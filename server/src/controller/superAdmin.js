/**
 * src/controller/superAdmin.js
 *
 * Handles SuperAdmin-specific operations:
 * - Triaging queue (SUBMITTED issues ordered by priority)
 * - Issue detail (full data + images + audit trail)
 * - Verify & Route (assign department)
 * - Reject (with reason, emails citizen)
 * - Department CRUD
 * - Dashboard stats
 */
const Joi = require('joi');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { sendOtpEmail } = require('../config/mailer');
const { isValidDesignation } = require('../config/designations');
const { invalidateCache } = require('../config/departmentCache');

// ─── Validation ──────────────────────────────────────────────────────────────

const verifySchema = Joi.object({
  department_id:          Joi.number().integer().positive().required(),
  admin_designation:      Joi.string().min(2).max(100).trim().optional().allow(null, ''),
});

const rejectSchema = Joi.object({
  reason: Joi.string().min(5).max(500).required(),
});

const createDeptSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
});

const createEmployeeSchema = Joi.object({
  name:          Joi.string().min(2).max(100).trim().required(),
  email:         Joi.string().email().lowercase().trim().required(),
  password:      Joi.string().min(8).max(72).required(),
  role:          Joi.string().valid('ADMIN', 'FIELD_WORKER').required(),
  department_id: Joi.number().integer().positive().required(),
  designation:   Joi.string().min(2).max(100).trim().optional(),
});

const createStaffSchema = Joi.object({
  name:          Joi.string().min(2).max(100).trim().required(),
  email:         Joi.string().email().lowercase().trim().required(),
  role:          Joi.string().valid('ADMIN', 'FIELD_WORKER').required(),
  department_id: Joi.number().integer().positive().required(),
});

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/super-admin/queue
 * Returns all SUBMITTED issues ordered by priority_score DESC.
 */
const getTriagingQueue = async (req, res) => {
  try {
    const statusParam = req.query.status || 'SUBMITTED';
    const result = await pool.query(
      `SELECT 
        i.id, i.short_id, i.category, i.description, i.status,
        i.address, i.priority_score, i.report_count, i.created_at,
        ST_Y(i.location::geometry) AS lat,
        ST_X(i.location::geometry) AS lng,
        (SELECT image_url FROM issue_images WHERE issue_id = i.id AND image_type = 'REPORT' ORDER BY uploaded_at LIMIT 1) AS thumbnail,
        d.name AS department_name
      FROM issues i
      LEFT JOIN departments d ON i.department_id = d.id
      WHERE i.status = $1
      ORDER BY i.priority_score DESC, i.created_at ASC`,
      [statusParam]
    );

    res.status(200).json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('[getTriagingQueue]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch triaging queue.' });
  }
};

/**
 * GET /api/super-admin/issues/:id/detail
 * Full issue detail: all images, audit trail, location, reporter info.
 */
const getIssueDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const issueResult = await pool.query(
      `SELECT 
        i.*, 
        ST_Y(i.location::geometry) AS lat,
        ST_X(i.location::geometry) AS lng,
        u.name AS reporter_name, u.email AS reporter_email,
        d.name AS department_name
      FROM issues i
      LEFT JOIN users u ON i.reporter_id = u.id
      LEFT JOIN departments d ON i.department_id = d.id
      WHERE i.id = $1`,
      [id]
    );

    if (issueResult.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Issue not found.' });
    }

    // All images
    const images = await pool.query(
      `SELECT id, image_url, image_type, uploaded_at 
       FROM issue_images WHERE issue_id = $1 ORDER BY uploaded_at`,
      [id]
    );

    // Audit trail
    const audit = await pool.query(
      `SELECT a.*, u.name AS changed_by_name
       FROM audit_logs a
       LEFT JOIN users u ON a.changed_by = u.id
       WHERE a.issue_id = $1
       ORDER BY a.created_at`,
      [id]
    );

    // Watchers count
    const watcherCount = await pool.query(
      'SELECT COUNT(*) FROM watchers WHERE issue_id = $1',
      [id]
    );

    res.status(200).json({
      issue: issueResult.rows[0],
      images: images.rows,
      audit_trail: audit.rows,
      watcher_count: parseInt(watcherCount.rows[0].count),
    });
  } catch (err) {
    console.error('[getIssueDetail]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch issue detail.' });
  }
};

