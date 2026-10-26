import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Admin_Navbar from '../components/core/admin/Admin_Navbar';
import IssueDetailsModal from '../components/core/admin/IssueDetailsModal';
import IssueCard from '../components/core/admin/IssueCard';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import { 
  FiRefreshCw, 
  FiSearch,
  FiBriefcase,
  FiMail,
  FiCheckCircle,
  FiXCircle,
  FiTrendingUp,
  FiAward
} from 'react-icons/fi';
import { FaBuilding, FaWrench, FaHardHat } from 'react-icons/fa';

const Admin_FieldWorkers = () => {
  const { user } = useSelector((state) => state.auth);

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Expandable accordion states
  const [expandedWorkerId, setExpandedWorkerId] = useState(null);
  const [workerIssues, setWorkerIssues] = useState({});
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Persistent sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('admin-sidebar-collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setExpandedWorkerId(null);
    setWorkerIssues({});
    try {
      const res = await apiConnector('GET', endpoints.ADMIN_WORKERS_API);
      setWorkers(res.data || []);
    } catch (err) {
      console.error('[Admin_FieldWorkers] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter workers based on name or designation search query
  const filteredWorkers = workers.filter((worker) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      worker.name.toLowerCase().includes(query) ||
      (worker.designation && worker.designation.toLowerCase().includes(query)) ||
      (worker.email && worker.email.toLowerCase().includes(query))
    );
  });

  const handleWorkerClick = async (workerId) => {
    if (expandedWorkerId === workerId) {
      setExpandedWorkerId(null);
      return;
    }
    setExpandedWorkerId(workerId);
    if (!workerIssues[workerId]) {
      setIssuesLoading(true);
      try {
        const res = await apiConnector('GET', endpoints.ADMIN_WORKER_ISSUES_API(workerId));
        setWorkerIssues((prev) => ({ ...prev, [workerId]: res.data || [] }));
      } catch (err) {
        console.error('[Admin_FieldWorkers] fetch worker issues error:', err);
      } finally {
        setIssuesLoading(false);
      }
    }
  };

  const handleAssign = async (issueId, workerId) => {
    setActionLoading(true);
    try {
      await apiConnector('PATCH', endpoints.ADMIN_ASSIGN_API(issueId), { assigned_to: workerId });
      setSelectedIssueId(null);
      
      // Reload stats and clear expanded issues to fetch fresh updates
      fetchData();
    } catch (err) {
      alert(err?.data?.message || 'Failed to reassign issue.');
    } finally {
      setActionLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 7.0) return 'text-green-600 bg-green-50 border-green-150';
    if (score >= 4.0) return 'text-amber-600 bg-amber-50 border-amber-150';
    return 'text-blue-600 bg-blue-50 border-blue-150';
  };

  return (
    <div className="flex min-h-screen bg-[#f3f5f9] text-gray-800 font-sans">
      {/* Sidebar Navigation */}
      <Admin_Navbar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 pr-6 py-8 transition-all duration-300 ${isCollapsed ? 'md:pl-[118px]' : 'md:pl-[294px]'}`}>
        
        {/* Page Body */}
        <main className="space-y-6">
          
          {/* Welcome & Navigation header */}
          <div className="flex flex-col border-b pb-4 border-gray-200 sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-955 tracking-tight flex items-center gap-2.5">
                <span>👷 Field Workers Directory</span>
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
              <span>Refresh Workers</span>
            </button>
          </div>

          {/* Search bar row */}
          {/* <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 bg-white p-3 rounded-sm border border-gray-200/80 shadow-xs">
            <div className="relative w-full sm:max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <FiSearch className="w-4 h-4 text-gray-400" />
              </span>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by worker name, designation, or email..." 
                className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200/85 pl-10 pr-4 py-2 rounded-sm text-xs placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition shadow-inner"
              />
            </div>
          </div> */}

          {/* Workers list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-sm border border-gray-200 shadow-xs">
              <div className="w-10 h-10 border-4 border-blue-600/25 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm font-semibold text-gray-500 mt-3 animate-pulse">Loading workers directory...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <h2 className="text-lg font-black text-gray-900">
                  Staff Members
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-extrabold">
                  {filteredWorkers.length} Total
                </span>
              </div>

              {filteredWorkers.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-sm p-16 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-4 text-gray-400">
                    <FaHardHat className="w-8 h-8" />
                  </div>
                  <h3 className="font-extrabold text-gray-800 text-base">No Field Workers Found</h3>
                  <p className="text-gray-500 text-sm mt-1 max-w-sm">
                    {searchQuery ? 'No field workers match your search parameters.' : 'No field workers are currently registered under your department.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredWorkers.map((worker) => (
                    <div 
                      key={worker.id}
                      className="bg-white border border-gray-200 rounded-sm p-5 shadow-xs hover:shadow-md transition-all duration-400 flex flex-col cursor-pointer w-full"
                      onClick={() => handleWorkerClick(worker.id)}
                    >
                      {/* Worker summary header */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar Initials Badge */}
                          <div className="w-11 h-11 rounded-sm bg-gradient-to-tr from-[#1e2a5a] to-[#2d3f82] text-white flex items-center justify-center font-extrabold text-sm shadow-sm flex-shrink-0">
                            {worker.name ? worker.name[0].toUpperCase() : 'W'}
                          </div>
                          
                          <div className="min-w-0">
                            <span className="font-black text-sm text-gray-900 block truncate leading-tight">{worker.name}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-1.5 leading-none">
                              {worker.designation || 'Field Worker'}
                            </span>
                          </div>
                        </div>

                        {/* Email */}
                        <div className="text-xs text-gray-500 font-medium truncate flex items-center gap-1.5 max-w-xs">
                          <FiMail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>{worker.email}</span>
                        </div>

                        {/* Statistics inline gauges */}
                        <div className="flex items-center gap-4 flex-wrap lg:flex-nowrap">
                          {/* In Progress */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-blue-50 border border-blue-100/50 px-2.5 py-1 rounded-sm font-semibold">
                            <FaWrench className="w-3 h-3 text-blue-500" />
                            <span>In Progress: <strong className="text-blue-700 font-black">{worker.active_count}</strong></span>
                          </div>

                          {/* Resolved */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-green-50 border border-green-100/50 px-2.5 py-1 rounded-sm font-semibold">
                            <FiCheckCircle className="w-3.5 h-3.5 text-green-500" />
                            <span>Resolved: <strong className="text-green-700 font-black">{worker.resolved_count}</strong></span>
                          </div>

                          {/* Not Satisfied */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-red-50 border border-red-100/50 px-2.5 py-1 rounded-sm font-semibold">
                            <FiXCircle className="w-3.5 h-3.5 text-red-500" />
                            <span>Not Satisfied: <strong className="text-red-700 font-black">{worker.rejected_count}</strong></span>
                          </div>

                          {/* Score Badge */}
                          <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-sm border ${getScoreColor(worker.worker_score)} font-bold`}>
                            <FiAward className="w-3.5 h-3.5" />
                            <span>Score: {worker.worker_score}</span>
                          </div>
                        </div>
                      </div>

                      {/* Expandable issues drawer section */}
                      {expandedWorkerId === worker.id && (
                        <div 
                          className="mt-5 border-t border-gray-100 pt-5 space-y-4"
                          onClick={(e) => e.stopPropagation()} // Prevent row collapse on interactive card click
                        >
                          <div className="flex items-center justify-between px-1">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                              Assigned Complaints Queue
                            </h4>
                          </div>

                          {issuesLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="w-6 h-6 border-2 border-blue-600/25 border-t-blue-600 rounded-full animate-spin"></div>
                              <span className="text-xs text-gray-500 font-semibold ml-2">Loading tasks...</span>
                            </div>
                          ) : !workerIssues[worker.id] || workerIssues[worker.id].length === 0 ? (
                            <div className="bg-gray-50 rounded-sm border border-gray-150/60 p-8 text-center text-xs text-gray-500 font-medium">
                              No complaints are currently assigned to this worker.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3.5">
                              {workerIssues[worker.id].map((issue) => (
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
                    </div>
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

export default Admin_FieldWorkers;
