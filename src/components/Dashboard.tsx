import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Archive,
  Check,
  CircleHelp,
  Clock3,
  FileText,
  FolderKanban,
  Heart,
  Lightbulb,
  Pencil,
  Plus,
  Sparkles,
  Timer,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import type { AppPage, ProjectItem, SavedSession, StudyTask, WorkLogItem } from '../services/app-state'
import { ActivityChart, SubjectChart } from './DashboardCharts'
import type { ActivityPoint, SlicePoint } from './Charts'
import type { UseActivityTrackerReturn } from '../hooks/useActivityTracker'
import { fetchBrowserActivitySessionsForCurrentUser, loadLocalBrowserActivitySessions, persistOptInActivitySession } from '../services/browser-activity.ts'
import type { BrowserActivitySession, LocalBrowserActivitySession } from '../types/activity.ts'
import { selectDashboardCfiState } from '../services/cfi-display.ts'

interface DashboardProps {
  name: string
  sessions: SavedSession[]
  tasks: StudyTask[]
  projects: ProjectItem[]
  workLogs: WorkLogItem[]
  onNavigate: (page: AppPage) => void
  onStart: () => void
  onToggleTask: (id: string) => void
  onAddTask: () => void
  onEditTask: (task: StudyTask) => void
  onDeleteTask: (task: StudyTask) => void
  onAddProject: () => void
  onEditProject: (project: ProjectItem) => void
  onArchiveProject: (project: ProjectItem) => void
  onDeleteProject: (project: ProjectItem) => void
  onAddWorkLog: () => void
  onEditWorkLog: (log: WorkLogItem) => void
  onDeleteWorkLog: (log: WorkLogItem) => void
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const dateLabel = (value: string) => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const durationLabel = (minutes: number) => minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ''}`.trim() : `${minutes} min`

function createWeekData(sessions: SavedSession[]): ActivityPoint[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const records = sessions.filter((session) => sameDay(new Date(session.sessionDate), date))
    return { day: date.toLocaleDateString([], { weekday: 'short' }), minutes: records.reduce((total, session) => total + session.focusMinutes, 0) }
  })
}

function createDistribution(sessions: SavedSession[]): SlicePoint[] {
  const totals = new Map<string, number>()
  sessions.filter((session) => new Date(session.sessionDate).getTime() >= Date.now() - 7 * 86400000).forEach((session) => {
    const label = session.subject || session.project || session.category || 'Unassigned'
    totals.set(label, (totals.get(label) ?? 0) + session.focusMinutes)
  })
  return [...totals].map(([name, minutes]) => ({ name, minutes })).sort((a, b) => b.minutes - a.minutes)
}

function CfiCard({ sessions }: { sessions: SavedSession[] }) {
  const cfi = selectDashboardCfiState(sessions)
  const latest = cfi.latestSession
  const lastScored = cfi.latestScoredSession
  const score = cfi.status === 'scored' && latest ? latest.cfiScore : null
  const risk = latest?.cfiRiskLevel
    ? latest.cfiRiskLevel.charAt(0).toUpperCase() + latest.cfiRiskLevel.slice(1)
    : score === null ? null : score <= 33 ? 'Low' : score <= 66 ? 'Moderate' : 'High'
  const sections = cfi.sections

  function renderFactors(factors: string[]) {
    return <ul className="cfi-factors">{factors.map((factor, index) => <li key={`${index}-${factor}`}><span className="factor-check"><Check size={10} /></span><span>{factor}</span></li>)}</ul>
  }

  return <section className="panel cfi-panel" aria-labelledby="cfi-title">
    <div className="panel-heading cfi-heading"><div><span className="eyebrow">YOUR SIGNAL CHECK</span><h2 id="cfi-title">Latest CFI</h2></div><button type="button" className="icon-button quiet-button" aria-label="About the CFI score" title="The CFI is an experimental indicator, not a clinical diagnosis."><CircleHelp size={17} /></button></div>
    {cfi.status === 'empty' ? <div className="cfi-pending-state"><strong>No CFI result yet</strong><p>A score is available after a session is saved with both a recent check-in and an eligible individual wearable baseline.</p></div> : <>
      <div className="cfi-content">
        {score !== null ? <div className="cfi-ring" style={{ '--ring-progress': `${score}%` } as React.CSSProperties} aria-label={`CFI score ${score} out of 100`}><div className="cfi-ring-inner"><strong>{score}</strong><span>/ 100</span></div></div> : <div className="cfi-pending-score" role="status"><strong>Pending</strong><span>Not scored</span></div>}
        <div className="cfi-detail">
          {score !== null && risk ? <span className={`risk-pill ${risk.toLowerCase()}`}><span className="risk-dot" />{risk} signal</span> : <span className="risk-pill pending-cfi-status">Pending both scoring domains</span>}
          <p>{latest ? `Session evaluated ${new Date(latest.sessionDate).toLocaleString()}.` : 'No session timestamp available.'}</p>
          {cfi.status === 'pending' && <p className="cfi-pending-reason">{sections.pendingReasons.length ? 'The required data coverage is incomplete; see the breakdown below.' : 'A fresh subjective check-in and an eligible individual wearable baseline are both required.'}</p>}
          {cfi.isUnified ? <div className="cfi-source-breakdown">
            {sections.subjective.length > 0 && <section><strong>Subjective fatigue indicator · 50% provisional weight</strong>{renderFactors(sections.subjective)}</section>}
            {sections.wearable.length > 0 && <section><strong>Individual wearable domain · 50% provisional weight</strong>{renderFactors(sections.wearable)}</section>}
            {sections.pendingReasons.length > 0 && <section className="cfi-pending-reasons"><strong>Pending data</strong>{renderFactors(sections.pendingReasons)}</section>}
            {sections.activity.length > 0 && <section className="cfi-context-breakdown"><strong>Browser activity · context only · 0% scoring weight</strong>{renderFactors(sections.activity)}</section>}
            {sections.other.length > 0 && <details className="cfi-method-details"><summary>Method and provenance notes</summary>{renderFactors(sections.other)}</details>}
          </div> : <div className="cfi-source-breakdown">
            {latest && latest.cfiExplanation?.length ? <><strong>{latest.id.startsWith('demo-') ? 'Existing demo score' : 'Previously recorded score'} · not recalculated</strong>{renderFactors(latest.cfiExplanation)}</> : <p>Historical score details are not available.</p>}
          </div>}
          {score === null && lastScored && lastScored.id !== latest?.id && <p className="cfi-last-score">Last available score: {lastScored.cfiScore}/100 from {new Date(lastScored.sessionDate).toLocaleString()}. The newer session remains pending.</p>}
        </div>
      </div>
      <div className="cfi-footnote"><span>Experimental indicator · not a diagnosis</span><span className="demo-tag">{cfi.isUnified ? 'Unified CFI' : latest?.id.startsWith('demo-') ? 'Demo score' : 'Historical score'}</span></div>
    </>}
  </section>
}

function SessionRow({ session }: { session: SavedSession }) {
  return <div className="session-row"><span className="session-avatar"><Clock3 size={15} /></span><span className="session-info"><strong>{session.title}</strong><small>{session.subject || session.project || session.category} <span>·</span> {dateLabel(session.sessionDate)}</small></span><span className="session-duration">{session.focusMinutes}m</span>{session.pendingCFI ? <span className="pending-score">Pending</span> : <span className="session-score">{session.cfiScore}</span>}</div>
}

function StatCard({ icon: Icon, label, value, note, tone }: { icon: typeof Clock3; label: string; value: string; note: string; tone: string }) {
  return <div className={`stat-card ${tone}`}><span className="stat-icon"><Icon size={17} strokeWidth={1.9} /></span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></div>
}

function TaskPreview({ tasks, onToggle, onAdd, onEdit, onDelete }: { tasks: StudyTask[]; onToggle: (id: string) => void; onAdd: () => void; onEdit: (task: StudyTask) => void; onDelete: (task: StudyTask) => void }) {
  const done = tasks.filter((task) => task.completed).length
  const planned = tasks.reduce((total, task) => total + task.minutes, 0)
  const completeMinutes = tasks.filter((task) => task.completed).reduce((total, task) => total + task.minutes, 0)
  return <section className="panel task-panel"><div className="panel-heading"><div><span className="eyebrow">A GENTLE PLAN</span><h2>Today&apos;s priorities</h2></div><button type="button" className="text-action" onClick={onAdd}><Plus size={15} /> Add task</button></div><div className="task-progress-copy"><strong>{done} of {tasks.length} tasks</strong><span>{completeMinutes}/{planned} min</span></div><div className="progress-track"><span style={{ width: `${planned ? Math.min(100, completeMinutes / planned * 100) : 0}%` }} /></div><div className="task-list">{tasks.length ? tasks.slice(0, 4).map((task) => <div className={`task-row${task.completed ? ' completed' : ''}`} key={task.id}><button type="button" className="task-toggle" onClick={() => onToggle(task.id)} aria-pressed={task.completed} aria-label={`${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}><span className="task-check">{task.completed && <Check size={13} />}</span><span className="task-copy"><strong>{task.title}</strong><small>{task.subject}</small></span></button><span className="task-minutes">{task.minutes}m</span><button type="button" className="row-action" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><Pencil size={13} /></button><button type="button" className="row-action delete-row-action" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}><Trash2 size={13} /></button></div>) : <div className="inline-empty">Your list is clear. Add one small next step.</div>}</div></section>
}

