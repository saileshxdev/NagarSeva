/**
 * pages/UpvotedIssues.jsx
 *
 * Displays civic issues the citizen has upvoted (watching but did NOT report).
 * - Clicking a card opens the same detail modal as MyComplaints.
 * - "Remove Upvote" in the modal footer (or card footer) unwatches and removes.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import {
  FiThumbsUp, FiMapPin, FiCalendar, FiCheck,
  FiLoader, FiAlertTriangle, FiRefreshCw,
  FiUsers, FiClock, FiActivity,
} from 'react-icons/fi';
import AuditLogs from '../components/common/AuditLogs';

const CATEGORY_LABELS = {
  POTHOLE:           '🕳️ Pothole Issue',
  STREETLIGHT:       '💡 Street Light Issue',
  SEWAGE:            '🚰 Sewage Hazard',
  GARBAGE:           '🗑️ Garbage Overflow',
  WATER_SUPPLY:      '💧 Water Supply Issue',
  ROAD_DAMAGE:       '🛣️ Road Damage',
  ENCROACHMENT:      '🚧 Encroachment',
  STRAY_ANIMALS:     '🐕 Stray Animals Hazard',
  DEAD_ANIMAL:       '💀 Dead Animal Removal',
  PUBLIC_TOILET:     '🚻 Public Toilet Repair',
  DRAIN_BLOCKAGE:    '🚰 Drain Blockage',
  FALLEN_TREE:       '🌳 Fallen Tree Obstruction',
  ABANDONED_VEHICLE: '🚗 Abandoned Vehicle',
  AIR_POLLUTION:     '🌫️ Air Pollution',
  OTHER:             '📋 Civic Issue',
};

const STATUS_STYLES = {
  SUBMITTED:     { cls: 'bg-sky-50 text-sky-600 border-sky-100',           label: 'Submitted'     },
  VERIFIED:      { cls: 'bg-green-50 text-green-600 border-green-100',     label: 'Verified'      },
  REJECTED:      { cls: 'bg-red-50 text-red-600 border-red-100',           label: 'Rejected'      },
  ASSIGNED:      { cls: 'bg-purple-50 text-purple-600 border-purple-100',  label: 'Assigned'      },
  IN_PROGRESS:   { cls: 'bg-amber-50 text-amber-600 border-amber-100',     label: 'In Progress'   },
  RESOLVED:      { cls: 'bg-green-50 text-green-600 border-green-100',     label: 'Resolved'      },
  NOT_SATISFIED: { cls: 'bg-red-50 text-red-600 border-red-100',           label: 'Not Satisfied' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.SUBMITTED;
  return (
    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded border inline-block leading-none ${s.cls}`}>
      {s.label}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function UpvotedIssues() {
  const navigate = useNavigate();

  const [issues,        setIssues]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState(null);
  const [removeLoading, setRemoveLoading] = useState({});

  // Modal state
  const [selectedIssue, setSelectedIssue] = useState(null);

  async function fetchUpvoted() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await apiConnector('GET', endpoints.UPVOTED_ISSUES_API);
      setIssues(res.data || []);
    } catch (err) {
      setFetchError(err?.data?.message || 'Failed to load upvoted issues.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUpvoted(); }, []);

  async function handleRemove(issueId, e) {
    if (e) e.stopPropagation();   // prevent card click when clicking the button
    setRemoveLoading((prev) => ({ ...prev, [issueId]: true }));

    try {
      await apiConnector('DELETE', endpoints.UNWATCH_API(issueId));
      setIssues((prev) => prev.filter((i) => i.id !== issueId));
      // Close modal if the removed issue was open
      if (selectedIssue?.id === issueId) setSelectedIssue(null);
    } catch (err) {
      const status = err?.status;
      if (status === 400 || status === 404) {
        // Already unwatched — clean UI anyway
        setIssues((prev) => prev.filter((i) => i.id !== issueId));
        if (selectedIssue?.id === issueId) setSelectedIssue(null);
      }
    } finally {
      setRemoveLoading((prev) => ({ ...prev, [issueId]: false }));
    }
  }

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="bg-[#1e2a5a] text-white p-6 rounded-sm shadow-sm flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black tracking-wide flex items-center gap-2">
            <FiThumbsUp className="w-5 h-5" /> Upvoted Issues
          </h2>
          <p className="text-xs text-white/70 mt-1 font-medium leading-relaxed max-w-lg">
            Issues you've upvoted. Click any card to view details and audit trail.
            Remove upvote to unwatch.
          </p>
        </div>
        <button
          onClick={fetchUpvoted}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-sm border border-white/15 transition cursor-pointer disabled:opacity-50"
          title="Refresh"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-sm p-12 flex flex-col items-center justify-center text-center shadow-xs">
          <FiLoader className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-gray-500 font-bold mt-3 animate-pulse">Loading your upvoted issues…</p>
        </div>
      )}

      {/* Fetch error */}
      {fetchError && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-sm flex items-start gap-2.5 text-xs">
          <FiAlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{fetchError}</p>
            <button onClick={fetchUpvoted} className="mt-2 underline font-bold cursor-pointer">Retry</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !fetchError && issues.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-sm p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 text-2xl border border-gray-100 mb-3">
            👍
          </div>
          <h3 className="font-black text-gray-800 text-sm">No upvoted issues yet</h3>
          <p className="text-gray-500 text-xs mt-1 max-w-sm">
            Head to the home feed and upvote civic issues near you to track their resolution here.
          </p>
          <button
            onClick={() => navigate('/citizen')}
            className="mt-5 px-5 py-2.5 bg-[#1e2a5a] hover:bg-[#2d3f82] text-white text-xs font-bold rounded-sm transition cursor-pointer"
          >
            ← Go to Feed
          </button>
        </div>
      )}

      {/* Issues list */}
      {!loading && issues.length > 0 && (
        <div className="flex flex-col gap-4">
          {issues.map((issue) => {
            const imgs       = Array.isArray(issue.image_urls) ? issue.image_urls : [];
            const isRemoving = removeLoading[issue.id] || false;

            return (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue)}
                className="bg-white border border-gray-200 rounded-sm p-4 sm:p-5 shadow-xs flex gap-4 hover:shadow-md hover:border-blue-200/55 transition cursor-pointer select-none"
              >
                {/* Thumbnail */}
                {imgs[0] || issue.thumbnail ? (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-sm overflow-hidden shrink-0 border border-gray-100 bg-gray-50">
                    <img
                      src={imgs[0] || issue.thumbnail}
                      alt={issue.category}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-sm bg-gray-50 border border-gray-150 flex items-center justify-center text-xl shrink-0 text-gray-400">
                    📋
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-600 text-[9px] font-extrabold uppercase rounded tracking-wider">
                          <FiCheck className="w-2.5 h-2.5" /> Upvoted
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200/50">
                          #{issue.short_id}
                        </span>
                      </div>
                      <StatusBadge status={issue.status} />
                    </div>

                    <h3 className="font-extrabold text-gray-900 text-sm capitalize">
                      {CATEGORY_LABELS[issue.category] ?? issue.category?.replace(/_/g, ' ').toLowerCase()}
                    </h3>

                    {issue.description && (
                      <p className="text-gray-500 text-xs mt-1 truncate">{issue.description}</p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 mt-3 border-t border-gray-100">
                    {issue.address ? (
                      <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1 truncate">
                        <FiMapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{issue.address}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-bold">📍 No address</span>
                    )}

                    <button
                      onClick={(e) => handleRemove(issue.id, e)}
                      disabled={isRemoving}
                      className="self-end sm:self-auto shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wider border bg-red-50 text-red-500 border-red-200 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      {isRemoving
                        ? <><FiLoader className="w-3 h-3 animate-spin" /><span>Removing…</span></>
                        : <span>Remove Upvote</span>
                      }
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Back link */}
      {!loading && (
        <button
          onClick={() => navigate('/citizen')}
          className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-sm border border-gray-200 transition cursor-pointer shadow-xs"
        >
          ← Back to Feed
        </button>
      )}

      {/* ── Detail Modal (same pattern as MyComplaints) ─────────────────────── */}
      {selectedIssue && (
        <div
          className="fixed inset-0 bg-black/60 z-3000 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedIssue(null)}
        >
          <div
            className="bg-white w-full max-w-lg border border-gray-200 shadow-xl overflow-hidden rounded-sm relative animate-[cardSlideUp_0.2s_ease-out] flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute top-3.5 right-4 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs flex items-center justify-center cursor-pointer transition border border-gray-200 z-10 focus:outline-none"
              onClick={() => setSelectedIssue(null)}
            >
              ✕
            </button>

            {/* Scrollable content */}
            <div className="overflow-y-auto p-6 space-y-5">

              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-600 text-[9px] font-extrabold uppercase rounded tracking-wider">
                    <FiCheck className="w-3 h-3" /> Upvoted
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200/50">
                    #{selectedIssue.short_id}
                  </span>
                  <StatusBadge status={selectedIssue.status} />
                </div>
                <h2 className="font-black text-gray-900 text-[15px] capitalize">
                  {CATEGORY_LABELS[selectedIssue.category] ?? selectedIssue.category?.replace(/_/g, ' ').toLowerCase()}
                </h2>
              </div>

              {/* Image carousel */}
              {Array.isArray(selectedIssue.image_urls) && selectedIssue.image_urls.length > 0 ? (
                <div className="bg-gray-900/5 rounded-sm p-2 border border-gray-150">
                  <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth">
                    {selectedIssue.image_urls.map((url, idx) => (
                      <div key={idx} className="snap-center shrink-0 w-full h-48 rounded-sm overflow-hidden border border-gray-200 bg-white relative">
                        <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-bold rounded">
                          {idx + 1} / {selectedIssue.image_urls.length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedIssue.thumbnail ? (
                <div className="w-full h-48 rounded-sm overflow-hidden border border-gray-150 shadow-inner">
                  <img src={selectedIssue.thumbnail} alt="Evidence" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-32 bg-gray-50 border border-gray-150 rounded-sm flex items-center justify-center text-xs text-gray-400 font-semibold select-none">
                  📷 No evidence photos provided
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Description</span>
                <p className="text-xs text-gray-600 font-semibold bg-gray-100 shadow-sm p-3 rounded-sm leading-relaxed whitespace-pre-wrap">
                  {selectedIssue.description || 'No description provided.'}
                </p>
              </div>

              {/* Location */}
              {selectedIssue.address && (
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Location Address</span>
                  <div className="flex items-start gap-1.5 text-xs text-gray-600 font-semibold leading-relaxed">
                    <FiMapPin className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{selectedIssue.address}</span>
                  </div>
                </div>
              )}

              {/* Audit trail */}
              <div className="pt-4 border-t border-gray-150">
                <AuditLogs issueId={selectedIssue.id} />
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-150">
                <div>
                  <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <FiCalendar className="w-3 h-3 text-indigo-500" /> Date Reported
                  </span>
                  <p className="text-xs font-bold text-gray-600 mt-0.5">{formatDate(selectedIssue.created_at)}</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <FiClock className="w-3 h-3 text-indigo-500" /> Last Activity
                  </span>
                  <p className="text-xs font-bold text-gray-600 mt-0.5">{formatDate(selectedIssue.updated_at)}</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <FiUsers className="w-3 h-3 text-indigo-500" /> Upvotes / Reports
                  </span>
                  <p className="text-xs font-bold text-gray-600 mt-0.5">👥 {selectedIssue.report_count} supports</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <FiActivity className="w-3 h-3 text-indigo-500" /> Priority Score
                  </span>
                  <p className="text-xs font-bold text-gray-600 mt-0.5">⬆ {selectedIssue.priority_score}</p>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-150 flex items-center justify-end gap-3">
              <button
                onClick={(e) => handleRemove(selectedIssue.id, e)}
                disabled={removeLoading[selectedIssue.id]}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-500 text-xs font-extrabold rounded-sm border border-red-200 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {removeLoading[selectedIssue.id]
                  ? <><FiLoader className="w-3.5 h-3.5 animate-spin" /><span>Removing…</span></>
                  : <span>Remove Upvote</span>
                }
              </button>
              {/* <button
                className="px-5 py-2.5 bg-[#1e2a5a] hover:bg-[#2d3f82] text-white text-xs font-extrabold rounded-sm transition cursor-pointer"
                onClick={() => setSelectedIssue(null)}
              >
                Close
              </button> */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
