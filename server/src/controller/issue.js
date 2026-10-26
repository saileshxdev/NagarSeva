const Joi    = require('joi');
const crypto = require('crypto');
const pool   = require('../config/db');
const { DEDUP_RADIUS_METRES, DEDUP_PRIORITY_BOOST } = require('../config/dedup');
const { computeLockKey } = require('../utils/dedupLock');

// ─── Validation Schemas ──────────────────────────────────────────────────────

const createIssueSchema = Joi.object({
  category: Joi.string().max(50).default('OTHER'),
  department: Joi.string().max(100).allow('', null),  // AI-assigned department name
  description: Joi.string().max(1000).allow('', null),
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  address: Joi.string().allow('', null),
  image_urls: Joi.array().items(Joi.string().uri()).max(5).default([]),
});

const updateStatusSchema = Joi.object({
  new_status: Joi.string().valid(
    'SUBMITTED', 'VERIFIED', 'REJECTED', 'ASSIGNED',
    'IN_PROGRESS', 'RESOLVED', 'NOT_SATISFIED'
  ).required(),
  note: Joi.string().max(500).allow('', null),
});

const nearbyQuerySchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().min(100).max(50000).default(5000),
  category: Joi.string().valid(
    'POTHOLE', 'STREETLIGHT', 'SEWAGE', 'GARBAGE', 'WATER_SUPPLY', 
    'ROAD_DAMAGE', 'ENCROACHMENT', 'STRAY_ANIMALS', 'DEAD_ANIMAL', 
    'PUBLIC_TOILET', 'DRAIN_BLOCKAGE', 'FALLEN_TREE', 'ABANDONED_VEHICLE', 
    'AIR_POLLUTION', 'OTHER'
  ).optional(), 
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a readable short ID (e.g., ISS-2025-A7F3B1) using crypto for collision resistance */
function generateShortId() {
  const year = new Date().getFullYear();
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase(); // 16.7M unique values
  return `ISS-${year}-${randomStr}`;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/issues
 * Creates a new issue report with location and up to 5 images.
 */
const createIssue = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { error, value } = createIssueSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { category, department, description, lat, lng, address, image_urls } = value;
    const reporter_id = req.user.id;
    const short_id = generateShortId();

    // Resolve AI-assigned department name to department_id (if provided)
    let department_id = null;
    if (department) {
      const deptResult = await client.query(
        'SELECT id FROM departments WHERE name = $1 AND deleted_at IS NULL',
        [department]
      );
      if (deptResult.rows.length > 0) {
        department_id = deptResult.rows[0].id;
      }
    }

    await client.query('BEGIN'); // Start transaction

    // Dedup: Acquire advisory lock for this category + grid cell
    const lockKey = computeLockKey(category, lat, lng);
    await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

    // Dedup: Find best merge candidate (same category, nearby, open, not self-reported, not already watching)
    const candidateResult = await client.query(
      `SELECT id, short_id, report_count, priority_score
       FROM issues
       WHERE category = $1
         AND status IN ('SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'NOT_SATISFIED')
         AND reporter_id != $2
         AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5)
         AND id NOT IN (SELECT issue_id FROM watchers WHERE user_id = $2)
       ORDER BY report_count DESC, ST_Distance(location, ST_SetSRID(ST_MakePoint($3, $4), 4326)) ASC
       LIMIT 1`,
      [category, reporter_id, lng, lat, DEDUP_RADIUS_METRES]
    );
    const candidate = candidateResult.rows[0] || null;

    if (candidate) {
      // MERGE BRANCH: Merge into existing issue

      // 1. Update report_count and priority_score
      await client.query(
        `UPDATE issues SET report_count = report_count + 1, priority_score = priority_score + $1, updated_at = NOW() WHERE id = $2`,
        [DEDUP_PRIORITY_BOOST, candidate.id]
      );

      // 2. Insert submitted images linked to existing issue
      if (image_urls && image_urls.length > 0) {
        for (let url of image_urls) {
          await client.query(
            `INSERT INTO issue_images (issue_id, uploader_id, image_url, image_type)
             VALUES ($1, $2, $3, 'REPORT')`,
            [candidate.id, reporter_id, url]
          );
        }
      }

      // 3. Add submitter to watchers
      await client.query(
        `INSERT INTO watchers (issue_id, user_id) VALUES ($1, $2) ON CONFLICT (issue_id, user_id) DO NOTHING`,
        [candidate.id, reporter_id]
      );

      await client.query('COMMIT');

      return res.status(200).json({
        merged: true,
        message: 'Your report has been merged with an existing tracked issue. Its priority has been boosted.',
        issue: { id: candidate.id, short_id: candidate.short_id },
        report_count: candidate.report_count + 1
      });
    } else {
      // NEW ISSUE BRANCH: Create a new issue record

      // 1. Insert main issue record
      const issueResult = await client.query(
        `INSERT INTO issues (short_id, reporter_id, category, description, location, address, priority_score, department_id)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, 0, $8)
         RETURNING id, short_id`,
        [short_id, reporter_id, category, description, lng, lat, address, department_id]
      );
      
      const newIssueId = issueResult.rows[0].id;

      // 2. Insert uploaded images into dependent table
      if (image_urls && image_urls.length > 0) {
        for (let url of image_urls) {
          await client.query(
            `INSERT INTO issue_images (issue_id, uploader_id, image_url, image_type)
             VALUES ($1, $2, $3, 'REPORT')`,
            [newIssueId, reporter_id, url]
          );
        }
      }

      // 3. AUTO-WATCH: Automatically add the reporter to the watchers table 
      // We use ON CONFLICT DO NOTHING just as a safe database practice
      await client.query(
        `INSERT INTO watchers (issue_id, user_id) 
         VALUES ($1, $2)
         ON CONFLICT (issue_id, user_id) DO NOTHING`,
        [newIssueId, reporter_id]
      );

      await client.query('COMMIT'); // Save transaction

      res.status(201).json({
        merged: false,
        message: 'Issue reported successfully. You are now watching this issue for updates.',
        issue: { id: newIssueId, short_id: issueResult.rows[0].short_id }
      });
    }

  } catch (err) {
    await client.query('ROLLBACK'); // Undo if error occurs
    console.error('[createIssue]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to report issue.' });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/issues/:id/status
 * Updates issue status and logs it in the immutable audit trail.
 * BUG FIX: Added client.release() + ROLLBACK before early 404/400 returns
 *          to avoid leaking a pool connection.
 */
