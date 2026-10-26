import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/Operations/authAPI';
import { 
  FiUser, 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiArrowRight, 
  FiMapPin, 
  FiLayers, 
  FiActivity,
  FiBell,
  FiAlertCircle
} from 'react-icons/fi';

function getStrength(password) {
  let score = 0;
  if (password.length >= 8)           score++;
  if (/[A-Z]/.test(password))         score++;
  if (/[0-9]/.test(password))         score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = [
  '', 
  'bg-red-500 text-red-500', 
  'bg-amber-500 text-amber-500', 
  'bg-blue-500 text-blue-500', 
  'bg-green-500 text-green-500'
];

const FEATURES = [
  { icon: <FiMapPin className="w-5 h-5 text-sky-400" />, title: 'Pin-drop Reporting',      desc: 'Drop a pin, snap a photo, and report immediately' },
  { icon: <FiLayers className="w-5 h-5 text-indigo-400" />, title: 'Smart Deduplication',     desc: 'Groups similar geographical reports automatically' },
  { icon: <FiActivity className="w-5 h-5 text-emerald-400" />, title: 'Live Analytics',           desc: 'Real-time response audit dashboards' },
  { icon: <FiBell className="w-5 h-5 text-violet-400" />, title: 'Instant Alerts',   desc: 'SMS and email notifications on resolution milestones' },
];

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState({});
  const [serverErr, setServerErr]     = useState('');

  const pwdStrength = getStrength(form.password);

  function validate() {
    const e = {};
    if (!form.name.trim())               e.name    = 'Full name is required';
    else if (form.name.trim().length < 2) e.name   = 'Name must be at least 2 characters';
    if (!form.email)                     e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password)                  e.password = 'Password is required';
    else if (form.password.length < 8)   e.password = 'Password must be at least 8 characters';
    if (!form.confirmPassword)           e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
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
      await register({
        name: form.name.trim(), email: form.email.toLowerCase().trim(), password: form.password,
      });
      navigate('/verify-email', { state: { email: form.email.toLowerCase().trim() } });
    } catch (err) {
      if (err.data?.error === 'EMAIL_UNVERIFIED') {
        navigate('/verify-email', { state: { email: form.email.toLowerCase().trim(), fromLogin: true } });
        return;
      }
      setServerErr(err.data?.message || 'Registration failed. Please try again.');
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
        <div className="relative z-10 text-center mb-10 space-y-4">
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
            Join thousands of active citizens making their city better, one localized report at a time.
          </p>
        </div>

        {/* Feature bullets */}
        <div className="relative z-10 flex flex-col gap-3.5 w-full max-w-sm">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-4 px-5 py-3.5 rounded-sm bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-sm bg-white/5 flex items-center justify-center flex-shrink-0">
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
      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-14 overflow-y-auto">
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-sm p-8 sm:p-10 shadow-xs">

          {/* Step indicator */}
          <div className="flex gap-2 mb-6 select-none">
            <div className="h-1 flex-1 rounded-full bg-blue-600" />
            <div className="h-1 flex-1 rounded-full bg-gray-100" />
          </div>

          <div className="mb-6 border-b pb-4 border-gray-100">
            <h2 className="text-xl font-black text-gray-900 leading-tight">
              Create your account
            </h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1.5 leading-none">
              Step 1 of 2 — Personal Details
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

            {/* Full name */}
            <div className="space-y-1.5">
              <label htmlFor="reg-name" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <FiUser className="w-4 h-4" />
                </span>
                <input 
                  id="reg-name" 
                  className={`w-full bg-gray-50 border text-xs font-semibold pl-10 pr-4 py-3 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white focus:border-blue-500 transition duration-150 ${
                    errors.name ? 'border-red-400' : 'border-gray-200'
                  }`}
                  type="text" 
                  name="name" 
                  placeholder="Rahul Sharma"
                  value={form.name} 
                  onChange={handleChange} 
                  autoComplete="name" 
                  disabled={loading} 
                />
              </div>
              {errors.name && (
                <span className="text-[10px] text-red-650 font-bold flex items-center gap-1">
                  ⚠️ {errors.name}
                </span>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <FiMail className="w-4 h-4" />
                </span>
                <input 
                  id="reg-email" 
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
              <label htmlFor="reg-password" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <FiLock className="w-4 h-4" />
                </span>
                <input 
                  id="reg-password" 
                  className={`w-full bg-gray-50 border text-xs font-semibold pl-10 pr-10 py-3 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white focus:border-blue-500 transition duration-150 ${
                    errors.password ? 'border-red-400' : 'border-gray-200'
                  }`}
                  type={showPwd ? 'text' : 'password'} 
                  name="password" 
                  placeholder="Min. 8 characters"
                  value={form.password} 
                  onChange={handleChange} 
                  autoComplete="new-password" 
                  disabled={loading} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-450 hover:text-gray-700 bg-transparent border-none p-1 cursor-pointer"
                >
                  {showPwd ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {form.password && (
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 2, 3, 4].map((lvl) => {
                    const colorClass = STRENGTH_COLORS[pwdStrength] || 'bg-gray-200';
                    const activeColor = colorClass.split(' ')[0];
                    return (
                      <div 
                        key={lvl} 
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          lvl <= pwdStrength ? activeColor : 'bg-gray-100'
                        }`}
                      />
                    );
                  })}
                  <span className={`text-[10px] ml-1 font-bold ${STRENGTH_COLORS[pwdStrength]?.split(' ')[1] || 'text-gray-400'}`}>
                    {STRENGTH_LABELS[pwdStrength]}
                  </span>
                </div>
              )}
              {errors.password && (
                <span className="text-[10px] text-red-650 font-bold flex items-center gap-1">
                  ⚠️ {errors.password}
                </span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="reg-confirmPassword" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <FiLock className="w-4 h-4" />
                </span>
                <input 
                  id="reg-confirmPassword" 
                  className={`w-full bg-gray-50 border text-xs font-semibold pl-10 pr-10 py-3 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white focus:border-blue-500 transition duration-150 ${
                    errors.confirmPassword ? 'border-red-400' : 'border-gray-200'
                  }`}
                  type={showConfirm ? 'text' : 'password'} 
                  name="confirmPassword" 
                  placeholder="Repeat your password"
                  value={form.confirmPassword} 
                  onChange={handleChange} 
                  disabled={loading} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-450 hover:text-gray-700 bg-transparent border-none p-1 cursor-pointer"
                >
                  {showConfirm ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="text-[10px] text-red-650 font-bold flex items-center gap-1">
                  ⚠️ {errors.confirmPassword}
                </span>
              )}
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              className="w-full py-3 bg-[#1e2a5a] hover:bg-[#2d3f82] disabled:bg-gray-300 text-white text-xs font-extrabold rounded-sm shadow-sm transition duration-150 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <FiArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs mt-8 pt-4 border-t border-gray-150 text-gray-550 font-semibold">
            Already have an account?{' '}
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
