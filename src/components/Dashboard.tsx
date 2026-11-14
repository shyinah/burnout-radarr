import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CircleHelp,
  Clock3,
  Code2,
  FolderKanban,
  Lightbulb,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Trash2,
  Archive,
  FileText,
} from 'lucide-react'
import type { AppPage, ProjectItem, SavedSession, StudyTask, WorkLogItem } from '../services/app-state'
import { ActivityChart, SubjectChart } from './DashboardCharts'
import type { ActivityPoint, SlicePoint } from './Charts'

interface DashboardProps {
  view: 'overview' | 'student' | 'developer'
  name: string
  sessions: SavedSession[]
  tasks: StudyTask[]
  projects: ProjectItem[]
  workLogs: WorkLogItem[]
  onNavigate: (page: AppPage) => void
  onStart: (mode: 'student' | 'developer') => void
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

function createWeekData(sessions: SavedSession[], mode?: 'student' | 'developer'): ActivityPoint[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const records = sessions.filter((session) => {
      const sessionDate = new Date(session.sessionDate)
      return sameDay(sessionDate, date) && (!mode || session.mode === mode)
    })
    return {
      day: date.toLocaleDateString([], { weekday: 'short' }),
      minutes: records.reduce((total, session) => total + session.focusMinutes, 0),
    }
  })
}

function createDistribution(sessions: SavedSession[], mode: 'student' | 'developer'): SlicePoint[] {
  const totals = new Map<string, number>()
  sessions.filter((session) => session.mode === mode && new Date(session.sessionDate).getTime() >= Date.now() - 7 * 86400000)
    .forEach((session) => {
      const name = mode === 'student' ? session.subject : session.project || 'Unassigned'
      totals.set(name, (totals.get(name) ?? 0) + session.focusMinutes)
    })
  return [...totals].map(([name, minutes]) => ({ name, minutes })).sort((a, b) => b.minutes - a.minutes)
}

function CfiCard({ sessions }: { sessions: SavedSession[] }) {
  const latest = [...sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)).find((session) => !session.pendingCFI)
  const score = latest?.cfiScore ?? 0
  const risk = latest?.cfiRiskLevel
    ? latest.cfiRiskLevel.charAt(0).toUpperCase() + latest.cfiRiskLevel.slice(1)
    : score <= 33
      ? 'Low'
      : score <= 66
        ? 'Moderate'
        : 'High'
  const factors = latest?.cfiExplanation && latest.cfiExplanation.length > 1
    ? latest.cfiExplanation.slice(1)
    : latest
      ? [
          `${latest.sleepHours}h sleep recorded`,
          `Fatigue check-in: ${latest.perceivedFatigue}/10`,
          `${latest.breakMinutes}m planned break`,
        ]
      : ['Complete a session to start your trend.']
  const isDemo = latest?.id?.startsWith('demo-') ?? true

  return (
    <section className="panel cfi-panel" aria-labelledby="cfi-title">
      <div className="panel-heading cfi-heading">
        <div><span className="eyebrow">YOUR SIGNAL CHECK</span><h2 id="cfi-title">Focus &amp; balance</h2></div>
        <button type="button" className="icon-button quiet-button" aria-label="About the CFI score" title="The CFI is an experimental wellness estimate, not a diagnosis."><CircleHelp size={17} /></button>
      </div>
      <div className="cfi-content">
        <div className="cfi-ring" style={{ '--ring-progress': `${score}%` } as React.CSSProperties} aria-label={`CFI score ${score} out of 100`}>
          <div className="cfi-ring-inner"><strong>{score}</strong><span>/ 100</span></div>
        </div>
        <div className="cfi-detail">
          <span className={`risk-pill ${risk.toLowerCase()}`}><span className="risk-dot" />{risk} signal</span>
          <p>{risk === 'Low' ? 'A steady rhythm is taking shape.' : risk === 'Moderate' ? 'A little room to recharge could help.' : 'Your recent check-ins suggest it may be time to ease up.'}</p>
          <ul className="cfi-factors">{factors.map((factor) => <li key={factor}><span className="factor-check"><Check size={10} /></span>{factor}</li>)}</ul>
        </div>
      </div>
      <div className="cfi-footnote"><span>Experimental estimate · not a diagnosis</span><span className="demo-tag">{isDemo ? 'Demo score' : 'Calculated'}</span></div>
    </section>
  )
}

