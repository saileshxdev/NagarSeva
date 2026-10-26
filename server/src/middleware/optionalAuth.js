const jwt = require('jsonwebtoken');

/**
 * Optional auth middleware.
 * Attaches req.user if a valid JWT is present — does NOT block the request if absent.
 * Used on public routes that want to personalise the response for logged-in users.
 */
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // Invalid / expired token — treat as unauthenticated, don't block
  }
  next();
};

module.exports = optionalAuth;
