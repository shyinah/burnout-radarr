import {
  Activity,
  BookOpen,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Compass,
  LayoutDashboard,
  Lightbulb,
  Settings2,
  Timer,
} from 'lucide-react'
import type { AppPage } from '../services/app-state'

const navigation: { page: AppPage; label: string; icon: typeof LayoutDashboard }[] = [
  { page: 'overview', label: 'Overview', icon: LayoutDashboard },
  { page: 'student', label: 'Student mode', icon: BookOpen },
  { page: 'developer', label: 'Developer mode', icon: BriefcaseBusiness },
  { page: 'sessions', label: 'Focus sessions', icon: Timer },
  { page: 'insights', label: 'Insights', icon: ChartNoAxesCombined },
  { page: 'recommendations', label: 'Recommendations', icon: Lightbulb },
  { page: 'settings', label: 'Settings', icon: Settings2 },
]

interface SidebarProps {
  activePage: AppPage
  onNavigate: (page: AppPage) => void
  mode: 'student' | 'developer'
}

export function Sidebar({ activePage, onNavigate, mode }: SidebarProps) {
  return (
    <>
      <aside className="sidebar">
        <button className="brand-lockup" type="button" onClick={() => onNavigate('overview')} aria-label="Burnout Radarr overview">
          <span className="brand-mark"><Activity size={19} strokeWidth={2.4} /></span>
          <span className="brand-copy"><strong>radarr</strong><small>your balance, in focus</small></span>
        </button>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav aria-label="Main navigation" className="side-nav">
          {navigation.map(({ page, label, icon: Icon }) => (
            <button
              key={page}
              type="button"
              className={`nav-item${activePage === page ? ' active' : ''}${page === 'student' || page === 'developer' ? ' mode-nav' : ''}`}
              aria-current={activePage === page ? 'page' : undefined}
              onClick={() => onNavigate(page)}
            >
              <Icon size={18} strokeWidth={1.9} />
              <span>{label}</span>
              {page === 'overview' && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className={`mode-chip ${mode}`}>
          <span className="mode-chip-mark">{mode === 'student' ? <BookOpen size={15} /> : <BriefcaseBusiness size={15} />}</span>
          <span><small>YOU&apos;RE IN</small><strong>{mode === 'student' ? 'Study space' : 'Dev command'}</strong></span>
          <span className="mode-status-dot" />
        </div>
        <div className="sidebar-footer">
          <span className="tiny-radar"><Compass size={15} /></span>
          <span>Catch the signals.<br />Find your balance.</span>
        </div>
      </aside>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map(({ page, label, icon: Icon }) => {
          const shortLabel = page === 'student' ? 'Study' : page === 'developer' ? 'Dev' : page === 'sessions' ? 'Sessions' : page === 'recommendations' ? 'Recover' : label
          return <button key={page} type="button" className={`mobile-nav-item${activePage === page ? ' active' : ''}`} onClick={() => onNavigate(page)} aria-label={label} aria-current={activePage === page ? 'page' : undefined}>
            <Icon size={19} strokeWidth={1.9} /><span>{shortLabel}</span>
          </button>
        })}
      </nav>
    </>
  )
}
