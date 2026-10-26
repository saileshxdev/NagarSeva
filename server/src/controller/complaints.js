/**
 * src/controller/complaints.js
 *
 * Handles complaint-related API logic.
 * Current scope: AI analysis only — no DB persistence yet.
 */
const { analyzeComplaint } = require('../config/ai');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/complaints/analyze
 *
 * Accepts either:
 *   Single image (legacy):
 *     imageBase64  {string}
 *     mimeType     {string}
 *
 *   Multiple images:
 *     images       {Array<{ imageBase64, mimeType }>}
 *
 * Common optional fields:
 *   description  {string}
 *   location     {object} — { lat, lng, address }
 *
 * Returns: the structured AI analysis JSON.
 */
const analyze = asyncHandler(async (req, res) => {
  const { imageBase64, mimeType, images, description, location } = req.body;

  // Normalize to array of images
  let imageList = [];

  if (Array.isArray(images) && images.length > 0) {
    imageList = images;
  } else if (imageBase64 && typeof imageBase64 === 'string') {
    imageList = [{ imageBase64, mimeType }];
  }

  if (imageList.length === 0) {
    return res.status(400).json({ error: 'MISSING_IMAGE', message: 'At least one image is required.' });
  }

  // Validate each image
  for (let i = 0; i < imageList.length; i++) {
    const img = imageList[i];
    if (!img.imageBase64 || typeof img.imageBase64 !== 'string') {
      return res.status(400).json({ error: 'INVALID_IMAGE', message: `Image ${i + 1} has invalid base64 data.` });
    }
    if (!img.mimeType || !img.mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'INVALID_MIME', message: `Image ${i + 1} has an invalid mimeType.` });
    }
    if (img.imageBase64.length > 14_000_000) {
      return res.status(413).json({ error: 'IMAGE_TOO_LARGE', message: `Image ${i + 1} exceeds the 10MB limit.` });
    }
  }

  // Cap at 5 images
  if (imageList.length > 5) {
    imageList = imageList.slice(0, 5);
  }

  try {
    const result = await analyzeComplaint(
      imageList,
      description || '',
      location || null
    );

    return res.status(200).json(result);
  } catch (err) {
    console.error('[complaints/analyze] AI error:', err.message);

    if (err.code === 'AI_RATE_LIMITED') {
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'AI service is busy. Please try again shortly.' });
    }

    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'AI analysis is temporarily unavailable. Please try again in a moment.' });
  }
});

module.exports = { analyze };