const updateIssueStatus = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { new_status, note } = value;
    const changed_by = req.user.id; // Admin or Field Worker ID

    await client.query('BEGIN');

    // 1. Get current status
    const currentIssue = await client.query('SELECT status FROM issues WHERE id = $1', [id]);
    if (currentIssue.rows.length === 0) {
      // BUG FIX: Must ROLLBACK and release before returning early inside a transaction
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ISSUE_NOT_FOUND', message: 'Issue not found.' });
    }
    
    const old_status = currentIssue.rows[0].status;
    if (old_status === new_status) {
      // BUG FIX: Must ROLLBACK and release before returning early inside a transaction
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'Status is already set to this value.' });
    }

    // 2. Update issue status
    await client.query(
      `UPDATE issues SET status = $1, updated_at = NOW() WHERE id = $2`,
      [new_status, id]
    );

    // 3. Log to audit trail
    await client.query(
      `INSERT INTO audit_logs (issue_id, from_status, to_status, changed_by, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, old_status, new_status, changed_by, note]
    );

    await client.query('COMMIT');

    res.status(200).json({
      message: `Status successfully updated to ${new_status}.`
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[updateIssueStatus]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to update status.' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/issues/nearby
 * Fetches nearby issues using PostGIS spatial querying.
 * When an authenticated user calls this endpoint, each issue includes:
 *   - is_watching  {boolean} — true if the user is in the watchers table for this issue
 *   - is_reporter  {boolean} — true if the user is the original reporter
 */
const getNearbyIssues = async (req, res) => {
  try {
    const { error, value } = nearbyQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { lat, lng, radius, category } = value;
    const userId = req.user?.id ?? null;   // null when unauthenticated

    // Build the base query and parameters
    let queryStr = `
      SELECT
          i.id, i.short_id, i.category, i.description, i.status,
          i.priority_score, i.address, i.report_count, i.created_at,
          i.reporter_id,
          u.name AS reporter_name,
          ST_AsGeoJSON(i.location)::json AS geo_location,
          COALESCE(
            (
              SELECT json_agg(image_url)
              FROM issue_images
              WHERE issue_id = i.id AND image_type = 'REPORT'
            ),
            '[]'::json
          ) AS image_urls,
          ${userId
            ? `EXISTS (SELECT 1 FROM watchers WHERE issue_id = i.id AND user_id = $4) AS is_watching,
               (i.reporter_id = $4) AS is_reporter`
            : `FALSE AS is_watching,
               FALSE AS is_reporter`
          }
       FROM issues i
       LEFT JOIN users u ON i.reporter_id = u.id
       WHERE ST_DWithin(
          i.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
       )
       AND i.status NOT IN ('RESOLVED', 'REJECTED')
    `;

    const queryParams = [lng, lat, radius];
    if (userId) queryParams.push(userId);   // $4

    if (category) {
      queryParams.push(category);
      queryStr += ` AND i.category = $${queryParams.length}`;
    }

    queryStr += ` ORDER BY ST_Distance(i.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) ASC;`;

    const result = await pool.query(queryStr, queryParams);

    res.status(200).json({
      message: 'Nearby issues retrieved.',
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error('[getNearbyIssues]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch nearby issues.' });
  }
};

/**
 * POST /api/issues/:id/watch
 * Adds the authenticated user to the watchers list for an issue.
 */
const watchIssue = async (req, res) => {
  try {
    const issue_id = req.params.id;
    const user_id = req.user.id;

    // 1. Verify the issue actually exists first
    const issueCheck = await pool.query('SELECT id FROM issues WHERE id = $1', [issue_id]);
    if (issueCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ISSUE_NOT_FOUND', message: 'Issue not found.' });
    }

    // 2. Insert into the watchers table securely
    // 'ON CONFLICT' gracefully handles if they are already watching it
    const result = await pool.query(
      `INSERT INTO watchers (issue_id, user_id) 
       VALUES ($1, $2) 
       ON CONFLICT (issue_id, user_id) DO NOTHING 
       RETURNING *`,
      [issue_id, user_id]
    );

    // If rows.length is 0, the ON CONFLICT clause triggered (already watching)
    if (result.rows.length === 0) {
      return res.status(200).json({ 
        message: 'You are already watching this issue.' 
      });
    }

    res.status(201).json({
      message: 'You are now watching this issue. You will be notified of updates.'
    });

  } catch (err) {
    console.error('[watchIssue]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to watch issue.' });
  }
};

/**
 * DELETE /api/issues/:id/watch
 * Removes the authenticated user from the watchers list.
 */
const unwatchIssue = async (req, res) => {
  try {
    const issue_id = req.params.id;
    const user_id = req.user.id;

    const result = await pool.query(
      `DELETE FROM watchers 
       WHERE issue_id = $1 AND user_id = $2 
       RETURNING *`,
      [issue_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ 
        error: 'NOT_WATCHING', 
        message: 'You are not currently watching this issue.' 
      });
    }

    res.status(200).json({
      message: 'You have stopped watching this issue.'
    });

  } catch (err) {
    console.error('[unwatchIssue]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to unwatch issue.' });
  }
};

/**
 * GET /api/issues/mine
 * Returns all issues the authenticated user is watching (includes reported + merged).
 */
const getMyIssues = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT 
        i.id, i.short_id, i.category, i.description, i.status, 
        i.address, i.priority_score, i.report_count, i.created_at, i.updated_at,
        (
          SELECT image_url FROM issue_images 
          WHERE issue_id = i.id AND image_type = 'REPORT' 
          ORDER BY uploaded_at LIMIT 1
        ) as thumbnail,
        COALESCE(
          (
            SELECT json_agg(image_url) 
            FROM issue_images 
            WHERE issue_id = i.id AND image_type = 'REPORT'
          ),
          '[]'::json
        ) AS image_urls
      FROM issues i
      INNER JOIN watchers w ON w.issue_id = i.id
      WHERE w.user_id = $1
      ORDER BY i.updated_at DESC`,
      [user_id]
    );

    res.status(200).json({
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error('[getMyIssues]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch your issues.' });
  }
};

