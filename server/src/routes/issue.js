/**
 * routes/issue.js
 *
 * Endpoints:
 *   POST   /api/issues               — report a new civic issue (citizen)
 *   GET    /api/issues/nearby        — fetch nearby open issues (public)
 *   PATCH  /api/issues/:id/status    — update issue status (admin/staff only)
 *   POST   /api/issues/:id/watch     — watch an issue for updates (citizen)
 *   DELETE /api/issues/:id/watch     — unwatch an issue (citizen)
 */
const express   = require('express');
const auth      = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const roleGuard = require('../middleware/roleGuard');

const {
  createIssue,
  getNearbyIssues,
  getMyIssues,
  getUpvotedIssues,
  getViewportIssues,
  getPublicIssueStats,
  updateIssueStatus,
  watchIssue,
  unwatchIssue,
  meToo,
  getIssueAuditLogs,
} = require('../controller/issue');

const router = express.Router();

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/issues/public-stats
 * Public aggregate counts used by the landing page.
 */
router.get('/public-stats', getPublicIssueStats);

/**
 * GET /api/issues/viewport
 * Optionally authenticated — returns is_watching + is_reporter flags for logged-in users.
 */
router.get('/viewport', optionalAuth, getViewportIssues);

/**
 * GET /api/issues/nearby
 * Optionally authenticated — returns is_watching + is_reporter flags for logged-in users.
 */
router.get('/nearby', optionalAuth, getNearbyIssues);

/**
 * GET /api/issues/mine
 * Authenticated — returns all issues reported by the current user.
 * NOTE: Must be defined before /:id routes.
 */
router.get('/mine', auth, getMyIssues);

/**
 * GET /api/issues/upvoted
 * Authenticated — returns issues the user has upvoted (watched but not reported).
 * NOTE: Must be defined before /:id routes.
 */
router.get('/upvoted', auth, getUpvotedIssues);

/**
 * POST /api/issues
 * Authenticated citizens report a new issue.
 */
router.post('/', auth, createIssue);

/**
 * POST /api/issues/:id/me-too
 * Authenticated citizen endorses an existing issue to boost its priority.
 */
router.post('/:id/me-too', auth, meToo);

/**
 * PATCH /api/issues/:id/status
 * Restricted to ADMIN and FIELD_WORKER roles.
 * Body: { new_status, note? }
 */
router.patch('/:id/status', auth, roleGuard('ADMIN', 'FIELD_WORKER'), updateIssueStatus);

/**
 * POST /api/issues/:id/watch
 * Authenticated user subscribes to updates for an issue.
 */
router.post('/:id/watch', auth, watchIssue);

/**
 * DELETE /api/issues/:id/watch
 * Authenticated user unsubscribes from an issue.
 */
router.delete('/:id/watch', auth, unwatchIssue);

/**
 * GET /api/issues/:id/audit-logs
 * Authenticated user fetches audit logs for an issue.
 */
router.get('/:id/audit-logs', auth, getIssueAuditLogs);

module.exports = router;
