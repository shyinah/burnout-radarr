import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronLeft,
  CircleHelp,
  Code2,
  Gauge,
  Settings2,
  Sparkles,
  Timer,
} from 'lucide-react'
import type { AppPage } from '../types/app'

const navigation: { label: string; items: { id: AppPage; title: string; icon: typeof Gauge }[] }[] = [
  {
    label: 'Your workspace',
    items: [
      { id: 'overview', title: 'Overview', icon: Gauge },
      { id: 'student', title: 'Student mode', icon: BookOpen },
      { id: 'developer', title: 'Developer mode', icon: Code2 },
    ],
  },
  {
    label: 'Understand your rhythm',
    items: [
      { id: 'sessions', title: 'Focus sessions', icon: Timer },
      { id: 'insights', title: 'Insights', icon: BarChart3 },
      { id: 'recommendations', title: 'Recommendations', icon: Sparkles },
    ],
  },
]

interface SidebarProps {
  activePage: AppPage
  isOpen: boolean
  onNavigate: (page: AppPage) => void
  onClose: () => void
}

export function Sidebar({ activePage, isOpen, onNavigate, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><Activity size={19} strokeWidth={2.2} /></span>
          <span className="brand-copy"><strong>radarr</strong><small>burnout radar</small></span>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={onClose}>
            <ChevronLeft size={18} />
          </button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">A</div>
          <div className="workspace-copy"><strong>Alex&apos;s workspace</strong><span>Personal space</span></div>
          <span className="workspace-chevron" aria-hidden="true">⌄</span>
        </div>

        <nav className="nav-groups">
          {navigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map(({ id, title, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`nav-item ${activePage === id ? 'nav-item-active' : ''}`}
                  aria-current={activePage === id ? 'page' : undefined}
                  onClick={() => { onNavigate(id); onClose() }}
                >
                  <Icon size={17} strokeWidth={1.9} />
                  <span>{title}</span>
                  {id === 'overview' && <span className="nav-indicator" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon"><Sparkles size={16} /></span>
            <p><strong>A gentler kind of productive.</strong><span>Small steps count, too.</span></p>
          </div>
          <button
            type="button"
            className={`nav-item ${activePage === 'settings' ? 'nav-item-active' : ''}`}
            aria-current={activePage === 'settings' ? 'page' : undefined}
            onClick={() => { onNavigate('settings'); onClose() }}
          >
            <Settings2 size={17} strokeWidth={1.9} /><span>Settings</span>
          </button>
          <button className="nav-item nav-help" type="button" onClick={() => onNavigate('recommendations')}>
            <CircleHelp size={17} strokeWidth={1.9} /><span>Need a reset?</span>
          </button>
          <div className="sidebar-footer">A mindful workspace <span>·</span> v1.0</div>
        </div>
      </aside>
    </>
  )
}
