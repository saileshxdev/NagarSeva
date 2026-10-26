import React, { useState } from 'react';
import { FiMail, FiKey } from 'react-icons/fi';

/**
 * Beautiful EmployeeCard for SuperAdmin Department Details
 */
const EmployeeCard = ({ employee, onResendCredentials }) => {
  const [resending, setResending] = useState(false);

  const handleResend = async (e) => {
    e.stopPropagation(); // Avoid triggering any parent accordion toggle
    if (!confirm(`Are you sure you want to reset the password and resend credentials to ${employee.email}?`)) {
      return;
    }
    setResending(true);
    try {
      await onResendCredentials(employee.id);
    } catch (err) {
      console.error(err);
    } finally {
      setResending(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="bg-gray-100 p-4 rounded-sm flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar badge */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1e2a5a] to-[#2d3f82] text-white flex items-center justify-center font-extrabold text-xs shadow-sm flex-shrink-0">
          {getInitials(employee.name)}
        </div>
        
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <span className="font-extrabold text-xs text-gray-900 block truncate leading-tight">
              {employee.name}
            </span>
            {employee.designation && (
              <span className="text-[9px] font-bold text-gray-400 bg-gray-50 border px-1 rounded-sm">
                {employee.designation}
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 leading-none">
            <FiMail className="w-3 h-3 text-gray-300" />
            <span className="font-medium">{employee.email}</span>
          </span>
        </div>
      </div>

      <button
        onClick={handleResend}
        disabled={resending}
        title="Reset password & resend credentials email"
        className="px-3.5 py-1.5 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200/80 rounded-sm text-[10px] font-bold transition duration-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        <FiKey className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
        <span>{resending ? 'Sending...' : 'Reset Credentials'}</span>
      </button>
    </div>
  );
};

export default EmployeeCard;