/**
 * PATCH /api/super-admin/issues/:id/verify
 * Verify an issue and route it to a department.
 * Transitions: SUBMITTED → ASSIGNED
 */
const verifyIssue = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { error, value } = verifySchema.validate(req.body);
    if (error) {
      client.release();
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { department_id, admin_designation } = value;

    await client.query('BEGIN');

    // Check issue exists and is SUBMITTED
    const issue = await client.query('SELECT id, status FROM issues WHERE id = $1', [id]);
    if (issue.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Issue not found.' });
    }
    if (issue.rows[0].status !== 'SUBMITTED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'INVALID_STATUS', message: `Issue is ${issue.rows[0].status}, not SUBMITTED.` });
    }

    // Verify department exists and get dept_type for designation validation
    const dept = await client.query('SELECT id, name, dept_type FROM departments WHERE id = $1 AND deleted_at IS NULL', [department_id]);
    if (dept.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'INVALID_DEPT', message: 'Department not found or deleted.' });
    }
    const deptRow = dept.rows[0];

    // Validate admin_designation against the department's type vocabulary
    if (admin_designation && deptRow.dept_type) {
      if (!isValidDesignation(deptRow.dept_type, 'ADMIN', admin_designation)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'INVALID_DESIGNATION',
          message: `"${admin_designation}" is not a valid admin designation for ${deptRow.name}.`,
        });
      }
    }

    // Update issue — set department, admin designation (nullable), status
    await client.query(
      `UPDATE issues
       SET status = 'ASSIGNED', department_id = $1, assigned_admin_designation = $2, updated_at = NOW()
       WHERE id = $3`,
      [department_id, admin_designation || null, id]
    );

    // Audit log
    const noteText = admin_designation
      ? `Verified and routed to ${deptRow.name} → ${admin_designation}`
      : `Verified and routed to ${deptRow.name}`;

    await client.query(
      `INSERT INTO audit_logs (issue_id, from_status, to_status, changed_by, note, metadata)
       VALUES ($1, 'SUBMITTED', 'ASSIGNED', $2, $3, $4)`,
      [id, req.user.id, noteText, JSON.stringify({ department_id, department_name: deptRow.name, admin_designation: admin_designation || null })]
    );

    await client.query('COMMIT');

    res.status(200).json({
      message: admin_designation
        ? `Issue verified and assigned to ${deptRow.name} (${admin_designation}).`
        : `Issue verified and assigned to ${deptRow.name}.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[verifyIssue]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to verify issue.' });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/super-admin/issues/:id/reject
 * Reject an issue with a mandatory reason. Emails the reporter.
 * Transitions: SUBMITTED → REJECTED
 */
const rejectIssue = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { error, value } = rejectSchema.validate(req.body);
    if (error) {
      client.release();
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { reason } = value;

    await client.query('BEGIN');

    // Get issue + reporter email
    const issueResult = await client.query(
      `SELECT i.id, i.status, i.short_id, i.category, i.description, u.email AS reporter_email, u.name AS reporter_name
       FROM issues i
       LEFT JOIN users u ON i.reporter_id = u.id
       WHERE i.id = $1`,
      [id]
    );

    if (issueResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Issue not found.' });
    }

    const issue = issueResult.rows[0];
    if (issue.status !== 'SUBMITTED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'INVALID_STATUS', message: `Issue is ${issue.status}, not SUBMITTED.` });
    }

    // Update issue status
    await client.query(
      `UPDATE issues SET status = 'REJECTED', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (issue_id, from_status, to_status, changed_by, note, metadata)
       VALUES ($1, 'SUBMITTED', 'REJECTED', $2, $3, $4)`,
      [id, req.user.id, reason, JSON.stringify({ rejection_reason: reason })]
    );

    await client.query('COMMIT');

    // Send rejection email to reporter (non-blocking, don't fail the request)
    if (issue.reporter_email) {
      sendRejectionEmail(issue.reporter_email, issue.reporter_name, issue.short_id, issue.category, reason)
        .catch((err) => console.warn('[rejectIssue] email failed:', err.message));
    }

    res.status(200).json({ message: 'Issue rejected. Reporter has been notified.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[rejectIssue]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to reject issue.' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/super-admin/departments
 * List all active departments.
 */
const getDepartments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.name, d.dept_type, d.created_at,
        (SELECT COUNT(*) FROM issues WHERE department_id = d.id AND status NOT IN ('RESOLVED', 'REJECTED')) AS active_issues,
        (SELECT COUNT(*) FROM users WHERE department_id = d.id AND role = 'FIELD_WORKER') AS worker_count,
        (SELECT COUNT(*) FROM users WHERE department_id = d.id AND role = 'ADMIN') AS admin_count
      FROM departments d
      WHERE d.deleted_at IS NULL
      ORDER BY d.name`
    );
    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error('[getDepartments]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch departments.' });
  }
};

