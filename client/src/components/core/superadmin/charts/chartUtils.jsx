/**
 * components/core/superadmin/charts/chartUtils.js
 *
 * Shared constants and small presentational components used by all
 * SuperAdmin analytics chart components.
 */

// ── Palette ───────────────────────────────────────────────────────────────────
export const NAVY  = '#1e2a5a';
export const GREEN = '#22c55e';
export const RED   = '#ef4444';
export const AMBER = '#f59e0b';

export const PIE_COLORS = [GREEN, RED, AMBER];

// ── PeriodToggle ──────────────────────────────────────────────────────────────
/**
 * Small two-button toggle for switching between 'monthly' and 'yearly'.
 * Props: value {string}, onChange {fn}
 */
export function PeriodToggle({ value, onChange }) {
  return (
    <div className="flex bg-gray-100 rounded-sm border border-gray-200 p-0.5">
      {['monthly', 'yearly'].map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-sm transition cursor-pointer ${
            value === p ? 'bg-white text-[#1e2a5a] shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ── ChartCard ─────────────────────────────────────────────────────────────────
/**
 * Uniform card wrapper for every chart.
 * Props: title, icon (React component), action (optional JSX), loading, children
 */
export function ChartCard({ title, icon: Icon, action, loading, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-sm shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-sm bg-[#1e2a5a]/8 border border-[#1e2a5a]/10 flex items-center justify-center text-[#1e2a5a]">
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black text-gray-900 tracking-tight">{title}</h3>
        </div>
        {action}
      </div>

      {loading ? (
        <div className="h-56 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ── CustomTooltip ─────────────────────────────────────────────────────────────
/**
 * Shared tooltip renderer for Line and Bar charts.
 */
export function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-sm shadow-lg px-3 py-2 text-xs">
      <p className="font-extrabold text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-bold">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}
