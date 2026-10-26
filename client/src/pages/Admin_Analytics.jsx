/**
 * pages/Admin_Analytics.jsx
 *
 * Analytics dashboard for the Department Admin.
 *
 * Chart 1 — Line: received / resolved / not-satisfied over time (monthly/yearly)
 * Chart 2 — Pie:  In-Progress vs Assigned (current snapshot)
 * Chart 3 — Pie:  Resolved vs Not-Satisfied (all time)
 * Chart 4 — Line: per-worker breakdown (in-progress / resolved / not-satisfied)
 */
import { useEffect, useState, useCallback } from 'react';
import Admin_Navbar from '../components/core/admin/Admin_Navbar';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import { FiRefreshCw, FiBarChart2, FiAlertTriangle } from 'react-icons/fi';

import AdminTrendLineChart  from '../components/core/admin/charts/AdminTrendLineChart';
import AdminStatusPie1      from '../components/core/admin/charts/AdminStatusPie1';
import AdminStatusPie2      from '../components/core/admin/charts/AdminStatusPie2';
import AdminWorkerLineChart from '../components/core/admin/charts/AdminWorkerLineChart';

export default function Admin_Analytics() {
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem('admin-sidebar-collapsed') === 'true'
  );
  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);

  const [period,   setPeriod]   = useState('monthly');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiConnector('GET', `${endpoints.ADMIN_ANALYTICS_API}?period=${period}`);
      setData(res);
    } catch (err) {
      setError(err?.data?.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  return (
    <div className="flex min-h-screen bg-[#f3f5f9] text-gray-800 font-sans">
      <Admin_Navbar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      <div className={`flex-1 flex flex-col min-w-0 pr-6 py-8 transition-all duration-300 ${isCollapsed ? 'md:pl-28' : 'md:pl-72'}`}>
        <main className="px-6 space-y-6">

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 border-gray-200">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Analytics</h1>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                <FiBarChart2 className="w-3.5 h-3.5 text-gray-400" />
                Department-level issue trends and worker performance
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

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-sm">
              <FiAlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Chart 1 — Issue trend line chart (full width) */}
          <AdminTrendLineChart
            data={data?.trend || []}
            period={period}
            loading={loading}
            onPeriodChange={setPeriod}
          />

          {/* Charts 2 & 3 — Pie charts side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdminStatusPie1
              data={data?.statusPie1 || null}
              loading={loading}
            />
            <AdminStatusPie2
              data={data?.statusPie2 || null}
              loading={loading}
            />
          </div>

          {/* Chart 4 — Per-worker line chart (full width) */}
          <AdminWorkerLineChart
            data={data?.workers || []}
            loading={loading}
          />

        </main>
      </div>
    </div>
  );
}
