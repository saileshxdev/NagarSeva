import React, { useEffect, useState, useCallback } from 'react';
import SuperAdmin_Navbar from '../components/core/superadmin/SuperAdmin_Navbar';
import DepartmentCard from '../components/core/superadmin/DepartmentCard';
import CreateDepartmentForm from '../components/core/superadmin/CreateDepartmentForm';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import { 
  FiRefreshCw, 
  FiLayers, 
  FiBriefcase, 
  FiUserPlus, 
  FiMail, 
  FiUser, 
  FiSearch,
  FiPlus,
  FiActivity
} from 'react-icons/fi';
import { FaBuilding } from 'react-icons/fa';

const SuperAdmin_Departments = () => {
  const [departments, setDepts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [designations, setDesignations] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Department creation states
  const [createDeptLoading, setCreateDeptLoading] = useState(false);

  // Staff creation states
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffMsg, setStaffMsg] = useState('');
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    role: 'FIELD_WORKER',
    department_id: '',
    designation: ''
  });

  // Persistent sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('superadmin-sidebar-collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('superadmin-sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, staffRes, desigRes] = await Promise.all([
        apiConnector('GET', endpoints.SA_DEPARTMENTS_API),
        apiConnector('GET', endpoints.SA_STAFF_API),
        apiConnector('GET', endpoints.SA_DESIGNATIONS_API).catch(() => ({ data: {} })),
      ]);
      setDepts(deptRes.data || []);
      setStaff(staffRes.data || []);
      setDesignations(desigRes.data || {});
    } catch (err) {
      console.error('[SuperAdmin_Departments] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create department
  const handleCreateDept = async (name, type) => {
    setCreateDeptLoading(true);
    try {
      await apiConnector('POST', endpoints.SA_DEPARTMENTS_API, { 
        name,
        dept_type: type
      });
      fetchData();
    } catch (err) {
      alert(err?.data?.message || 'Failed to create department.');
    } finally {
      setCreateDeptLoading(false);
    }
  };

  // Delete department
  const handleDeleteDept = async (id) => {
    if (!confirm('Are you sure you want to delete this department? This will soft-delete it and unassign its employees.')) {
      return;
    }
    try {
      await apiConnector('DELETE', `${endpoints.SA_DEPARTMENTS_API}/${id}`);
      fetchData();
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete department.');
    }
  };

  // Create staff/employee
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.email || !staffForm.department_id) {
      setStaffMsg('All fields are required.');
      return;
    }
    setStaffLoading(true);
    setStaffMsg('');
    try {
      const res = await apiConnector('POST', endpoints.SA_STAFF_API, {
        ...staffForm,
        department_id: parseInt(staffForm.department_id),
      });
      const icon = res.email_sent ? '✅' : '⚠️';
      setStaffMsg(`${icon} ${res.message}${res.dev_password ? ` (Dev password: ${res.dev_password})` : ''}`);
      setStaffForm({ name: '', email: '', role: 'FIELD_WORKER', department_id: '', designation: '' });
      fetchData();
    } catch (err) {
      setStaffMsg(`❌ ${err?.data?.message || 'Failed to create staff member.'}`);
    } finally {
      setStaffLoading(false);
    }
  };

  // Resend credentials
  const handleResendCredentials = async (staffId) => {
    try {
      const res = await apiConnector('POST', `${endpoints.SA_STAFF_API}/${staffId}/resend-credentials`);
      alert(res.message + (res.dev_password ? `\n\nDev password: ${res.dev_password}` : ''));
      fetchData();
    } catch (err) {
      alert(err?.data?.message || 'Failed to resend credentials.');
      throw err;
    }
  };

  // Group staff members by department_id and role
  const getStaffByDeptAndRole = (deptId, role) => {
    return staff.filter(s => String(s.department_id) === String(deptId) && s.role === role);
  };

  // Filter departments based on search query
  const filteredDepts = departments.filter(d => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      d.name.toLowerCase().includes(query) ||
      d.dept_type.toLowerCase().includes(query)
    );
  });

  // Calculate designation options for staff creation
  const selectedDeptObj = departments.find(d => String(d.id) === String(staffForm.department_id));
  const selectedDeptType = selectedDeptObj?.dept_type;
  const staffDesignationOptions = selectedDeptType ? (designations[selectedDeptType]?.[staffForm.role] || []) : [];

  return (
    <div className="flex min-h-screen bg-[#f3f5f9] text-gray-800 font-sans">
      {/* Sidebar Navigation */}
      <SuperAdmin_Navbar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 pr-6 py-8 transition-all duration-300 ${isCollapsed ? 'md:pl-[118px]' : 'md:pl-[294px]'}`}>
        
        {/* Main Content Body */}
        <main className="space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 border-gray-200">
            <div>
              <h1 className="text-2xl font-black text-gray-955 tracking-tight flex items-center gap-2.5">
                <span>Department Management</span>
              </h1>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                <FiLayers className="w-3.5 h-3.5 text-gray-400" />
                <span>Configure city departments, classification schemes, and ULB personnel roles</span>
              </p>
            </div>
            
            <button 
              onClick={fetchData}
              className="self-start sm:self-center px-4.5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-xs font-extrabold rounded-sm transition duration-150 flex items-center gap-2 border border-gray-200/80 shadow-xs cursor-pointer group"
            >
              <FiRefreshCw className="w-3.5 h-3.5 text-gray-500 transition-transform duration-500 group-hover:rotate-180" />
              <span>Refresh Department List</span>
            </button>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Department List & Expandable Accordion drawers (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Search Bar header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 rounded-sm border border-gray-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-gray-900">
                    City Departments
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#1e2a5a]/10 text-[#1e2a5a] font-extrabold">
                    {filteredDepts.length} total
                  </span>
                </div>
                
                {/* Search */}
                <div className="relative w-full sm:max-w-xs">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <FiSearch className="w-4 h-4 text-gray-400" />
                  </span>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search department name or type..." 
                    className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200 pl-10 pr-4 py-2.5 rounded-sm text-xs placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition shadow-inner"
                  />
                </div>
              </div>

              {/* Department Cards List */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-sm border border-gray-200">
                  <div className="w-10 h-10 border-4 border-blue-600/25 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="text-xs text-gray-500 font-bold mt-3 animate-pulse">Loading department directories...</span>
                </div>
              ) : filteredDepts.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-sm p-20 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-3 text-gray-400">
                    <FaBuilding className="w-7 h-7" />
                  </div>
                  <h3 className="font-extrabold text-gray-800 text-sm">No Departments Available</h3>
                  <p className="text-gray-500 text-xs mt-1 max-w-sm">
                    {searchQuery ? 'No departments match your query.' : 'Create a department using the side panel to get started.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredDepts.map((dept) => (
                    <DepartmentCard 
                      key={dept.id}
                      dept={dept}
                      admins={getStaffByDeptAndRole(dept.id, 'ADMIN')}
                      staff={getStaffByDeptAndRole(dept.id, 'FIELD_WORKER')}
                      onResendCredentials={handleResendCredentials}
                      onDeleteDept={handleDeleteDept}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Creation Forms (1/3 width) */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Form A: Register Department */}
              <CreateDepartmentForm 
                departments={departments}
                onCreateDept={handleCreateDept}
                createDeptLoading={createDeptLoading}
              />

              {/* Form B: Register Staff member */}
              <div className="bg-white p-5 rounded-md border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <FiUserPlus className="w-4 h-4 text-[#1e2a5a]" />
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Add Staff Member
                  </h3>
                </div>

                <form onSubmit={handleCreateStaff} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Name</label>
                    <input 
                      type="text"
                      value={staffForm.name}
                      onChange={(e) => setStaffForm(s => ({ ...s, name: e.target.value }))}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold p-2.5 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Email Address</label>
                    <input 
                      type="email"
                      value={staffForm.email}
                      onChange={(e) => setStaffForm(s => ({ ...s, email: e.target.value }))}
                      placeholder="ramesh@nagarseva.in"
                      className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold p-2.5 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white"
                      required
                    />
                  </div>

                  {/* Department Assignment */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Department</label>
                    <select
                      value={staffForm.department_id}
                      onChange={(e) => setStaffForm(s => ({ ...s, department_id: e.target.value, designation: '' }))}
                      className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold p-2.5 rounded-sm focus:outline-none cursor-pointer"
                      required
                    >
                      <option value="">Select department...</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>

                  {/* Role Type */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Role Classification</label>
                    <select
                      value={staffForm.role}
                      onChange={(e) => setStaffForm(s => ({ ...s, role: e.target.value, designation: '' }))}
                      className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold p-2.5 rounded-sm focus:outline-none cursor-pointer"
                    >
                      <option value="FIELD_WORKER">Field Worker (Staff)</option>
                      <option value="ADMIN">Department Admin</option>
                    </select>
                  </div>

                  {/* Designation dropdown, derived from selections */}
                  {staffDesignationOptions.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Official Designation</label>
                      <select
                        value={staffForm.designation}
                        onChange={(e) => setStaffForm(s => ({ ...s, designation: e.target.value }))}
                        className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold p-2.5 rounded-sm focus:outline-none cursor-pointer"
                        required
                      >
                        <option value="">Select designation...</option>
                        {staffDesignationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Message displays */}
                  {staffMsg && (
                    <div className={`p-3 rounded text-xs font-bold ${
                      staffMsg.startsWith('✅')
                        ? 'bg-green-50 text-green-700 border border-green-200/50'
                        : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                    }`}>
                      {staffMsg}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={staffLoading || !staffForm.department_id || !staffForm.name || !staffForm.email}
                    className="w-full py-2.5 bg-[#1e2a5a] hover:bg-[#2d3f82] disabled:bg-gray-300 text-white text-xs font-extrabold rounded-sm shadow-sm transition cursor-pointer"
                  >
                    {staffLoading ? 'Registering...' : 'Register & Dispatch Credentials'}
                  </button>
                </form>
              </div>

            </div>

          </div>

        </main>
      </div>
    </div>
  );
};

export default SuperAdmin_Departments;
