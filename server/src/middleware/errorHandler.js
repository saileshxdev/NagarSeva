/**
 * errorHandler.js
 * Centralized Express error handler — must be registered LAST in app.js.
 * All errors thrown inside asyncHandler() land here.
 */
const errorHandler = (err, req, res, next) => {  // eslint-disable-line no-unused-vars
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: err.details[0]?.message || 'Invalid request data',
      fields: err.details.map((d) => ({ field: d.path.join('.'), message: d.message })),
    });
  }

  // PostgreSQL unique violation (e.g., duplicate email)
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'DUPLICATE',
      message: 'A record with this value already exists',
    });
  }

  // Default 500
  res.status(err.status || 500).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Something went wrong',
  });
};

module.exports = errorHandler;
