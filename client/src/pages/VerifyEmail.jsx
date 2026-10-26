import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuth } from '../slices/authSlice';
import { verifyEmail as verifyEmailAPI, resendOtp, checkAuth } from '../services/Operations/authAPI';

const OTP_LENGTH      = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyEmail() {
  const dispatch     = useDispatch();
  const navigate     = useNavigate();
  const location     = useLocation();

  const emailFromState = location.state?.email || '';
  const fromLogin      = location.state?.fromLogin || false;

  const [email, setEmail]           = useState(emailFromState);
  const [digits, setDigits]         = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading]       = useState(false);
  const [resending, setResending]   = useState(false);
  const [countdown, setCountdown]   = useState(RESEND_COOLDOWN);
  const [serverErr, setServerErr]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [digitsError, setDigitsError] = useState(false);

  const inputsRef = useRef([]);
  const timerRef  = useRef(null);

  // ── Auto-send OTP when arriving from register redirect (409 EMAIL_UNVERIFIED) ──
  const hasSentRef = useRef(false);
  useEffect(() => {
    if (fromLogin && email && !hasSentRef.current) {
      hasSentRef.current = true;
      resendOtp(email).catch(() => {});
    }
  }, [fromLogin, email]);

  // ── Countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(timerRef.current); return 0; } return c - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    setCountdown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(timerRef.current); return 0; } return c - 1; });
    }, 1000);
  };

  // ── Digit input handlers ───────────────────────────────────────────────
  function handleDigitChange(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...digits];
    next[index] = digit;
    setDigits(next);
    setDigitsError(false);
    setServerErr('');
    if (digit && index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
    if (next.every((d) => d !== '') && digit) submitOtp(next.join(''));
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputsRef.current[index - 1]?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      setDigits(pasted.split(''));
      inputsRef.current[OTP_LENGTH - 1]?.focus();
      submitOtp(pasted);
    }
  }

  // ── Verify ─────────────────────────────────────────────────────────────
  const submitOtp = useCallback(async (code) => {
    if (!email || code.length !== OTP_LENGTH) return;
    setLoading(true);
    setServerErr('');
    try {
      // Backend sets cookie & returns { message, user }
      const data = await verifyEmailAPI(email, code);
      dispatch(setAuth(data.user));
      navigate('/', { replace: true });
    } catch (err) {
      setDigitsError(true);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
      setServerErr(err.data?.message || 'Invalid or expired code. Try again.');
    } finally {
      setLoading(false);
    }
  }, [email, dispatch, navigate]);

  function handleManualSubmit(e) {
    e.preventDefault();
    submitOtp(digits.join(''));
  }

  // ── Resend ─────────────────────────────────────────────────────────────
  async function handleResend() {
    if (countdown > 0 || resending) return;
    setResending(true);
    setServerErr('');
    try {
      await resendOtp(email);
      setSuccessMsg('A new code has been sent to your email.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
      resetTimer();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setServerErr(err.data?.message || 'Failed to resend. Try again.');
    } finally {
      setResending(false);
    }
  }

  const isFilled = digits.join('').length === OTP_LENGTH;

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2" style={{ background: 'var(--color-base)' }}>

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex flex-col items-center justify-center px-12 py-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0c1a3a 50%, #0f2654 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(56,189,248,0.10) 0%, transparent 60%)' }} />

        <div className="relative z-10 text-center mb-12">
          <div className="text-6xl mb-4" style={{ filter: 'drop-shadow(0 0 24px rgba(56,189,248,0.4))' }}>🏙️</div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
            Nagar<span style={{ color: 'var(--color-accent)' }}>Seva</span>
          </h1>
          <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: 'var(--color-secondary)' }}>
            One more step — verify your email to activate your account.
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-3 w-full max-w-sm">
          {[
            { icon: '🔒', title: 'Secure Verification',   desc: '6-digit code sent to your email' },
            { icon: '⏱️', title: 'Code Expires in 10 min', desc: 'Request a new one if it expires' },
            { icon: '📬', title: 'Check Spam Folder',     desc: 'Sometimes it ends up there' },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-4 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-2xl shrink-0">{f.icon}</span>
              <div>
                <strong className="block text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{f.title}</strong>
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-14">
        <div className="w-full max-w-sm">

          {/* Step indicator */}
          <div className="flex gap-2 mb-8">
            <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--color-success)' }} />
            <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--color-accent)' }} />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
              Verify your email
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-secondary)' }}>
              {fromLogin ? "Your account needs verification. We've " : "We've "}sent a 6-digit code to{' '}
              <strong style={{ color: 'var(--color-accent)' }}>{email || 'your email'}</strong>
            </p>
          </div>

          {/* Alerts */}
          {serverErr && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm mb-5 leading-snug"
              style={{ background: 'var(--color-danger-dim)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              <span>⚠️</span><span>{serverErr}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm mb-5 leading-snug"
              style={{ background: 'var(--color-success-dim)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}>
              <span>✅</span><span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit}>
            {/* OTP digit boxes */}
            <div className="flex justify-center gap-2.5 mb-7" onPaste={handlePaste}>
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputsRef.current[idx] = el)}
                  className={`otp-digit${digit ? ' filled' : ''}${digitsError ? ' error' : ''}`}
                  type="text" inputMode="numeric" maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={loading}
                  autoFocus={idx === 0}
                  aria-label={`Digit ${idx + 1} of ${OTP_LENGTH}`}
                />
              ))}
            </div>

            <button type="submit" className="btn-primary" disabled={!isFilled || loading}>
              {loading ? <><span className="spinner" />Verifying...</> : '✅ Verify & Continue'}
            </button>
          </form>

          {/* Resend */}
          <div className="flex flex-col items-center gap-2.5 mt-7">
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {countdown > 0
                ? <>Resend code in <strong style={{ color: 'var(--color-accent)' }}>{countdown}s</strong></>
                : "Didn't receive the code?"}
            </p>
            <button
              onClick={handleResend}
              disabled={countdown > 0 || resending}
              className="text-sm font-semibold underline bg-transparent border-none transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
              style={{ color: 'var(--color-accent)', cursor: countdown > 0 ? 'not-allowed' : 'pointer' }}
            >
              {resending ? 'Sending...' : 'Resend verification code'}
            </button>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--color-secondary)' }}>
            Wrong email? <Link to="/register" className="font-semibold" style={{ color: 'var(--color-accent)' }}>Go back</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
