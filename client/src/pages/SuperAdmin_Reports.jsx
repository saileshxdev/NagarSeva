import React, { useEffect, useState, useCallback } from 'react';
import SuperAdmin_Navbar from '../components/core/superadmin/SuperAdmin_Navbar';
import IssueCard from '../components/core/admin/IssueCard';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import AuditLogs from '../components/common/AuditLogs';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FiRefreshCw, 
  FiCheckCircle, 
  FiUsers, 
  FiMapPin, 
  FiCalendar, 
  FiBarChart2, 
  FiInfo,
  FiSearch,
  FiXCircle,
  FiClock,
  FiActivity
} from 'react-icons/fi';
import { FaBuilding, FaWrench } from 'react-icons/fa';

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

const SuperAdmin_Reports = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ASSIGNED'); // 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'NOT_SATISFIED'

  // Modal detail states
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Persistent sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('superadmin-sidebar-collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('superadmin-sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queueRes = await apiConnector('GET', `${endpoints.SA_QUEUE_API}?status=${activeTab}`);
      setQueue(queueRes.data || []);
    } catch (err) {
      console.error('[SuperAdmin_Reports] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenReview = (issueId) => {
    setSelectedIssueId(issueId);
    setDetailLoading(true);
    apiConnector('GET', endpoints.SA_ISSUE_DETAIL_API(issueId))
      .then(setDetail)
      .catch((err) => {
        console.error('[detail fetch error]', err);
        alert('Failed to load issue details.');
        setSelectedIssueId(null);
      })
      .finally(() => setDetailLoading(false));
  };

  // Filter list based on search query
  const filteredQueue = queue.filter((issue) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      issue.short_id.toLowerCase().includes(query) ||
      (issue.address && issue.address.toLowerCase().includes(query)) ||
      (issue.category && issue.category.toLowerCase().includes(query)) ||
      (issue.description && issue.description.toLowerCase().includes(query)) ||
      (issue.department_name && issue.department_name.toLowerCase().includes(query))
    );
  });

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
                <span>System Reports</span>
              </h1>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                <FiActivity className="w-3.5 h-3.5 text-gray-400" />
                <span>Track status metrics and assignments globally</span>
              </p>
            </div>
            
            <button 
              onClick={fetchData}
              className="self-start sm:self-center px-4.5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-xs font-extrabold rounded-sm transition duration-150 flex items-center gap-2 border border-gray-200/80 shadow-xs cursor-pointer group"
            >
              <FiRefreshCw className="w-3.5 h-3.5 text-gray-500 transition-transform duration-500 group-hover:rotate-180" />
              <span>Refresh Reports</span>
            </button>
          </div>

          {/* Selector Bar & Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-end gap-4 bg-white p-3 rounded-sm border border-gray-200/80 shadow-xs">
            {/* Segmented Selector Buttons */}
            <div className="flex bg-gray-100 p-1 rounded-sm border border-gray-200/40 w-full lg:max-w-2xl">
              {[
                { id: 'ASSIGNED', label: 'Assigned', icon: <FiClock className="w-3.5 h-3.5" /> },
                { id: 'IN_PROGRESS', label: 'In Progress', icon: <FaWrench className="w-3 h-3" /> },
                { id: 'RESOLVED', label: 'Resolved', icon: <FiCheckCircle className="w-4 h-4" /> },
                { id: 'NOT_SATISFIED', label: 'Not Satisfied', icon: <FiXCircle className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sm text-xs font-black transition-all duration-300 cursor-pointer focus:outline-none ${
                    activeTab === tab.id
                      ? 'bg-white text-[#1e2a5a] shadow-sm font-black'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50/50'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Search Query Input */}
            {/* <div className="relative w-full lg:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <FiSearch className="w-4 h-4 text-gray-400" />
              </span>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, department, category..." 
                className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200 pl-10 pr-4 py-2.5 rounded-sm text-xs placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition shadow-inner"
              />
            </div> */}
          </div>

          {/* Reports Queue List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-sm border border-gray-200">
              <div className="w-10 h-10 border-4 border-blue-600/25 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-xs text-gray-500 font-bold mt-3 animate-pulse">Loading reports queue...</span>
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-sm p-20 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-3 text-gray-400">
                <FiInfo className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-gray-800 text-sm">No Reports Found</h3>
              <p className="text-gray-500 text-xs mt-1 max-w-sm">
                No issues are currently marked as '{activeTab.replace('_', ' ').toLowerCase()}' in this department context.
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

        </main>
      </div>

      {/* Detail Overlay Modal */}
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
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition duration-150 cursor-pointer"
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

                    {/* Status Audit Trail Tracker */}
                    <div className="bg-white p-5 rounded-md border border-gray-150 shadow-sm">
                      <AuditLogs issueId={detail.issue.id} />
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
                                <span className="text-[10px] text-gray-505">{detail.issue.address || 'Reported Location'}</span>
                              </Popup>
                            </Marker>
                          </MapContainer>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${detail.issue.lat},${detail.issue.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-gray-55 hover:bg-gray-100 text-gray-700 text-xs font-bold border-t border-gray-150 flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer"
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
                    <div className="bg-white p-5 rounded-md border border-gray-150 shadow-sm space-y-3">
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

            {/* Assignment & Status Info Footer */}
            {detail && (
              <div className="px-6 py-4.5 border-t border-gray-100 bg-gray-100 flex flex-col gap-3">
                <div className="flex items-center justify-between bg-white p-4.5 rounded-md border border-gray-200/80 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <FaBuilding className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block leading-none">Routed Department</span>
                      <span className="text-sm font-extrabold text-gray-900 mt-1 block leading-tight">
                        {detail.issue.department_name || 'Unassigned'}
                      </span>
                      {detail.issue.assigned_admin_designation && (
                        <span className="text-[10px] text-gray-500 mt-0.5 block leading-none font-medium">
                          Admin Level: {detail.issue.assigned_admin_designation}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block leading-none">Current Status</span>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider bg-indigo-50 text-indigo-600 border-indigo-150 mt-1">
                      {detail.issue.status}
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default SuperAdmin_Reports;
