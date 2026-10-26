import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import FieldWorker_Navbar from '../components/core/fieldworker/FieldWorker_Navbar';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import { 
  FiRefreshCw, 
  FiClock, 
  FiCheckCircle, 
  FiCalendar, 
  FiUsers, 
  FiMapPin, 
  FiSearch,
  FiActivity,
  FiPlay,
  FiChevronRight
} from 'react-icons/fi';
import { FaWrench, FaHardHat, FaRegSmile } from 'react-icons/fa';

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

const STATUS_STYLING = {
  ASSIGNED: 'bg-amber-50 text-amber-600 border-amber-100',
  IN_PROGRESS: 'bg-blue-50 text-blue-600 border-blue-100',
  RESOLVED: 'bg-green-50 text-green-600 border-green-100',
};

const FieldWorker_Home = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [activeIssues, setActiveIssues] = useState([]);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [profile, setProfile] = useState(null);

  // Persistent sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('fieldworker-sidebar-collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('fieldworker-sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, resolvedRes, profileRes] = await Promise.all([
        apiConnector('GET', endpoints.FW_ACTIVE_API),
        apiConnector('GET', endpoints.FW_RESOLVED_API),
        apiConnector('GET', endpoints.ME_API),
      ]);
      setActiveIssues(activeRes.data || []);
      setResolvedCount(resolvedRes.data?.length || 0);
      setProfile(profileRes.user);
    } catch (err) {
      console.error('[FieldWorker_Home] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh issues list every 45 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAction = (issueId) => {
    navigate(`/field-worker/issues/${issueId}`);
  };

  // Filter issues based on search query
  const filteredIssues = activeIssues.filter((issue) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      issue.short_id.toLowerCase().includes(query) ||
      (issue.address && issue.address.toLowerCase().includes(query)) ||
      (issue.category && issue.category.toLowerCase().includes(query)) ||
      (issue.description && issue.description.toLowerCase().includes(query))
    );
  });

  const inProgressCount = activeIssues.filter((i) => i.status === 'IN_PROGRESS').length;

  return (
    <div className="flex min-h-screen bg-[#f3f5f9] text-gray-800 font-sans">
      {/* Sidebar Navigation */}
      <FieldWorker_Navbar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 pr-6 py-8 transition-all duration-300 ${isCollapsed ? 'md:pl-[118px]' : 'md:pl-[294px]'}`}>
        
        {/* Main Content Body */}
        <main className="space-y-6">
          
          {/* Welcome & Navigation header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 border-gray-200">
            <div>
              <h1 className="text-2xl font-black text-gray-955 tracking-tight flex items-center gap-2.5">
                <span>Welcome back, {profile?.name || user?.name}.</span>
              </h1>
              {profile?.designation && (
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                  <FaHardHat className="w-3.5 h-3.5 text-gray-400" />
                  <span>{profile.designation} &bull; {profile.department_name || 'ULB Department'}</span>
                </p>
              )}
            </div>
            
            <button 
              onClick={fetchData}
              className="self-start sm:self-center px-4.5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-xs font-extrabold rounded-sm transition duration-150 flex items-center gap-2 border border-gray-200/80 shadow-xs cursor-pointer group"
            >
              <FiRefreshCw className="w-3.5 h-3.5 text-gray-500 transition-transform duration-500 group-hover:rotate-180" />
              <span>Refresh Workload</span>
            </button>
          </div>

          {/* Stat-tiles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            
            {/* Assigned */}
            {/* <div className="bg-white p-5 rounded-sm border border-gray-200/65 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-none">Assigned Tasks</span>
                <span className="text-2xl font-black text-gray-900 mt-2 block">
                  {assignedCount}
                </span>
              </div>
              <div className="p-3 rounded-md bg-amber-50 text-amber-600 border border-amber-100 flex-shrink-0 ml-2">
                <FiClock className="w-5 h-5" />
              </div>
            </div> */}

            {/* In-Progress */}
            <div className="bg-white p-5 rounded-sm border border-gray-200/65 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-none">In-Progress Tasks</span>
                <span className="text-2xl font-black text-gray-900 mt-2 block">
                  {inProgressCount}
                </span>
              </div>
              <div className="p-3 rounded-md bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0 ml-2">
                <FaWrench className="w-4.5 h-4.5" />
              </div>
            </div>

            {/* Resolved */}
            <div className="bg-white p-5 rounded-sm border border-gray-200/65 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-none">Resolved Tasks</span>
                <span className="text-2xl font-black text-gray-900 mt-2 block">
                  {resolvedCount}
                </span>
              </div>
              <div className="p-3 rounded-md bg-green-50 text-green-600 border border-green-100 flex-shrink-0 ml-2">
                <FiCheckCircle className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* Workload Queue list */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 rounded-sm border border-gray-200 shadow-xs">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-gray-900">
                  Active Workload
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-extrabold">
                  {filteredIssues.length} active
                </span>
              </div>
              
              {/* Search query box */}
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <FiSearch className="w-4 h-4 text-gray-400" />
                </span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID, category, or address..." 
                  className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200 pl-10 pr-4 py-2.5 rounded-sm text-xs placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition shadow-inner"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-sm border border-gray-200">
                <div className="w-10 h-10 border-4 border-blue-600/25 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-xs text-gray-500 font-bold mt-3 animate-pulse">Loading workload list...</span>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-sm p-16 flex flex-col items-center justify-center text-center shadow-xs">
                <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-3 text-gray-400">
                  <FaRegSmile className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-gray-800 text-sm">Workload Queue Clear</h3>
                <p className="text-gray-550 text-xs mt-1 max-w-sm">
                  {searchQuery ? 'No active tasks match your search.' : 'Great job! You have no pending active tasks assigned.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredIssues.map((issue) => {
                  const category = CATEGORY_LABELS[issue.category] || issue.category;
                  return (
                    <div 
                      key={issue.id}
                      onClick={() => handleAction(issue.id)}
                      className="bg-white border border-gray-200 rounded-sm p-4.5 sm:p-5 shadow-xs hover:shadow-md transition-all duration-250 cursor-pointer hover:border-blue-200/50 hover:translate-y-[-1px] flex gap-4"
                    >
                      {issue.thumbnail ? (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-sm overflow-hidden flex-shrink-0 shadow-inner bg-gray-50">
                          <img src={issue.thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-sm flex items-center justify-center text-xl bg-gray-50 border border-gray-150 flex-shrink-0 text-gray-400">
                          {category.split(' ')[0]}
                        </div>
                      )}

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200/50">
                                #{issue.short_id}
                              </span>
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${STATUS_STYLING[issue.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {issue.status.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {issue.report_count && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                                  <FiUsers className="w-3.5 h-3.5 text-gray-400" /> {issue.report_count} reports
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                                <FiActivity className="w-3.5 h-3.5" /> Score: {issue.priority_score}
                              </span>
                            </div>
                          </div>

                          <h3 className="font-extrabold text-gray-900 text-base leading-tight mb-1">
                            {category}
                          </h3>
                          <p className="text-gray-550 text-xs font-semibold flex items-start gap-1">
                            <FiMapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span className="truncate">{issue.address || 'Location information not provided'}</span>
                          </p>
                        </div>

                        {/* Work Action Button */}
                        <div className="flex justify-end mt-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAction(issue.id); }}
                            className={`px-4.5 py-2.5 text-xs font-extrabold rounded-sm shadow-xs transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                              issue.status === 'ASSIGNED'
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            <FiPlay className="w-3.5 h-3.5" />
                            <span>{issue.status === 'ASSIGNED' ? 'Start Work' : 'Resume Work'}</span>
                            <FiChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default FieldWorker_Home;
