import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import { 
  FiMail, 
  FiLock, 
  FiArrowRight, 
  FiAlertCircle, 
  FiCheckCircle,
  FiMapPin, 
  FiCpu, 
  FiActivity
} from 'react-icons/fi';

const FEATURES = [
  { icon: <FiMapPin className="w-5 h-5 text-sky-400" />, title: 'Geo-tagged Reporting',  desc: 'Pin-drop precision mapping for Ranchi civic issues' },
  { icon: <FiCpu className="w-5 h-5 text-indigo-400" />, title: 'AI-Powered Triage',   desc: 'Groq-powered photo verification & department routing' },
  { icon: <FiActivity className="w-5 h-5 text-emerald-400" />, title: 'Real-time Analytics',    desc: 'Audit trails & status updates directly to citizens' },
];

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep]               = useState(1);
  const [email, setEmail]             = useState('');
  const [code, setCode]               = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [showRegisterLink, setShowRegisterLink] = useState(false);

  // Step 1: Check if email is registered → send OTP
  async function handleSendOtp(e) {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiConnector('POST', endpoints.FORGOT_PASSWORD_API, { email: email.toLowerCase().trim() });
      setSuccess(res.message);
      setStep(2);
    } catch (err) {
      if (err?.data?.error === 'NOT_REGISTERED') {
        setError('No account found with this email.');
        setShowRegisterLink(true);
      } else if (err?.data?.error === 'EMAIL_UNVERIFIED') {
        setError('This account is not verified. Please verify your email first.');
      } else {
        setError(err?.data?.message || 'Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify the OTP
  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (code.length !== 6) { setError('Enter the complete 6-digit code.'); return; }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiConnector('POST', endpoints.VERIFY_RESET_OTP_API, {
        email: email.toLowerCase().trim(),
        code,
      });
      setSuccess('Code verified! Set your new password below.');
      setStep(3);
    } catch (err) {
      setError(err?.data?.message || 'Invalid or expired code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Set new password
  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPwd) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const res = await apiConnector('POST', endpoints.RESET_PASSWORD_API, {
        email: email.toLowerCase().trim(),
        code,
        newPassword,
      });
      setSuccess(res.message || 'Password reset! Redirecting to login…');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err?.data?.message || 'Failed to reset password. Please start over.');
    } finally {
      setLoading(false);
    }
  }

  const stepLabels = ['Email', 'Verify', 'New Password'];

  return (
    <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#f3f5f9] text-gray-800 font-sans">
      
      {/* Floating Home Button */}
      <Link 
        to="/" 
        className="absolute top-6 right-6 px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 text-xs font-extrabold rounded-sm transition border border-gray-200 shadow-xs flex items-center gap-1.5 cursor-pointer z-50 uppercase tracking-wider"
      >
        <span>← Back to Home</span>
      </Link>

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col items-center justify-center px-16 py-16 relative overflow-hidden bg-[#1e2a5a] text-white">
        {/* Glow blobs */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent)] pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 text-center mb-12 space-y-4">
          <div className="w-14 h-14 rounded-xl bg-white/10 text-white border border-white/20 flex items-center justify-center text-2xl mx-auto shadow-lg">
            🏛️
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight leading-none">
              Nagar<span className="text-sky-300">Seva</span>
            </h1>
            <p className="text-xs text-white/50 font-bold uppercase tracking-widest leading-none mt-2">
              Public Administration Portal
            </p>
          </div>
          <p className="text-xs text-white/70 max-w-xs mx-auto leading-relaxed pt-2">
            Your city, your voice. Report local complaints and track resolution processes in real-time.
          </p>
        </div>

        {/* Feature bullets */}
        <div className="relative z-10 flex flex-col gap-4 w-full max-w-sm">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-4 px-5 py-4 rounded-sm bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <strong className="block text-xs font-black text-white uppercase tracking-wider">{f.title}</strong>
                <span className="text-[11px] text-white/60 block mt-0.5 leading-snug">{f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-14">
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-sm p-8 sm:p-10 shadow-xs">

          {/* Step indicator */}
          <div className="flex gap-2 mb-6 select-none">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex-1 text-center">
                <div
                  className={`h-1 rounded-full mb-1 transition-all duration-300 ${
                    i + 1 <= step ? 'bg-blue-600' : 'bg-gray-100'
                  }`}
                />
                <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                  i + 1 <= step ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="mb-6 border-b pb-4 border-gray-100">
            <h2 className="text-xl font-black text-gray-900 leading-tight">
              {step === 1 && 'Forgot Password?'}
              {step === 2 && 'Verify Identity'}
              {step === 3 && 'Set New Password'}
            </h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1.5 leading-tight">
              {step === 1 && 'Enter your registered email to get a reset code.'}
              {step === 2 && `Enter the 6-digit code sent to ${email}`}
              {step === 3 && 'Choose a strong new password for your account.'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-sm text-xs mb-5 leading-snug bg-red-50 border border-red-200 text-red-700">
              <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span className="font-bold">{error}</span>
            </div>
          )}
          
          {showRegisterLink && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-sm text-xs mb-5 bg-blue-50 border border-blue-200 text-blue-700">
              <span className="font-bold">Don't have an account?</span>
              <Link to="/register" className="font-black hover:text-blue-800">
                Register now →
              </Link>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-sm text-xs mb-5 leading-snug bg-green-50 border border-green-200 text-green-700">
              <FiCheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-500" />
              <span className="font-bold">{success}</span>
            </div>
          )}

          {/* Step 1: Email Form */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <FiMail className="w-4 h-4" />
                  </span>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold pl-10 pr-4 py-3 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white focus:border-blue-500 transition duration-150"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); setShowRegisterLink(false); }}
                    disabled={loading}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-3 bg-[#1e2a5a] hover:bg-[#2d3f82] disabled:bg-gray-300 text-white text-xs font-extrabold rounded-sm shadow-sm transition duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Code</span>
                    <FiArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: OTP Verification Form */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  6-Digit Reset Code
                </label>
                <input
                  className="w-full bg-gray-50 border border-gray-200 py-3 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white focus:border-blue-500 transition duration-150"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                  disabled={loading}
                  style={{ textAlign: 'center', letterSpacing: '0.4em', fontWeight: 700, fontSize: '1.2rem' }}
                  autoFocus
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full py-3 bg-[#1e2a5a] hover:bg-[#2d3f82] disabled:bg-gray-300 text-white text-xs font-extrabold rounded-sm shadow-sm transition duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Code</span>
                    <FiArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); setSuccess(''); setCode(''); }}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-transparent border-none transition cursor-pointer uppercase tracking-wider"
                >
                  ← Wrong email? Go back
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password Form */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  New Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <FiLock className="w-4 h-4" />
                  </span>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold pl-10 pr-4 py-3 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white focus:border-blue-500 transition duration-150"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <FiLock className="w-4 h-4" />
                  </span>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold pl-10 pr-4 py-3 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white focus:border-blue-500 transition duration-150"
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPwd}
                    onChange={(e) => { setConfirmPwd(e.target.value); setError(''); }}
                    disabled={loading}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs font-extrabold rounded-sm shadow-sm transition duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <FiLock className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          <p className="text-center text-xs mt-8 pt-4 border-t border-gray-150 text-gray-550 font-semibold">
            Remembered your password?{' '}
            <Link 
              to="/login" 
              className="font-black text-blue-600 hover:text-blue-700"
            >
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
