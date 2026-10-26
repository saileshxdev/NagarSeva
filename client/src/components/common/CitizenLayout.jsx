/**
 * components/common/CitizenLayout.jsx
 *
 * Persists a sticky top header navbar across all citizen routing views.
 * Contains: Home/Feed, My Complaints, City Pulse Map, Register Issue, and Profile dropdown.
 */
import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clearAuth } from '../../slices/authSlice';
import { apiConnector } from '../../services/apiConnector';
import { endpoints } from '../../services/api';
import { FiLogOut, FiMenu, FiX, FiUser, FiActivity, FiMapPin, FiPlusCircle, FiList, FiThumbsUp } from 'react-icons/fi';

export default function CitizenLayout() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus when route changes
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    try { await apiConnector('POST', endpoints.LOGOUT_API); } catch { /* ignore */ }
    localStorage.clear();
    dispatch(clearAuth());
    navigate('/login', { replace: true });
  }

  // Helper to get initials
  function getInitials(name) {
    if (!name) return 'C';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  const navItems = [
    { label: 'Home',           path: '/citizen',           icon: FiActivity   },
    { label: 'My Complaints',  path: '/citizen/complaints', icon: FiList       },
    { label: 'Upvoted',        path: '/citizen/upvoted',   icon: FiThumbsUp   },
    { label: 'City Pulse Map', path: '/citizen/city-pulse', icon: FiMapPin     },
    { label: 'Report Issue',   path: '/citizen/report',    icon: FiPlusCircle },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#f3f5f9] font-sans overflow-hidden">

      {/* Sticky Top Navbar */}
      <header className="sticky top-0 z-[2000] bg-[#1e2a5a] text-white shadow-md border-b border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo / Branding */}
          <div
            onClick={() => navigate('/citizen')}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="text-xl font-bold transition group-hover:scale-110">🏛️</div>
            <span className="text-sm font-black uppercase tracking-widest text-white leading-none">
              NagarSeva
            </span>
          </div>

          {/* Desktop Navigation Link Tabs */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-2.5 rounded-sm text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer select-none ${isActive
                      ? 'bg-white/10 text-white shadow-inner'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions Menu (Profile + Hamburger) */}
          <div className="flex items-center gap-3">

            {/* User Profile Dropdown Button */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 border border-white/15 flex items-center justify-center text-xs font-black cursor-pointer transition select-none uppercase tracking-wider focus:outline-none"
                aria-label="Toggle profile menu"
              >
                {getInitials(user?.name)}
              </button>

              {/* Profile dropdown container */}
              {profileOpen && (
                <div className="absolute right-0 mt-2.5 w-56 bg-white border border-gray-200 rounded-sm shadow-lg overflow-hidden py-1 z-[2100] animate-[cardSlideUp_0.2s_ease-out]">
                  <div className="px-4.5 py-3 bg-gray-50 border-b border-gray-150">
                    <p className="text-xs font-extrabold text-gray-900 truncate capitalize">{user?.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{user?.role?.replace('_', ' ')}</p>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4.5 py-3 text-xs text-red-600 text-red-650 hover:bg-red-200/50 font-bold transition flex items-center gap-2 border-none bg-transparent cursor-pointer"
                  >
                    <FiLogOut className="w-4 h-4 shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle Menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-sm bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center cursor-pointer transition"
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? <FiX className="w-4 h-4" /> : <FiMenu className="w-4 h-4" />}
            </button>

          </div>

        </div>

        {/* Mobile Navigation Drawer Dropdown */}
        {menuOpen && (
          <div className="md:hidden bg-[#18224b] border-t border-white/5 py-2 animate-[cardSlideUp_0.2s_ease-out]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full text-left px-6 py-3.5 text-xs font-extrabold uppercase tracking-wider flex items-center gap-3 transition border-none bg-transparent cursor-pointer ${isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Icon className="w-4 h-4 text-blue-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Page Scroll Area — full-bleed on map, padded elsewhere */}
      {location.pathname === '/citizen/city-pulse' ? (
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-[cardSlideUp_0.3s_ease-out]">
            <Outlet />
          </div>
        </main>
      )}

    </div>
  );
}