function ProjectPreview({ projects, sessions, onAdd, onEdit, onArchive, onDelete }: { projects: ProjectItem[]; sessions: SavedSession[]; onAdd: () => void; onEdit: (project: ProjectItem) => void; onArchive: (project: ProjectItem) => void; onDelete: (project: ProjectItem) => void }) {
  const activeProjects = projects.filter((project) => !project.archived)
  return <section className="panel project-panel"><div className="panel-heading"><div><span className="eyebrow">WHAT&apos;S IN MOTION</span><h2>Projects &amp; interests</h2></div><button type="button" className="icon-button soft-icon-button" onClick={onAdd} aria-label="Add project"><Plus size={16} /></button></div><div className="project-list">{activeProjects.length ? activeProjects.slice(0, 4).map((project) => { const projectMinutes = sessions.filter((session) => session.project === project.name).reduce((total, session) => total + session.focusMinutes, 0); const latest = sessions.find((session) => session.project === project.name); return <div className="project-row" key={project.id}><span className={`project-swatch ${project.color}`}><FolderKanban size={15} /></span><span className="project-copy"><strong>{project.name}</strong><small>{latest ? latest.title : project.detail}</small></span><span className="project-time">{durationLabel(projectMinutes)}</span><button type="button" className="row-action" onClick={() => onEdit(project)} aria-label={`Edit ${project.name}`}><Pencil size={13} /></button><button type="button" className="row-action" onClick={() => onArchive(project)} aria-label={`Archive ${project.name}`}><Archive size={13} /></button><button type="button" className="row-action delete-row-action" onClick={() => onDelete(project)} aria-label={`Delete ${project.name}`}><Trash2 size={13} /></button></div> }) : <div className="inline-empty">Add a project or personal goal.</div>}</div><button className="panel-bottom-link" type="button" onClick={onAdd}>Add a project <ArrowRight size={14} /></button></section>
}