function StatCard({ icon: Icon, label, value, note, tone, trend }: { icon: typeof Clock3; label: string; value: string; note: string; tone: string; trend?: 'up' | 'down' }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className="stat-icon"><Icon size={17} strokeWidth={1.9} /></span>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-note">{trend === 'up' ? <ArrowUpRight size={13} /> : trend === 'down' ? <ArrowDownRight size={13} /> : null}{note}</span>
    </div>
  )
}

function SessionRow({ session, mode }: { session: SavedSession; mode: 'student' | 'developer' }) {
  return (
    <div className="session-row">
      <span className={`session-avatar ${mode}`}>
        {mode === 'student' ? <BookOpen size={15} /> : <Code2 size={15} />}
      </span>
      <span className="session-info"><strong>{session.title}</strong><small>{session.subject || session.project || session.category} <span>·</span> {dateLabel(session.sessionDate)}</small></span>
      <span className="session-duration">{session.focusMinutes}m</span>
      {session.pendingCFI ? <span className="pending-score">Pending</span> : <span className="session-score">{session.cfiScore}</span>}
    </div>
  )
}

function StudentHero({ name, onStart }: { name: string; onStart: () => void }) {
  const today = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <section className="mode-hero student-hero">
      <div className="student-hero-copy">
        <span className="hero-kicker"><Sparkles size={13} /> YOUR STUDY SPACE <span className="hero-kicker-dot" /> {today.toUpperCase()}</span>
        <h1>Make room for<br /><span>what matters.</span></h1>
        <p>One thoughtful session at a time, {name}.</p>
        <button className="button-primary student-primary" type="button" onClick={onStart}><BookOpen size={16} /> Start studying <ArrowRight size={15} /></button>
      </div>
      <div className="study-illustration" aria-hidden="true">
        <span className="illustration-sun" /><span className="illustration-orbit orbit-one" /><span className="illustration-orbit orbit-two" />
        <div className="illustration-book"><BookOpen size={52} strokeWidth={1.15} /></div>
        <span className="sticker sticker-star">✦</span><span className="sticker sticker-dot">✳</span><span className="illustration-caption">little by little</span>
      </div>
    </section>
  )
}

function DeveloperHero({ name, onStart }: { name: string; onStart: () => void }) {
  return (
    <section className="mode-hero developer-hero">
      <div className="terminal-top"><span className="terminal-lights"><i /><i /><i /></span><span>RADARR / WORKSPACE</span><span className="terminal-online"><i /> SYSTEM ONLINE</span></div>
      <div className="developer-hero-content">
        <div>
          <span className="hero-kicker"><Code2 size={13} /> DEVELOPER COMMAND CENTRE</span>
          <h1>Good work,<br /><span>{name}.</span></h1>
          <p>Keep the pace sustainable. The work will still be there tomorrow.</p>
          <button className="button-primary developer-primary" type="button" onClick={onStart}><Code2 size={16} /> Initialize session <ArrowRight size={15} /></button>
        </div>
        <div className="terminal-readout" aria-label="Workspace ready status">
          <span className="readout-label">CURRENT STATUS</span><strong><i /> READY</strong>
          <span className="readout-divider" />
          <span className="readout-label">WORKSPACE</span><b>personal / focus</b>
          <span className="readout-label">SESSION MODE</span><b>intentional_build</b>
        </div>
      </div>
    </section>
  )
}

