import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
  FiSearch
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

const Admin_Home = () => {
  const { user } = useSelector((state) => state.auth);

  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Sidebar collapse state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('admin-sidebar-collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, queueRes, workersRes] = await Promise.all([
        apiConnector('GET', endpoints.ADMIN_STATS_API),
        apiConnector('GET', endpoints.ADMIN_QUEUE_API),
        apiConnector('GET', endpoints.ADMIN_WORKERS_API),
      ]);
      setStats(statsRes);
      setQueue(queueRes.data || []);
      setWorkers(workersRes.data || []);
    } catch (err) {
      console.error('[Admin_Home] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssign = async (issueId, workerId) => {
    setActionLoading(true);
    try {
      await apiConnector('PATCH', endpoints.ADMIN_ASSIGN_API(issueId), { assigned_to: workerId });
      fetchData();
    } catch (err) {
      alert(err?.data?.message || 'Failed to assign.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter issues based on search input query
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
      <div className={`flex-1 flex flex-col min-w-0 pr-6 py-8 transition-all duration-300 ${isCollapsed ? 'md:pl-28' : 'md:pl-72'}`}>

        {/* Dashboard Main Grid Area */}
        <main className="px-6 space-y-6">

          {/* Top welcome section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-955 tracking-tight flex items-center gap-2">
                <span>Welcome back, {user?.name || 'Admin'}!</span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mt-1"></span>
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
              className="self-start sm:self-center px-4.5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-xs font-extrabold rounded-2xl transition-all duration-150 flex items-center gap-2 border border-gray-200/80 shadow-xs cursor-pointer group"
            >
              <FiRefreshCw className="w-3.5 h-3.5 text-gray-500 transition-transform duration-500 group-hover:rotate-180" />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {/* Stats Grid - Matching the soft rounded white mockup cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div className="bg-white p-5 rounded-xs border border-gray-200/60 shadow-xs hover:shadow-sm transition-all duration-150 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-none">Pending Allocation</span>
                <span className="text-2xl font-black text-gray-900 mt-2 block">
                  {stats ? stats.pending_assignment : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/50 flex-shrink-0 ml-2">
                <FiClock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xs border border-gray-200/60 shadow-xs hover:shadow-sm transition-all duration-150 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-none">In Progress</span>
                <span className="text-2xl font-black text-gray-900 mt-2 block">
                  {stats ? stats.in_progress : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50 flex-shrink-0 ml-2">
                <FaWrench className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xs border border-gray-200/60 shadow-xs hover:shadow-sm transition-all duration-150 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-none">Resolved Issues</span>
                <span className="text-2xl font-black text-gray-900 mt-2 block">
                  {stats ? stats.resolved : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-green-50 text-green-600 border border-green-100/50 flex-shrink-0 ml-2">
                <FiCheckCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xs border border-gray-200/60 shadow-xs hover:shadow-sm transition-all duration-150 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-none">Field Workers</span>
                <span className="text-2xl font-black text-gray-900 mt-2 block">
                  {stats ? stats.worker_count : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50 flex-shrink-0 ml-2">
                <FaHardHat className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>

          {/* Content Loading & Columns Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200 shadow-xs">
              <div className="w-10 h-10 border-4 border-blue-600/25 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm font-semibold text-gray-500 mt-3 animate-pulse">Synchronizing dashboard details...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left/Middle block: Issues Queue */}
              <div className="lg:col-span-2 space-y-4">

                {/* Header row with inline search */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2 px-2">
                  {/* <div className="flex items-center gap-2.5"> */}
                  <h2 className="text-lg font-black text-gray-900">
                    Department Issues Queue
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-extrabold">
                    {filteredQueue.length} Issues
                  </span>
                  

                  {/* Inline Queue Search
                  <div className="relative w-full max-w-xs">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <FiSearch className="w-3.5 h-3.5 text-gray-400" />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search issues, addresses..."
                      className="w-full bg-white border border-gray-200/80 pl-9 pr-4 py-1.5 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:border-blue-500 transition shadow-xs"
                    />
                  </div> */}
                </div>

                {filteredQueue.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-xs">
                    <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mb-4">
                      <FaRegSmile className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="font-extrabold text-gray-800 text-base">All clear!</h3>
                    <p className="text-gray-500 text-sm mt-1 max-w-sm">
                      {searchQuery ? 'No issues matching your search query.' : 'No complaints are pending worker allocation in your department.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
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

              {/* Right block: Department Staff Overview */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="text-lg font-black text-gray-900 mb-2">
                  Staff Directory
                </h2>

                <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                    Field Workers Grid
                  </h3>

                  {workers.length === 0 ? (
                    <p className="text-sm text-gray-500 font-medium py-4 text-center">
                      No workers assigned to this department yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {workers.map((worker) => (
                        <div
                          key={worker.id}
                          className="p-3.5 rounded-sm border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-all flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-extrabold text-sm text-gray-900 block truncate">{worker.name}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5">
                              {worker.designation || 'Field Worker'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <WorkloadBadge count={worker.active_count} />
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-semibold mt-0.5">
                              <FiAward className="w-3.5 h-3.5 text-amber-500" />
                              <span>{worker.resolved_count} resolved</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Issue Details Modal */}
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

export default Admin_Home;