function WorkLogPreview({ logs, onAdd, onEdit, onDelete }: { logs: WorkLogItem[]; onAdd: () => void; onEdit: (log: WorkLogItem) => void; onDelete: (log: WorkLogItem) => void }) {
  return <section className="panel worklog-panel"><div className="panel-heading"><div><span className="eyebrow">A FEW THINGS THAT MOVED</span><h2>Recent notes</h2></div><button type="button" className="text-action" onClick={onAdd}><Plus size={14} /> Add note</button></div><div className="worklog-list">{logs.length ? [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map((log) => <div className="worklog-row" key={log.id}><span className="worklog-icon"><FileText size={15} /></span><span className="worklog-copy"><strong>{log.description}</strong><small>{log.project} <span>·</span> {log.category}</small></span><button type="button" className="row-action" onClick={() => onEdit(log)} aria-label={`Edit ${log.description}`}><Pencil size={13} /></button><button type="button" className="row-action delete-row-action" onClick={() => onDelete(log)} aria-label={`Delete ${log.description}`}><Trash2 size={13} /></button></div>) : <div className="inline-empty">Save a note about something you completed.</div>}</div></section>
}

function trackedDurationLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

export function BrowserActivityPanel({ tracker, userId }: { tracker: UseActivityTrackerReturn; userId: string }) {
  const { metrics, isTracking, start, stop, reset } = tracker
  const [cloudSessions, setCloudSessions] = useState<BrowserActivitySession[]>([])
  const [localSessions, setLocalSessions] = useState<LocalBrowserActivitySession[]>(() => loadLocalBrowserActivitySessions())
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isSavingSession, setIsSavingSession] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    void fetchBrowserActivitySessionsForCurrentUser(controller.signal).then((result) => {
      if (!active) return
      if (result.data === null) setHistoryError(result.error ?? 'Activity history could not be loaded.')
      else setCloudSessions(result.data)
    }).catch(() => {
      if (active) setHistoryError('Activity history could not be loaded.')
    }).finally(() => {
      if (active) setIsLoadingHistory(false)
    })
    return () => {
      active = false
      controller.abort()
    }
  }, [userId])

  async function stopAndSave() {
    const finalMetrics = stop()
    if (!finalMetrics) return
    setIsSavingSession(true)
    setSaveMessage('')
    try {
      const result = await persistOptInActivitySession(finalMetrics)
      const cloudRecord = result.cloudRecord
      const localRecord = result.localRecord
      if (cloudRecord && cloudRecord.userId === userId) {
        setCloudSessions((current) => [cloudRecord, ...current.filter((session) => session.id !== cloudRecord.id)])
        setHistoryError('')
        setSaveMessage('This opt-in activity session was saved to your account.')
      } else if (localRecord) {
        setLocalSessions((current) => [localRecord, ...current.filter((session) => session.id !== localRecord.id)])
        setSaveMessage('Cloud save was unavailable. The aggregate session was kept locally and was not linked to an account.')
      } else {
        setSaveMessage(result.error ?? 'The activity session could not be saved.')
      }
    } catch {
      setSaveMessage('The activity session could not be saved.')
    } finally {
      setIsSavingSession(false)
    }
  }

  return <section className="panel browser-activity-panel">
    <div className="panel-heading"><div><span className="eyebrow">OPTIONAL · BROWSER TAB ONLY</span><h2>Keyboard and mouse counts</h2></div><span className={`browser-activity-status${isTracking ? ' is-tracking' : ''}`} role="status">{isTracking ? 'Tracking on' : 'Tracking off'}</span></div>
    <p className="browser-activity-copy">Tracking is off until you opt in. While enabled, Burnout Radarr counts key presses and primary mouse clicks in this tab only. It never reads key values, typed text, field contents, click targets, or coordinates, and it does not track system-wide activity. Only aggregate counts and session times are saved.</p>
    <div className="browser-activity-metrics">
      <div><span>Key presses</span><strong>{metrics.keyPressCount.toLocaleString()}</strong></div>
      <div><span>Mouse clicks</span><strong>{metrics.mouseClickCount.toLocaleString()}</strong></div>
      <div><span>Tracking time</span><strong>{trackedDurationLabel(metrics.elapsedSeconds)}</strong></div>
    </div>
    {saveMessage && <p className="browser-activity-save-message" role="status">{saveMessage}</p>}
    <div className="browser-activity-footer">
      <span>{isTracking ? 'Only counts are collected; no input content is read.' : 'Choose Start tracking to begin count-only collection.'}</span>
      <div className="browser-activity-controls">
        {isTracking ? <button type="button" className="browser-activity-toggle is-stop" onClick={() => { void stopAndSave() }}>Stop &amp; save session</button> : <>
          <button type="button" className="button-secondary browser-activity-reset" onClick={reset} disabled={isSavingSession || (!metrics.keyPressCount && !metrics.mouseClickCount && !metrics.elapsedSeconds)}>Reset counts</button>
          <button type="button" className="browser-activity-toggle" onClick={start} disabled={isSavingSession}>Start tracking</button>
        </>}
      </div>
    </div>
    <section className="browser-activity-history" aria-label="Saved browser activity sessions">
      <h3>Recent opt-in sessions</h3>
      {isLoadingHistory && <p role="status">Loading account activity…</p>}
      {historyError && <p role="alert">{historyError}</p>}
      {!isLoadingHistory && !historyError && cloudSessions.length === 0 && <p>No account activity sessions yet.</p>}
      {cloudSessions.slice(0, 5).map((session) => <div className="browser-activity-history-row" key={`cloud-${session.id}`}>
        <span><strong>{new Date(session.startedAt).toLocaleString()}</strong><small>Account session · {session.durationSeconds}s</small></span>
        <span>{session.keyPressCount.toLocaleString()} key presses · {session.mouseClickCount.toLocaleString()} clicks</span>
      </div>)}
      {localSessions.slice(0, 5).map((session) => <div className="browser-activity-history-row is-local" key={`local-${session.id}`}>
        <span><strong>{new Date(session.startedAt).toLocaleString()}</strong><small>Local only · not linked to an account · {session.durationSeconds}s</small></span>
        <span>{session.keyPressCount.toLocaleString()} key presses · {session.mouseClickCount.toLocaleString()} clicks</span>
      </div>)}
    </section>
  </section>
}