/**
 * GET /api/issues/upvoted
 * Returns issues the authenticated user has upvoted (watching but did NOT report).
 * Excludes issues where the user is the original reporter — those are in "My Complaints".
 */
const getUpvotedIssues = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT
        i.id, i.short_id, i.category, i.description, i.status,
        i.address, i.priority_score, i.report_count, i.created_at, i.updated_at,
        (
          SELECT image_url FROM issue_images
          WHERE issue_id = i.id AND image_type = 'REPORT'
          ORDER BY uploaded_at LIMIT 1
        ) AS thumbnail,
        COALESCE(
          (
            SELECT json_agg(image_url)
            FROM issue_images
            WHERE issue_id = i.id AND image_type = 'REPORT'
          ),
          '[]'::json
        ) AS image_urls
      FROM issues i
      INNER JOIN watchers w ON w.issue_id = i.id
      WHERE w.user_id = $1
        AND i.reporter_id != $1
      ORDER BY i.updated_at DESC`,
      [user_id]
    );

    res.status(200).json({
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error('[getUpvotedIssues]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch upvoted issues.' });
  }
};

/**
 * POST /api/issues/:id/me-too
 * Allows a citizen to endorse an existing issue ("Me too"), boosting its priority.
 *
 * Location-aware validation:
 *   - If user is already a watcher → allowed (they've previously proven involvement)
 *   - Otherwise, user must provide GPS coords (X-User-Lat, X-User-Lng headers)
 *     and be within 500m of the issue to endorse it.
 */
const ENDORSE_RADIUS_METRES = 20000;

/**
 * GET /api/issues/public-stats
 * Public aggregate counts for the landing page.
 */
const getPublicIssueStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_issues,
        COUNT(*) FILTER (WHERE status IN ('ASSIGNED', 'IN_PROGRESS')) AS assigned_active,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved_issues,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED') AS submitted_pending,
        COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected_issues
      FROM issues
    `);

    const row = result.rows[0] || {};

    res.status(200).json({
      total_issues: Number(row.total_issues || 0),
      assigned_active: Number(row.assigned_active || 0),
      resolved_issues: Number(row.resolved_issues || 0),
      submitted_pending: Number(row.submitted_pending || 0),
      rejected_issues: Number(row.rejected_issues || 0),
    });
  } catch (err) {
    console.error('[getPublicIssueStats]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch public stats.' });
  }
};

