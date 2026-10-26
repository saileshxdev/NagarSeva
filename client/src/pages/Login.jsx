import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuth } from '../slices/authSlice';
import { login as loginAPI } from '../services/Operations/authAPI';
import { 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiArrowRight, 
  FiMapPin, 
  FiCpu, 
  FiActivity,
  FiAlertCircle
} from 'react-icons/fi';

const FEATURES = [
  { icon: <FiMapPin className="w-5 h-5 text-sky-400" />, title: 'Geo-tagged Reporting',  desc: 'Pin-drop precision mapping for Ranchi civic issues' },
  { icon: <FiCpu className="w-5 h-5 text-indigo-400" />, title: 'AI-Powered Triage',   desc: 'Groq-powered photo verification & department routing' },
  { icon: <FiActivity className="w-5 h-5 text-emerald-400" />, title: 'Real-time Analytics',    desc: 'Audit trails & status updates directly to citizens' },
];

export default function Login() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const dispatch   = useDispatch();

  const [form, setForm]           = useState({ email: '', password: '' });
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState({});
  const [serverErr, setServerErr] = useState('');

  const from = location.state?.from?.pathname || '/';

  function validate() {
    const e = {};
    if (!form.email)                            e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email    = 'Enter a valid email';
    if (!form.password)                         e.password = 'Password is required';
    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
    setServerErr('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }

    setLoading(true);
    setServerErr('');
    try {
      const data = await loginAPI(form.email.toLowerCase().trim(), form.password);
      dispatch(setAuth(data.user));
      navigate(from, { replace: true });
    } catch (err) {
      if (err.data?.error === 'EMAIL_UNVERIFIED') {
        navigate('/verify-email', { state: { email: form.email, fromLogin: true } });
        return;
      }
      setServerErr(err.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  }

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

          {/* Header */}
          <div className="mb-6 border-b pb-4 border-gray-100">
            <h2 className="text-xl font-black text-gray-900 leading-tight">
              Welcome back
            </h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1.5 leading-none">
              Sign in to your NagarSeva account
            </p>
          </div>

          {/* Server error */}
          {serverErr && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-sm text-xs mb-5 leading-snug bg-red-50 border border-red-200 text-red-700">
              <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span className="font-bold">{serverErr}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <FiMail className="w-4 h-4" />
                </span>
                <input
                  id="login-email"
                  className={`w-full bg-gray-50 border text-xs font-semibold pl-10 pr-4 py-3 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white focus:border-blue-500 transition duration-150 ${
                    errors.email ? 'border-red-400' : 'border-gray-200'
                  }`}
                  type="email" 
                  name="email" 
                  placeholder="you@example.com"
                  value={form.email} 
                  onChange={handleChange}
                  autoComplete="email" 
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <span className="text-[10px] text-red-650 font-bold flex items-center gap-1">
                  ⚠️ {errors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <FiLock className="w-4 h-4" />
                </span>
                <input
                  id="login-password"
                  className={`w-full bg-gray-50 border text-xs font-semibold pl-10 pr-10 py-3 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white focus:border-blue-500 transition duration-150 ${
                    errors.password ? 'border-red-400' : 'border-gray-200'
                  }`}
                  type={showPwd ? 'text' : 'password'} 
                  name="password" 
                  placeholder="Your account password"
                  value={form.password} 
                  onChange={handleChange}
                  autoComplete="current-password" 
                  disabled={loading}
                />
                <button 
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-450 hover:text-gray-700 bg-transparent border-none p-1 transition cursor-pointer"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <span className="text-[10px] text-red-650 font-bold flex items-center gap-1">
                  ⚠️ {errors.password}
                </span>
              )}
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              className="w-full py-3 bg-[#1e2a5a] hover:bg-[#2d3f82] disabled:bg-gray-300 text-white text-xs font-extrabold rounded-sm shadow-sm transition duration-150 cursor-pointer flex items-center justify-center gap-1.5"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <FiArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <div className="text-right pt-1.5">
              <Link 
                to="/forgot-password" 
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
              >
                Forgot password?
              </Link>
            </div>
          </form>

          <p className="text-center text-xs mt-8 pt-4 border-t border-gray-150 text-gray-550 font-semibold">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="font-black text-blue-600 hover:text-blue-700"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
