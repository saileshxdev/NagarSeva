/**
 * src/controller/fieldWorker.js
 *
 * Field Worker operations:
 * - GET  /api/field-worker/issues          — Active (ASSIGNED + IN_PROGRESS) issues assigned to me
 * - GET  /api/field-worker/issues/resolved — Resolved/Closed issues assigned to me
 * - GET  /api/field-worker/issues/:id      — Full detail for one issue (description, images, watchers)
 * - PATCH /api/field-worker/issues/:id/start   — ASSIGNED → IN_PROGRESS
 * - PATCH /api/field-worker/issues/:id/resolve — IN_PROGRESS → RESOLVED (with resolution images)
 */
const Joi  = require('joi');
const pool = require('../config/db');

// ─── Validation ──────────────────────────────────────────────────────────────

const resolveSchema = Joi.object({
  image_urls: Joi.array().items(Joi.string().uri()).max(5).default([]),
  note:       Joi.string().max(500).allow('', null),
});

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/field-worker/issues
 * Returns ASSIGNED + IN_PROGRESS issues assigned to the requesting field worker.
 */
const getActiveIssues = async (req, res) => {
  try {
    const worker_id = req.user.id;

    const result = await pool.query(
      `SELECT
        i.id, i.short_id, i.category, i.description, i.status,
        i.address, i.priority_score, i.report_count, i.created_at, i.updated_at,
        i.assigned_admin_designation,
        ST_Y(i.location::geometry) AS lat,
        ST_X(i.location::geometry) AS lng,
        (SELECT image_url FROM issue_images
         WHERE issue_id = i.id AND image_type = 'REPORT'
         ORDER BY uploaded_at LIMIT 1) AS thumbnail
      FROM issues i
      WHERE i.assigned_to = $1
        AND i.status IN ('ASSIGNED', 'IN_PROGRESS')
      ORDER BY
        CASE i.status WHEN 'IN_PROGRESS' THEN 0 ELSE 1 END,
        i.priority_score DESC,
        i.created_at ASC`,
      [worker_id]
    );

    res.status(200).json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('[getActiveIssues]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch active issues.' });
  }
};

/**
 * GET /api/field-worker/issues/resolved
 * Returns RESOLVED issues assigned to the requesting field worker.
 */
const getResolvedIssues = async (req, res) => {
  try {
    const worker_id = req.user.id;

    const result = await pool.query(
      `SELECT
        i.id, i.short_id, i.category, i.description, i.status,
        i.address, i.priority_score, i.report_count, i.created_at, i.resolved_at,
        (SELECT image_url FROM issue_images
         WHERE issue_id = i.id AND image_type = 'REPORT'
         ORDER BY uploaded_at LIMIT 1) AS thumbnail
      FROM issues i
      WHERE i.assigned_to = $1
        AND i.status IN ('RESOLVED', 'NOT_SATISFIED')
      ORDER BY i.resolved_at DESC NULLS LAST, i.updated_at DESC`,
      [worker_id]
    );

    res.status(200).json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('[getResolvedIssues]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch resolved issues.' });
  }
};

/**
 * GET /api/field-worker/issues/:id
 * Full detail for one issue: description, all images (REPORT + RESOLUTION), watcher count.
 */
const getIssueDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const worker_id = req.user.id;

    // Verify this issue is actually assigned to this worker (or was resolved by them)
    const issueResult = await pool.query(
      `SELECT
        i.id, i.short_id, i.category, i.description, i.status,
        i.address, i.priority_score, i.report_count,
        i.created_at, i.updated_at, i.resolved_at,
        i.assigned_admin_designation,
        ST_Y(i.location::geometry) AS lat,
        ST_X(i.location::geometry) AS lng,
        u.name AS reporter_name
      FROM issues i
      LEFT JOIN users u ON i.reporter_id = u.id
      WHERE i.id = $1 AND i.assigned_to = $2`,
      [id, worker_id]
    );

    if (issueResult.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Issue not found or not assigned to you.' });
    }

    // All images (report evidence + field worker resolution uploads)
    const images = await pool.query(
      `SELECT id, image_url, image_type, uploaded_at
       FROM issue_images WHERE issue_id = $1 ORDER BY image_type, uploaded_at`,
      [id]
    );

    // Watcher count (people following)
    const watcherCount = await pool.query(
      'SELECT COUNT(*) FROM watchers WHERE issue_id = $1',
      [id]
    );

    res.status(200).json({
      issue:         issueResult.rows[0],
      images:        images.rows,
      watcher_count: parseInt(watcherCount.rows[0].count),
    });
  } catch (err) {
    console.error('[getIssueDetail]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch issue detail.' });
  }
};

/**
 * PATCH /api/field-worker/issues/:id/start
 * Transitions ASSIGNED → IN_PROGRESS when the field worker starts working.
 */
const startIssue = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const worker_id = req.user.id;

    await client.query('BEGIN');

    const issue = await client.query(
      'SELECT id, status FROM issues WHERE id = $1 AND assigned_to = $2 FOR UPDATE',
      [id, worker_id]
    );
    if (issue.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Issue not found or not assigned to you.' });
    }
    if (issue.rows[0].status !== 'ASSIGNED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'INVALID_STATUS', message: `Issue is ${issue.rows[0].status}, not ASSIGNED.` });
    }

    await client.query(
      `UPDATE issues SET status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await client.query(
      `INSERT INTO audit_logs (issue_id, from_status, to_status, changed_by, note)
       VALUES ($1, 'ASSIGNED', 'IN_PROGRESS', $2, 'Field worker started work on site')`,
      [id, worker_id]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Issue marked as In Progress.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[startIssue]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to start issue.' });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/field-worker/issues/:id/resolve
 * Transitions IN_PROGRESS → RESOLVED.
 * Accepts up to 5 geotagged resolution image URLs + an optional note.
 */
const resolveIssue = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const worker_id = req.user.id;

    const { error, value } = resolveSchema.validate(req.body);
    if (error) {
      client.release();
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { image_urls, note } = value;

    await client.query('BEGIN');

    const issue = await client.query(
      'SELECT id, status FROM issues WHERE id = $1 AND assigned_to = $2 FOR UPDATE',
      [id, worker_id]
    );
    if (issue.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Issue not found or not assigned to you.' });
    }
    if (issue.rows[0].status !== 'IN_PROGRESS') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'INVALID_STATUS',
        message: `Issue is ${issue.rows[0].status}. Only IN_PROGRESS issues can be resolved. Use /start first.`,
      });
    }

    // Update status + set resolved_at timestamp
    await client.query(
      `UPDATE issues SET status = 'RESOLVED', resolved_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Insert resolution images (type = RESOLUTION)
    if (image_urls && image_urls.length > 0) {
      for (const url of image_urls) {
        await client.query(
          `INSERT INTO issue_images (issue_id, uploader_id, image_url, image_type)
           VALUES ($1, $2, $3, 'RESOLUTION')`,
          [id, worker_id, url]
        );
      }
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (issue_id, from_status, to_status, changed_by, note)
       VALUES ($1, 'IN_PROGRESS', 'RESOLVED', $2, $3)`,
      [id, worker_id, note || 'Issue resolved by field worker']
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Issue marked as Resolved. Great work!' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[resolveIssue]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to resolve issue.' });
  } finally {
    client.release();
  }
};

module.exports = { getActiveIssues, getResolvedIssues, getIssueDetail, startIssue, resolveIssue };
