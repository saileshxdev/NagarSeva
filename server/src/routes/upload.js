/**
 * routes/upload.js
 *
 * Endpoints:
 *   GET /api/upload/signature — generate a secure Cloudinary upload signature (authenticated)
 */
const express  = require('express');
const auth     = require('../middleware/auth');
const { getUploadSignature } = require('../controller/upload');

const router = express.Router();

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/upload/signature
 * Only authenticated users (citizens, field workers) may request a signature.
 */
router.get('/signature', auth, getUploadSignature);

module.exports = router;