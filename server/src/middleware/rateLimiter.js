const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter — 100 requests per 15 minutes per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests from this IP. Try again in 15 minutes.',
  },
});

/**
 * Strict limiter for auth endpoints — 10 requests per 15 minutes.
 * Prevents brute-force login/register attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many auth attempts. Try again in 15 minutes.',
  },
});

/**
 * OTP limiter — 5 OTP sends per hour per IP.
 */
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many OTP requests. Try again in an hour.',
  },
});

module.exports = { apiLimiter, authLimiter, otpLimiter };
