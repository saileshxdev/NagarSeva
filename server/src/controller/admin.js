/**
 * src/controller/admin.js
 *
 * Department Admin operations:
 * - Departmental queue (ASSIGNED issues for their department)
 * - Field worker ranking (composite score: experience + success rate - busyness)
 * - Assign issue to a specific field worker
 * - Resource overview (all workers + their active counts)
 */
const Joi  = require('joi');
const pool = require('../config/db');

// ─── Validation ──────────────────────────────────────────────────────────────

const assignSchema = Joi.object({
  assigned_to: Joi.string().uuid().required(),
});

// ─── Configurable Weights for Worker Score ───────────────────────────────────

const W_EXPERIENCE = parseFloat(process.env.WORKER_W_EXPERIENCE) || 0.3;
const W_SUCCESS    = parseFloat(process.env.WORKER_W_SUCCESS)    || 0.4;
const W_BUSYNESS   = parseFloat(process.env.WORKER_W_BUSYNESS)  || 0.5;

/**
 * Helper: Get the admin's department_id and designation from JWT (fast)
 * or DB fallback (one query). Always reads from DB to ensure designation
 * is current (not stale in an old JWT).
 */
async function getAdminContext(req) {
  const result = await pool.query(
    'SELECT department_id, designation FROM users WHERE id = $1',
    [req.user.id]
  );
  const row = result.rows[0];
  return {
    dept_id:     row?.department_id || null,
    designation: row?.designation   || null,
  };
}

// Keep backward-compatible alias for other controllers that call getAdminDeptId
async function getAdminDeptId(req) {
  const { dept_id } = await getAdminContext(req);
  return dept_id;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/queue
 * Returns ASSIGNED issues for the admin's department, ordered by priority.
 */
const getDepartmentQueue = async (req, res) => {
  try {
    const { dept_id, designation: adminDesignation } = await getAdminContext(req);
    if (!dept_id) {
      return res.status(400).json({ error: 'NO_DEPARTMENT', message: 'You are not assigned to a department.' });
    }

    const statusParam = req.query.status || 'ASSIGNED';

    const result = await pool.query(
      `SELECT 
        i.id, i.short_id, i.category, i.description, i.status,
        i.address, i.priority_score, i.report_count, i.created_at, i.updated_at,
        i.assigned_admin_designation,
        ST_Y(i.location::geometry) AS lat,
        ST_X(i.location::geometry) AS lng,
        (SELECT image_url FROM issue_images WHERE issue_id = i.id AND image_type = 'REPORT' ORDER BY uploaded_at LIMIT 1) AS thumbnail,
        EXTRACT(DAY FROM NOW() - i.updated_at)::INT AS days_pending
      FROM issues i
      WHERE i.department_id = $1
        AND i.status = $2
        AND (
          i.assigned_admin_designation IS NULL
          OR i.assigned_admin_designation = $3
        )
      ORDER BY i.priority_score DESC, i.created_at ASC`,
      [dept_id, statusParam, adminDesignation]
    );

    res.status(200).json({ 
      count: result.rows.length, 
      data: result.rows 
    });
  } catch (err) {
    console.error('[getDepartmentQueue]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch department queue.' });
  }
};

/**
 * GET /api/admin/workers
 * Returns ranked field workers in the admin's department using the composite Worker Score.
 *
 * Score: S = (w₁ · E) + (w₂ · R) − (w₃ · B)
 *   E = normalized total resolved (experience)
 *   R = resolved / (resolved + rejected) (success rate)
 *   B = current active tasks (busyness penalty)
 *
 * Computed in a single CTE with window functions — no N+1 queries.
 */
const getRankedWorkers = async (req, res) => {
  try {
    const dept_id = await getAdminDeptId(req);
    if (!dept_id) {
      return res.status(400).json({ error: 'NO_DEPARTMENT', message: 'You are not assigned to a department.' });
    }

    const result = await pool.query(
      `WITH worker_stats AS (
        SELECT
          u.id, u.name, u.email, u.designation,
          COUNT(i.id) FILTER (WHERE i.status = 'RESOLVED') AS resolved_count,
          COUNT(i.id) FILTER (WHERE i.status = 'NOT_SATISFIED') AS rejected_count,
          COUNT(i.id) FILTER (WHERE i.status = 'IN_PROGRESS') AS active_count,
          COUNT(i.id) AS total_handled
        FROM users u
        LEFT JOIN issues i ON i.assigned_to = u.id
        WHERE u.role = 'FIELD_WORKER'
          AND u.department_id = $1
        GROUP BY u.id, u.name, u.email, u.designation
      )
      SELECT *,
        CASE WHEN MAX(total_handled) OVER () = 0 THEN 0
             ELSE total_handled::FLOAT / NULLIF(MAX(total_handled) OVER (), 0)
        END AS experience_norm,
        CASE WHEN (resolved_count + rejected_count) = 0 THEN 0.5
             ELSE resolved_count::FLOAT / (resolved_count + rejected_count)
        END AS success_rate,
        ROUND((
          (${W_EXPERIENCE} * (CASE WHEN MAX(total_handled) OVER () = 0 THEN 0
                      ELSE total_handled::FLOAT / NULLIF(MAX(total_handled) OVER (), 0) END))
          + (${W_SUCCESS} * (CASE WHEN (resolved_count + rejected_count) = 0 THEN 0.5
                        ELSE resolved_count::FLOAT / (resolved_count + rejected_count) END))
          - (${W_BUSYNESS} * active_count)
        )::NUMERIC, 2) AS worker_score
      FROM worker_stats
      ORDER BY worker_score DESC`,
      [dept_id]
    );

    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error('[getRankedWorkers]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch workers.' });
  }
};