export function Dashboard(props: DashboardProps) {
  const { name, sessions, tasks, projects, workLogs, onNavigate, onStart, onToggleTask, onAddTask, onEditTask, onDeleteTask, onAddProject, onEditProject, onArchiveProject, onDeleteProject, onAddWorkLog, onEditWorkLog, onDeleteWorkLog } = props
  const today = new Date()
  const todaySessions = sessions.filter((session) => sameDay(new Date(session.sessionDate), today))
  const focusToday = todaySessions.reduce((total, session) => total + session.focusMinutes, 0)
  const weekData = createWeekData(sessions)
  const weekFocus = weekData.reduce((total, day) => total + day.minutes, 0)
  const average = sessions.length ? Math.round(sessions.reduce((total, session) => total + session.focusMinutes, 0) / sessions.length) : 0
  const distribution = createDistribution(sessions)
  const recent = [...sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)).slice(0, 4)
  const greeting = new Date().getHours() < 12 ? 'A bright start to the day.' : 'You have done enough to be proud of.'
  const latestCheckInSession = sessions.find((session) => session.checkInContextAvailable !== false)

  return <div className="dashboard-page overview-page">
    <div className="page-title-row"><div><span className="eyebrow">YOUR PERSONAL RADARR</span><h1>Your week, in focus.</h1><p>Notice your rhythm, then make space for what you need.</p></div><span className="live-date"><span className="live-date-dot" /> {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
    <section className="overview-hero"><div><span className="hero-kicker"><Sparkles size={13} /> YOUR WEEK, AT A GLANCE</span><h2>Welcome back, {name}.</h2><p>{greeting} Where would you like to begin?</p><div className="unified-hero-actions"><button className="button-primary" type="button" onClick={onStart}><Timer size={16} /> Start a focus session <ArrowRight size={15} /></button><button className="button-secondary" type="button" onClick={() => onNavigate('check-in')}>Daily check-in</button></div></div><div className="overview-orb" aria-hidden="true"><span className="orb-ring" /><span className="orb-center"><ActivityChart data={weekData} compact /></span><span className="orb-caption">YOUR RHYTHM</span></div></section>
    <div className="stat-grid overview-stat-grid"><StatCard icon={Clock3} label="Focused today" value={durationLabel(focusToday)} note="time well spent" tone="lavender" /><StatCard icon={Timer} label="Sessions today" value={String(todaySessions.length)} note="small steps count" tone="peach" /><StatCard icon={TrendingUp} label="This week" value={durationLabel(weekFocus)} note="focused minutes" tone="sage" /><StatCard icon={Heart} label="Average session" value={average ? `${average}m` : '—'} note="across your journal" tone="blue" /></div>
    <div className="dashboard-grid overview-grid">
      <section className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">THE LAST 7 DAYS</span><h2>Your activity</h2></div><button type="button" className="text-action" onClick={() => onNavigate('activity')}>View activity <ArrowRight size={14} /></button></div><ActivityChart data={weekData} /></section>
      <CfiCard sessions={sessions} />
      <section className="panel distribution-panel"><div className="panel-heading"><div><span className="eyebrow">A LITTLE CONTEXT</span><h2>Time by focus area</h2></div><button type="button" className="icon-button quiet-button" onClick={() => onNavigate('insights')} aria-label="View analysis and insights"><ArrowRight size={16} /></button></div><SubjectChart data={distribution} /></section>
      <TaskPreview tasks={tasks} onToggle={onToggleTask} onAdd={onAddTask} onEdit={onEditTask} onDelete={onDeleteTask} />
      <ProjectPreview projects={projects} sessions={sessions} onAdd={onAddProject} onEdit={onEditProject} onArchive={onArchiveProject} onDelete={onDeleteProject} />
      <section className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow">JUST CHECKING IN</span><h2>Recent sessions</h2></div><button type="button" className="text-action" onClick={() => onNavigate('activity')}>View all <ArrowRight size={14} /></button></div><div className="session-list">{recent.length ? recent.map((session) => <SessionRow key={session.id} session={session} />) : <div className="inline-empty">Your next session will show up here.</div>}</div></section>
      <WorkLogPreview logs={workLogs} onAdd={onAddWorkLog} onEdit={onEditWorkLog} onDelete={onDeleteWorkLog} />
      <section className="panel recovery-panel"><div className="recovery-icon"><Lightbulb size={17} /></div><div><span className="eyebrow">A GENTLE REMINDER</span><h2>Recovery is part of the rhythm.</h2><p>{latestCheckInSession && latestCheckInSession.perceivedFatigue >= 6 ? 'Your last check-in felt a little heavy. Consider a lighter next step or a few minutes away.' : 'A short reset can make the next focus block feel clearer.'}</p></div><button type="button" className="text-action" onClick={() => onNavigate('insights')}>Explore insights <ArrowRight size={14} /></button></section>
    </div>
  </div>
}
