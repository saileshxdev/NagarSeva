/**
 * routes/admin.js
 *
 * Department Admin routes — all require ADMIN role.
 */
const express   = require('express');
const auth      = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const {
  getDepartmentQueue,
  getRankedWorkers,
  assignWorker,
  getDeptStats,
  getAdminAnalytics,
  getIssueDetailForAdmin,
  getWorkerIssues
} = require('../controller/admin');

const router = express.Router();

// All routes require auth + ADMIN role
router.use(auth, roleGuard('ADMIN'));

// Stats for this admin's department
router.get('/stats', getDeptStats);

// Analytics charts
router.get('/analytics', getAdminAnalytics);

// Issues assigned to this admin's department (pending allocation)
router.get('/queue', getDepartmentQueue);

// Ranked field workers in this department
router.get('/workers', getRankedWorkers);

// Issues assigned to a specific field worker
router.get('/workers/:workerId/issues', getWorkerIssues);

// Full details of a departmental issue
router.get('/issues/:id/detail', getIssueDetailForAdmin);

// Assign a specific worker to an issue
router.patch('/issues/:id/assign', assignWorker);

module.exports = router;
