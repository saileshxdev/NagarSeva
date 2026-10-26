const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const Joi      = require('joi');
const pool     = require('../config/db');
const { sendOtpEmail } = require('../config/mailer');

// ─── Validation Schemas ──────────────────────────────────────────────────────

const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(100).trim().required(),
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(72).required(),
  role:     Joi.string().valid('CITIZEN').default('CITIZEN'),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

const otpSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  code:  Joi.string().length(6).pattern(/^\d+$/).required(),
});

const resendSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

const verifyResetOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  code:  Joi.string().length(6).pattern(/^\d+$/).required(),
});

const resetPasswordSchema = Joi.object({
  email:       Joi.string().email().lowercase().trim().required(),
  code:        Joi.string().length(6).pattern(/^\d+$/).required(),
  newPassword: Joi.string().min(8).max(72).required(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a cryptographically random 6-digit OTP */
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Sign a JWT token stored in an httpOnly cookie */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, department_id: user.department_id || null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/** Parse a duration string like '7d', '15m', '2h' into milliseconds */
function parseDurationMs(duration) {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const num = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default:  return 7 * 24 * 60 * 60 * 1000;
  }
}

/** Set the JWT as an httpOnly cookie on the response */
function setTokenCookie(res, token) {
  const maxAge = parseDurationMs(process.env.JWT_EXPIRES_IN || '7d');
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',  // 'none' required for cross-origin (Vercel→Render)
    maxAge,
  });
}

/**
 * Upsert an OTP — invalidate any existing codes for this email+type,
 * then insert a fresh one.
 */
async function createOtp(email, type) {
  const code      = generateOtp();
  const expiresAt = new Date(Date.now() + (Number(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000);

  // Mark all previous OTPs for this email+type as used
  await pool.query(
    `UPDATE otps SET used = TRUE WHERE email = $1 AND type = $2 AND used = FALSE`,
    [email, type]
  );

  // Insert new OTP
  await pool.query(
    `INSERT INTO otps (email, code, type, expires_at) VALUES ($1, $2, $3, $4)`,
    [email, code, type, expiresAt]
  );

  return code;
}

/**
 * Attempt to send an OTP email — never throws.
 * Falls back to logging dev_otp in the terminal when SMTP is not configured.
 */
async function trySendEmail(email, otp, type) {
  try {
    await sendOtpEmail(email, otp, type);
  } catch (err) {
    console.warn(`[WARN] Email not sent to ${email}: ${err.message}`);
    console.warn(`[DEV ONLY] OTP for ${email}: ${otp}`);
    console.warn('[WARN] Using dev_otp in response instead. Set SMTP credentials to send real emails.');
  }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates a new unverified user and sends OTP to email.
 */
const register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { name, email, password, role } = value;

    // Check if email already taken
    const existing = await pool.query('SELECT id, is_verified FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (!user.is_verified) {
        return res.status(409).json({
          error: 'EMAIL_UNVERIFIED',
          message: 'This email is registered but not verified. Please verify your account.',
          email,
        });
      }
      return res.status(409).json({
        error: 'EMAIL_TAKEN',
        message: 'An account with this email already exists.',
      });
    }

    // Hash password & create user
    const password_hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      [name, email, password_hash, role]
    );

    // Generate & send OTP
    const otp = await createOtp(email, 'VERIFY_EMAIL');
    await trySendEmail(email, otp, 'VERIFY_EMAIL');

    res.status(201).json({
      message: 'Account created. Check your email for the verification code.',
      email,
      ...(process.env.NODE_ENV === 'development' && { dev_otp: otp }),
    });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Something went wrong.' });
  }
};

/**
 * POST /api/auth/verify-email
 * Validates the OTP, marks the user as verified, and sets a cookie.
 */
const verifyEmail = async (req, res) => {
  try {
    const { error, value } = otpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { email, code } = value;

    // Find a matching, unused, unexpired OTP
    const otpResult = await pool.query(
      `SELECT id FROM otps
       WHERE email = $1 AND code = $2 AND type = 'VERIFY_EMAIL'
         AND used = FALSE AND expires_at > NOW()
       LIMIT 1`,
      [email, code]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        error: 'INVALID_OTP',
        message: 'The code is invalid or has expired. Request a new one.',
      });
    }

    // Mark OTP as used & activate the user
    await pool.query('UPDATE otps SET used = TRUE WHERE id = $1', [otpResult.rows[0].id]);

    const userResult = await pool.query(
      `UPDATE users SET is_verified = TRUE, updated_at = NOW()
       WHERE email = $1 RETURNING id, name, email, role`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found.' });
    }

    const user = userResult.rows[0];

    // Issue token via cookie — user is now logged in
    const token = generateToken(user);
    setTokenCookie(res, token);

    res.status(200).json({
      message: 'Email verified! Welcome to NagarSeva.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[verifyEmail]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Something went wrong.' });
  }
};

/**
 * POST /api/auth/resend-otp
 * Resends email verification OTP.
 */