function ModeSwitch({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  return (
    <div className="mode-switch" aria-label="Choose a workspace">
      <button type="button" onClick={() => onNavigate('student')}><BookOpen size={15} /> Study space</button>
      <button type="button" onClick={() => onNavigate('developer')}><Code2 size={15} /> Dev command</button>
    </div>
  )
}

function TaskPreview({ tasks, onToggle, onAdd, onEdit, onDelete }: { tasks: StudyTask[]; onToggle: (id: string) => void; onAdd: () => void; onEdit: (task: StudyTask) => void; onDelete: (task: StudyTask) => void }) {
  const done = tasks.filter((task) => task.completed).length
  const planned = tasks.reduce((total, task) => total + task.minutes, 0)
  const completeMinutes = tasks.filter((task) => task.completed).reduce((total, task) => total + task.minutes, 0)
  return (
    <section className="panel task-panel">
      <div className="panel-heading"><div><span className="eyebrow">A GENTLE PLAN</span><h2>Today&apos;s study list</h2></div><button type="button" className="text-action" onClick={onAdd}><Plus size={15} /> Add task</button></div>
      <div className="task-progress-copy"><strong>{done} of {tasks.length} tasks</strong><span>{completeMinutes}/{planned} min</span></div>
      <div className="progress-track"><span style={{ width: `${planned ? Math.min(100, (completeMinutes / planned) * 100) : 0}%` }} /></div>
      <div className="task-list">
        {tasks.length ? tasks.slice(0, 4).map((task) => <div className={`task-row${task.completed ? ' completed' : ''}`} key={task.id}>
          <button type="button" className="task-toggle" onClick={() => onToggle(task.id)} aria-pressed={task.completed} aria-label={`${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}><span className="task-check">{task.completed && <Check size={13} />}</span><span className="task-copy"><strong>{task.title}</strong><small>{task.subject}</small></span></button><span className="task-minutes">{task.minutes}m</span><button type="button" className="row-action" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><Pencil size={13} /></button><button type="button" className="row-action delete-row-action" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}><Trash2 size={13} /></button>
        </div>) : <div className="inline-empty">Your list is clear. Add one small next step.</div>}
      </div>
    </section>
  )
}

function ProjectPreview({ projects, sessions, onAdd, onEdit, onArchive, onDelete }: { projects: ProjectItem[]; sessions: SavedSession[]; onAdd: () => void; onEdit: (project: ProjectItem) => void; onArchive: (project: ProjectItem) => void; onDelete: (project: ProjectItem) => void }) {
  const activeProjects = projects.filter((project) => !project.archived)
  return (
    <section className="panel project-panel">
      <div className="panel-heading"><div><span className="eyebrow">ACTIVE WORKSPACES</span><h2>Project pulse</h2></div><button type="button" className="icon-button soft-icon-button" onClick={onAdd} aria-label="Add project"><Plus size={16} /></button></div>
      <div className="project-list">
        {activeProjects.length ? activeProjects.slice(0, 4).map((project) => {
          const projectMinutes = sessions.filter((session) => session.project === project.name).reduce((total, session) => total + session.focusMinutes, 0)
          const latest = sessions.find((session) => session.project === project.name)
          return <div className="project-row" key={project.id}><span className={`project-swatch ${project.color}`}><FolderKanban size={15} /></span><span className="project-copy"><strong>{project.name}</strong><small>{latest ? latest.title : project.detail}</small></span><span className="project-time">{durationLabel(projectMinutes)}</span><button type="button" className="row-action" onClick={() => onEdit(project)} aria-label={`Edit ${project.name}`}><Pencil size={13} /></button><button type="button" className="row-action" onClick={() => onArchive(project)} aria-label={`Archive ${project.name}`}><Archive size={13} /></button><button type="button" className="row-action delete-row-action" onClick={() => onDelete(project)} aria-label={`Delete ${project.name}`}><Trash2 size={13} /></button></div>
        }) : <div className="inline-empty">Add a project to organize your work.</div>}
      </div>
      <button className="panel-bottom-link" type="button" onClick={onAdd}>Add a project <ArrowRight size={14} /></button>
    </section>
  )
}

function WorkLogPreview({ logs, onAdd, onEdit, onDelete }: { logs: WorkLogItem[]; onAdd: () => void; onEdit: (log: WorkLogItem) => void; onDelete: (log: WorkLogItem) => void }) {
  return <section className="panel worklog-panel">
    <div className="panel-heading"><div><span className="eyebrow">WORK LOG</span><h2>Things that moved</h2></div><button type="button" className="text-action" onClick={onAdd}><Plus size={14} /> Add log</button></div>
    <div className="worklog-list">{logs.length ? [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map((log) => <div className="worklog-row" key={log.id}><span className="worklog-icon"><FileText size={15} /></span><span className="worklog-copy"><strong>{log.description}</strong><small>{log.project} <span>·</span> {log.category}</small></span><button type="button" className="row-action" onClick={() => onEdit(log)} aria-label={`Edit ${log.description}`}><Pencil size={13} /></button><button type="button" className="row-action delete-row-action" onClick={() => onDelete(log)} aria-label={`Delete ${log.description}`}><Trash2 size={13} /></button></div>) : <div className="inline-empty">Add a note when a task is done.</div>}</div>
  </section>
}

export function Dashboard(props: DashboardProps) {
  const { view, name, sessions, tasks, projects, workLogs, onNavigate, onStart, onToggleTask, onAddTask, onEditTask, onDeleteTask, onAddProject, onEditProject, onArchiveProject, onDeleteProject, onAddWorkLog, onEditWorkLog, onDeleteWorkLog } = props
  const mode = view === 'developer' ? 'developer' : 'student'
  const records = view === 'overview' ? sessions : sessions.filter((session) => session.mode === mode)
  const today = new Date()
  const todaysRecords = records.filter((session) => sameDay(new Date(session.sessionDate), today))
  const focusToday = todaysRecords.reduce((total, session) => total + session.focusMinutes, 0)
  const weekData = createWeekData(sessions, view === 'overview' ? undefined : mode)
  const weekFocus = weekData.reduce((total, day) => total + day.minutes, 0)
  const distribution = createDistribution(sessions, mode)
  const avg = records.length ? Math.round(records.reduce((total, session) => total + session.focusMinutes, 0) / records.length) : 0
  const sessionsToday = todaysRecords.filter((session) => session.completed).length
  const recent = [...records].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)).slice(0, 4)
  const latestSession = [...sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))[0]
  const recentLogs = [...sessions].filter((session) => session.mode === 'developer').sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)).slice(0, 3)
  const studentGreeting = new Date().getHours() < 12 ? 'A bright start to the day.' : 'You have done enough to be proud of.'

  if (view === 'overview') {
    const overallMinutes = sessions.filter((session) => sameDay(new Date(session.sessionDate), today)).reduce((total, session) => total + session.focusMinutes, 0)
    return <div className="dashboard-page overview-page">
      <div className="page-title-row"><div><span className="eyebrow">YOUR PERSONAL RADARR</span><h1>A little more in tune.</h1><p>Notice your rhythm, then make space for what you need.</p></div><span className="demo-tag"><span className="demo-dot" /> SAMPLE JOURNAL</span></div>
      <section className="overview-hero">
        <div><span className="hero-kicker"><Sparkles size={13} /> YOUR WEEK, AT A GLANCE</span><h2>Welcome back, {name}.</h2><p>{studentGreeting} Where would you like to begin?</p><ModeSwitch onNavigate={onNavigate} /></div>
        <div className="overview-orb" aria-hidden="true"><span className="orb-ring" /><span className="orb-center"><ActivityChart data={weekData} compact /></span><span className="orb-caption">YOUR RHYTHM</span></div>
      </section>
      <div className="stat-grid overview-stat-grid">
        <StatCard icon={Clock3} label="Focused today" value={durationLabel(overallMinutes)} note="across both modes" tone="lavender" />
        <StatCard icon={Timer} label="Sessions today" value={String(sessions.filter((session) => sameDay(new Date(session.sessionDate), today)).length)} note="small steps count" tone="peach" />
        <StatCard icon={TrendingUp} label="This week" value={durationLabel(weekFocus)} note="focused minutes" tone="sage" />
      </div>
      <div className="dashboard-grid overview-grid">
        <section className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">THE LAST 7 DAYS</span><h2>Your activity</h2></div><button type="button" className="text-action" onClick={() => onNavigate('insights')}>More insights <ArrowRight size={14} /></button></div><ActivityChart data={weekData} /></section>
        <CfiCard sessions={sessions} />
        <section className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow">JUST CHECKING IN</span><h2>Recent sessions</h2></div><button type="button" className="text-action" onClick={() => onNavigate('sessions')}>View all <ArrowRight size={14} /></button></div><div className="session-list">{[...sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)).slice(0, 4).map((session) => <SessionRow key={session.id} session={session} mode={session.mode} />)}</div></section>
        <section className="panel quickstart-panel"><div className="panel-heading"><div><span className="eyebrow">START WHERE YOU ARE</span><h2>Choose your space</h2></div><span className="sparkle-mark"><Sparkles size={17} /></span></div><button className="quickstart-option study-option" type="button" onClick={() => onStart('student')}><span className="quickstart-icon"><BookOpen size={18} /></span><span><strong>Study something</strong><small>Make a little progress, gently.</small></span><ArrowRight size={16} /></button><button className="quickstart-option dev-option" type="button" onClick={() => onStart('developer')}><span className="quickstart-icon"><Code2 size={18} /></span><span><strong>Build something</strong><small>Focus on the next right thing.</small></span><ArrowRight size={16} /></button><div className="quiet-reminder"><Lightbulb size={15} /><span>{latestSession && latestSession.perceivedFatigue >= 6 ? 'Your last check-in felt heavy. Try a lighter next step.' : latestSession && latestSession.sleepHours < 7 ? `You logged ${latestSession.sleepHours} hours of sleep. Leave a little breathing room today.` : 'Small breaks are part of the work.'}</span><button type="button" onClick={() => onNavigate('recommendations')}>Recovery notes <ArrowRight size={12} /></button></div></section>
      </div>
    </div>
  }

  return <div className={`dashboard-page mode-dashboard ${mode}-dashboard`}>
    <div className="page-title-row mode-page-title"><div><span className="eyebrow">{mode === 'student' ? 'A SPACE THAT IS YOURS' : 'PERSONAL WORKSPACE / SESSION LOG'}</span><p className="mode-subtitle">{mode === 'student' ? 'A little progress is still progress.' : 'Work with intention. Recover with the same intention.'}</p></div><span className="live-date"><span className="live-date-dot" /> {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
    {mode === 'student' ? <StudentHero name={name} onStart={() => onStart('student')} /> : <DeveloperHero name={name} onStart={() => onStart('developer')} />}
    <div className="stat-grid mode-stat-grid">
      <StatCard icon={Clock3} label={mode === 'student' ? 'Focused today' : 'Coding today'} value={durationLabel(focusToday)} note={mode === 'student' ? 'time well spent' : 'intentional time'} tone="lavender" />
      <StatCard icon={Timer} label="Sessions" value={String(sessionsToday)} note="completed today" tone="peach" />
      <StatCard icon={Target} label="This week" value={durationLabel(weekFocus)} note="focused minutes" tone="sage" />
      <StatCard icon={TrendingUp} label="Average session" value={avg ? `${avg}m` : '—'} note="across your log" tone="blue" />
    </div>
    <div className="dashboard-grid mode-grid">
      <section className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">WEEKLY RHYTHM</span><h2>{mode === 'student' ? 'Your study minutes' : 'Coding activity'}</h2></div><span className="chart-total"><strong>{durationLabel(weekFocus)}</strong><small>this week</small></span></div><ActivityChart data={weekData} mode={mode} /></section>
      <CfiCard sessions={sessions} />
      <section className="panel distribution-panel"><div className="panel-heading"><div><span className="eyebrow">A LITTLE CONTEXT</span><h2>{mode === 'student' ? 'By subject' : 'By project'}</h2></div><button type="button" className="icon-button quiet-button" onClick={() => onNavigate('insights')} aria-label="View detailed insights"><ArrowRight size={16} /></button></div><SubjectChart data={distribution} mode={mode} /></section>
      {mode === 'student' ? <TaskPreview tasks={tasks} onToggle={onToggleTask} onAdd={onAddTask} onEdit={onEditTask} onDelete={onDeleteTask} /> : <ProjectPreview projects={projects} sessions={sessions} onAdd={onAddProject} onEdit={onEditProject} onArchive={onArchiveProject} onDelete={onDeleteProject} />}
      {mode === 'developer' && <WorkLogPreview logs={workLogs} onAdd={onAddWorkLog} onEdit={onEditWorkLog} onDelete={onDeleteWorkLog} />}
      <section className="panel recent-panel mode-recent-panel"><div className="panel-heading"><div><span className="eyebrow">THE LATEST</span><h2>{mode === 'student' ? 'Recent study sessions' : 'Recent work sessions'}</h2></div><button type="button" className="text-action" onClick={() => onNavigate('sessions')}>View history <ArrowRight size={14} /></button></div><div className="session-list">{recent.length ? recent.map((session) => <SessionRow key={session.id} session={session} mode={mode} />) : <div className="inline-empty">Your next session will show up here.</div>}</div></section>
      {mode === 'developer' && <section className="panel recovery-panel"><div className="recovery-icon"><Lightbulb size={17} /></div><div><span className="eyebrow">RECOVERY CONSOLE</span><h2>Protect your next hour.</h2><p>{recentLogs[0]?.perceivedFatigue && recentLogs[0].perceivedFatigue >= 6 ? 'Your last check-in felt a little heavy. Try switching to a lighter task or stepping away for a few minutes.' : 'You have been showing up consistently. A short reset now can make the next focus block feel clearer.'}</p></div><button type="button" className="text-action" onClick={() => onNavigate('recommendations')}>View suggestions <ArrowRight size={14} /></button></section>}
      {mode === 'student' && <section className="motivation-card"><span className="motivation-icon"><Sparkles size={17} /></span><div><span className="eyebrow">A NOTE TO YOURSELF</span><strong>{focusToday >= 100 ? 'Look at all the care you put into today.' : 'You do not have to do it all at once.'}</strong><small>Progress can be quiet. It still counts.</small></div><span className="motivation-doodle" aria-hidden="true">✳</span></section>}
    </div>
  </div>
}
