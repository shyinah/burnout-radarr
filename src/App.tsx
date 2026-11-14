import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ChevronDown, Cloud, Moon, MoreHorizontal, Sun } from 'lucide-react'
import { Dashboard } from './components/Dashboard'
import { EntryDialog, type EntryKind, type EntryRecord, type EntryValues } from './components/EntryDialog'
const HistoryPage = lazy(() => import('./components/InsightsPages').then((module) => ({ default: module.HistoryPage })))
const InsightsPage = lazy(() => import('./components/InsightsPages').then((module) => ({ default: module.InsightsPage })))
const RecommendationsPage = lazy(() => import('./components/InsightsPages').then((module) => ({ default: module.RecommendationsPage })))
const SettingsPage = lazy(() => import('./components/InsightsPages').then((module) => ({ default: module.SettingsPage })))
import { SessionSetupDialog, FocusTimerDialog, type TimerState } from './components/SessionDialogs'
import { SessionDetailsDialog } from './components/SessionDetailsDialog'
import { Sidebar } from './components/Sidebar'
import { AuthDialog } from './components/AuthDialog'
import {
  DEFAULT_PREFERENCES,
  type AppData,
  type AppPage,
  type AppPreferences,
  type ProjectItem,
  type SavedSession,
  type SessionDraft,
  type StudyTask,
  type WorkLogItem,
} from './services/app-state'
import { evaluateWithCFI } from './services/cfi'
import { loadAppData, resetAppData, saveAppData, backupGuestData, restoreGuestData } from './services/storage'
import { supabase } from './services/supabase'
import {
  fetchCloudSessions,
  fetchUserProfile,
  getAuthenticatedUser,
  saveSessionToCloud,
} from './services/cloud-sessions'
import type { SessionInput, UserMode } from './types'
import type { User } from '@supabase/supabase-js'
import './App.css'

const pageTitles: Record<AppPage, string> = {
  overview: 'Overview',
  student: 'Your Study Space',
  developer: 'Developer Command Centre',
  sessions: 'Focus sessions',
  insights: 'Insights',
  recommendations: 'Recovery notes',
  settings: 'Settings',
}

const createId = () => crypto.randomUUID()