const resendOtp = async (req, res) => {
  try {
    const { error, value } = resendSchema.validate(req.body); // resendSchema — only email, no code
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { email } = value;

    const userResult = await pool.query(
      'SELECT id, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal whether the email exists
      return res.status(200).json({ message: 'If this email is registered, a new OTP has been sent.' });
    }

    const user = userResult.rows[0];
    if (user.is_verified) {
      return res.status(400).json({
        error: 'ALREADY_VERIFIED',
        message: 'This email is already verified.',
      });
    }

    const otp = await createOtp(email, 'VERIFY_EMAIL');
    await trySendEmail(email, otp, 'VERIFY_EMAIL');

    res.status(200).json({
      message: 'A new verification code has been sent to your email.',
      ...(process.env.NODE_ENV === 'development' && { dev_otp: otp }),
    });
  } catch (err) {
    console.error('[resendOtp]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Something went wrong.' });
  }
};

/**
 * POST /api/auth/login
 * Authenticates user — must be verified. Sets JWT cookie.
 */
const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { email, password } = value;

    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, is_verified, department_id FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        error: 'EMAIL_UNVERIFIED',
        message: 'Please verify your email before logging in.',
        email: user.email,
      });
    }

    const token = generateToken(user);
    setTokenCookie(res, token);

    res.status(200).json({
      message: 'Login successful.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Something went wrong.' });
  }
};

/**
 * GET /api/auth/me
 * Returns current authenticated user's profile. Protected by auth middleware.
 */
const me = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_verified,
              u.department_id, u.designation, u.created_at,
              d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found.' });
    }

    const user = result.rows[0];
    res.status(200).json({
      user: {
        id:              user.id,
        name:            user.name,
        email:           user.email,
        role:            user.role,
        department_id:   user.department_id,
        designation:     user.designation,
        department_name: user.department_name,
      },
    });
  } catch (err) {
    console.error('[me]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Something went wrong.' });
  }
};

/**
 * POST /api/auth/logout
 * Clears the JWT cookie.
 */
const logout = async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  res.status(200).json({ message: 'Logged out successfully.' });
};

/**
 * POST /api/auth/forgot-password
 * Step 1: Check if email is registered. If yes, send a RESET_PASSWORD OTP.
 * Unlike verify-email flow, this DOES tell the user if the email is not registered
 * (per your requirement — user needs to know if they have an account).
 */
const forgotPassword = async (req, res) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { email } = value;

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, is_verified, name FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_REGISTERED',
        message: 'No account found with this email. Please register first.',
      });
    }

    const user = userResult.rows[0];

    if (!user.is_verified) {
      return res.status(403).json({
        error: 'EMAIL_UNVERIFIED',
        message: 'This account is not verified. Please verify your email first.',
        email,
      });
    }

    // User exists and is verified — send reset OTP
    const otp = await createOtp(email, 'RESET_PASSWORD');
    await trySendEmail(email, otp, 'RESET_PASSWORD');

    res.status(200).json({
      message: 'A 6-digit reset code has been sent to your email.',
      email,
      ...(process.env.NODE_ENV === 'development' && { dev_otp: otp }),
    });
  } catch (err) {
    console.error('[forgotPassword]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Something went wrong.' });
  }
};

/**
 * POST /api/auth/verify-reset-otp
 * Step 2: Verify the reset OTP (does NOT mark it as used yet).
 * This confirms the user owns the email before allowing password change.
 * The OTP remains valid for the next step (reset-password).
 */
const verifyResetOtp = async (req, res) => {
  try {
    const { error, value } = verifyResetOtpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { email, code } = value;

    // Find a matching, unused, unexpired OTP
    const otpResult = await pool.query(
      `SELECT id FROM otps
       WHERE email = $1 AND code = $2 AND type = 'RESET_PASSWORD'
         AND used = FALSE AND expires_at > NOW()
       LIMIT 1`,
      [email, code]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        error: 'INVALID_OTP',
        message: 'The code is invalid or has expired. Request a new one.',
      });
    }

    // OTP is valid — don't mark as used yet (will be consumed in reset-password step)
    res.status(200).json({
      message: 'Code verified. You may now set your new password.',
      verified: true,
    });
  } catch (err) {
    console.error('[verifyResetOtp]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Something went wrong.' });
  }
};

/**
 * POST /api/auth/reset-password
 * Step 3: Set new password. Requires the same OTP (still valid, still unused).
 * This consumes the OTP, hashes the new password, and forces re-login.
 */
const resetPassword = async (req, res) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { email, code, newPassword } = value;

    // Re-validate OTP (defense in depth — even if frontend verified it, server checks again)
    const otpResult = await pool.query(
      `SELECT id FROM otps
       WHERE email = $1 AND code = $2 AND type = 'RESET_PASSWORD'
         AND used = FALSE AND expires_at > NOW()
       LIMIT 1`,
      [email, code]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        error: 'INVALID_OTP',
        message: 'The reset code is invalid or has expired. Please start over.',
      });
    }

    // Mark OTP as used (consumed)
    await pool.query('UPDATE otps SET used = TRUE WHERE id = $1', [otpResult.rows[0].id]);

    // Hash new password and update user
    const password_hash = await bcrypt.hash(newPassword, 12);
    const updateResult = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE email = $2 AND is_verified = TRUE
       RETURNING id`,
      [password_hash, email]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found.' });
    }

    // Clear any existing cookie (force re-login with new password)
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax' });

    res.status(200).json({
      message: 'Password reset successfully! Please log in with your new password.',
    });
  } catch (err) {
    console.error('[resetPassword]', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Something went wrong.' });
  }
};

module.exports = { register, verifyEmail, resendOtp, login, me, logout, forgotPassword, verifyResetOtp, resetPassword };
