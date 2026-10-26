/**
 * components/core/citizen/IssueCard.jsx
 *
 * Self-contained issue card for the Surrounding Feed sidebar.
 *
 * Props:
 *   issue        - issue object from viewport API (includes is_watching, is_reporter)
 *   isSelected   - boolean, highlights card when true
 *   onSelect     - callback when card body is clicked
 *   onUpvote     - async callback(issueId) — called when not yet watching
 *   onUnwatch    - async callback(issueId) — called when already watching
 */
import { useState } from 'react';
import { FiMapPin, FiThumbsUp, FiLoader, FiCheck } from 'react-icons/fi';

const CATEGORY_ICONS = {
  POTHOLE: '🕳️', STREETLIGHT: '💡', SEWAGE: '🚰', GARBAGE: '🗑️',
  WATER_SUPPLY: '💧', ROAD_DAMAGE: '🛣️', ENCROACHMENT: '🚧',
  STRAY_ANIMALS: '🐕', DEAD_ANIMAL: '💀', PUBLIC_TOILET: '🚻',
  DRAIN_BLOCKAGE: '🌊', FALLEN_TREE: '🌳', ABANDONED_VEHICLE: '🚗',
  AIR_POLLUTION: '🌫️', OTHER: '📋',
};

const CATEGORY_LABELS = {
  POTHOLE: 'Pothole', STREETLIGHT: 'Street Light', SEWAGE: 'Sewage',
  GARBAGE: 'Garbage', WATER_SUPPLY: 'Water Supply', ROAD_DAMAGE: 'Road Damage',
  ENCROACHMENT: 'Encroachment', STRAY_ANIMALS: 'Stray Animals', DEAD_ANIMAL: 'Dead Animal',
  PUBLIC_TOILET: 'Public Toilet', DRAIN_BLOCKAGE: 'Drain Blockage', FALLEN_TREE: 'Fallen Tree',
  ABANDONED_VEHICLE: 'Abandoned Vehicle', AIR_POLLUTION: 'Air Pollution', OTHER: 'Other',
};

const STATUS_CONFIG = {
  SUBMITTED:     { bg: 'bg-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-500'     },
  VERIFIED:      { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  ASSIGNED:      { bg: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-500'  },
  IN_PROGRESS:   { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  RESOLVED:      { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  NOT_SATISFIED: { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
  REJECTED:      { bg: 'bg-gray-100',    text: 'text-gray-500',    dot: 'bg-gray-400'    },
};

export default function IssueCard({ issue, isSelected, onSelect, onUpvote, onUnwatch }) {
  const [loading, setLoading] = useState(false);

  const sc         = STATUS_CONFIG[issue.status] || STATUS_CONFIG.SUBMITTED;
  const label      = CATEGORY_LABELS[issue.category] || issue.category?.replace(/_/g, ' ') || 'Issue';
  const icon       = CATEGORY_ICONS[issue.category] || '📋';
  const isWatching = issue.is_watching;
  const isReporter = issue.is_reporter;

  async function handleClick(e) {
    e.stopPropagation();
    if (loading || isReporter) return;

    setLoading(true);
    try {
      if (isWatching) {
        await onUnwatch(issue.id);
      } else {
        await onUpvote(issue.id);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Button appearance ──────────────────────────────────────────────────────
  let btnClass, btnContent;

  if (isReporter) {
    // Locked — reporter cannot vote
    btnClass = 'bg-[#1e2a5a]/8 border-[#1e2a5a]/15 text-[#1e2a5a] cursor-default';
    btnContent = <><FiCheck className="w-2.5 h-2.5" /><span>{issue.report_count ?? 0}</span></>;
  } else if (loading) {
    btnClass = 'bg-gray-50 border-gray-200 text-gray-400 cursor-wait';
    btnContent = <><FiLoader className="w-2.5 h-2.5 animate-spin" /><span>{issue.report_count ?? 0}</span></>;
  } else if (isWatching) {
    // Already upvoted — hover turns red to hint removal
    btnClass = 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-red-50 hover:border-red-200 hover:text-red-500 cursor-pointer';
    btnContent = <><FiCheck className="w-2.5 h-2.5" /><span>{issue.report_count ?? 0}</span></>;
  } else {
    // Not yet upvoted
    btnClass = 'bg-white border-[#1e2a5a]/30 text-[#1e2a5a] hover:bg-[#1e2a5a] hover:text-white hover:border-[#1e2a5a] cursor-pointer';
    btnContent = <><FiThumbsUp className="w-2.5 h-2.5" /><span>{issue.report_count ?? 0}</span></>;
  }

  return (
    <div
      onClick={onSelect}
      className={`relative bg-white border transition-all duration-200 cursor-pointer overflow-hidden select-none rounded-sm ${
        isSelected
          ? 'border-[#1e2a5a] shadow-lg ring-2 ring-[#1e2a5a]/20'
          : 'border-gray-200 hover:border-[#1e2a5a]/40 hover:shadow-md'
      }`}
    >
      {isSelected && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#1e2a5a]" />}

      <div className="flex min-h-0">
        {/* Thumbnail / emoji */}
        <div className="shrink-0 w-14 self-stretch">
          {issue.thumbnail
            ? <img src={issue.thumbnail} alt={label} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center bg-[#1e2a5a]/5 text-xl">{icon}</div>
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-2.5">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[8px] font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
              #{issue.short_id}
            </span>
            <span className={`inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
              <span className={`w-1 h-1 rounded-full shrink-0 ${sc.dot}`} />
              {issue.status?.replace(/_/g, ' ')}
            </span>
          </div>

          <h4 className="text-[11px] font-black text-gray-900 truncate leading-snug flex items-center gap-1">
            {label}
            {isReporter && (
              <span className="text-[8px] font-extrabold text-[#1e2a5a] bg-[#1e2a5a]/10 px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
                You
              </span>
            )}
          </h4>

          {issue.description && (
            <p className="text-[9px] text-gray-500 font-medium truncate mt-0.5">{issue.description}</p>
          )}

          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100 gap-2">
            <span className="text-[9px] text-gray-400 font-semibold flex items-center gap-0.5 truncate min-w-0">
              <FiMapPin className="w-2.5 h-2.5 shrink-0 text-rose-400" />
              <span className="truncate">{issue.address || 'No address'}</span>
            </span>

            <button
              onClick={handleClick}
              disabled={isReporter || loading}
              title={
                isReporter  ? 'Your report'         :
                isWatching  ? 'Remove upvote'        :
                              'Upvote this issue'
              }
              className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold transition ${btnClass}`}
            >
              {btnContent}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
