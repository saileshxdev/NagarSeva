import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import SuperAdmin_Navbar from '../components/core/superadmin/SuperAdmin_Navbar';
import IssueCard from '../components/core/admin/IssueCard';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FiRefreshCw, 
  FiClock, 
  FiCheckCircle, 
  FiUsers, 
  FiMapPin, 
  FiCalendar, 
  FiBriefcase, 
  FiBarChart2, 
  FiInfo,
  FiSearch,
  FiXCircle,
  FiTrendingUp,
  FiUser,
  FiFileText,
  FiShield
} from 'react-icons/fi';
import { FaBuilding, FaWrench, FaHardHat, FaRegSmile } from 'react-icons/fa';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORY_LABELS = {
  POTHOLE: '🕳️ Pothole',
  STREETLIGHT: '💡 Street Light',
  SEWAGE: '🚰 Sewage',
  GARBAGE: '🗑️ Garbage',
  WATER_SUPPLY: '💧 Water Supply',
  ROAD_DAMAGE: '🛣️ Road Damage',
  ENCROACHMENT: '🚧 Encroachment',
  STRAY_ANIMALS: '🐕 Stray Animals',
  DEAD_ANIMAL: '💀 Dead Animal',
  PUBLIC_TOILET: '🚻 Public Toilet',
  DRAIN_BLOCKAGE: '🚰 Drain Blockage',
  FALLEN_TREE: '🌳 Fallen Tree',
  ABANDONED_VEHICLE: '🚗 Abandoned Vehicle',
  AIR_POLLUTION: '🌫️ Air Pollution',
  OTHER: '📋 Other',
};