const meToo = async (req, res) => {
  const issue_id = req.params.id;
  const user_id = req.user.id;

  // Parse optional location from headers
  const userLat = parseFloat(req.headers['x-user-lat']);
  const userLng = parseFloat(req.headers['x-user-lng']);
  const hasLocation = !isNaN(userLat) && !isNaN(userLng);

  // 1. Check issue exists and is open (PK lookup — O(1))
  const issueCheck = await pool.query(
    'SELECT id, reporter_id, status, report_count, priority_score FROM issues WHERE id = $1',
    [issue_id]
  );
  if (issueCheck.rows.length === 0) {
    return res.status(404).json({ error: 'ISSUE_NOT_FOUND', message: 'Issue not found.' });
  }

  const issue = issueCheck.rows[0];

  // 2. Check if issue is closed/rejected/resolved
  if (['REJECTED', 'RESOLVED', 'NOT_SATISFIED'].includes(issue.status)) {
    return res.status(400).json({ error: 'ISSUE_CLOSED', message: 'This issue is no longer accepting endorsements.' });
  }

  // 3. Check if user is the original reporter
  if (issue.reporter_id === user_id) {
    return res.status(400).json({ error: 'SELF_ENDORSE', message: 'You cannot endorse your own issue.' });
  }

  // 4. Check if user is already a watcher (composite PK index — O(1))
  const watcherCheck = await pool.query(
    'SELECT 1 FROM watchers WHERE issue_id = $1 AND user_id = $2',
    [issue_id, user_id]
  );
  if (watcherCheck.rows.length > 0) {
    return res.status(200).json({
      message: 'You have already endorsed this issue.',
      report_count: issue.report_count,
      already_endorsed: true,
    });
  }

  // 5. Proximity validation — user must be within 500m of the issue
  if (!hasLocation) {
    return res.status(400).json({
      error: 'LOCATION_REQUIRED',
      message: 'Location access is required to endorse issues near you. Please enable GPS.'
    });
  }

  const proximityCheck = await pool.query(
    `SELECT 1 FROM issues
     WHERE id = $1
       AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)`,
    [issue_id, userLng, userLat, ENDORSE_RADIUS_METRES]
  );

  if (proximityCheck.rows.length === 0) {
    return res.status(403).json({
      error: 'TOO_FAR',
      message: 'You must be within 500m of this issue to endorse it.'
    });
  }

  // 6. All checks pass — execute endorsement in transaction
  //    Insert watcher FIRST, use RETURNING to detect if genuinely new.
  //    Only increment counts if the insert actually added a row.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Attempt watcher insert — RETURNING tells us if it was new
    const insertResult = await client.query(
      `INSERT INTO watchers (issue_id, user_id) VALUES ($1, $2)
       ON CONFLICT (issue_id, user_id) DO NOTHING
       RETURNING issue_id`,
      [issue_id, user_id]
    );

    // If no row returned → user was already a watcher (caught race condition)
    if (insertResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(200).json({
        message: 'You have already endorsed this issue.',
        report_count: issue.report_count,
        already_endorsed: true,
      });
    }

    // Watcher was genuinely new — safe to increment counts
    const updated = await client.query(
      `UPDATE issues SET report_count = report_count + 1, priority_score = priority_score + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING report_count, priority_score`,
      [DEDUP_PRIORITY_BOOST, issue_id]
    );

    await client.query('COMMIT');

    res.status(200).json({
      message: "Thanks! You've endorsed this issue. Its priority has been boosted.",
      report_count: updated.rows[0].report_count,
      priority_score: parseFloat(updated.rows[0].priority_score),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[meToo]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to endorse issue.' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/issues/viewport
 * Returns issues within the map's visible bounding box.
 * When an authenticated user calls this endpoint, each issue includes:
 *   - is_watching  {boolean} — true if the user is in the watchers table for this issue
 *   - is_reporter  {boolean} — true if the user is the original reporter
 * Uses the && operator with ST_MakeEnvelope for pure GIST index scan.
 */
const viewportSchema = Joi.object({
  sw_lng: Joi.number().min(-180).max(180).required(),
  sw_lat: Joi.number().min(-90).max(90).required(),
  ne_lng: Joi.number().min(-180).max(180).required(),
  ne_lat: Joi.number().min(-90).max(90).required(),
});

const getViewportIssues = async (req, res) => {
  try {
    const { error, value } = viewportSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { sw_lng, sw_lat, ne_lng, ne_lat } = value;
    const userId = req.user?.id ?? null;

    const result = await pool.query(
      `SELECT
        i.id, i.short_id, i.category, i.status, i.report_count,
        i.priority_score, i.address, i.description, i.reporter_id,
        ST_X(i.location::geometry) AS lng,
        ST_Y(i.location::geometry) AS lat,
        (
          SELECT image_url FROM issue_images
          WHERE issue_id = i.id AND image_type = 'REPORT'
          ORDER BY uploaded_at LIMIT 1
        ) AS thumbnail,
        ${userId
          ? `EXISTS (SELECT 1 FROM watchers WHERE issue_id = i.id AND user_id = $5) AS is_watching,
             (i.reporter_id = $5) AS is_reporter`
          : `FALSE AS is_watching,
             FALSE AS is_reporter`
        }
      FROM issues i
      WHERE i.location::geometry && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        AND i.status NOT IN ('RESOLVED', 'REJECTED')
      ORDER BY i.priority_score DESC
      LIMIT 500`,
      userId ? [sw_lng, sw_lat, ne_lng, ne_lat, userId] : [sw_lng, sw_lat, ne_lng, ne_lat]
    );

    res.status(200).json({
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error('[getViewportIssues]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch viewport issues.' });
  }
};

/**
 * GET /api/issues/:id/audit-logs
 * Retrieves the status trail history for an issue.
 */
const getIssueAuditLogs = async (req, res) => {
  try {
    const issue_id = req.params.id;

    // Verify issue exists first
    const issueCheck = await pool.query('SELECT id FROM issues WHERE id = $1', [issue_id]);
    if (issueCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ISSUE_NOT_FOUND', message: 'Issue not found.' });
    }

    const audit = await pool.query(
      `SELECT a.id, a.from_status, a.to_status, a.note, a.created_at, u.name AS changed_by_name
       FROM audit_logs a
       LEFT JOIN users u ON a.changed_by = u.id
       WHERE a.issue_id = $1
       ORDER BY a.created_at ASC`,
      [issue_id]
    );

    res.status(200).json({
      data: audit.rows
    });
  } catch (err) {
    console.error('[getIssueAuditLogs]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch audit logs.' });
  }
};

module.exports = { createIssue, updateIssueStatus, getPublicIssueStats, getNearbyIssues, getMyIssues, getUpvotedIssues, getViewportIssues, watchIssue, unwatchIssue, meToo, getIssueAuditLogs };