/**
 * pages/MyComplaints.jsx
 *
 * Displays all complaints/issues filed by the current citizen.
 * Includes a detailed modal drawer overlay for issue cards.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setStep } from '../slices/complaintSlice';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import {
  FiPlus, FiAlertCircle, FiMapPin, FiCalendar,
  FiUsers, FiClock, FiActivity,
} from 'react-icons/fi';
import AuditLogs from '../components/common/AuditLogs';

const CATEGORY_LABELS = {
  POTHOLE:           '🕳️ Pothole',
  STREETLIGHT:       '💡 Street Light',
  SEWAGE:            '🚰 Sewage',
  GARBAGE:           '🗑️ Garbage',
  WATER_SUPPLY:      '💧 Water Supply',
  ROAD_DAMAGE:       '🛣️ Road Damage',
  ENCROACHMENT:      '🚧 Encroachment',
  STRAY_ANIMALS:     '🐕 Stray Animals',
  DEAD_ANIMAL:       '💀 Dead Animal',
  PUBLIC_TOILET:     '🚻 Public Toilet',
  DRAIN_BLOCKAGE:    '🚰 Drain Blockage',
  FALLEN_TREE:       '🌳 Fallen Tree',
  ABANDONED_VEHICLE: '🚗 Abandoned Vehicle',
  AIR_POLLUTION:     '🌫️ Air Pollution',
  OTHER:             '📋 Other',
};

const STATUS_STYLES = {
  SUBMITTED:     { cls: 'bg-sky-50 text-sky-600 border-sky-100',          label: 'Submitted'     },
  VERIFIED:      { cls: 'bg-green-50 text-green-600 border-green-100',    label: 'Verified'      },
  REJECTED:      { cls: 'bg-red-50 text-red-600 border-red-100',          label: 'Rejected'      },
  ASSIGNED:      { cls: 'bg-purple-50 text-purple-600 border-purple-100', label: 'Assigned'      },
  IN_PROGRESS:   { cls: 'bg-amber-50 text-amber-600 border-amber-100',    label: 'In Progress'   },
  RESOLVED:      { cls: 'bg-green-50 text-green-600 border-green-100',    label: 'Resolved'      },
  NOT_SATISFIED: { cls: 'bg-red-50 text-red-600 border-red-100',          label: 'Not Satisfied' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.SUBMITTED;
  return (
    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border inline-block leading-none shrink-0 ${s.cls}`}>
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

export default function MyComplaints() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [issues,       setIssues]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);

  useEffect(() => {
    async function fetchIssues() {
      try {
        const data = await apiConnector('GET', endpoints.MY_ISSUES_API);
        setIssues(data.data || []);
      } catch (err) {
        setError(err?.data?.message || 'Failed to load your complaints.');
      } finally {
        setLoading(false);
      }
    }
    fetchIssues();
  }, []);

  function handleNewComplaint() {
    dispatch(setStep(1));
    navigate('/citizen/report');
  }

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4 border-gray-200">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">My Complaints</h1>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1 leading-none">
            Track the status of all civic issues you've reported
          </p>
        </div>
        <button
          onClick={handleNewComplaint}
          className="self-start sm:self-center px-4 py-2.5 bg-[#1e2a5a] hover:bg-[#2d3f82] text-white text-xs font-extrabold rounded-sm transition flex items-center gap-1.5 cursor-pointer"
        >
          <FiPlus className="w-3.5 h-3.5" />
          <span>New Complaint</span>
        </button>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-sm border border-gray-200">
          <div className="w-9 h-9 border-4 border-blue-600/25 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-xs text-gray-500 font-bold mt-3 animate-pulse">Loading your complaints…</span>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-sm text-xs bg-red-50 border border-red-200 text-red-700">
          <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {!loading && !error && issues.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 text-xl border border-gray-100 mb-3">
            📋
          </div>
          <h3 className="font-extrabold text-gray-800 text-sm">No complaints yet</h3>
          <p className="text-gray-500 text-xs mt-1 max-w-xs">
            Report your first civic issue and track its resolution here.
          </p>
          <button
            onClick={handleNewComplaint}
            className="mt-4 px-5 py-2.5 bg-[#1e2a5a] hover:bg-[#2d3f82] text-white text-xs font-extrabold rounded-sm transition cursor-pointer flex items-center gap-1.5"
          >
            <FiPlus className="w-3.5 h-3.5" />
            <span>Register Complaint</span>
          </button>
        </div>
      )}

      {/* ── Complaints list ─────────────────────────────────────────────── */}
      {!loading && issues.length > 0 && (
        <div className="flex flex-col gap-3">
          {issues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => setSelectedIssue(issue)}
              className="bg-white border border-gray-200 rounded-sm p-3 sm:p-4 shadow-xs flex gap-3 hover:shadow-md hover:border-blue-200/60 transition cursor-pointer select-none"
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-sm overflow-hidden shrink-0 border border-gray-100 bg-gray-50 flex items-center justify-center text-lg text-gray-400">
                {issue.thumbnail
                  ? <img src={issue.thumbnail} alt={issue.category} className="w-full h-full object-cover" />
                  : '📋'
                }
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">

                {/* Row 1: short_id left — status right */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200/50 leading-none">
                    #{issue.short_id}
                  </span>
                  <StatusBadge status={issue.status} />
                </div>

                {/* Row 2: title */}
                <h3 className="font-extrabold text-gray-900 text-sm leading-snug capitalize truncate">
                  {CATEGORY_LABELS[issue.category] ?? issue.category?.replace(/_/g, ' ').toLowerCase()}
                </h3>

                {/* Row 3: description preview */}
                {issue.description && (
                  <p className="text-gray-500 text-xs leading-snug line-clamp-1">
                    {issue.description}
                  </p>
                )}

                {/* Row 4: report count badge (only if >1) */}
                {issue.report_count > 1 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 self-start">
                    <FiUsers className="w-3 h-3" /> {issue.report_count} reports
                  </span>
                )}

                {/* Row 5: address + date */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-2 mt-auto border-t border-gray-100">
                  {issue.address ? (
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1 min-w-0">
                      <FiMapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[160px] sm:max-w-none">{issue.address}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-bold">📍 No address</span>
                  )}
                  <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1 shrink-0">
                    <FiCalendar className="w-3 h-3 shrink-0" />
                    {formatDate(issue.created_at)}
                  </span>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Back button ─────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/citizen')}
        className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-extrabold rounded-sm transition flex items-center gap-1.5 border border-gray-200 cursor-pointer"
      >
        ← Back to Dashboard
      </button>

      {/* ── Detail Modal ────────────────────────────────────────────────── */}
      {selectedIssue && (
        <div
          className="fixed inset-0 bg-black/60 z-3000 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs"
          onClick={() => setSelectedIssue(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg border border-gray-200 shadow-xl overflow-hidden rounded-t-xl sm:rounded-sm relative animate-[cardSlideUp_0.25s_ease-out] flex flex-col max-h-[92vh] sm:max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute top-3.5 right-4 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs flex items-center justify-center cursor-pointer transition border border-gray-200 z-10 focus:outline-none"
              onClick={() => setSelectedIssue(null)}
            >
              ✕
            </button>

            {/* Drag handle (mobile) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-5">

              {/* Header */}
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
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
                      <div
                        key={idx}
                        className="snap-center shrink-0 w-full h-44 sm:h-52 rounded-sm overflow-hidden border border-gray-200 bg-white relative"
                      >
                        <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-bold rounded">
                          {idx + 1} / {selectedIssue.image_urls.length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedIssue.thumbnail ? (
                <div className="w-full h-44 sm:h-52 rounded-sm overflow-hidden border border-gray-150">
                  <img src={selectedIssue.thumbnail} alt="Evidence" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-28 bg-gray-50 border border-gray-150 rounded-sm flex items-center justify-center text-xs text-gray-400 font-semibold select-none">
                  📷 No evidence photos provided
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Description</span>
                <p className="text-xs text-gray-600 font-semibold bg-gray-100 shadow-sm p-3 rounded-sm leading-relaxed whitespace-pre-wrap">
                  {selectedIssue.description || 'No description provided.'}
                </p>
              </div>

              {/* Location */}
              {selectedIssue.address && (
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Location Address</span>
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
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-150">
                <div>
                  <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <FiCalendar className="w-3 h-3 text-indigo-500 shrink-0" /> Date Reported
                  </span>
                  <p className="text-xs font-bold text-gray-600 mt-0.5">{formatDate(selectedIssue.created_at)}</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <FiClock className="w-3 h-3 text-indigo-500 shrink-0" /> Last Activity
                  </span>
                  <p className="text-xs font-bold text-gray-600 mt-0.5">{formatDate(selectedIssue.updated_at)}</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <FiUsers className="w-3 h-3 text-indigo-500 shrink-0" /> Upvotes
                  </span>
                  <p className="text-xs font-bold text-gray-600 mt-0.5">👥 {selectedIssue.report_count} supports</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <FiActivity className="w-3 h-3 text-indigo-500 shrink-0" /> Priority Score
                  </span>
                  <p className="text-xs font-bold text-gray-600 mt-0.5">⬆ {selectedIssue.priority_score}</p>
                </div>
              </div>

            </div>

            {/* Modal footer */}
            <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-150 flex justify-end">
              <button
                className="px-5 py-2.5 bg-[#1e2a5a] hover:bg-[#2d3f82] text-white text-xs font-extrabold rounded-sm transition cursor-pointer"
                onClick={() => setSelectedIssue(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
