import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownToLine, ArrowRight, Check, CircleHelp, Clock3, Heart, Lightbulb, MoonStar, ShieldCheck, Sparkles, SunMedium } from 'lucide-react'
import type { AppPreferences, SavedSession } from '../services/app-state'
import { ActivityChart, CompareBars, SubjectChart, type SlicePoint } from './Charts'

const minutesLabel = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`
const dateLabel = (date: string) => new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })
const timeLabel = (date: string) => new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const todayAt = (date: string) => {
  const value = new Date(date)
  const now = new Date()
  return value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth() && value.getDate() === now.getDate()
}

function weekPoints(sessions: SavedSession[], mode?: 'student' | 'developer') {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - 6 + index)
    const matching = sessions.filter((session) => {
      const sessionDate = new Date(session.sessionDate)
      return sessionDate.getFullYear() === date.getFullYear() && sessionDate.getMonth() === date.getMonth() && sessionDate.getDate() === date.getDate() && (!mode || session.mode === mode)
    })
    return { day: date.toLocaleDateString([], { weekday: 'short' }), minutes: matching.reduce((total, session) => total + session.focusMinutes, 0) }
  })
}

function distribution(sessions: SavedSession[], key: 'subject' | 'project' | 'category'): SlicePoint[] {
  const values = new Map<string, number>()
  sessions.forEach((session) => {
    const name = session[key] || 'Unassigned'
    values.set(name, (values.get(name) ?? 0) + session.focusMinutes)
  })
  return [...values].map(([name, minutes]) => ({ name, minutes })).sort((a, b) => b.minutes - a.minutes)
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty-state"><span><Sparkles size={18} /></span><strong>{title}</strong><p>{body}</p></div>
}

function exportSessions(sessions: SavedSession[]) {
  const columns = ['Date', 'Mode', 'Title', 'Subject', 'Project', 'Category', 'Focused minutes', 'Break minutes', 'Sleep hours', 'Fatigue', 'Completed', 'CFI score']
  const rows = sessions.map((session) => [
    session.sessionDate,
    session.mode,
    session.title,
    session.subject,
    session.project,
    session.category,
    session.focusMinutes,
    session.breakMinutes,
    session.sleepHours,
    session.perceivedFatigue,
    session.completed ? 'yes' : 'no',
    session.pendingCFI ? 'pending' : session.cfiScore,
  ])
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const csv = [columns, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'burnout-radarr-sessions.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function HistoryPage({ sessions, onOpenSession }: { sessions: SavedSession[]; onOpenSession?: (session: SavedSession) => void }) {
  const [mode, setMode] = useState('all')
  const [subject, setSubject] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [duration, setDuration] = useState('all')
  const [now] = useState(() => Date.now())
  const subjects = [...new Set(sessions.map((session) => session.subject || session.project).filter(Boolean))].sort()
  const filtered = sessions.filter((session) => {
    if (mode !== 'all' && session.mode !== mode) return false
    if (subject !== 'all' && session.subject !== subject && session.project !== subject) return false
    if (dateRange === 'week' && new Date(session.sessionDate).getTime() < now - 7 * 86400000) return false
    if (dateRange === 'month' && new Date(session.sessionDate).getTime() < now - 30 * 86400000) return false
    if (duration === 'short' && session.focusMinutes >= 45) return false
    if (duration === 'long' && session.focusMinutes < 45) return false
    return true
  }).sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))

  return <div className="content-page">
    <div className="page-title-row"><div><span className="eyebrow">THE NOTES YOU LEFT YOURSELF</span><h1>Focus sessions</h1><p>A clear-eyed look back, without a scorecard.</p></div><button type="button" className="button-secondary" onClick={() => exportSessions(filtered)}><ArrowDownToLine size={16} /> Export CSV</button></div>
    <section className="panel history-panel">
      <div className="history-filters">
        <label>Mode<select value={mode} onChange={(event) => setMode(event.target.value)}><option value="all">All modes</option><option value="student">Student</option><option value="developer">Developer</option></select></label>
        <label>Subject or project<select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="all">Everything</option>{subjects.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <label>When<select value={dateRange} onChange={(event) => setDateRange(event.target.value)}><option value="all">Any time</option><option value="week">Past 7 days</option><option value="month">Past 30 days</option></select></label>
        <label>Length<select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="all">Any length</option><option value="short">Under 45 min</option><option value="long">45 min or more</option></select></label>
        <span className="filter-count">{filtered.length} {filtered.length === 1 ? 'session' : 'sessions'}</span>
      </div>
      {filtered.length ? <div className="history-table-wrap"><table className="history-table"><thead><tr><th>Session</th><th>Mode</th><th>Date</th><th>Duration</th><th>Break</th><th>Feeling</th><th>CFI</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{filtered.map((session) => <tr key={session.id}>
        <td><strong>{session.title}</strong><small>{session.subject || session.project || session.category}</small></td>
        <td><span className={`table-mode ${session.mode}`}>{session.mode === 'student' ? 'Study' : 'Dev'}</span></td>
        <td><strong>{todayAt(session.sessionDate) ? 'Today' : dateLabel(session.sessionDate)}</strong><small>{timeLabel(session.sessionDate)}</small></td>
        <td>{session.focusMinutes} min{!session.completed && <small className="incomplete-note">· ended early</small>}</td>
        <td>{session.breakMinutes} min</td>
        <td>{session.feeling || '—'}</td>
        <td>{session.pendingCFI ? <span className="pending-score">Pending</span> : <span className="history-score">{session.cfiScore}</span>}</td>
        <td><button className="icon-button quiet-button" type="button" onClick={() => onOpenSession?.(session)} aria-label={`Open ${session.title}`} title="View session details"><ArrowRight size={15} /></button></td>
      </tr>)}</tbody></table></div> : <EmptyState title="No sessions match those filters" body="Try widening your date range or choosing another mode." />}
      <div className="history-note"><CircleHelp size={14} /> This is your personal journal. It is not a productivity ranking.</div>
    </section>
  </div>
}

export function InsightsPage({ sessions }: { sessions: SavedSession[] }) {
  const minutesByDay = weekPoints(sessions)
  const focusTotal = minutesByDay.reduce((total, point) => total + point.minutes, 0)
  const average = sessions.length ? Math.round(sessions.reduce((total, session) => total + session.focusMinutes, 0) / sessions.length) : 0
  const subjects = distribution(sessions.filter((session) => session.mode === 'student'), 'subject')
  const projects = distribution(sessions.filter((session) => session.mode === 'developer'), 'project')
  const categories = distribution(sessions.filter((session) => session.mode === 'developer'), 'category')
  const scored = [...sessions].filter((session) => !session.pendingCFI).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate)).slice(-7).map((session) => ({ day: dateLabel(session.sessionDate), score: session.cfiScore }))
  const breakMinutes = sessions.reduce((total, session) => total + session.breakMinutes, 0)
  const focusBreakRatio = breakMinutes ? `${Math.round(sessions.reduce((total, session) => total + session.focusMinutes, 0) / breakMinutes)}:1` : '—'
  const trend = scored.length > 1 ? scored[scored.length - 1].score - scored[0].score : 0

  return <div className="content-page">
    <div className="page-title-row"><div><span className="eyebrow">PATTERNS, NOT PRESSURE</span><h1>Your insights</h1><p>Small signals can help you find a steadier rhythm.</p></div><span className="demo-tag"><span className="demo-dot" /> Personal journal</span></div>
    <div className="insights-summary-grid">
      <div className="insight-summary"><span>FOCUSED THIS WEEK</span><strong>{minutesLabel(focusTotal)}</strong><small><Clock3 size={13} /> Across {sessions.length} recorded sessions</small></div>
      <div className="insight-summary"><span>AVERAGE SESSION</span><strong>{average ? `${average} min` : '—'}</strong><small><Heart size={13} /> Your pace, your way</small></div>
      <div className="insight-summary"><span>FOCUS / BREAK</span><strong>{focusBreakRatio}</strong><small><SunMedium size={13} /> A healthy pause is part of it</small></div>
      <div className="insight-summary"><span>CFI TREND</span><strong>{scored.length ? `${trend > 0 ? '+' : ''}${trend} pts` : '—'}</strong><small><ShieldCheck size={13} /> Experimental signal, not diagnosis</small></div>
    </div>
    <div className="insights-grid">
      <section className="panel insights-chart-panel"><div className="panel-heading"><div><span className="eyebrow">THE LAST SEVEN DAYS</span><h2>Minutes in focus</h2></div><span className="chart-total"><strong>{minutesLabel(focusTotal)}</strong><small>logged time</small></span></div><ActivityChart data={minutesByDay} /></section>
      <section className="panel insights-chart-panel"><div className="panel-heading"><div><span className="eyebrow">RECORDED CHECK-INS</span><h2>CFI history</h2></div><button type="button" className="icon-button quiet-button" title="CFI is an experimental wellness estimate, not a medical diagnosis." aria-label="About the CFI"><CircleHelp size={16} /></button></div>
        {scored.length ? <div className="chart-wrap cfi-trend-chart" role="img" aria-label="Recorded CFI trend"><ResponsiveContainer width="100%" height="100%"><LineChart data={scored} margin={{ top: 12, right: 10, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 5" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-label)', fontSize: 11 }} dy={8} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-label)', fontSize: 11 }} /><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)' }} formatter={(value) => [`${value ?? 0}/100`, 'CFI']} /><Line type="monotone" dataKey="score" stroke="var(--accent-strong)" strokeWidth={3} dot={{ fill: 'var(--accent-strong)', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div> : <EmptyState title="Your trend starts with a check-in" body="When scores are available, they will show here." />}
        <div className="chart-disclaimer">Experimental estimate · not a diagnosis</div>
      </section>
      <section className="panel insights-chart-panel"><div className="panel-heading"><div><span className="eyebrow">STUDY SPACE</span><h2>Subject mix</h2></div></div><SubjectChart data={subjects} /></section>
      <section className="panel insights-chart-panel"><div className="panel-heading"><div><span className="eyebrow">DEV WORKSPACE</span><h2>Time by project</h2></div></div><SubjectChart data={projects} mode="developer" /></section>
      <section className="panel insights-wide-panel"><div className="panel-heading"><div><span className="eyebrow">A WEEK IN CONTEXT</span><h2>Focus minutes, day by day</h2></div></div><CompareBars data={minutesByDay} /></section>
      <section className="panel category-panel"><div className="panel-heading"><div><span className="eyebrow">HOW YOU SPENT IT</span><h2>Work categories</h2></div></div>{categories.length ? <div className="category-bars">{categories.slice(0, 5).map((item, index) => <div className="category-bar-row" key={item.name}><div><span>{item.name}</span><strong>{item.minutes}m</strong></div><span className="category-track"><i style={{ width: `${Math.max(8, item.minutes / Math.max(...categories.map((category) => category.minutes)) * 100)}%`, animationDelay: `${index * 80}ms` }} /></span></div>)}</div> : <EmptyState title="No developer sessions yet" body="Work categories will appear after your first session." />}</section>
    </div>
  </div>
}

export function RecommendationsPage({ sessions, onStart }: { sessions: SavedSession[]; onStart: (mode: 'student' | 'developer') => void }) {
  const latest = [...sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))[0]
  const suggestions = [
    { icon: MoonStar, title: 'Make room for rest', body: latest && latest.sleepHours < 7 ? `You logged ${latest.sleepHours} hours of sleep before your last session. If it fits your day, a little extra rest may help.` : 'A consistent wind-down can make it easier to arrive at tomorrow with a clearer head.', tone: 'lavender' },
    { icon: SunMedium, title: 'Let the break be a break', body: latest ? `Your last session included a ${latest.breakMinutes}-minute pause. Try standing up, stretching, or looking away from the screen.` : 'A short stretch or a glass of water can be a good reset between focus blocks.', tone: 'peach' },
    { icon: Lightbulb, title: 'Choose one next step', body: latest && latest.perceivedFatigue >= 6 ? 'Your recent fatigue check-in was on the higher side. Consider switching to a lighter task or breaking a large one into smaller pieces.' : 'A small, clear next step can feel easier to start than the whole project.', tone: 'sage' },
  ]
  return <div className="content-page">
    <div className="page-title-row"><div><span className="eyebrow">A KINDER KIND OF NUDGE</span><h1>Recovery notes</h1><p>Practical ideas, never medical advice or a grade.</p></div><span className="recovery-badge"><Heart size={14} /> Care over output</span></div>
    <div className="recommendation-grid">{suggestions.map(({ icon: Icon, title, body, tone }) => <article className={`recommendation-card ${tone}`} key={title}><span className="recommendation-icon"><Icon size={19} /></span><span className="eyebrow">A SMALL SUGGESTION</span><h2>{title}</h2><p>{body}</p><span className="recommendation-foot"><Check size={13} /> Take what helps, leave the rest.</span></article>)}</div>
    <section className="panel recommendation-cta"><div><span className="eyebrow">READY WHEN YOU ARE</span><h2>Start with a manageable block.</h2><p>Choose a focus session that fits the energy you have today.</p></div><button type="button" className="button-primary" onClick={() => onStart(latest?.mode ?? 'student')}><Clock3 size={16} /> Set up a session <ArrowRight size={15} /></button></section>
    <p className="medical-note"><ShieldCheck size={15} /> Burnout Radarr offers an experimental wellness estimate for reflection only. It does not diagnose, treat, or replace professional care.</p>
  </div>
}

export function SettingsPage({ preferences, sessions, user, onChange, onResetSettings, onResetData, onSave, onOpenAuth, onSignOut }: {
  preferences: AppPreferences
  sessions: SavedSession[]
  user?: { email?: string } | null
  onChange: (patch: Partial<AppPreferences>) => void
  onResetSettings: () => void
  onResetData: () => void
  onSave: () => void
  onOpenAuth?: () => void
  onSignOut?: () => void
}) {
  return <div className="content-page">
    <div className="page-title-row"><div><span className="eyebrow">MAKE THIS SPACE YOURS</span><h1>Settings</h1><p>Your preferences stay on this device.</p></div><button className="button-primary settings-save" type="button" onClick={onSave}><Check size={16} /> Save settings</button></div>
    <div className="settings-layout">
      <div className="settings-main">
        <section className="panel settings-section"><div className="settings-section-title"><span className="settings-icon"><Heart size={17} /></span><div><h2>Your profile</h2><p>Just for a more personal hello.</p></div></div><label className="field-label">Name<input value={preferences.name} maxLength={32} onChange={(event) => onChange({ name: event.target.value })} /></label></section>
        <section className="panel settings-section"><div className="settings-section-title"><span className="settings-icon"><Sparkles size={17} /></span><div><h2>Workspace defaults</h2><p>Pick the space and rhythm you usually start with.</p></div></div>
          <div className="settings-field-row"><label className="field-label">Default mode<select value={preferences.defaultMode} onChange={(event) => onChange({ defaultMode: event.target.value as 'student' | 'developer' })}><option value="student">Student · Study space</option><option value="developer">Developer · Command centre</option></select></label><label className="field-label">Focus duration<select value={preferences.focusMinutes} onChange={(event) => onChange({ focusMinutes: Number(event.target.value) })}>{[25, 45, 50, 60, 90].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label><label className="field-label">Break duration<select value={preferences.breakMinutes} onChange={(event) => onChange({ breakMinutes: Number(event.target.value) })}>{[5, 8, 10, 15, 20].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label></div>
        </section>
        <section className="panel settings-section"><div className="settings-section-title"><span className="settings-icon"><SunMedium size={17} /></span><div><h2>Appearance</h2><p>Choose a theme that feels right.</p></div></div><div className="theme-choices" role="radiogroup" aria-label="Theme">
          {[['light', 'Light', SunMedium], ['dark', 'Dark', MoonStar], ['system', 'System', CircleHelp]].map(([value, label, Icon]) => {
            const ThemeIcon = Icon as typeof SunMedium
            return <button key={value as string} type="button" role="radio" aria-checked={preferences.theme === value} className={`theme-choice${preferences.theme === value ? ' selected' : ''}`} onClick={() => onChange({ theme: value as AppPreferences['theme'] })}><ThemeIcon size={17} /><span>{label as string}</span>{preferences.theme === value && <Check size={14} />}</button>
          })}
        </div></section>
        <section className="panel settings-section"><div className="settings-section-title"><span className="settings-icon"><Heart size={17} /></span><div><h2>Gentle reminders</h2><p>Little nudges, only if they are useful to you.</p></div></div>
          <label className="toggle-row"><span><strong>Break reminders</strong><small>Suggest a short pause during longer sessions.</small></span><input type="checkbox" checked={preferences.breakReminders} onChange={(event) => onChange({ breakReminders: event.target.checked })} /><i /></label>
          <label className="toggle-row"><span><strong>Notifications</strong><small>Show in-app session and break reminders.</small></span><input type="checkbox" checked={preferences.notifications} onChange={(event) => onChange({ notifications: event.target.checked })} /><i /></label>
        </section>
        <section className="panel settings-section data-settings"><div className="settings-section-title"><span className="settings-icon"><ArrowDownToLine size={17} /></span><div><h2>Your data</h2><p>Manage the demo journal stored on this device.</p></div></div><button className="button-secondary" type="button" onClick={() => exportSessions(sessions)}><ArrowDownToLine size={15} /> Export session data</button><button className="button-danger-quiet" type="button" onClick={onResetData}>Reset local demo data</button></section>
        <section className="panel settings-section reset-section"><div><h2>Reset preferences</h2><p>Restore the original mode, theme and timer defaults.</p></div><button type="button" className="button-secondary" onClick={onResetSettings}>Reset settings</button></section>
      </div>
      <aside className="settings-aside">
        <div className="privacy-card">
          <span className="privacy-icon"><ShieldCheck size={18} /></span>
          <span className="eyebrow">{user ? 'CLOUD CONNECTED' : 'PRIVATE BY DEFAULT'}</span>
          <h2>{user ? 'Cloud sync active.' : 'Your journal stays yours.'}</h2>
          <p>{user ? 'Your sessions and CFI results are securely stored with Supabase Row Level Security.' : 'Sessions and settings are saved in this browser’s local storage. Sign in to sync across devices.'}</p>
          <span className="privacy-status">
            <i style={{ background: user ? '#607f42' : undefined }} />
            {user ? `Signed in (${user.email})` : 'Local storage enabled'}
          </span>
          {user ? (
            <button type="button" className="button-secondary" onClick={onSignOut} style={{ marginTop: '12px', width: '100%', fontSize: '10px' }}>
              Sign out
            </button>
          ) : (
            <button type="button" className="button-secondary" onClick={onOpenAuth} style={{ marginTop: '12px', width: '100%', fontSize: '10px' }}>
              Sign in to cloud
            </button>
          )}
        </div>
        <div className="cfi-notice"><CircleHelp size={15} /><p>The CFI is an experimental wellness estimate, not a medical diagnosis. Completed sessions are evaluated locally by the CFI engine.</p></div>
      </aside>
    </div>
  </div>
}
