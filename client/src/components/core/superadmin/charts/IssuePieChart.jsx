/**
 * components/core/superadmin/charts/IssuePieChart.jsx
 *
 * Donut pie chart: Issue verification breakdown.
 * Three slices — Verified, Rejected, Pending Review.
 *
 * Props:
 *   pieData {object | null}  — { total, verified, rejected, pending }
 *   loading {boolean}
 */
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
} from 'recharts';
import { FiPieChart } from 'react-icons/fi';
import { PIE_COLORS, ChartCard } from './chartUtils';

const SLICES = [
  { key: 'verified', label: 'Verified'       },
  { key: 'rejected', label: 'Rejected'        },
  { key: 'pending',  label: 'Pending Review'  },
];

export default function IssuePieChart({ pieData, loading }) {
  const chartData = pieData
    ? SLICES.map(({ key, label }) => ({ name: label, value: pieData[key] }))
    : [];

  return (
    <ChartCard
      title="Issue Verification Breakdown"
      icon={FiPieChart}
      loading={loading}
    >
      {!pieData || pieData.total === 0 ? (
        <div className="h-56 flex items-center justify-center text-xs text-gray-400 font-bold">
          No issues recorded yet.
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val, name) => [
                  `${val} (${Math.round((val / pieData.total) * 100)}%)`,
                  name,
                ]}
                contentStyle={{ fontSize: 11, fontWeight: 700, borderRadius: 4 }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend grid */}
          <div className="w-full grid grid-cols-3 gap-2">
            {chartData.map((entry, idx) => (
              <div
                key={entry.name}
                className="flex flex-col items-center p-2 rounded-sm border border-gray-100 bg-gray-50/50"
              >
                <span
                  className="w-3 h-3 rounded-full mb-1"
                  style={{ background: PIE_COLORS[idx] }}
                />
                <span className="text-[10px] font-bold text-gray-500 text-center leading-tight">
                  {entry.name}
                </span>
                <span
                  className="text-base font-black mt-0.5"
                  style={{ color: PIE_COLORS[idx] }}
                >
                  {entry.value}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Total: {pieData.total} issues
          </p>
        </div>
      )}
    </ChartCard>
  );
}
