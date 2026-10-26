const jwt = require('jsonwebtoken');

/**
 * Auth middleware — verifies JWT access token on every protected route.
 * Attaches decoded user payload to req.user.
 */
const auth = (req, res, next) => {
  // Look for 'token' to match what you set in your login controller
  const token = req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Token not found. Please log in.'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;   // { id, email, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'Access token expired — please log in again.',
      });
    }
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Access token is invalid.',
    });
  }
};

module.exports = auth;