import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Admin_Navbar from '../components/core/admin/Admin_Navbar';
import IssueDetailsModal from '../components/core/admin/IssueDetailsModal';
import IssueCard from '../components/core/admin/IssueCard';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import { 
  FiRefreshCw, 
  FiClock, 
  FiCheckCircle, 
  FiUsers, 
  FiMapPin, 
  FiCalendar, 
  FiBriefcase, 
  FiBarChart2, 
  FiAward,
  FiInfo,
  FiSearch,
  FiXCircle,
  FiTrendingUp,
  FiUser
} from 'react-icons/fi';
import { FaBuilding, FaWrench, FaHardHat, FaRegSmile } from 'react-icons/fa';

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

function WorkloadBadge({ count }) {
  const isBusy = count > 4;
  const isModerate = count > 2 && count <= 4;
  
  if (isBusy) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 inline-block animate-pulse"></span>
        {count} Active
      </span>
    );
  }
  if (isModerate) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 inline-block"></span>
        {count} Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-600 border border-green-100">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 inline-block"></span>
      {count} Active
    </span>
  );
}

const Admin_Reports = () => {
  const { user } = useSelector((state) => state.auth);

  // Tab State: 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
  const [activeTab, setActiveTab] = useState('IN_PROGRESS');

  const [queue, setQueue] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Persistent sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('admin-sidebar-collapsed') === 'true');

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, workersRes] = await Promise.all([
        apiConnector('GET', `${endpoints.ADMIN_QUEUE_API}?status=${activeTab}`),
        apiConnector('GET', endpoints.ADMIN_WORKERS_API),
      ]);
      setQueue(queueRes.data || []);
      setWorkers(workersRes.data || []);
    } catch (err) {
      console.error('[Admin_Reports] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssign = async (issueId, workerId) => {
    setActionLoading(true);
    try {
      await apiConnector('PATCH', endpoints.ADMIN_ASSIGN_API(issueId), { assigned_to: workerId });
      setSelectedIssueId(null);
      fetchData();
    } catch (err) {
      alert(err?.data?.message || 'Failed to assign.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter issues based on search query
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

  return (
    <div className="flex min-h-screen bg-[#f3f5f9] text-gray-800 font-sans">
      {/* Sidebar Navigation */}
      <Admin_Navbar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 pr-6 py-8 transition-all duration-300 ${isCollapsed ? 'md:pl-[118px]' : 'md:pl-[294px]'}`}>
        
        {/* Main Content Area */}
        <main className="space-y-6">
          
          {/* Welcome & Navigation header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-955 tracking-tight flex items-center gap-2.5">
                <span>🏛️ Departmental Reports</span>
              </h1>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                <FiBriefcase className="w-3.5 h-3.5 text-gray-400" />
                <span>{user?.designation || 'Department Admin'}</span>
                <span className="text-gray-300">&bull;</span>
                <FaBuilding className="w-3.5 h-3.5 text-gray-400" />
                <span>{user?.department_name || 'NagarSeva'}</span>
              </p>
            </div>
            
            <button 
              onClick={fetchData}
              className="self-start sm:self-center px-4.5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-xs font-extrabold rounded-md transition duration-150 flex items-center gap-2 border border-gray-200/80 shadow-xs cursor-pointer group"
            >
              <FiRefreshCw className="w-3.5 h-3.5 text-gray-500 transition-transform duration-500 group-hover:rotate-180" />
              <span>Refresh Reports</span>
            </button>
          </div>

          {/* Segmented Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 bg-white p-3 rounded-sm border border-gray-200/80 shadow-xs">
            <div className="flex bg-gray-100/80 p-1 rounded-xs border border-gray-200/40 w-full sm:max-w-md">
              {[
                { id: 'IN_PROGRESS', label: 'In Progress', icon: <FaWrench className="w-3.5 h-3.5" /> },
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
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* In-Queue Search input
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <FiSearch className="w-4 h-4 text-gray-400" />
              </span>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab.replace('_', ' ').toLowerCase()} issues...`} 
                className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200/85 pl-10 pr-4 py-2 rounded-2xl text-xs placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition shadow-inner"
              />
            </div> */}
          </div>

          {/* Queue of Issues Marked as Selected */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-gray-200 shadow-xs">
              <div className="w-10 h-10 border-4 border-blue-600/25 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm font-semibold text-gray-500 mt-3 animate-pulse">Loading reports queue...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <h2 className="text-lg font-black text-gray-900 capitalize">
                  {activeTab.replace('_', ' ').toLowerCase()} Queue
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-extrabold">
                  {filteredQueue.length} Total
                </span>
              </div>

              {filteredQueue.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-4 text-gray-400">
                    <FiInfo className="w-8 h-8" />
                  </div>
                  <h3 className="font-extrabold text-gray-800 text-base">No Issues Found</h3>
                  <p className="text-gray-500 text-sm mt-1 max-w-sm">
                    No departmental issues are currently in {activeTab.replace('_', ' ').toLowerCase()} state.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredQueue.map((issue) => (
                    <IssueCard 
                      key={issue.id}
                      issue={issue}
                      onClick={() => setSelectedIssueId(issue.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Details Modal */}
      {selectedIssueId && (
        <IssueDetailsModal
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          workers={workers}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
};

export default Admin_Reports;
