import { Bell, Menu, Moon, Sun } from 'lucide-react'
import type { AppPage, Theme } from '../types/app'

const pageTitles: Record<AppPage, string> = {
  overview: 'Overview',
  student: 'Student mode',
  developer: 'Developer mode',
  sessions: 'Focus sessions',
  insights: 'Insights',
  recommendations: 'Recommendations',
  settings: 'Settings',
}

interface TopBarProps {
  activePage: AppPage
  theme: Theme
  onToggleTheme: () => void
  onOpenNavigation: () => void
}

export function TopBar({ activePage, theme, onToggleTheme, onOpenNavigation }: TopBarProps) {
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const isOverview = activePage === 'overview'

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <button type="button" className="icon-button mobile-menu" aria-label="Open navigation" onClick={onOpenNavigation}>
          <Menu size={20} />
        </button>
        <div>
          <p className="topbar-eyebrow">{isOverview ? greeting : 'Your space'}</p>
          <h1>{isOverview ? 'Make room for your best work.' : pageTitles[activePage]}</h1>
        </div>
      </div>
      <div className="topbar-actions">
        <span className="today-chip"><span className="status-dot" /> Today, {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date())}</span>
        <button type="button" className="icon-button theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button type="button" className="icon-button notification-button" aria-label="Notifications are quiet" title="You’re all caught up">
          <Bell size={18} /><span className="notification-dot" />
        </button>
        <button type="button" className="profile-button" aria-label="Open settings">
          <span className="profile-avatar">AM</span>
        </button>
      </div>
    </header>
  )
}
