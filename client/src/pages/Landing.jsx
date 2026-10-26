/**
 * pages/Landing.jsx
 *
 * Public homepage — accessible without authentication.
 * Redesigned with premium landing layout, sticky top navbar, and high-impact hero.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import HowItWorks from '../components/core/landing/HowItWorks';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import {
  FiArrowRight,
  FiCheckCircle,
  FiMapPin,
  FiActivity,
  FiLayers,
  FiSmartphone,
  FiCpu,
  FiLock,
  FiZap,
  FiUsers
} from 'react-icons/fi';
import { FaRegSmile } from 'react-icons/fa';



const STATS = [
  { value: '50m', label: 'Deduplication Radius' },
  { value: '<5ms', label: 'Spatial Query Latency' },
  { value: '460+', label: 'AI Inference Tokens/Sec' },
  { value: '4-Tier', label: 'Role Access Hierarchy' },
];

const FEATURES = [
  { icon: <FiMapPin className="w-6 h-6 text-blue-600" />, title: 'City Pulse Map', desc: 'Real-time Supercluster map showing active, assigned, and resolved issues in your ward.' },
  { icon: <FiLayers className="w-6 h-6 text-indigo-600" />, title: 'Smart Deduplication', desc: 'PostGIS spatial indexes and advisory locks automatically filter duplicate reports.' },
  { icon: <FiUsers className="w-6 h-6 text-sky-600" />, title: 'Community Support', desc: 'Endorse nearby complaints to boost priority scores and expedite department routing.' },
  { icon: <FiActivity className="w-6 h-6 text-emerald-600" />, title: 'Rank-Fit Dispatch', desc: 'Workload-balancing algorithm maps field worker capacity against ticket severity.' },
  { icon: <FiLock className="w-6 h-6 text-violet-600" />, title: 'Enterprise Security', desc: 'httpOnly sessions, rate limiting, secure OTP authorization, and verified admin audits.' },
  { icon: <FiZap className="w-6 h-6 text-amber-600" />, title: 'Optimized Queries', desc: 'GIST spatial indexing triggers instant bounding-box queries for smooth viewport changes.' },
];

function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-8');
          }
        });
      },
      { threshold: 0.1 }
    );
    const children = ref.current?.querySelectorAll('.reveal-item');
    children?.forEach((el) => {
      el.classList.add('transition-all', 'duration-700', 'transform', 'opacity-0', 'translate-y-8');
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function Landing() {
  const { isAuthenticated } = useSelector((s) => s.auth);
  const workflowRef = useScrollReveal();
  const featuresRef = useScrollReveal();
  const [publicStats, setPublicStats] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicStats() {
      try {
        const data = await apiConnector('GET', endpoints.PUBLIC_ISSUE_STATS_API);
        if (isMounted) setPublicStats(data);
      } catch {
        if (isMounted) setPublicStats(null);
      }
    }

    loadPublicStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const dashboardStats = [
    {
      label: 'Submitted Inquiries',
      value: publicStats ? publicStats.total_issues.toLocaleString() : '—',
      valueClass: 'text-white',
    },
    {
      label: 'Assigned & Active',
      value: publicStats ? publicStats.assigned_active.toLocaleString() : '—',
      valueClass: 'text-sky-400',
    },
    {
      label: 'Verified Resolutions',
      value: publicStats ? publicStats.resolved_issues.toLocaleString() : '—',
      valueClass: 'text-emerald-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f3f5f9] text-gray-800 font-sans selection:bg-[#1e2a5a] selection:text-white">

      {/* Premium Sticky Top Navbar */}
      <nav className="bg-[#1e2a5a] text-white py-4 px-6 sm:px-12 flex items-center justify-between border-b border-white/10 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 text-white border border-white/20">
            <span className="text-lg" role="img" aria-label="logo">🏛️</span>
          </div>
          <div className="flex flex-col">
            <span className="font-black tracking-wider leading-tight" style={{ fontSize: '1rem', color: '#ffffff' }}>
              NagarSeva
            </span>
            <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest leading-none mt-0.5">
              Public Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <a href="#how-it-works" className="text-white/80 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors hidden md:block">
            How It Works
          </a>
          <a href="#features" className="text-white/80 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors hidden md:block">
            Features
          </a>
          {isAuthenticated ? (
            <Link
              to="/"
              className="px-4.5 py-2 bg-white hover:bg-gray-100 text-[#1e2a5a] text-xs font-black rounded-sm transition shadow-sm uppercase tracking-wider"
            >
              Dashboard →
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 hover:bg-white/10 text-white text-xs font-bold rounded-sm transition uppercase tracking-wider"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4.5 py-2 bg-white hover:bg-gray-100 text-[#1e2a5a] text-xs font-black rounded-sm transition shadow-sm uppercase tracking-wider"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32 bg-linear-to-b from-[#1e2a5a] to-[#2d3f82] text-white">
        {/* Soft decorative blur grids */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent)] pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Hero text */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider text-sky-300 border border-white/10">
              <FiActivity className="w-3.5 h-3.5 animate-pulse" />
              <span>Smart Civic Infrastructure Platform</span>
            </span>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
              Your City. <span className="text-transparent bg-clip-text bg-linear-to-r from-sky-400 to-indigo-300">Your Voice.</span><br />
              Real Change.
            </h1>

            <p className="text-gray-300 text-sm max-w-2xl leading-relaxed">
              Report civic issues like potholes, streetlights, or sewage hazards in seconds. Our automated routing system ensures complaints get verified, dispatched, and resolved with photographic proof.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                to="/register"
                className="w-full sm:w-auto px-6 py-3.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-black rounded-sm shadow-md transition duration-150 uppercase tracking-wider flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Report an Issue</span>
                <FiArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-sm border border-white/20 transition duration-150 uppercase tracking-wider text-center"
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* Side preview dashboard mockup */}
          <div className="lg:col-span-5 hidden lg:block relative">
            <div className="absolute inset-0 bg-linear-to-tr from-sky-500/10 to-indigo-500/10 rounded-md blur-xl" />
            <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold tracking-wider text-white/80">LIVE RESOLUTION STATS</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-3">
                {dashboardStats.map((stat) => (
                  <div key={stat.label} className="bg-white/5 border border-white/5 p-3 rounded-sm flex items-center justify-between">
                    <span className="text-xs text-white/70">{stat.label}</span>
                    <span className={`text-xs font-extrabold ${stat.valueClass}`}>
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Stats Counter Row */}
      <section className="relative z-25 -mt-8 max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="bg-white border border-gray-200/80 p-5 sm:p-6 rounded-sm shadow-sm hover:shadow-md transition text-center"
            >
              <span className="text-2xl sm:text-3xl font-black text-[#1e2a5a] tracking-tight">{s.value}</span>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mt-1.5 leading-tight">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow - 6 Steps Pipeline */}
      <section id="how-it-works" className="py-20 lg:py-28 max-w-6xl mx-auto px-6" ref={workflowRef}>
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">How It Works</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">From citizen photo reports to verified ground resolutions</p>
        </div>

        {/* Interactive Workflow Visualizer */}
        <HowItWorks />
      </section>

      {/* Features Grid - Built for Scale */}
      <section id="features" className="py-20 lg:py-28 border-t border-gray-200 bg-white" ref={featuresRef}>
        <div className="max-w-6xl mx-auto px-6">

          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Built for Scale</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Engineering infrastructure backing civic accountability</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="reveal-item p-6 rounded-sm shadow-sm hover:border-gray-250 hover:shadow-xs transition duration-200 space-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  {f.icon}
                </div>
                <h3 className="font-extrabold" style={{ fontSize: '1rem', color: '#111827' }}>{f.title}</h3>
                <p className="text-xs text-gray-550 leading-relaxed font-semibold">{f.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 max-w-5xl mx-auto px-6">
        <div className="bg-linear-to-tr from-[#1e2a5a] to-[#2d3f82] text-white p-8 sm:p-16 rounded-sm shadow-xl relative overflow-hidden text-center space-y-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.1),transparent)] pointer-events-none" />

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Ready to make your city better?
          </h2>
          <p className="text-xs sm:text-sm text-white/80 max-w-xl mx-auto font-medium">
            Join thousands of active citizens and municipal administrators driving transparency and quick turnarounds in our neighborhoods.
          </p>

          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex px-8 py-3.5 bg-white hover:bg-gray-100 text-[#1e2a5a] text-xs font-black rounded-sm shadow-sm transition uppercase tracking-wider cursor-pointer"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1e2a5a] text-white/85 py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏙️</span>
            <span className="font-black text-sm tracking-wider uppercase">NagarSeva</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-white/50 flex-wrap justify-center">
            <span>PostGIS Database</span>
            <span>&bull;</span>
            <span>Deepseek AI routing</span>
            <span>&bull;</span>
            <span>React UI</span>
            <span>&bull;</span>
            <span>Node / Express API</span>
          </div>

          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
            Built with ❤️ for Indian cities &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>

    </div>
  );
}