/**
 * PATCH /api/admin/issues/:id/assign
 * Assign an issue to a field worker. Transitions: ASSIGNED → IN_PROGRESS.
 */
const assignWorker = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { error, value } = assignSchema.validate(req.body);
    if (error) {
      client.release();
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { assigned_to } = value;
    const dept_id = await getAdminDeptId(req);

    await client.query('BEGIN');

    // Verify issue exists, is ASSIGNED, and belongs to this admin's department.
    // FOR UPDATE locks the row so two concurrent admins cannot assign the same issue simultaneously.
    const issue = await client.query(
      'SELECT id, status, department_id FROM issues WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (issue.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Issue not found.' });
    }
    if (issue.rows[0].status !== 'ASSIGNED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'INVALID_STATUS', message: `Issue is ${issue.rows[0].status}, not ASSIGNED.` });
    }
    if (issue.rows[0].department_id !== dept_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'FORBIDDEN', message: 'This issue does not belong to your department.' });
    }

    // Verify worker exists, is FIELD_WORKER, and in same department
    const worker = await client.query(
      'SELECT id, name, department_id FROM users WHERE id = $1 AND role = $2',
      [assigned_to, 'FIELD_WORKER']
    );
    if (worker.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'INVALID_WORKER', message: 'Field worker not found.' });
    }
    if (worker.rows[0].department_id !== dept_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'WRONG_DEPT', message: 'Worker is not in your department.' });
    }

    // Assign and update status
    await client.query(
      `UPDATE issues SET assigned_to = $1, status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $2`,
      [assigned_to, id]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (issue_id, from_status, to_status, changed_by, note, metadata)
       VALUES ($1, 'ASSIGNED', 'IN_PROGRESS', $2, $3, $4)`,
      [id, req.user.id, `Assigned to ${worker.rows[0].name}`, JSON.stringify({ assigned_to, worker_name: worker.rows[0].name })]
    );

    await client.query('COMMIT');

    res.status(200).json({ message: `Issue assigned to ${worker.rows[0].name}. Status: IN_PROGRESS.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[assignWorker]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to assign worker.' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/admin/stats
 * Department-level stats.
 */
const getDeptStats = async (req, res) => {
  try {
    const dept_id = await getAdminDeptId(req);
    if (!dept_id) return res.status(400).json({ error: 'NO_DEPARTMENT', message: 'No department assigned.' });

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'ASSIGNED') AS pending_assignment,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved,
        (SELECT COUNT(*) FROM users WHERE department_id = $1 AND role = 'FIELD_WORKER') AS worker_count
      FROM issues
      WHERE department_id = $1
    `, [dept_id]);

    // Department name
    const dept = await pool.query('SELECT name FROM departments WHERE id = $1', [dept_id]);

    res.status(200).json({
      department_name: dept.rows[0]?.name || '—',
      ...result.rows[0],
    });
  } catch (err) {
    console.error('[getDeptStats]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch stats.' });
  }
};

const getIssueDetailForAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const dept_id = await getAdminDeptId(req);
    if (!dept_id) {
      return res.status(400).json({ error: 'NO_DEPARTMENT', message: 'No department assigned.' });
    }

    const issueResult = await pool.query(
      `SELECT i.*, 
              ST_Y(i.location::geometry) AS lat,
              ST_X(i.location::geometry) AS lng,
              u.name AS reporter_name,
              u.email AS reporter_email,
              w.name AS worker_name,
              w.email AS worker_email
       FROM issues i 
       LEFT JOIN users u ON i.reporter_id = u.id
       LEFT JOIN users w ON i.assigned_to = w.id
       WHERE i.id = $1 AND i.department_id = $2`,
      [id, dept_id]
    );

    if (issueResult.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Issue not found or does not belong to your department.' });
    }

    const imagesResult = await pool.query(
      `SELECT id, image_url, image_type, uploaded_at 
       FROM issue_images 
       WHERE issue_id = $1 
       ORDER BY uploaded_at`,
      [id]
    );

    res.status(200).json({
      issue: issueResult.rows[0],
      images: imagesResult.rows,
    });
  } catch (err) {
    console.error('[getIssueDetailForAdmin]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch issue details.' });
  }
};

/**
 * GET /api/admin/workers/:workerId/issues
 * Returns all issues assigned to a specific field worker.
 */
const getWorkerIssues = async (req, res) => {
  try {
    const { workerId } = req.params;
    const dept_id = await getAdminDeptId(req);
    if (!dept_id) {
      return res.status(400).json({ error: 'NO_DEPARTMENT', message: 'You are not assigned to a department.' });
    }

    const result = await pool.query(
      `SELECT 
        i.id, i.short_id, i.category, i.description, i.status,
        i.address, i.priority_score, i.report_count, i.created_at, i.updated_at,
        ST_Y(i.location::geometry) AS lat,
        ST_X(i.location::geometry) AS lng,
        (SELECT image_url FROM issue_images WHERE issue_id = i.id AND image_type = 'REPORT' ORDER BY uploaded_at LIMIT 1) AS thumbnail,
        EXTRACT(DAY FROM NOW() - i.updated_at)::INT AS days_pending
      FROM issues i
      WHERE i.assigned_to = $1 AND i.department_id = $2
      ORDER BY i.created_at DESC`,
      [workerId, dept_id]
    );

    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error('[getWorkerIssues]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch issues for worker.' });
  }
};

/**
 * GET /api/admin/analytics
 * Department-scoped analytics for the Admin dashboard.
 * Query params: period = 'monthly' (default) | 'yearly'
 *
 * Response:
 * {
 *   trend:      [{ period, received, resolved, not_satisfied }]
 *   statusPie1: { in_progress, assigned }
 *   statusPie2: { resolved, not_satisfied }
 *   workers:    [{ name, in_progress, resolved, not_satisfied }]
 * }
 */
const getAdminAnalytics = async (req, res) => {
  try {
    const dept_id = await getAdminDeptId(req);
    if (!dept_id) {
      return res.status(400).json({ error: 'NO_DEPARTMENT', message: 'No department assigned.' });
    }

    const period = req.query.period === 'yearly' ? 'yearly' : 'monthly';
    const trunc  = period === 'monthly' ? 'month' : 'year';
    const fmt    = period === 'monthly' ? 'Mon YYYY' : 'YYYY';
    const since  = period === 'monthly' ? `NOW() - INTERVAL '12 months'` : `'2000-01-01'`;

    // ── Chart 1: Issue trend over time ──────────────────────────────────────
    const trendRes = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('${trunc}', created_at), '${fmt}') AS period,
        DATE_TRUNC('${trunc}', created_at)                     AS sort_key,
        COUNT(*)                                               AS received,
        COUNT(*) FILTER (WHERE status IN ('RESOLVED','CLOSED')) AS resolved,
        COUNT(*) FILTER (WHERE status = 'NOT_SATISFIED')        AS not_satisfied
      FROM issues
      WHERE department_id = $1
        AND created_at >= ${since}
      GROUP BY DATE_TRUNC('${trunc}', created_at)
      ORDER BY sort_key ASC
    `, [dept_id]);

    // ── Chart 2a: In-Progress vs Assigned (current snapshot) ───────────────
    const pie1Res = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'ASSIGNED')    AS assigned
      FROM issues
      WHERE department_id = $1
    `, [dept_id]);

    // ── Chart 2b: Resolved vs Not-Satisfied (all time) ──────────────────────
    const pie2Res = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('RESOLVED','CLOSED')) AS resolved,
        COUNT(*) FILTER (WHERE status = 'NOT_SATISFIED')        AS not_satisfied
      FROM issues
      WHERE department_id = $1
    `, [dept_id]);

    // ── Chart 4: Per-worker breakdown ───────────────────────────────────────
    const workersRes = await pool.query(`
      SELECT
        u.name,
        COUNT(i.id) FILTER (WHERE i.status = 'IN_PROGRESS')           AS in_progress,
        COUNT(i.id) FILTER (WHERE i.status IN ('RESOLVED','CLOSED'))   AS resolved,
        COUNT(i.id) FILTER (WHERE i.status = 'NOT_SATISFIED')          AS not_satisfied
      FROM users u
      LEFT JOIN issues i ON i.assigned_to = u.id AND i.department_id = $1
      WHERE u.role = 'FIELD_WORKER' AND u.department_id = $1
      GROUP BY u.id, u.name
      ORDER BY u.name ASC
    `, [dept_id]);

    res.status(200).json({
      trend: trendRes.rows.map(r => ({
        period:        r.period,
        received:      parseInt(r.received),
        resolved:      parseInt(r.resolved),
        not_satisfied: parseInt(r.not_satisfied),
      })),
      statusPie1: {
        in_progress: parseInt(pie1Res.rows[0].in_progress),
        assigned:    parseInt(pie1Res.rows[0].assigned),
      },
      statusPie2: {
        resolved:      parseInt(pie2Res.rows[0].resolved),
        not_satisfied: parseInt(pie2Res.rows[0].not_satisfied),
      },
      workers: workersRes.rows.map(r => ({
        name:          r.name,
        in_progress:   parseInt(r.in_progress),
        resolved:      parseInt(r.resolved),
        not_satisfied: parseInt(r.not_satisfied),
      })),
    });
  } catch (err) {
    console.error('[getAdminAnalytics]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch analytics.' });
  }
};

module.exports = { 
  getDepartmentQueue, 
  getRankedWorkers, 
  assignWorker, 
  getDeptStats,
  getAdminAnalytics,
  getIssueDetailForAdmin,
  getWorkerIssues
};