function App() {
  const [data, setData] = useState<AppData>(() => loadAppData())
  const [page, setPage] = useState<AppPage>('overview')
  const [activeMode, setActiveMode] = useState<UserMode>(data.preferences.defaultMode)
  const [setupMode, setSetupMode] = useState<UserMode | null>(null)
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [entry, setEntry] = useState<{ kind: EntryKind; item?: EntryRecord } | null>(null)
  const [selectedSession, setSelectedSession] = useState<SavedSession | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [breakReminder, setBreakReminder] = useState(false)
  const [reminderSnoozeAt, setReminderSnoozeAt] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  async function syncFromCloud(user: User) {
    try {
      const profile = await fetchUserProfile(user.id)
      const userDisplayName =
        profile?.displayName ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Friend'

      const { sessions: cloudSessions, error } = await fetchCloudSessions(user.id)

      if (error) {
        console.warn('Cloud sync note:', error)
        setToast('Operating from local cache (cloud session fetch failed).')
        return
      }

      setData((current) => ({
        ...current,
        sessions: cloudSessions,
        preferences: {
          ...current.preferences,
          name: userDisplayName,
        },
      }))
    } catch (err) {
      console.error('Error syncing from cloud:', err)
    }
  }

  // Restore user session on mount and listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null
      setCurrentUser(user)
      if (user) {
        syncFromCloud(user)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const nextUser = session?.user ?? null
      setCurrentUser(nextUser)

      if (event === 'SIGNED_IN' && nextUser) {
        setData((current) => {
          backupGuestData(current)
          return current
        })
        await syncFromCloud(nextUser)
        const name = nextUser.user_metadata?.full_name || nextUser.email || 'friend'
        setToast(`Signed in. Cloud sessions loaded for ${name}.`)
      } else if (event === 'SIGNED_OUT') {
        const restored = restoreGuestData()
        setData(restored)
        setToast('Signed out. Local storage restored.')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    saveAppData(data)
    if (!currentUser) {
      backupGuestData(data)
    }
  }, [data, currentUser])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const focusElapsedRef = useRef(0)

  useEffect(() => {
    if (timer?.status !== 'running') return
    const interval = window.setInterval(() => {
      if (timer.phase === 'focus') {
        const elapsed = focusElapsedRef.current + 1
        focusElapsedRef.current = elapsed
        if (data.preferences.breakReminders && data.preferences.notifications && elapsed > 0 && elapsed % (25 * 60) === 0) setBreakReminder(true)
        if (data.preferences.breakReminders && data.preferences.notifications && reminderSnoozeAt !== null && elapsed >= reminderSnoozeAt) {
          setBreakReminder(true)
          setReminderSnoozeAt(null)
        }
      }
      setTimer((current) => {
        if (!current || current.status !== 'running') return current
        if (current.phase === 'break') {
          if (current.secondsLeft <= 1) {
            return { ...current, phase: 'focus', secondsLeft: current.focusSecondsLeft, elapsedBreakSeconds: current.elapsedBreakSeconds + 1 }
          }
          return { ...current, secondsLeft: current.secondsLeft - 1, elapsedBreakSeconds: current.elapsedBreakSeconds + 1 }
        }
        if (current.secondsLeft <= 1) {
          return { ...current, status: 'finished', secondsLeft: 0, focusSecondsLeft: 0, elapsedFocusSeconds: current.elapsedFocusSeconds + 1, completed: true }
        }
        return { ...current, secondsLeft: current.secondsLeft - 1, focusSecondsLeft: current.focusSecondsLeft - 1, elapsedFocusSeconds: current.elapsedFocusSeconds + 1 }
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [timer?.status, timer?.phase, data.preferences.breakReminders, data.preferences.notifications, reminderSnoozeAt])

  function navigate(nextPage: AppPage) {
    setPage(nextPage)
    if (nextPage === 'student' || nextPage === 'developer') setActiveMode(nextPage)
    setProfileOpen(false)
  }

  function openEntry(kind: EntryKind, item?: EntryRecord) {
    setEntry({ kind, item })
  }

  function saveEntry(values: EntryValues) {
    setData((current) => {
      if (entry?.kind === 'task') {
        const existingTask = values.id ? current.tasks.find((item) => item.id === values.id) : undefined
        const task: StudyTask = { id: values.id ?? createId(), title: values.title ?? '', subject: values.subject ?? 'Other', minutes: values.minutes ?? 25, completed: values.completed ?? existingTask?.completed ?? false }
        return { ...current, tasks: values.id ? current.tasks.map((item) => item.id === values.id ? task : item) : [task, ...current.tasks] }
      }
      if (entry?.kind === 'project') {
        const project: ProjectItem = { id: values.id ?? createId(), name: values.name ?? '', detail: values.detail ?? '', color: values.color ?? 'lilac', archived: values.archived ?? false }
        return { ...current, projects: values.id ? current.projects.map((item) => item.id === values.id ? project : item) : [project, ...current.projects] }
      }
      if (entry?.kind === 'worklog') {
        const log: WorkLogItem = { id: values.id ?? createId(), project: values.project ?? '', category: values.category ?? 'Coding', description: values.description ?? '', date: values.date ?? new Date().toISOString() }
        return { ...current, workLogs: values.id ? current.workLogs.map((item) => item.id === values.id ? log : item) : [log, ...current.workLogs] }
      }
      return current
    })
    setEntry(null)
    setToast(entry?.item ? 'Changes saved.' : entry?.kind === 'task' ? 'Added to your study list.' : entry?.kind === 'project' ? 'Project created.' : 'Work log saved.')
  }

  function toggleTask(id: string) {
    setData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task) }))
  }

  function deleteTask(task: StudyTask) {
    if (!window.confirm(`Delete “${task.title}” from your study list?`)) return
    setData((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }))
    setToast('Task deleted.')
  }

  function archiveProject(project: ProjectItem) {
    if (!window.confirm(`Archive “${project.name}”? Its session history will stay in your journal.`)) return
    setData((current) => ({ ...current, projects: current.projects.map((item) => item.id === project.id ? { ...item, archived: true } : item) }))
    setToast('Project archived. Session history is unchanged.')
  }

  function deleteProject(project: ProjectItem) {
    if (!window.confirm(`Delete “${project.name}”? This will not remove its past sessions.`)) return
    setData((current) => ({ ...current, projects: current.projects.filter((item) => item.id !== project.id) }))
    setToast('Project deleted. Session history is unchanged.')
  }

  function deleteWorkLog(log: WorkLogItem) {
    if (!window.confirm('Delete this work log entry?')) return
    setData((current) => ({ ...current, workLogs: current.workLogs.filter((item) => item.id !== log.id) }))
    setToast('Work log entry deleted.')
  }

  function startSession(draft: SessionDraft) {
    const seconds = draft.focusMinutes * 60
    focusElapsedRef.current = 0
    setTimer({ draft, status: 'running', phase: 'focus', secondsLeft: seconds, focusSecondsLeft: seconds, elapsedFocusSeconds: 0, elapsedBreakSeconds: 0, completed: false })
    setSetupMode(null)
    setBreakReminder(false)
    setReminderSnoozeAt(null)
  }

  function pauseTimer() {
    setTimer((current) => current ? { ...current, status: 'paused' } : null)
  }

  function resumeTimer() {
    setTimer((current) => current ? { ...current, status: 'running' } : null)
  }

  function takeBreak() {
    setBreakReminder(false)
    setTimer((current) => {
      if (!current) return current
      if (current.phase === 'break') return { ...current, phase: 'focus', secondsLeft: current.focusSecondsLeft }
      return { ...current, phase: 'break', secondsLeft: current.draft.breakMinutes * 60 }
    })
  }

  function endSession() {
    setTimer((current) => current ? { ...current, status: 'finished', completed: false } : null)
    setBreakReminder(false)
  }

  async function handleLogout() {
    setProfileOpen(false)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  async function saveSession(feeling: string, endFatigue?: number) {
    if (!timer || isSaving) return
    setIsSaving(true)
    try {
      const resolvedEndFatigue = endFatigue ?? timer.draft.perceivedFatigue
      const input: SessionInput = {
        mode: timer.draft.mode,
        focusMinutes: Math.max(1, Math.round(timer.elapsedFocusSeconds / 60)),
        breakMinutes: timer.draft.breakMinutes,
        sleepHours: timer.draft.sleepHours,
        perceivedFatigue: timer.draft.perceivedFatigue,
        endFatigue: resolvedEndFatigue,
        sessionDate: new Date().toISOString(),
      }
      const cfiResult = await evaluateWithCFI(input)

      // Requirement 5: Always use authenticated Supabase user ID. Never trust client-supplied userId.
      const authUser = await getAuthenticatedUser()
      const effectiveUserId = authUser ? authUser.id : 'local-user'

      const session: SavedSession = {
        ...input,
        id: createId(),
        userId: effectiveUserId,
        title: timer.draft.title,
        subject: timer.draft.subject,
        project: timer.draft.project,
        category: timer.draft.category,
        description: timer.draft.description,
        goal: timer.draft.goal,
        completed: timer.completed,
        pendingCFI: !cfiResult,
        cfiScore: cfiResult ? cfiResult.score : -1,
        cfiRiskLevel: cfiResult?.riskLevel,
        cfiExplanation: cfiResult?.explanation,
        cfiRecommendations: cfiResult?.recommendations,
        feeling,
        endFatigue: resolvedEndFatigue,
      }
      setData((current) => ({ ...current, sessions: [session, ...current.sessions] }))
      setTimer(null)
      setBreakReminder(false)

      if (authUser) {
        const cloudResult = await saveSessionToCloud(session, authUser.id)
        if (cloudResult.success) {
          setToast(session.completed ? 'Session saved and synced to cloud.' : 'Session saved (ended early) and synced to cloud.')
        } else {
          console.warn('Cloud sync error:', cloudResult.error)
          setToast(session.completed ? 'Session saved locally (cloud sync offline).' : 'Session saved locally (ended early).')
        }
      } else {
        setToast(session.completed ? 'Session saved. Nice work showing up.' : 'Session saved as ended early.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  function resetSettings() {
    if (!window.confirm('Restore the original mode, theme, and timer defaults? Your sessions will remain.')) return
    setData((current) => ({ ...current, preferences: { ...DEFAULT_PREFERENCES } }))
    setActiveMode(DEFAULT_PREFERENCES.defaultMode)
    setToast('Settings restored.')
  }

  function resetData() {
    if (!window.confirm('Reset this device’s demo journal? This replaces your local sessions, tasks, projects, work logs, and preferences with the sample set.')) return
    const restored = resetAppData()
    setData(restored)
    setActiveMode(restored.preferences.defaultMode)
    setPage('overview')
    setToast('Demo journal reset on this device.')
  }

  const currentMode: UserMode = page === 'student' || page === 'developer' ? page : activeMode
  const pageTitle = pageTitles[page]

  return <div className="app-shell" data-mode={currentMode} data-theme={data.preferences.theme}>
    <Sidebar activePage={page} onNavigate={navigate} mode={currentMode} />
    <div className="main-column">
      <header className="topbar">
        <div className="breadcrumbs"><span>radarr</span><span className="breadcrumb-slash">/</span><strong>{pageTitle}</strong></div>
        <div className="topbar-actions">
          <div className="topbar-mode-switch" aria-label="Choose mode"><button type="button" className={currentMode === 'student' ? 'selected' : ''} onClick={() => navigate('student')}><span className="mode-switch-dot student-dot" /> Study</button><button type="button" className={currentMode === 'developer' ? 'selected' : ''} onClick={() => navigate('developer')}><span className="mode-switch-dot dev-dot" /> Dev</button></div>
          <button type="button" className="icon-button topbar-icon" onClick={() => setData((current) => ({ ...current, preferences: { ...current.preferences, theme: current.preferences.theme === 'dark' ? 'light' : 'dark' } }))} aria-label={data.preferences.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title="Toggle theme">{data.preferences.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
          {!currentUser && (
            <button
              type="button"
              className="button-secondary topbar-auth-btn"
              onClick={() => setAuthOpen(true)}
              style={{ minHeight: '31px', padding: '0 10px', fontSize: '10px' }}
            >
              <Cloud size={14} /> Sign in
            </button>
          )}
          <div className="profile-menu-wrap"><button type="button" className={`profile-trigger${profileOpen ? ' is-open' : ''}`} onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-haspopup="menu"><span className="profile-avatar">{data.preferences.name.trim().slice(0, 1).toUpperCase() || 'T'}</span><span className="profile-name">{data.preferences.name}</span>{currentUser && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7da58b', marginRight: '-2px' }} title="Cloud connected" />}<ChevronDown size={14} /></button>{profileOpen && <div className="profile-menu" role="menu"><div className="profile-menu-heading"><strong>{data.preferences.name}</strong><small>{currentUser ? currentUser.email : 'Personal journal (local)'}</small>{currentUser ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: '#607f42', marginTop: '2px', fontWeight: 600 }}><span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#607f42' }} /> Cloud connected</span> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: 'var(--muted)', marginTop: '2px' }}>Local storage mode</span>}</div><button type="button" role="menuitem" onClick={() => navigate('settings')}>Profile &amp; settings</button><button type="button" role="menuitem" onClick={() => { navigate('sessions'); setProfileOpen(false) }}>View session history</button>{currentUser ? <button type="button" role="menuitem" onClick={handleLogout} style={{ color: '#d94343' }}>Sign out</button> : <button type="button" role="menuitem" onClick={() => { setAuthOpen(true); setProfileOpen(false) }}>Sign in / Create account</button>}</div>}</div>
        </div>
      </header>
      <main className="app-main">
        <Suspense fallback={<div className="page-skeleton" role="status">Opening your workspace…</div>}>{page === 'overview' || page === 'student' || page === 'developer' ? <Dashboard
          view={page}
          name={data.preferences.name || 'friend'}
          sessions={data.sessions}
          tasks={data.tasks}
          projects={data.projects}
          workLogs={data.workLogs}
          onNavigate={navigate}
          onStart={(mode) => setSetupMode(mode)}
          onToggleTask={toggleTask}
          onAddTask={() => openEntry('task')}
          onEditTask={(task) => openEntry('task', task)}
          onDeleteTask={deleteTask}
          onAddProject={() => openEntry('project')}
          onEditProject={(project) => openEntry('project', project)}
          onArchiveProject={archiveProject}
          onDeleteProject={deleteProject}
          onAddWorkLog={() => openEntry('worklog')}
          onEditWorkLog={(log) => openEntry('worklog', log)}
          onDeleteWorkLog={deleteWorkLog}
        /> : page === 'sessions' ? <HistoryPage sessions={data.sessions} onOpenSession={setSelectedSession} />
          : page === 'insights' ? <InsightsPage sessions={data.sessions} />
            : page === 'recommendations' ? <RecommendationsPage sessions={data.sessions} mode={currentMode} onStart={(mode) => setSetupMode(mode || currentMode)} />
              : <SettingsPage
                preferences={data.preferences}
                sessions={data.sessions}
                user={currentUser}
                onChange={(patch: Partial<AppPreferences>) => {
                  setData((current) => ({ ...current, preferences: { ...current.preferences, ...patch } }))
                  if (patch.defaultMode) {
                    setActiveMode(patch.defaultMode)
                  }
                }}
                onResetSettings={resetSettings}
                onResetData={resetData}
                onSave={() => setToast('Settings saved on this device.')}
                onOpenAuth={() => setAuthOpen(true)}
                onSignOut={handleLogout}
              />}</Suspense>
      </main>
      <footer className="app-disclaimer">CFI is an experimental wellness estimate, not a medical diagnosis.</footer>
    </div>

    {setupMode && <SessionSetupDialog
      mode={setupMode}
      defaultFocus={data.preferences.focusMinutes}
      defaultBreak={data.preferences.breakMinutes}
      projects={data.projects}
      onClose={() => setSetupMode(null)}
      onStart={startSession}
    />}
    {timer && <FocusTimerDialog
      timer={timer}
      onPause={pauseTimer}
      onResume={resumeTimer}
      onEnd={endSession}
      onTakeBreak={takeBreak}
      onSave={saveSession}
      onClose={() => { if (window.confirm('Discard this unsaved session?')) setTimer(null) }}
      reminderVisible={breakReminder}
      onSnoozeReminder={() => { setBreakReminder(false); setReminderSnoozeAt(timer.elapsedFocusSeconds + 5 * 60) }}
      onDismissReminder={() => setBreakReminder(false)}
    />}
    {entry && <EntryDialog kind={entry.kind} item={entry.item} projects={data.projects} onClose={() => setEntry(null)} onSave={saveEntry} />}
    {selectedSession && <SessionDetailsDialog session={selectedSession} onClose={() => setSelectedSession(null)} />}
    {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} onSuccess={() => setToast('Connected to Supabase cloud.')} />}
    {toast && <div className="toast-message" role="status" aria-live="polite"><span className="toast-mark"><MoreHorizontal size={16} /></span>{toast}<button type="button" onClick={() => setToast('')} aria-label="Dismiss notification">×</button></div>}
  </div>
}

export default App