/**
 * POST /api/super-admin/departments
 * Create a new department.
 */
const createDepartment = async (req, res) => {
  try {
    const { error, value } = createDeptSchema.validate(req.body);
    if (error) return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });

    const result = await pool.query(
      `INSERT INTO departments (name) VALUES ($1) RETURNING id, name, created_at`,
      [value.name]
    );

    // Invalidate cache so AI prompt picks up new department immediately
    invalidateCache();

    res.status(201).json({ message: 'Department created.', department: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'DUPLICATE', message: 'A department with this name already exists.' });
    }
    console.error('[createDepartment]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to create department.' });
  }
};

/**
 * DELETE /api/super-admin/departments/:id
 * Soft-delete a department.
 */
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE departments SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id, name`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Department not found or already deleted.' });
    }

    // Invalidate cache so AI prompt no longer offers this department
    invalidateCache();

    res.status(200).json({ message: `Department "${result.rows[0].name}" deleted.` });
  } catch (err) {
    console.error('[deleteDepartment]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to delete department.' });
  }
};

/**
 * GET /api/super-admin/analytics
 * Returns data for all 3 analytics charts in one round-trip.
 *
 * Query params:
 *   period   — 'monthly' (default) | 'yearly'
 *
 * Response shape:
 * {
 *   line:  [{ period, received, resolved }]           — for the line chart
 *   pie:   { total, verified, rejected, pending }     — for the pie chart
 *   bar:   [{ department, count }]                    — for the bar chart
 * }
 */
const getAnalytics = async (req, res) => {
  try {
    const period = req.query.period === 'yearly' ? 'yearly' : 'monthly';

    // ── Line chart: received vs resolved over time ────────────────────────────
    const lineQuery = period === 'monthly'
      ? `
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS period,
          DATE_TRUNC('month', created_at)                       AS sort_key,
          COUNT(*)                                              AS received,
          COUNT(*) FILTER (WHERE status IN ('RESOLVED','CLOSED')) AS resolved
        FROM issues
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY sort_key ASC
      `
      : `
        SELECT
          TO_CHAR(DATE_TRUNC('year', created_at), 'YYYY') AS period,
          DATE_TRUNC('year', created_at)                   AS sort_key,
          COUNT(*)                                          AS received,
          COUNT(*) FILTER (WHERE status IN ('RESOLVED','CLOSED')) AS resolved
        FROM issues
        GROUP BY DATE_TRUNC('year', created_at)
        ORDER BY sort_key ASC
      `;

    // ── Pie chart: verification breakdown (all time) ──────────────────────────
    const pieQuery = `
      SELECT
        COUNT(*)                                                          AS total,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED')                     AS pending,
        COUNT(*) FILTER (WHERE status IN ('VERIFIED', 'ASSIGNED',
                                          'IN_PROGRESS', 'RESOLVED',
                                          'NOT_SATISFIED', 'CLOSED'))    AS verified,
        COUNT(*) FILTER (WHERE status = 'REJECTED')                      AS rejected
      FROM issues
    `;

    // ── Bar chart: issues per department ─────────────────────────────────────
    const barQuery = period === 'monthly'
      ? `
        SELECT
          d.name                                             AS department,
          COUNT(i.id)                                        AS count
        FROM departments d
        LEFT JOIN issues i
          ON i.department_id = d.id
         AND i.created_at >= NOW() - INTERVAL '1 month'
        WHERE d.deleted_at IS NULL
        GROUP BY d.name
        ORDER BY count DESC
      `
      : `
        SELECT
          d.name           AS department,
          COUNT(i.id)      AS count
        FROM departments d
        LEFT JOIN issues i
          ON i.department_id = d.id
         AND EXTRACT(YEAR FROM i.created_at) = EXTRACT(YEAR FROM NOW())
        WHERE d.deleted_at IS NULL
        GROUP BY d.name
        ORDER BY count DESC
      `;

    const [lineRes, pieRes, barRes] = await Promise.all([
      pool.query(lineQuery),
      pool.query(pieQuery),
      pool.query(barQuery),
    ]);

    res.status(200).json({
      line: lineRes.rows.map(r => ({
        period:   r.period,
        received: parseInt(r.received),
        resolved: parseInt(r.resolved),
      })),
      pie: {
        total:    parseInt(pieRes.rows[0].total),
        verified: parseInt(pieRes.rows[0].verified),
        rejected: parseInt(pieRes.rows[0].rejected),
        pending:  parseInt(pieRes.rows[0].pending),
      },
      bar: barRes.rows.map(r => ({
        department: r.department,
        count:      parseInt(r.count),
      })),
    });
  } catch (err) {
    console.error('[getAnalytics]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch analytics.' });
  }
};
const getStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'SUBMITTED') AS pending_count,
        COUNT(*) FILTER (WHERE status = 'ASSIGNED') AS assigned_count,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved_count,
        COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected_count,
        COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED', 'REJECTED')) AS total_active
      FROM issues
    `);

    // Verification rate (last 30 days)
    const rateResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE to_status = 'ASSIGNED') AS verified,
        COUNT(*) FILTER (WHERE to_status = 'REJECTED') AS rejected
      FROM audit_logs
      WHERE from_status = 'SUBMITTED'
        AND created_at > NOW() - INTERVAL '30 days'
    `);

    const rate = rateResult.rows[0];
    const total = parseInt(rate.verified) + parseInt(rate.rejected);
    const verificationRate = total > 0 ? Math.round((parseInt(rate.verified) / total) * 100) : 0;

    res.status(200).json({
      ...stats.rows[0],
      verification_rate: verificationRate,
    });
  } catch (err) {
    console.error('[getStats]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch stats.' });
  }
};

/**
 * POST /api/super-admin/employees
 * Create an ADMIN or FIELD_WORKER account and assign them to a department.
 * Validates that the designation is appropriate for the department's type and role.
 */
const createEmployee = async (req, res) => {
  try {
    const { error, value } = createEmployeeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { name, email, password, role, department_id, designation } = value;

    // Verify department exists and get its dept_type
    const deptResult = await pool.query(
      'SELECT id, name, dept_type FROM departments WHERE id = $1 AND deleted_at IS NULL',
      [department_id]
    );
    if (deptResult.rows.length === 0) {
      return res.status(400).json({ error: 'INVALID_DEPT', message: 'Department not found or deleted.' });
    }
    const dept = deptResult.rows[0];

    // Validate designation against the department type + role vocabulary
    if (designation && dept.dept_type) {
      if (!isValidDesignation(dept.dept_type, role, designation)) {
        return res.status(400).json({
          error: 'INVALID_DESIGNATION',
          message: `"${designation}" is not a valid designation for ${role} in ${dept.name}.`,
        });
      }
    }

    // Check email is not already taken
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'EMAIL_TAKEN', message: 'An account with this email already exists.' });
    }

    // Hash password and insert employee
    const password_hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department_id, designation, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, name, email, role, designation, department_id`,
      [name, email, password_hash, role, department_id, designation || null]
    );

    const employee = result.rows[0];
    res.status(201).json({
      message: `${role === 'ADMIN' ? 'Admin' : 'Field Worker'} "${name}" created and assigned to ${dept.name}.`,
      employee: { ...employee, department_name: dept.name },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'EMAIL_TAKEN', message: 'An account with this email already exists.' });
    }
    console.error('[createEmployee]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to create employee.' });
  }
};

