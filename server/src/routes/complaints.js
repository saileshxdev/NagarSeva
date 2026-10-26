/**
 * src/routes/complaints.js
 *
 * POST /api/complaints/analyze  — AI image analysis (auth required)
 */
const express = require('express');
const auth = require('../middleware/auth');
const { analyze } = require('../controller/complaints');

const router = express.Router();

// All complaint routes require a valid JWT (citizen must be logged in)
router.use(auth);

/**
 * POST /api/complaints/analyze
 * Analyse a complaint image with AI (Groq/Qwen 3.6 27B) and return structured data.
 */
router.post('/analyze', analyze);

module.exports = router;
