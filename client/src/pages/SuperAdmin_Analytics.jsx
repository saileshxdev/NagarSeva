/**
 * pages/SuperAdmin_Analytics.jsx
 *
 * Analytics dashboard for SuperAdmin.
 * Data is fetched here and passed down to three chart components:
 *   IssueLineChart — received vs resolved over time
 *   IssuePieChart  — verification breakdown (verified / rejected / pending)
 *   DeptBarChart   — issues per department
 */
import { useEffect, useState, useCallback } from 'react';
import SuperAdmin_Navbar from '../components/core/superadmin/SuperAdmin_Navbar';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import { FiRefreshCw, FiBarChart2, FiAlertTriangle } from 'react-icons/fi';

import IssueLineChart from '../components/core/superadmin/charts/IssueLineChart';
import IssuePieChart  from '../components/core/superadmin/charts/IssuePieChart';
import DeptBarChart   from '../components/core/superadmin/charts/DeptBarChart';

export default function SuperAdmin_Analytics() {
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem('superadmin-sidebar-collapsed') === 'true'
  );
  useEffect(() => {
    localStorage.setItem('superadmin-sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);

  const [linePeriod, setLinePeriod] = useState('monthly');
  const [barPeriod,  setBarPeriod]  = useState('monthly');

  const [lineData, setLineData] = useState([]);
  const [pieData,  setPieData]  = useState(null);
  const [barData,  setBarData]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Line + pie share one call (line period); bar gets its own if periods differ
      const [lineRes, barRes] = await Promise.all([
        apiConnector('GET', `${endpoints.SA_ANALYTICS_API}?period=${linePeriod}`),
        barPeriod !== linePeriod
          ? apiConnector('GET', `${endpoints.SA_ANALYTICS_API}?period=${barPeriod}`)
          : null,
      ]);

      setLineData(lineRes.line || []);
      setPieData(lineRes.pie  || null);
      setBarData((barRes ?? lineRes).bar || []);
    } catch (err) {
      setError(err?.data?.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [linePeriod, barPeriod]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  return (
    <div className="flex min-h-screen bg-[#f3f5f9] text-gray-800 font-sans">
      <SuperAdmin_Navbar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      <div className={`flex-1 flex flex-col min-w-0 pr-6 py-8 transition-all duration-300 ${isCollapsed ? 'md:pl-[118px]' : 'md:pl-[294px]'}`}>
        <main className="space-y-6">

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 border-gray-200">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Analytics</h1>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                <FiBarChart2 className="w-3.5 h-3.5 text-gray-400" />
                System-wide issue trends and department performance
              </p>
            </div>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="self-start sm:self-center px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-xs font-extrabold rounded-sm transition flex items-center gap-2 border border-gray-200 cursor-pointer group disabled:opacity-60"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-500 group-hover:rotate-180 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-sm">
              <FiAlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Chart 1 — Line */}
          <IssueLineChart
            data={lineData}
            period={linePeriod}
            loading={loading}
            onPeriodChange={setLinePeriod}
          />

          {/* Charts 2 + 3 side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IssuePieChart
              pieData={pieData}
              loading={loading}
            />
            <DeptBarChart
              data={barData}
              period={barPeriod}
              loading={loading}
              onPeriodChange={setBarPeriod}
            />
          </div>

        </main>
      </div>
    </div>
  );
}