/**
 * GET /api/super-admin/employees
 * List all non-citizen users (ADMINs and FIELD_WORKERs) with their department.
 */
const getEmployees = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.designation, u.created_at,
              d.id AS department_id, d.name AS department_name, d.dept_type
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.role IN ('ADMIN', 'FIELD_WORKER')
       ORDER BY u.role, d.name, u.name`
    );
    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error('[getEmployees]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch employees.' });
  }
};

/**
 * GET /api/super-admin/designations
 * Returns the full designation vocabulary keyed by dept_type.
 * Frontend uses this to dynamically build the admin designation dropdown
 * after the user selects a department (which carries a dept_type).
 */
const getDesignationsConfig = (req, res) => {
  const { DESIGNATIONS } = require('../config/designations');
  res.status(200).json({ data: DESIGNATIONS });
};

// ─── Email Helper ────────────────────────────────────────────────────────────

async function sendRejectionEmail(email, name, shortId, category, reason) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@nagarseva.in',
    to: email,
    subject: `❌ NagarSeva — Your complaint ${shortId} was not accepted`,
    html: `
      <div style="font-family:'Inter',sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#f1f5f9;padding:40px 32px;border-radius:16px;">
        <h1 style="color:#38bdf8;font-size:24px;margin:0 0 16px;">🏙️ NagarSeva</h1>
        <p style="color:#94a3b8;font-size:15px;line-height:1.6;">
          Hi ${name || 'Citizen'},<br><br>
          Your complaint <strong style="color:#f1f5f9;">${shortId}</strong> (${category.replace(/_/g, ' ')}) 
          has been reviewed and <strong style="color:#ef4444;">not accepted</strong>.
        </p>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;margin:20px 0;">
          <p style="color:#64748b;font-size:12px;text-transform:uppercase;margin:0 0 8px;">Reason</p>
          <p style="color:#f1f5f9;font-size:14px;line-height:1.5;margin:0;">${reason}</p>
        </div>
        <p style="color:#64748b;font-size:13px;">
          If you believe this was an error, you may submit a new complaint with clearer evidence.
        </p>
      </div>
    `,
  });
}

/**
 * POST /api/super-admin/staff
 * Creates a new ADMIN or FIELD_WORKER with a generated password.
 */

// ╔════════════════════════════════════════════════════════════════════╗
// ║  CONFIGURABLE: Maximum admins allowed per department.            ║
// ║  Change this value to allow more admins per dept in the future.  ║
// ╚════════════════════════════════════════════════════════════════════╝
const MAX_ADMINS_PER_DEPT = 1;

function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(16);
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

const createStaff = async (req, res) => {
  try {
    const { error, value } = createStaffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { name, email, role, department_id } = value;

    // ─── Safety Lock 1: Check if email already exists ─────────────────
    const existingUser = await pool.query('SELECT id, role FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'DUPLICATE',
        message: `A user with email ${email} already exists (role: ${existingUser.rows[0].role}).`,
      });
    }

    // ─── Safety Lock 2: Verify department exists and is active ────────
    const deptCheck = await pool.query(
      'SELECT id, name FROM departments WHERE id = $1 AND deleted_at IS NULL',
      [department_id]
    );
    if (deptCheck.rows.length === 0) {
      return res.status(400).json({ error: 'INVALID_DEPT', message: 'Department not found or has been deleted.' });
    }
    const deptName = deptCheck.rows[0].name;

    // ─── Safety Lock 3: Admin cap per department ──────────────────────
    if (role === 'ADMIN') {
      const adminCount = await pool.query(
        "SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND department_id = $1",
        [department_id]
      );
      if (parseInt(adminCount.rows[0].count) >= MAX_ADMINS_PER_DEPT) {
        return res.status(400).json({
          error: 'ADMIN_CAP_REACHED',
          message: `This department already has ${MAX_ADMINS_PER_DEPT} admin(s). Maximum allowed: ${MAX_ADMINS_PER_DEPT}.`,
        });
      }
    }

    // ─── Generate password & create user ──────────────────────────────
    const plainPassword = generateSecurePassword();
    const password_hash = await bcrypt.hash(plainPassword, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_verified, department_id)
       VALUES ($1, $2, $3, $4, TRUE, $5)
       RETURNING id, name, email, role`,
      [name, email, password_hash, role, department_id]
    );

    const newUser = result.rows[0];

    // ─── Send credentials email (track success/failure) ───────────────
    let emailSent = false;
    try {
      await sendCredentialEmail(email, name, role, deptName, plainPassword);
      emailSent = true;
      console.log(`[createStaff] ✅ Credentials sent to ${email}`);
    } catch (emailErr) {
      console.warn(`[createStaff] ❌ Email FAILED for ${email}: ${emailErr.message}`);
      // User is created but email failed — they'll need "Forgot Password" or a resend
    }

    res.status(201).json({
      message: emailSent
        ? `${role === 'ADMIN' ? 'Admin' : 'Field Worker'} created. Credentials sent to ${email}.`
        : `${role === 'ADMIN' ? 'Admin' : 'Field Worker'} created, but email delivery FAILED. Use "Resend Credentials" or the user can reset via Forgot Password.`,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, department: deptName },
      email_sent: emailSent,
      ...(process.env.NODE_ENV === 'development' && { dev_password: plainPassword }),
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'DUPLICATE', message: 'A user with this email already exists.' });
    }
    console.error('[createStaff]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to create staff member.' });
  }
};

