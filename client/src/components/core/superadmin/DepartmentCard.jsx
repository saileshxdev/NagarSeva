import React, { useState } from 'react';
import { 
  FiChevronDown, 
  FiChevronUp, 
  FiShield, 
  FiActivity
} from 'react-icons/fi';
import { FaBuilding, FaWrench } from 'react-icons/fa';
import EmployeeCard from './EmployeeCard';

const DepartmentCard = ({ dept, admins = [], staff = [], onResendCredentials, onDeleteDept }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdminsExpanded, setIsAdminsExpanded] = useState(false);
  const [isStaffExpanded, setIsStaffExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      setIsAdminsExpanded(false);
      setIsStaffExpanded(false);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation(); // Avoid triggering card toggle
    onDeleteDept(dept.id);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-sm shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
      
      {/* Department summary row */}
      <div 
        onClick={toggleExpand}
        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-sm bg-gradient-to-tr from-[#1e2a5a] to-[#2d3f82] text-white flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
            🏢
          </div>
          <div className="min-w-0">
            <span className="font-black text-sm text-gray-900 block truncate leading-tight">
              {dept.name}
            </span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-1.5 leading-none">
              {dept.dept_type}
            </span>
          </div>
        </div>

        {/* Statistics and control icons */}
        <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
          {/* Active issues */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-sky-50 border border-sky-100/50 px-2.5 py-1 rounded-sm font-semibold">
            <FiActivity className="w-3.5 h-3.5 text-sky-500" />
            <span>Active Issues: <strong className="text-sky-700 font-black">{dept.active_issues || 0}</strong></span>
          </div>

          {/* Employee summaries */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-sm font-semibold">
            <FiShield className="w-3.5 h-3.5 text-indigo-500" />
            <span>Admins: <strong className="text-indigo-700 font-black">{dept.admin_count || 0}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-blue-50 border border-blue-100/50 px-2.5 py-1 rounded-sm font-semibold">
            <FaWrench className="w-3 h-3 text-blue-500" />
            <span>Staff: <strong className="text-blue-700 font-black">{dept.worker_count || 0}</strong></span>
          </div>

          {/* Delete department button */}
          <button 
            onClick={handleDelete}
            title="Delete Department"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-sm border border-gray-100/60 transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          {/* Toggle Expand Icon */}
          <div className="text-gray-400 hover:text-gray-900 transition-colors ml-1">
            {isExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Expandable drawer section containing subcomponents */}
      {isExpanded && (
        <div 
          className="border-t border-gray-100 bg-gray-50/50 p-5 space-y-4"
          onClick={(e) => e.stopPropagation()} // Prevent row toggle on nested click
        >
          
          {/* Subcomponent A: Department Admins */}
          <div className="border border-gray-200/60 rounded-sm bg-white overflow-hidden shadow-xs">
            <div 
              onClick={() => setIsAdminsExpanded(!isAdminsExpanded)}
              className="px-4.5 py-3.5 bg-white border-b border-gray-100 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2">
                <FiShield className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                  Department Admins ({admins.length})
                </h4>
              </div>
              <div className="text-gray-400">
                {isAdminsExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {isAdminsExpanded && (
              <div className="p-4.5 bg-gray-50/20 space-y-3">
                {admins.length === 0 ? (
                  <p className="text-xs text-gray-500 font-medium py-2 px-1">
                    No administrators registered under this department.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5">
                    {admins.map(admin => (
                      <EmployeeCard 
                        key={admin.id}
                        employee={admin}
                        onResendCredentials={onResendCredentials}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subcomponent B: Staff Members (Field Workers) */}
          <div className="border border-gray-200/60 rounded-sm bg-white overflow-hidden shadow-xs">
            <div 
              onClick={() => setIsStaffExpanded(!isStaffExpanded)}
              className="px-4.5 py-3.5 bg-white border-b border-gray-100 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2">
                <FaWrench className="w-3.5 h-3.5 text-blue-500" />
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                  Staff Members ({staff.length})
                </h4>
              </div>
              <div className="text-gray-400">
                {isStaffExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {isStaffExpanded && (
              <div className="p-4.5 bg-gray-50/20 space-y-3">
                {staff.length === 0 ? (
                  <p className="text-xs text-gray-500 font-medium py-2 px-1">
                    No field workers registered under this department.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5">
                    {staff.map(worker => (
                      <EmployeeCard 
                        key={worker.id}
                        employee={worker}
                        onResendCredentials={onResendCredentials}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default DepartmentCard;
