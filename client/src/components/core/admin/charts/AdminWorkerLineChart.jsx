/**
 * components/core/admin/charts/AdminWorkerLineChart.jsx
 *
 * Line chart — per field-worker breakdown: In-Progress, Resolved, Not-Satisfied.
 * X-axis = worker names. Three lines, one per status.
 *
 * Props:
 *   data    {Array<{ name, in_progress, resolved, not_satisfied }>}
 *   loading {boolean}
 */
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { FiUsers } from 'react-icons/fi';
import { NAVY, GREEN, RED, ChartCard, CustomTooltip } from '../../../core/superadmin/charts/chartUtils';

export default function AdminWorkerLineChart({ data, loading }) {
  return (
    <ChartCard title="Per-Worker Issue Breakdown" icon={FiUsers} loading={loading}>
      {data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-xs text-gray-400 font-bold">
          No field workers in this department.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 12 }} />
            <Line
              type="monotone" dataKey="in_progress" name="In Progress"
              stroke={NAVY} strokeWidth={2.5}
              dot={{ r: 5, fill: NAVY, strokeWidth: 0 }} activeDot={{ r: 7 }}
            />
            <Line
              type="monotone" dataKey="resolved" name="Resolved"
              stroke={GREEN} strokeWidth={2.5}
              dot={{ r: 5, fill: GREEN, strokeWidth: 0 }} activeDot={{ r: 7 }}
            />
            <Line
              type="monotone" dataKey="not_satisfied" name="Not Satisfied"
              stroke={RED} strokeWidth={2.5}
              dot={{ r: 5, fill: RED, strokeWidth: 0 }} activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
