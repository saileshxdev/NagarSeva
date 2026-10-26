/**
 * components/core/superadmin/charts/IssueLineChart.jsx
 *
 * Line chart: Issues Received vs Resolved over time.
 *
 * Props:
 *   data    {Array<{ period, received, resolved }>}
 *   period  {'monthly' | 'yearly'}
 *   loading {boolean}
 *   onPeriodChange {fn}
 */
import {
  ResponsiveContainer,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { FiTrendingUp } from 'react-icons/fi';
import { NAVY, GREEN, ChartCard, PeriodToggle, CustomTooltip } from './chartUtils';

export default function IssueLineChart({ data, period, loading, onPeriodChange }) {
  return (
    <ChartCard
      title="Issues Received vs Resolved"
      icon={FiTrendingUp}
      loading={loading}
      action={<PeriodToggle value={period} onChange={onPeriodChange} />}
    >
      {data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-xs text-gray-400 font-bold">
          No data for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
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
              type="monotone"
              dataKey="received"
              name="Received"
              stroke={NAVY}
              strokeWidth={2.5}
              dot={{ r: 4, fill: NAVY, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="resolved"
              name="Resolved"
              stroke={GREEN}
              strokeWidth={2.5}
              dot={{ r: 4, fill: GREEN, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
