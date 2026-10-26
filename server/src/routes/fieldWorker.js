/**
 * routes/fieldWorker.js
 *
 * All routes require auth + FIELD_WORKER role.
 */
const express    = require('express');
const auth       = require('../middleware/auth');
const roleGuard  = require('../middleware/roleGuard');
const {
  getActiveIssues,
  getResolvedIssues,
  getIssueDetail,
  startIssue,
  resolveIssue,
} = require('../controller/fieldWorker');

const router = express.Router();

// All routes require FIELD_WORKER
router.use(auth, roleGuard('FIELD_WORKER'));

// Issue queues
router.get('/issues',          getActiveIssues);
router.get('/issues/resolved', getResolvedIssues);

// Issue detail
router.get('/issues/:id', getIssueDetail);

// Status transitions
router.patch('/issues/:id/start',   startIssue);
router.patch('/issues/:id/resolve', resolveIssue);

module.exports = router;
