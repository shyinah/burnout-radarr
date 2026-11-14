import type { SlicePoint, ActivityPoint } from './Charts'

const studentColors = ['#a78bfa', '#f4a6bd', '#f2b57a', '#8eb8a0', '#e6cc7c']
const developerColors = ['#c6e77d', '#68c7bb', '#8fa7d8', '#718174', '#d4b86c']

export function ActivityChart({ data, mode = 'student', compact = false }: { data: ActivityPoint[]; mode?: 'student' | 'developer'; compact?: boolean }) {
  const maximum = Math.max(1, ...data.map((point) => point.minutes))
  return <div className={`simple-activity-chart${compact ? ' simple-activity-chart-compact' : ''}`} role="img" aria-label="Focused minutes by day over the past week">
    {data.map((point) => <div className="simple-chart-day" key={point.day}>
      <span className="simple-chart-value">{point.minutes || ''}</span>
      <span className="simple-chart-track"><i className={mode} style={{ height: `${Math.max(point.minutes ? 10 : 3, point.minutes / maximum * 100)}%` }} /></span>
      <span className="simple-chart-label">{point.day}</span>
    </div>)}
  </div>
}

export function SubjectChart({ data, mode = 'student' }: { data: SlicePoint[]; mode?: 'student' | 'developer' }) {
  const colors = mode === 'developer' ? developerColors : studentColors
  const rows = data.slice(0, 5)
  const total = data.reduce((sum, item) => sum + item.minutes, 0)
  const stops = rows.map((item, index) => {
    const start = rows.slice(0, index).reduce((sum, previous) => sum + (total ? previous.minutes / total * 100 : 0), 0)
    const end = start + (total ? item.minutes / total * 100 : 0)
    return `${item.color ?? colors[index % colors.length]} ${start}% ${end}%`
  })
  const gradient = stops.length ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(var(--line) 0 100%)'
  return <div className="subject-chart" role="img" aria-label="Time distribution by subject or project">
    <div className="pie-wrap"><div className="css-donut" style={{ background: gradient }}><div className="pie-center"><span>{total}</span><small>min</small></div></div></div>
    <ul className="chart-legend">{rows.length ? rows.map((item, index) => <li key={item.name}><span className="legend-dot" style={{ background: item.color ?? colors[index % colors.length] }} /><span className="legend-name">{item.name}</span><strong>{item.minutes}<small>m</small></strong></li>) : <li className="muted">Your breakdown will appear here.</li>}</ul>
  </div>
}
