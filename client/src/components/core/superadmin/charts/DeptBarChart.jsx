/**
 * components/core/superadmin/charts/DeptBarChart.jsx
 *
 * Bar chart: Issues assigned per department.
 * All bars rendered in a single navy colour (#1e2a5a).
 *
 * Props:
 *   data    {Array<{ department, count }>}
 *   period  {'monthly' | 'yearly'}
 *   loading {boolean}
 *   onPeriodChange {fn}
 */
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import { FiBarChart2 } from 'react-icons/fi';
import { NAVY, ChartCard, PeriodToggle, CustomTooltip } from './chartUtils';

export default function DeptBarChart({ data, period, loading, onPeriodChange }) {
  return (
    <ChartCard
      title="Issues per Department"
      icon={FiBarChart2}
      loading={loading}
      action={<PeriodToggle value={period} onChange={onPeriodChange} />}
    >
      {data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-xs text-gray-400 font-bold">
          No department data for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="department"
              tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              angle={-35}
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
            <Bar dataKey="count" name="Issues" fill={NAVY} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
