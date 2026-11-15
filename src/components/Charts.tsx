import { useId } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface ActivityPoint {
  day: string
  minutes: number
  [key: string]: string | number
}

export interface SlicePoint {
  name: string
  minutes: number
  color?: string
}

interface ActivityChartProps {
  data: ActivityPoint[]
  compact?: boolean
}

const chartMargin = { top: 10, right: 8, left: -22, bottom: 0 }

export function ActivityChart({ data, compact = false }: ActivityChartProps) {
  const gradientId = `activity-fill-${useId().replaceAll(':', '')}`
  const stroke = '#718064'
  return (
    <div className={`chart-wrap${compact ? ' chart-wrap-compact' : ''}`} role="img" aria-label="Focused minutes by day over the past week">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={chartMargin}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 5" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-label)', fontSize: 11 }} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-label)', fontSize: 11 }} />
          <Tooltip
            cursor={{ stroke: 'var(--chart-cursor)', strokeDasharray: '4 4' }}
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, color: 'var(--ink)', boxShadow: 'var(--shadow-card)' }}
            formatter={(value) => [`${value ?? 0} min`, 'Focused']}
          />
          <Area type="monotone" dataKey="minutes" stroke={stroke} strokeWidth={3} fill={`url(#${gradientId})`} fillOpacity={1} activeDot={{ r: 5, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SubjectChart({ data }: { data: SlicePoint[] }) {
  const colors = ['#8f5146', '#718064', '#b08b4d', '#688294', '#9a7763']
  const rows = data.length ? data.slice(0, 5) : [{ name: 'No sessions yet', minutes: 1 }]
  return (
    <div className="subject-chart" role="img" aria-label="Time distribution by subject or project">
      <div className="pie-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="minutes" nameKey="name" innerRadius="66%" outerRadius="94%" paddingAngle={3} stroke="none">
              {rows.map((entry, index) => <Cell key={entry.name} fill={entry.color ?? colors[index % colors.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)' }} formatter={(value) => [`${value ?? 0} min`, 'Focused']} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pie-center"><span>{data.reduce((total, item) => total + item.minutes, 0)}</span><small>min</small></div>
      </div>
      <ul className="chart-legend">
        {data.length ? data.slice(0, 5).map((item, index) => (
          <li key={item.name}>
            <span className="legend-dot" style={{ background: item.color ?? colors[index % colors.length] }} />
            <span className="legend-name">{item.name}</span>
            <strong>{item.minutes}<small>m</small></strong>
          </li>
        )) : <li className="muted">Your breakdown will appear here.</li>}
      </ul>
    </div>
  )
}

export function CompareBars({ data }: { data: ActivityPoint[] }) {
  const fill = '#8f5146'
  return (
    <div className="chart-wrap compare-chart" role="img" aria-label="Weekly focus minutes bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ ...chartMargin, top: 14 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 5" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-label)', fontSize: 11 }} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-label)', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, color: 'var(--ink)' }} formatter={(value) => [`${value ?? 0} min`, 'Focused']} />
          <Bar dataKey="minutes" fill={fill} radius={[6, 6, 2, 2]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
