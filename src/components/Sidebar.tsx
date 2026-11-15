import {
  Activity,
  ChartNoAxesCombined,
  ClipboardCheck,
  HeartPulse,
  LayoutDashboard,
  Settings2,
  Watch,
} from 'lucide-react'
import type { AppPage } from '../services/app-state'

const navigation: { page: AppPage; label: string; shortLabel: string; icon: typeof LayoutDashboard }[] = [
  { page: 'overview', label: 'Overview', shortLabel: 'Home', icon: LayoutDashboard },
  { page: 'check-in', label: 'Check-ins', shortLabel: 'Check-ins', icon: ClipboardCheck },
  { page: 'wearable', label: 'Wearable Data', shortLabel: 'Wearables', icon: Watch },
  { page: 'activity', label: 'Activity', shortLabel: 'Activity', icon: Activity },
  { page: 'insights', label: 'Analysis & Insights', shortLabel: 'Insights', icon: ChartNoAxesCombined },
  { page: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings2 },
]

interface SidebarProps {
  activePage: AppPage
  onNavigate: (page: AppPage) => void
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <>
      <aside className="sidebar">
        <button className="brand-lockup" type="button" onClick={() => onNavigate('overview')} aria-label="Burnout Radarr overview">
          <span className="brand-mark"><HeartPulse size={19} strokeWidth={2.2} /></span>
          <span className="brand-copy"><strong>radarr</strong><small>your balance, in focus</small></span>
        </button>
        <div className="sidebar-stamp" aria-hidden="true"><span>PERSONAL FIELD NOTES</span><strong>VOL. 01 <i>·</i> DAILY RHYTHM</strong></div>
        <div className="sidebar-section-label">YOUR SPACE</div>
        <nav aria-label="Main navigation" className="side-nav">
          {navigation.map(({ page, label, icon: Icon }) => (
            <button
              key={page}
              type="button"
              className={`nav-item${activePage === page ? ' active' : ''}`}
              aria-current={activePage === page ? 'page' : undefined}
              onClick={() => onNavigate(page)}
            >
              <Icon size={18} strokeWidth={1.9} />
              <span>{label}</span>
              {activePage === page && <span className="nav-indicator" aria-hidden="true" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-footer">
          <span className="tiny-radar"><Activity size={15} /></span>
          <span>Catch the signals.<br />Find your balance.</span>
        </div>
      </aside>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map(({ page, label, shortLabel, icon: Icon }) => (
          <button key={page} type="button" className={`mobile-nav-item${activePage === page ? ' active' : ''}`} onClick={() => onNavigate(page)} aria-label={label} aria-current={activePage === page ? 'page' : undefined}>
            <Icon size={19} strokeWidth={1.9} /><span>{shortLabel}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
