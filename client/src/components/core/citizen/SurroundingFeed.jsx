/**
 * components/core/citizen/SurroundingFeed.jsx
 *
 * Collapsible glassmorphic sidebar for the City Pulse map.
 * Shows live-filtered issues visible in the current map viewport.
 */
import { FiSearch, FiX, FiFilter, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import IssueCard from './IssueCard';

const CATEGORY_ICONS = {
  POTHOLE:           '🕳️',
  STREETLIGHT:       '💡',
  SEWAGE:            '🚰',
  GARBAGE:           '🗑️',
  WATER_SUPPLY:      '💧',
  ROAD_DAMAGE:       '🛣️',
  ENCROACHMENT:      '🚧',
  STRAY_ANIMALS:     '🐕',
  DEAD_ANIMAL:       '💀',
  PUBLIC_TOILET:     '🚻',
  DRAIN_BLOCKAGE:    '🌊',
  FALLEN_TREE:       '🌳',
  ABANDONED_VEHICLE: '🚗',
  AIR_POLLUTION:     '🌫️',
  OTHER:             '📋',
};

const CATEGORY_LABELS = {
  POTHOLE:           'Pothole',
  STREETLIGHT:       'Street Light',
  SEWAGE:            'Sewage',
  GARBAGE:           'Garbage',
  WATER_SUPPLY:      'Water Supply',
  ROAD_DAMAGE:       'Road Damage',
  ENCROACHMENT:      'Encroachment',
  STRAY_ANIMALS:     'Stray Animals',
  DEAD_ANIMAL:       'Dead Animal',
  PUBLIC_TOILET:     'Public Toilet',
  DRAIN_BLOCKAGE:    'Drain Blockage',
  FALLEN_TREE:       'Fallen Tree',
  ABANDONED_VEHICLE: 'Abandoned Vehicle',
  AIR_POLLUTION:     'Air Pollution',
  OTHER:             'Other',
};


/* ─── Main Sidebar ───────────────────────────────────────────── */
export default function SurroundingFeed({
  issues = [],
  selectedIssue,
  onSelectIssue,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onUpvote,
  onUnwatch,
  collapsed,
  onToggleCollapse,
}) {
  return (
    <div
      className={`absolute top-3 left-3 bottom-3 z-[1000] flex flex-col transition-all duration-300 ease-in-out
        ${collapsed ? '-translate-x-[calc(100%+20px)]' : 'translate-x-0'}
        w-[296px] sm:w-[316px]`}
    >
      {/* Panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-white shadow-2xl border border-gray-200 overflow-hidden rounded-sm">

        {/* Header */}
        <div className="px-4 pt-4 pb-3.5 bg-[#1e2a5a] shrink-0">
          <div className="flex items-center justify-between mb-0.5">
            <h2 className="text-xs font-black text-white uppercase tracking-widest">Surrounding Feed</h2>
            <span className="text-[9px] font-bold bg-white/15 text-white/90 px-2 py-0.5 rounded-full border border-white/20">
              {issues.length} visible
            </span>
          </div>
          <p className="text-[10px] text-white/60 font-medium">Issues in your current map view</p>
        </div>

        {/* Search + Filters */}
        <div className="px-3 py-3 border-b border-gray-100 space-y-2.5 shrink-0 bg-gray-50/60">
          {/* Search input */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search issues, address…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-[11px] font-semibold rounded-sm border border-gray-200 bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1e2a5a]/50 focus:border-[#1e2a5a]/40 shadow-sm transition"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
              >
                <FiX className="w-2.5 h-2.5 text-gray-600" />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <FiFilter className="w-2.5 h-2.5 text-gray-400" />
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Filter</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none snap-x">
              <button
                onClick={() => onCategoryChange('')}
                className={`snap-start shrink-0 px-2.5 py-1 text-[9px] font-bold rounded border transition
                  ${!selectedCategory
                    ? 'bg-[#1e2a5a] border-[#1e2a5a] text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-[#1e2a5a]/40 hover:text-[#1e2a5a]'
                  }`}
              >
                All
              </button>
              {Object.keys(CATEGORY_LABELS).map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(selectedCategory === cat ? '' : cat)}
                  className={`snap-start shrink-0 px-2.5 py-1 text-[9px] font-bold rounded border transition
                    ${selectedCategory === cat
                      ? 'bg-[#1e2a5a] border-[#1e2a5a] text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#1e2a5a]/40 hover:text-[#1e2a5a]'
                    }`}
                >
                  {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Issue list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-none">
          {issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 select-none text-center">
              <div className="text-4xl mb-3 opacity-50">🔭</div>
              <p className="text-xs font-bold text-gray-500">No issues in view</p>
              <p className="text-[10px] text-gray-400 mt-1 max-w-[180px] leading-relaxed">
                Pan or zoom out the map to discover nearby complaints.
              </p>
            </div>
          ) : (
            issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                isSelected={selectedIssue?.id === issue.id}
                onSelect={() => onSelectIssue(issue)}
                onUpvote={onUpvote}
                onUnwatch={onUnwatch}
              />
            ))
          )}
        </div>
      </div>

      {/* Collapse/Expand tab */}
      <button
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute top-1/2 -right-8 -translate-y-1/2 w-8 h-16 bg-white border border-gray-200 border-l-0 rounded-r-sm flex items-center justify-center text-[#1e2a5a] cursor-pointer hover:bg-[#1e2a5a] hover:text-white transition shadow-lg focus:outline-none z-10"
      >
        {collapsed ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );
}
