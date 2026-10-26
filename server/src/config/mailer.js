/**
 * src/config/mailer.js
 *
 * Email sending abstraction. Uses Resend API in production (works on Render/Railway
 * where SMTP ports are blocked), falls back to Nodemailer SMTP for local dev.
 */
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Nodemailer fallback for local development
let nodemailerTransport = null;
if (!resend && process.env.SMTP_HOST) {
  const nodemailer = require('nodemailer');
  nodemailerTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  });

  nodemailerTransport.verify()
    .then(() => console.log('✅ SMTP connection verified'))
    .catch((err) => console.warn(`⚠️ SMTP failed: ${err.message}`));
}

if (resend) {
  console.log('✅ Email: using Resend API');
} else if (nodemailerTransport) {
  console.log('✅ Email: using Nodemailer SMTP');
} else {
  console.warn('⚠️ No email provider configured (set RESEND_API_KEY or SMTP_HOST)');
}

/**
 * Send a 6-digit OTP to the given email.
 */
async function sendOtpEmail(email, otp, type) {
  const subject =
    type === 'VERIFY_EMAIL'
      ? '✅ Verify your NagarSeva account'
      : '🔐 NagarSeva — Reset your password';

  const html = buildOtpHtml(otp, type);

  if (resend) {
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'NagarSeva <onboarding@resend.dev>',
      to: email,
      subject,
      html,
    });
  } else if (nodemailerTransport) {
    await nodemailerTransport.sendMail({
      from: process.env.SMTP_FROM || 'noreply@nagarseva.in',
      to: email,
      subject,
      html,
    });
  } else {
    console.warn(`[mailer] No provider — OTP for ${email}: ${otp}`);
  }
}

function buildOtpHtml(otp, type) {
  const title = type === 'VERIFY_EMAIL' ? 'Email Verification' : 'Password Reset';
  const message = type === 'VERIFY_EMAIL'
    ? 'Enter this code to verify your NagarSeva account:'
    : 'Enter this code to reset your password:';

  return `
    <div style="font-family:'Inter',Arial,sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#f1f5f9;padding:40px 32px;border-radius:16px;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="color:#38bdf8;font-size:28px;margin:0;">🏙️ NagarSeva</h1>
        <p style="color:#64748b;margin:4px 0 0;">${title}</p>
      </div>
      <p style="color:#94a3b8;font-size:15px;line-height:1.6;">${message}</p>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
        <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#38bdf8;font-family:monospace;">${otp}</span>
      </div>
      <p style="color:#64748b;font-size:13px;text-align:center;">
        This code expires in <strong style="color:#94a3b8;">${process.env.OTP_EXPIRY_MINUTES || 10} minutes</strong>.
        <br>Do not share it with anyone.
      </p>
    </div>
  `;
}

module.exports = { sendOtpEmail };