/**
 * POST /api/super-admin/staff/:id/resend-credentials
 * Generates a NEW password for an existing staff user and resends credentials.
 * Use case: original email failed, or user lost their password and needs admin help.
 *
 * Safety: This resets their password (old one is invalidated).
 */
const resendCredentials = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the user
    const userResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1 AND u.role IN ('ADMIN', 'FIELD_WORKER')`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Staff user not found.' });
    }

    const user = userResult.rows[0];

    // Generate new password (invalidates old one)
    const plainPassword = generateSecurePassword();
    const password_hash = await bcrypt.hash(plainPassword, 12);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, id]
    );

    // Send credentials email
    let emailSent = false;
    try {
      await sendCredentialEmail(user.email, user.name, user.role, user.department_name || '—', plainPassword);
      emailSent = true;
    } catch (emailErr) {
      console.warn(`[resendCredentials] Email failed for ${user.email}: ${emailErr.message}`);
    }

    res.status(200).json({
      message: emailSent
        ? `New credentials sent to ${user.email}. Previous password is now invalid.`
        : `Password was reset but email delivery FAILED. Dev password shown below (dev only).`,
      email_sent: emailSent,
      ...(process.env.NODE_ENV === 'development' && { dev_password: plainPassword }),
    });
  } catch (err) {
    console.error('[resendCredentials]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to resend credentials.' });
  }
};

/**
 * GET /api/super-admin/staff
 * Lists all ADMIN and FIELD_WORKER users with their department info.
 */
const getStaffList = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.designation, u.created_at,
              u.department_id, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.role IN ('ADMIN', 'FIELD_WORKER')
       ORDER BY u.role, u.name`
    );
    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error('[getStaffList]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch staff.' });
  }
};

