/**
 * roleGuard.js
 * Factory middleware — restricts a route to specific roles.
 *
 * Usage:
 *   router.get('/admin', auth, roleGuard('ADMIN', 'SUPER_ADMIN'), handler)
 */
const roleGuard = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
    });
  }

  next();
};

module.exports = roleGuard;
