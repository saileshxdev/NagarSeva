/**
 * pages/CitizenDashboard.jsx
 *
 * Citizen Home / Feed Page.
 * - Queries nearby issues (20km radius). Each issue from the API includes:
 *     is_watching  — true if the current user is a watcher
 *     is_reporter  — true if the current user is the original reporter
 * - Pre-marks upvoted state from the server (not session-only).
 * - Reporters see a locked "Your Report" badge — no upvote/downvote.
 * - Other watchers see ✓ Upvoted and can click to remove their upvote.
 * - Non-watchers see Upvote button.
 */
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import {
  FiThumbsUp, FiMapPin, FiUser, FiCalendar,
  FiLoader, FiAlertTriangle, FiCheck,
} from 'react-icons/fi';

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
    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border inline-block leading-none ${s.cls}`}>
      {s.label}
    </span>
  );
}

const RANCHI_COORDS = { lat: 23.3441, lng: 85.3090 };

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function CitizenDashboard() {
  const { user } = useSelector((s) => s.auth);

  const [coords,        setCoords]        = useState(null);
  const [geoStatus,     setGeoStatus]     = useState('locating');
  const [issues,        setIssues]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [upvoteLoading, setUpvoteLoading] = useState({});

  // 1. Geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('denied');
      setCoords(RANCHI_COORDS);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('granted');
      },
      () => {
        setGeoStatus('denied');
        setCoords(RANCHI_COORDS);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  // 2. Fetch nearby issues — server returns is_watching + is_reporter per issue
  useEffect(() => {
    if (!coords) return;
    async function fetchNearby() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiConnector(
          'GET',
          `${endpoints.NEARBY_ISSUES_API}?lat=${coords.lat}&lng=${coords.lng}&radius=20000`
        );
        setIssues(res.data || []);
      } catch (err) {
        setError(err?.data?.message || 'Failed to load local feed.');
      } finally {
        setLoading(false);
      }
    }
    fetchNearby();
  }, [coords]);

  // 3. Toggle upvote
  //    - is_reporter issues are blocked (no action).
  //    - is_watching=true  → unwatch (DELETE /watch)
  //    - is_watching=false → me-too  (POST /me-too)
  async function handleUpvoteToggle(issue) {
    if (issue.is_reporter) return;   // reporters cannot upvote/downvote their own issue

    const issueId   = issue.id;
    const isWatching = issue.is_watching;

    setUpvoteLoading((prev) => ({ ...prev, [issueId]: true }));

    try {
      if (!isWatching) {
        // ── Upvote ───────────────────────────────────────────────────────
        const res = await apiConnector('POST', endpoints.ME_TOO_API(issueId), null, {
          'X-User-Lat': coords.lat.toString(),
          'X-User-Lng': coords.lng.toString(),
        });

        setIssues((prev) =>
          prev.map((item) =>
            item.id === issueId
              ? {
                  ...item,
                  is_watching: true,
                  report_count: res.report_count ?? item.report_count,
                }
              : item
          )
        );
      } else {
        // ── Remove upvote ────────────────────────────────────────────────
        await apiConnector('DELETE', endpoints.UNWATCH_API(issueId));

        setIssues((prev) =>
          prev.map((item) =>
            item.id === issueId
              ? {
                  ...item,
                  is_watching: false,
                  report_count: Math.max(0, (item.report_count ?? 1) - 1),
                }
              : item
          )
        );
      }
    } catch (err) {
      if (!isWatching) {
        const msg    = err?.data?.message || 'Could not upvote issue.';
        const code   = err?.data?.error;
        if (code === 'TOO_FAR' || code === 'LOCATION_REQUIRED') {
          alert(`Location check failed: ${msg}`);
        } else if (code === 'ALREADY_ENDORSED') {
          // Race condition — mark as watched anyway
          setIssues((prev) =>
            prev.map((item) =>
              item.id === issueId ? { ...item, is_watching: true } : item
            )
          );
        }
      }
      // Unwatch errors: silently ignore — optimistic UI is fine
    } finally {
      setUpvoteLoading((prev) => ({ ...prev, [issueId]: false }));
    }
  }

  return (
    <div className="space-y-6">

      {/* Top Banner */}
      <div className="bg-[#1e2a5a] text-white p-6 rounded-sm shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black tracking-wide">Local Issue Feed</h2>
          <p className="text-xs text-white/70 mt-1 max-w-xl font-medium leading-relaxed">
            Civic complaints within 20km of your location. Upvote to escalate priority.
            Click again to remove your upvote.
          </p>
        </div>
        <div className="shrink-0 self-start md:self-center">
          {geoStatus === 'locating' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-[10px] font-extrabold uppercase tracking-wider">
              <FiLoader className="w-3 h-3 animate-spin" /> Detecting Location
            </span>
          )}
          {geoStatus === 'granted' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/30">
              📍 GPS Active (20km Radius)
            </span>
          )}
          {geoStatus === 'denied' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider border border-amber-500/30">
              ⚠️ GPS Offline (Ranchi Center)
            </span>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-6">

        {loading && (
          <div className="bg-white border border-gray-200 rounded-sm p-12 flex flex-col items-center justify-center text-center shadow-xs">
            <FiLoader className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs text-gray-500 font-bold mt-3 animate-pulse">Scanning surrounding area for complaints…</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-sm flex items-start gap-2.5 text-xs">
            <FiAlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {!loading && !error && issues.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-sm p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 text-xl border border-gray-100 mb-3">
              🎉
            </div>
            <h3 className="font-black text-gray-800 text-sm">All clean nearby!</h3>
            <p className="text-gray-500 text-xs mt-1 max-w-sm">
              No open civic complaints found within 20km. If you spot an issue, register it now.
            </p>
          </div>
        )}

        {!loading && issues.length > 0 && (
          <div className="flex flex-col gap-6">
            {issues.map((issue) => {
              const isReporter     = issue.is_reporter;
              const isWatching     = issue.is_watching;
              const isLoadingBtn   = upvoteLoading[issue.id] || false;
              const imgs           = Array.isArray(issue.image_urls) ? issue.image_urls : [];

              return (
                <div
                  key={issue.id}
                  className="bg-white border border-gray-200 rounded-sm overflow-hidden shadow-xs hover:shadow-md transition duration-200 flex flex-col"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <FiUser className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-extrabold text-gray-800 truncate leading-none capitalize">
                          {issue.reporter_name || 'Anonymous Citizen'}
                          {isReporter && (
                            <span className="ml-1.5 text-[9px] font-extrabold text-[#1e2a5a] bg-[#1e2a5a]/10 px-1.5 py-0.5 rounded uppercase tracking-wide">
                              You
                            </span>
                          )}
                        </p>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5 leading-none">
                          Reporter
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-mono font-bold text-gray-400 bg-gray-200/50 px-1.5 py-0.5 rounded border border-gray-200">
                        #{issue.short_id}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                        <FiCalendar className="w-3.5 h-3.5 shrink-0" />
                        {formatDate(issue.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Image Carousel */}
                  {imgs.length > 0 ? (
                    <div className="border-b border-gray-100 bg-gray-900/5">
                      <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none p-3.5">
                        {imgs.map((url, idx) => (
                          <div
                            key={idx}
                            className="snap-center shrink-0 w-64 h-40 rounded-sm overflow-hidden border border-gray-200 shadow-xs relative bg-white"
                          >
                            <img
                              src={url}
                              alt={`Issue visual ${idx + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/75 text-white text-[9px] font-bold rounded">
                              {idx + 1} / {imgs.length}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 bg-gray-50 border-b border-gray-100 flex items-center justify-center text-xs text-gray-400 font-semibold select-none">
                      📷 No evidence photos provided
                    </div>
                  )}

                  {/* Card Body */}
                  <div className="p-5 flex-1 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 border border-blue-100 rounded uppercase tracking-wider">
                        {issue.category}
                      </span>
                      <StatusBadge status={issue.status} />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 tracking-tight capitalize">
                      {CATEGORY_LABELS[issue.category] ?? issue.category?.replace(/_/g, ' ').toLowerCase()}
                    </h3>

                    {issue.description && (
                      <p className="text-xs text-gray-600 leading-relaxed font-medium bg-gray-100 shadow-sm p-3 rounded-sm">
                        {issue.description}
                      </p>
                    )}

                    {issue.address && (
                      <div className="flex items-start gap-1 text-[11px] text-gray-500 font-semibold">
                        <FiMapPin className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                        <span>{issue.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
                    <span className="text-xs text-gray-500 font-extrabold uppercase tracking-wide">
                      👥 {issue.report_count} Upvote{issue.report_count !== 1 ? 's' : ''}
                    </span>

                    {/* ── Reporter: locked badge, no action ── */}
                    {isReporter ? (
                      <span className="px-4 py-2.5 rounded-sm text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 bg-[#1e2a5a]/8 text-[#1e2a5a] border border-[#1e2a5a]/15 select-none">
                        <FiCheck className="w-3.5 h-3.5" />
                        Your Report
                      </span>

                    ) : isLoadingBtn ? (
                      /* ── Loading spinner ── */
                      <button disabled className="px-4 py-2.5 rounded-sm text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed">
                        <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                        <span>{isWatching ? 'Removing…' : 'Upvoting…'}</span>
                      </button>

                    ) : isWatching ? (
                      /* ── Already upvoted — click to remove ── */
                      <button
                        onClick={() => handleUpvoteToggle(issue)}
                        title="Click to remove your upvote"
                        className="px-4 py-2.5 rounded-sm text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                      >
                        <FiCheck className="w-3.5 h-3.5" />
                        <span>Upvoted</span>
                      </button>

                    ) : (
                      /* ── Not yet upvoted ── */
                      <button
                        onClick={() => handleUpvoteToggle(issue)}
                        title="Upvote this issue"
                        className="px-4 py-2.5 rounded-sm text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border bg-[#1e2a5a] hover:bg-[#2d3f82] text-white border-transparent"
                      >
                        <FiThumbsUp className="w-3.5 h-3.5" />
                        <span>Upvote</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
