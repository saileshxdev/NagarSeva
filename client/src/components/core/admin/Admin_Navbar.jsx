import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { NavLink, useNavigate } from 'react-router-dom';
import { links } from '../../../data/admin_navbar';
import { clearAuth } from '../../../slices/authSlice';
import { apiConnector } from '../../../services/apiConnector';
import { endpoints } from '../../../services/api';
import {
  FiHome,
  FiFileText,
  FiUsers,
  FiBarChart2,
  FiLogOut,
  FiMenu,
  FiX
} from 'react-icons/fi';

const LINK_ICONS = {
  'Home': <FiHome className="w-4.5 h-4.5" />,
  'Reports': <FiFileText className="w-4.5 h-4.5" />,
  'Field Workers': <FiUsers className="w-4.5 h-4.5" />,
  'Analytics': <FiBarChart2 className="w-4.5 h-4.5" />,
};

const Admin_Navbar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Mobile drawer state
  const [isOpen, setIsOpen] = useState(false);

  // Profile dropdown states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiConnector('POST', endpoints.LOGOUT_API);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.clear();
      dispatch(clearAuth());
      navigate('/login', { replace: true });
    }
  };

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-white/10">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 text-white border border-white/20">
          <span className="text-lg" role="img" aria-label="logo">🏛️</span>
        </div>
        <div className="flex flex-col">
          <span className="font-black text-base text-white tracking-wider font-sans leading-tight">
            NagarSeva
          </span>
          <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest leading-none mt-0.5">
            Admin Panel
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-1.5 px-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/admin'}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4.5 py-3.5 rounded-xs text-sm font-bold transition-all duration-400 group cursor-pointer ${isActive
                ? 'bg-white text-[#1e2a5a] shadow-md shadow-black/5 font-extrabold translate-x-3.5'
                : 'text-white/70 hover:text-white hover:bg-white/10'
              }`
            }
          >
            <span className="transition-transform group-hover:scale-110">
              {LINK_ICONS[link.label] || <FiHome className="w-4.5 h-4.5" />}
            </span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Profile Trigger & Dropdown Menu at the Bottom */}
      <div className="mt-auto pt-4 border-t border-white/10 px-1 relative" ref={dropdownRef}>
        {user && (
          <>
            {/* Trigger Button */}
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/10 transition-all duration-150 cursor-pointer text-left focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full border border-white/20 overflow-hidden flex items-center justify-center bg-white/20 text-white font-extrabold text-sm flex-shrink-0">
                {user.profile_image ? (
                  <img src={user.profile_image} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name ? user.name[0].toUpperCase() : 'A'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-white block truncate leading-tight">{user.name}</span>
                <span className="text-[10px] text-white/50 block truncate leading-none mt-0.5">{user.designation || 'Admin'}</span>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-white/40 flex-shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-white' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {/* Dropdown Menu (pops up above the button) */}
            {isDropdownOpen && (
              <div className="absolute left-0 bottom-full mb-3 w-64 bg-white border border-gray-150 rounded-sm shadow-xl py-3.5 z-50 text-gray-800 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="px-4 py-3 flex flex-col items-center border-b border-gray-100">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xl font-extrabold shadow-md mb-2 overflow-hidden border-2 border-white">
                    {user.profile_image ? (
                      <img src={user.profile_image} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name ? user.name[0].toUpperCase() : 'A'
                    )}
                  </div>
                  <span className="text-sm font-extrabold text-gray-900 leading-snug">{user.name}</span>
                  <span className="text-xs text-gray-500 font-medium mt-0.5 font-mono break-all">{user.email}</span>
                  <span className="mt-2 text-[9px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                    {user.designation || 'Department Admin'}
                  </span>
                </div>
                <div className="pt-2 px-1.5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xs text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition duration-150 text-left cursor-pointer"
                  >
                    <FiLogOut className="w-4 h-4 text-red-500" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-[#1e2a5a] text-white p-5 flex flex-col my-3.5 ml-3.5 rounded-xs shadow-xl hidden md:flex border border-white/5">
        {navContent}
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between bg-[#1e2a5a] text-white p-4.5 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🏛️</span>
          <span className="font-extrabold text-sm tracking-wider uppercase">NagarSeva</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
          aria-label="Toggle Menu"
        >
          {isOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Sidebar Slider Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          {/* Drawer container */}
          <div className="relative w-64 max-w-xs bg-[#1e2a5a] text-white flex flex-col p-5 h-[calc(100vh-24px)] my-3 ml-3 rounded-2xl shadow-2xl z-10 border border-white/5 animate-in slide-in-from-left duration-250">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Admin_Navbar;