// ─── Credential Email ────────────────────────────────────────────────────────

async function sendCredentialEmail(email, name, role, deptName, password) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  });

  const roleLabel = role === 'ADMIN' ? 'Department Admin' : 'Field Worker';

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@nagarseva.in',
    to: email,
    subject: `🏙️ NagarSeva — Your ${roleLabel} Account Credentials`,
    html: `
      <div style="font-family:'Inter',sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#f1f5f9;padding:40px 32px;border-radius:16px;">
        <h1 style="color:#38bdf8;font-size:24px;margin:0 0 16px;">🏙️ NagarSeva</h1>
        <p style="color:#94a3b8;font-size:15px;line-height:1.6;">
          Hi ${name},<br><br>
          You've been added as a <strong style="color:#f1f5f9;">${roleLabel}</strong> 
          in the <strong style="color:#38bdf8;">${deptName}</strong> department.
        </p>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;margin:20px 0;">
          <p style="color:#64748b;font-size:12px;text-transform:uppercase;margin:0 0 12px;">Your Login Credentials</p>
          <p style="color:#f1f5f9;font-size:14px;margin:0 0 8px;">
            <strong>Email:</strong> ${email}
          </p>
          <p style="color:#f1f5f9;font-size:14px;margin:0;">
            <strong>Password:</strong> <code style="background:#0f172a;padding:2px 8px;border-radius:4px;color:#38bdf8;font-size:15px;">${password}</code>
          </p>
        </div>
        <p style="color:#f59e0b;font-size:13px;line-height:1.5;">
          ⚠️ Please change your password after your first login using the "Forgot Password" feature.
        </p>
        <p style="color:#64748b;font-size:12px;margin-top:16px;">
          Login at: <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="color:#38bdf8;">NagarSeva Platform</a>
        </p>
      </div>
    `,
  });
}

module.exports = {
  getTriagingQueue,
  getIssueDetail,
  verifyIssue,
  rejectIssue,
  getDepartments,
  createDepartment,
  deleteDepartment,
  getStats,
  getAnalytics,
  createEmployee,
  getEmployees,
  getDesignationsConfig,
  createStaff,
  getStaffList,
  resendCredentials,
};