const SuperAdmin_Home = () => {
  const { user } = useSelector((state) => state.auth);

  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [departments, setDepts] = useState([]);
  const [designations, setDesignations] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Triage details modal state
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Verification Form states
  const [selectedDept, setSelectedDept] = useState('');
  const [adminDesignation, setAdminDesignation] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Persistent sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('superadmin-sidebar-collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('superadmin-sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, queueRes, deptRes, desigRes] = await Promise.all([
        apiConnector('GET', endpoints.SA_STATS_API),
        apiConnector('GET', endpoints.SA_QUEUE_API),
        apiConnector('GET', endpoints.SA_DEPARTMENTS_API),
        apiConnector('GET', endpoints.SA_DESIGNATIONS_API).catch(() => ({ data: {} })),
      ]);
      setStats(statsRes);
      setQueue(queueRes.data || []);
      setDepts(deptRes.data || []);
      setDesignations(desigRes.data || {});
    } catch (err) {
      console.error('[SuperAdmin_Home] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh queue every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleOpenReview = (issueId) => {
    setSelectedIssueId(issueId);
    setDetailLoading(true);
    setRejectReason('');
    setSelectedDept('');
    setAdminDesignation('');
    apiConnector('GET', endpoints.SA_ISSUE_DETAIL_API(issueId))
      .then(setDetail)
      .catch((err) => {
        console.error('[detail fetch error]', err);
        alert('Failed to load issue details.');
        setSelectedIssueId(null);
      })
      .finally(() => setDetailLoading(false));
  };

  const handleVerify = async () => {
    if (!selectedDept) return alert('Please select a department.');
    setActionLoading(true);
    try {
      await apiConnector('PATCH', endpoints.SA_VERIFY_API(selectedIssueId), {
        department_id: parseInt(selectedDept),
        admin_designation: adminDesignation || null,
      });
      setSelectedIssueId(null);
      setDetail(null);
      fetchData();
    } catch (err) {
      alert(err?.data?.message || 'Failed to verify.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (rejectReason.length < 5) return alert('Rejection reason must be at least 5 characters.');
    setActionLoading(true);
    try {
      await apiConnector('PATCH', endpoints.SA_REJECT_API(selectedIssueId), { reason: rejectReason });
      setSelectedIssueId(null);
      setDetail(null);
      fetchData();
    } catch (err) {
      alert(err?.data?.message || 'Failed to reject.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter queue based on search query
  const filteredQueue = queue.filter((issue) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      issue.short_id.toLowerCase().includes(query) ||
      (issue.address && issue.address.toLowerCase().includes(query)) ||
      (issue.category && issue.category.toLowerCase().includes(query)) ||
      (issue.description && issue.description.toLowerCase().includes(query))
    );
  });

  // Calculate designation options for verification based on selected dept
  const selectedDeptObj = departments.find((d) => String(d.id) === String(selectedDept));
  const deptType = selectedDeptObj?.dept_type;
  const designationOptions = deptType ? (designations[deptType]?.['ADMIN'] || []) : [];

  return (
    <div className="flex min-h-screen bg-[#f3f5f9] text-gray-800 font-sans">
      {/* Sidebar Navigation */}
      <SuperAdmin_Navbar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 pr-6 py-8 transition-all duration-300 ${isCollapsed ? 'md:pl-[118px]' : 'md:pl-[294px]'}`}>
        
        {/* Main Content Body */}
        <main className="space-y-6">
          
          {/* Welcome & Navigation header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 border-gray-200">
            <div>
              <h1 className="text-2xl font-black text-gray-955 tracking-tight flex items-center gap-2.5">
                <span>Welcome back, Superadmin!</span>
              </h1>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                <FiShield className="w-3.5 h-3.5 text-gray-400" />
                <span>System Intake & Triage Console</span>
              </p>
            </div>
            
            <button 
              onClick={fetchData}
              className="self-start sm:self-center px-4.5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-xs font-extrabold rounded-sm transition duration-150 flex items-center gap-2 border border-gray-200/80 shadow-xs cursor-pointer group"
            >
              <FiRefreshCw className="w-3.5 h-3.5 text-gray-500 transition-transform duration-500 group-hover:rotate-180" />
              <span>Refresh Queue</span>
            </button>
          </div>

          {/* Stat-tiles Grid */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Submitted Queries */}
              <div className="bg-white p-5 rounded-sm border border-gray-200/65 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-none">Submitted Queries</span>
                  <span className="text-2xl font-black text-gray-900 mt-2 block">
                    {stats.pending_count}
                  </span>
                </div>
                <div className="p-3 rounded-md bg-sky-50 text-sky-600 border border-sky-100 flex-shrink-0 ml-2">
                  <FiFileText className="w-5 h-5" />
                </div>
              </div>

              {/* Assigned */}
              <div className="bg-white p-5 rounded-sm border border-gray-200/65 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-none">Assigned</span>
                  <span className="text-2xl font-black text-gray-900 mt-2 block">
                    {stats.assigned_count}
                  </span>
                </div>
                <div className="p-3 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0 ml-2">
                  <FiUsers className="w-5 h-5" />
                </div>
              </div>

              {/* In-Progress */}
              <div className="bg-white p-5 rounded-sm border border-gray-200/65 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-none">In-Progress</span>
                  <span className="text-2xl font-black text-gray-900 mt-2 block">
                    {stats.in_progress_count}
                  </span>
                </div>
                <div className="p-3 rounded-md bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0 ml-2">
                  <FaWrench className="w-4.5 h-4.5" />
                </div>
              </div>

              {/* Resolved */}
              <div className="bg-white p-5 rounded-sm border border-gray-200/65 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-none">Resolved</span>
                  <span className="text-2xl font-black text-gray-900 mt-2 block">
                    {stats.resolved_count}
                  </span>
                </div>
                <div className="p-3 rounded-md bg-green-50 text-green-600 border border-green-100 flex-shrink-0 ml-2">
                  <FiCheckCircle className="w-5 h-5" />
                </div>
              </div>

            </div>
          )}

          {/* Triaging grid content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Intake queue list (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 rounded-sm border border-gray-200 shadow-xs">
                {/* <div className="flex items-center gap-2"> */}
                <h2 className="text-base font-extrabold text-gray-900">
                  Triaging Queue
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-100 font-extrabold">
                  {filteredQueue.length} pending
                </span>
                {/* </div> */}
                
                {/* Search query box */}
                {/* <div className="relative w-full sm:max-w-xs">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <FiSearch className="w-4 h-4 text-gray-400" />
                  </span>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search query ID, category, or address..." 
                    className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200/85 pl-10 pr-4 py-2 rounded-sm text-xs placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition shadow-inner"
                  />
                </div> */}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-sm border border-gray-200">
                  <div className="w-10 h-10 border-4 border-blue-600/25 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="text-xs text-gray-500 font-bold mt-3 animate-pulse">Loading triaging queue...</span>
                </div>
              ) : filteredQueue.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-sm p-16 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-3 text-gray-400">
                    <FaRegSmile className="w-7 h-7" />
                  </div>
                  <h3 className="font-extrabold text-gray-800 text-sm">Intake Queue Clear</h3>
                  <p className="text-gray-550 text-xs mt-1 max-w-sm">
                    {searchQuery ? 'No queries match your search query.' : 'Awesome! There are no submitted issues waiting for verification.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {filteredQueue.map((issue) => (
                    <IssueCard 
                      key={issue.id}
                      issue={issue}
                      onClick={() => handleOpenReview(issue.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Departments sidebar overview (1/3 width) */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-5 rounded-sm border border-gray-200 shadow-xs">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Active Departments
                </h3>
                {departments.length === 0 ? (
                  <p className="text-xs text-gray-500 font-medium">No departments registered.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {departments.map((dept) => (
                      <div key={dept.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-xs font-extrabold text-gray-900 block truncate tracking-wide leading-tight">{dept.name}</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mt-1 leading-none">{dept.dept_type}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-sm bg-blue-50 text-blue-600 border border-blue-100 font-bold">
                            💼 {dept.worker_count} staff
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </main>
      </div>

      {/* Review & Triage Overlay Modal */}
      {selectedIssueId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-gray-50 rounded-sm border border-gray-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-100 text-blue-600">
                  <FiInfo className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base leading-none">
                    {detail ? (CATEGORY_LABELS[detail.issue.category] || detail.issue.category) : 'Loading Issue...'}
                  </h3>
                  {detail && (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 mt-1 block">
                      ID: #{detail.issue.short_id}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedIssueId(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition duration-150 cursor-pointer animate-pulse"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-blue-600/25 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold text-gray-500 mt-3 animate-pulse">Loading details...</span>
                </div>
              ) : detail ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Media & Primary Info (2/3 width) */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Images Section */}
                    <div className="bg-white p-5 rounded-md border border-gray-150 shadow-sm">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Images Attached</h4>
                      {detail.images.filter(i => i.image_type === 'REPORT').length === 0 ? (
                        <div className="bg-gray-50 rounded-xl border border-gray-150/60 py-10 text-center text-sm text-gray-500 font-medium">
                          No images attached to this complaint.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {detail.images.filter(i => i.image_type === 'REPORT').map((img) => (
                            <a 
                              key={img.id}
                              href={img.image_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="relative aspect-square rounded-sm overflow-hidden bg-gray-100 group cursor-pointer block shadow-sm border border-gray-150"
                            >
                              <img 
                                src={img.image_url} 
                                alt="Evidence" 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Description Section */}
                    <div className="bg-white p-5 rounded-md border border-gray-150 shadow-sm">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Citizen Description</h4>
                      <div className="text-sm text-gray-650 whitespace-pre-wrap leading-relaxed">
                        {detail.issue.description || 'No description was provided.'}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Map & Metadata Sidebar (1/3 width) */}
                  <div className="lg:col-span-1 space-y-6">
                    
                    {/* Map & Coordinates */}
                    <div className="bg-white p-5 rounded-md border border-gray-150 shadow-sm space-y-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Geographic Location</h4>
                      
                      {/* Leaflet Map */}
                      {detail.issue.lat && detail.issue.lng ? (
                        <div className="rounded-sm overflow-hidden border border-gray-200 shadow-inner">
                          <MapContainer
                            key={`${detail.issue.lat}-${detail.issue.lng}`}
                            center={[detail.issue.lat, detail.issue.lng]}
                            zoom={16}
                            scrollWheelZoom={false}
                            style={{ height: '180px', width: '100%' }}
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={[detail.issue.lat, detail.issue.lng]}>
                              <Popup>
                                <strong className="text-xs">{detail.issue.short_id}</strong><br />
                                <span className="text-[10px] text-gray-500">{detail.issue.address || 'Reported Location'}</span>
                              </Popup>
                            </Marker>
                          </MapContainer>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${detail.issue.lat},${detail.issue.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold border-t border-gray-150 flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer"
                          >
                            🧭 Navigate to site (Google Maps)
                          </a>
                        </div>
                      ) : (
                        <div className="bg-gray-50 py-10 rounded-sm border border-gray-150 text-center text-xs text-gray-400 font-bold">
                          No GPS Coordinates Available
                        </div>
                      )}

                      {/* Address */}
                      <div className="text-xs text-gray-700 bg-gray-50/50 p-3 rounded-sm flex items-center gap-2 border border-gray-150">
                        <FiMapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Reported Address</span>
                          <span className="leading-relaxed block font-medium text-gray-600">{detail.issue.address || 'No location address provided.'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Card */}
                    <div className="bg-white p-5 rounded-md border border-gray-155 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Metrics</h4>
                      
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                          <span className="flex items-center gap-1.5"><FiUsers className="w-3.5 h-3.5 text-gray-400" /> Endorsements</span>
                          <span className="text-gray-900 font-bold">{detail.issue.report_count}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                          <span className="flex items-center gap-1.5"><FiBarChart2 className="w-3.5 h-3.5 text-gray-400" /> Priority Score</span>
                          <span className="text-red-600 font-black">{detail.issue.priority_score}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                          <span className="flex items-center gap-1.5"><FiCalendar className="w-3.5 h-3.5 text-gray-400" /> Created</span>
                          <span className="text-gray-900 font-medium">{new Date(detail.issue.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                <p className="text-center text-sm text-gray-500 py-10">Failed to load details.</p>
              )}
            </div>

            {/* Action Bar / verify or reject */}
            {detail && (
              <div className="px-6 py-4.5 border-t border-gray-100 bg-gray-100 flex flex-col md:flex-row gap-5">
                
                {/* Verify Column */}
                <div className="flex-1 bg-white p-4.5 rounded-md border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">✅ Verify & Dispatch</h4>
                    
                    {/* Department Dropdown */}
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Select Department</label>
                    <select
                      value={selectedDept}
                      onChange={(e) => { setSelectedDept(e.target.value); setAdminDesignation(''); }}
                      className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold p-2.5 rounded-sm focus:outline-none mb-3 cursor-pointer"
                    >
                      <option value="">Choose department...</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>

                    {/* Designation Dropdown */}
                    {designationOptions.length > 0 && (
                      <>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Select Admin Level</label>
                        <select
                          value={adminDesignation}
                          onChange={(e) => setAdminDesignation(e.target.value)}
                          className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold p-2.5 rounded-sm focus:outline-none mb-4 cursor-pointer"
                        >
                          <option value="">Default (Department Intake)</option>
                          {designationOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={actionLoading || !selectedDept}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-xs font-extrabold rounded-sm shadow-sm transition cursor-pointer"
                  >
                    {actionLoading ? 'Dispatching...' : 'Verify & Dispatch'}
                  </button>
                </div>

                {/* Reject Column */}
                <div className="flex-1 bg-white p-4.5 rounded-md border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">❌ Reject Complaint</h4>
                    
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Reason for Rejection</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Specify rejection reason (e.g. invalid location, duplicate submission, out of municipal scope)..."
                      className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium p-2.5 rounded-sm focus:outline-none h-[88px] resize-none mb-3"
                    />
                  </div>

                  <button
                    onClick={handleReject}
                    disabled={actionLoading || rejectReason.length < 5}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-xs font-extrabold rounded-sm shadow-sm transition cursor-pointer"
                  >
                    {actionLoading ? 'Rejecting...' : 'Reject Complaint'}
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default SuperAdmin_Home;
