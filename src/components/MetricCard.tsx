import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone?: 'sage' | 'clay' | 'gold' | 'blue'
  trend?: string
}

export function MetricCard({ label, value, detail, icon: Icon, tone = 'sage', trend }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-icon-${tone}`}><Icon size={18} strokeWidth={1.8} /></div>
      <p className="metric-label">{label}</p>
      <div className="metric-value-row"><strong>{value}</strong>{trend && <span className="metric-trend">{trend}</span>}</div>
      <p className="metric-detail">{detail}</p>
    </article>
  )
}
