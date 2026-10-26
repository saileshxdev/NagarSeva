/**
 * components/core/admin/charts/AdminStatusPie2.jsx
 *
 * Donut pie — Resolved vs Not-Satisfied (all time).
 *
 * Props:
 *   data    {{ resolved, not_satisfied }}
 *   loading {boolean}
 */
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { FiPieChart } from 'react-icons/fi';
import { GREEN, RED, ChartCard } from '../../../core/superadmin/charts/chartUtils';

const COLORS = [GREEN, RED];

export default function AdminStatusPie2({ data, loading }) {
  const total = data ? data.resolved + data.not_satisfied : 0;
  const chartData = data ? [
    { name: 'Resolved',      value: data.resolved      },
    { name: 'Not Satisfied', value: data.not_satisfied },
  ] : [];

  return (
    <ChartCard title="Resolved vs Not Satisfied" icon={FiPieChart} loading={loading}>
      {total === 0 ? (
        <div className="h-56 flex items-center justify-center text-xs text-gray-400 font-bold">
          No closed issues yet.
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                paddingAngle={3} dataKey="value"
              >
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val, name) => [`${val} (${Math.round(val / total * 100)}%)`, name]}
                contentStyle={{ fontSize: 11, fontWeight: 700, borderRadius: 4 }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="w-full grid grid-cols-2 gap-2">
            {chartData.map((entry, idx) => (
              <div key={entry.name} className="flex flex-col items-center p-2 rounded-sm border border-gray-100 bg-gray-50/50">
                <span className="w-3 h-3 rounded-full mb-1" style={{ background: COLORS[idx] }} />
                <span className="text-[10px] font-bold text-gray-500 text-center leading-tight">{entry.name}</span>
                <span className="text-base font-black mt-0.5" style={{ color: COLORS[idx] }}>{entry.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total closed: {total}</p>
        </div>
      )}
    </ChartCard>
  );
}
