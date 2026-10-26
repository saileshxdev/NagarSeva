/**
 * components/common/AuditLogs.jsx
 *
 * Reusable vertical timeline tracker showing the status transitions,
 * notes, and executor name for a given civic issue/complaint.
 */
import { useEffect, useState } from 'react';
import { apiConnector } from '../../services/apiConnector';
import { endpoints } from '../../services/api';
import { FiClock, FiUser, FiInfo, FiMessageSquare } from 'react-icons/fi';

const STATUS_LABELS = {
  SUBMITTED: 'Submitted',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  NOT_SATISFIED: 'Not Satisfied',
};

const STATUS_COLORS = {
  SUBMITTED: 'bg-sky-500 border-sky-200',
  VERIFIED: 'bg-emerald-500 border-emerald-200',
  REJECTED: 'bg-red-500 border-red-200',
  ASSIGNED: 'bg-purple-500 border-purple-200',
  IN_PROGRESS: 'bg-amber-500 border-amber-200',
  RESOLVED: 'bg-emerald-500 border-emerald-200',
  NOT_SATISFIED: 'bg-red-550 border-red-200',
};

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function AuditLogs({ issueId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!issueId) return;

    async function fetchLogs() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiConnector('GET', `${endpoints.GET_ISSUE_AUDIT_LOGS_API(issueId)}`);
        setLogs(res.data || []);
      } catch (err) {
        setError(err?.data?.message || 'Failed to load status history.');
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [issueId]);

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center gap-2 text-xs text-gray-400 font-bold select-none">
        <div className="w-4 h-4 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <span>Retrieving status timeline…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-[10px] font-bold text-red-500 bg-red-50/50 p-3 border border-red-100 rounded-sm select-none">
        ⚠️ {error}
      </div>
    );
  }

  // Base list always includes the submission step
  return (
    <div className="space-y-3.5 select-none">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Status Trail Tracker</span>
      
      {logs.length === 0 ? (
        <div className="p-4 bg-gray-100 rounded-sm text-xs shadow-sm font-semibold text-gray-500 flex items-center gap-2">
          <FiInfo className="w-4 h-4 text-blue-500 shrink-0" />
          <span>No updates logged yet. Issue is currently under review.</span>
        </div>
      ) : (
        <div className="relative bg-gray border-l border-gray-200 ml-2.5 pl-6 space-y-6 py-2">
          {logs.map((log, idx) => {
            const stepColor = STATUS_COLORS[log.to_status] || 'bg-gray-400 border-gray-200';
            const fromLabel = STATUS_LABELS[log.from_status];
            const toLabel = STATUS_LABELS[log.to_status] || 'Updated';

            return (
              <div key={log.id || idx} className="relative group">
                
                {/* Timeline Dot Indicator */}
                <div className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 ${stepColor} z-10 transition duration-150 group-hover:scale-125`} />

                {/* Log Details */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <span className="text-xs font-extrabold text-gray-900 leading-none">
                      {fromLabel ? (
                        <>
                          <span className="line-through text-gray-400 font-medium mr-1.5">{fromLabel}</span>
                          <span className="text-blue-600">&rarr;</span>
                          <span className="ml-1.5">{toLabel}</span>
                        </>
                      ) : (
                        `Status Set: ${toLabel}`
                      )}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                      <FiClock className="w-3 h-3 shrink-0" />
                      <span>{formatDateTime(log.created_at)}</span>
                    </span>
                  </div>

                  {/* Note message box */}
                  {log.note && (
                    <div className="p-3 bg-gray-100 shadow-sm rounded-sm text-[11px] text-gray-600 font-semibold leading-relaxed flex items-start gap-1.5 max-w-lg shadow-inner">
                      <FiMessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <p>{log.note}</p>
                    </div>
                  )}

                  {/* Executor info */}
                  <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1 leading-none select-none">
                    <FiUser className="w-3 h-3 shrink-0" />
                    <span>Updated by: {log.changed_by_name || 'System Auto-Route'}</span>
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
