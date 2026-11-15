import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Coffee, Pause, Play, Sparkles, Square, Timer, X } from 'lucide-react'
import type { FocusSessionDraft, ProjectItem, SessionDraft } from '../services/app-state'

interface SessionSetupDialogProps {
  defaultFocus: number
  defaultBreak: number
  projects: ProjectItem[]
  onClose: () => void
  onStart: (draft: FocusSessionDraft) => void
}

const activityCategories = ['Work', 'Study', 'Care', 'Home', 'Creative', 'Other']

export function SessionSetupDialog({ defaultFocus, defaultBreak, projects, onClose, onStart }: SessionSetupDialogProps) {
  const [subject, setSubject] = useState('')
  const [project, setProject] = useState(projects.find((item) => !item.archived)?.name ?? '')
  const [category, setCategory] = useState('Work')
  const [goal, setGoal] = useState('')
  const [duration, setDuration] = useState(String(defaultFocus))
  const [customDuration, setCustomDuration] = useState(defaultFocus)
  const [breakMinutes, setBreakMinutes] = useState(defaultBreak)
  const focusMinutes = duration === 'custom' ? customDuration : Number(duration)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!focusMinutes || focusMinutes < 1 || focusMinutes > 240) return
    const title = goal.trim() || subject.trim() || project.trim() || `${category} session`
    onStart({ title, subject: subject.trim(), project: project.trim(), category, description: '', goal: goal.trim(), focusMinutes, breakMinutes })
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="dialog-card setup-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-title">
      <div className="dialog-topline"><span className="dialog-icon"><Timer size={17} /></span><span className="eyebrow">FOCUS SESSION</span><button type="button" className="icon-button dialog-close" onClick={onClose} aria-label="Close session setup"><X size={18} /></button></div>
      <h2 id="setup-title">Set up a focus session.</h2>
      <p className="dialog-intro">Choose a focus area and pace that feels manageable for you.</p>
      <form onSubmit={handleSubmit} className="setup-form">
        <label className="field-label">Focus area<input value={subject} list="focus-area-list" onChange={(event) => setSubject(event.target.value)} placeholder="What would you like to spend time on?" /><datalist id="focus-area-list">{projects.filter((item) => !item.archived).map((item) => <option value={item.name} key={item.id} />)}</datalist></label>
        <label className="field-label">Activity type<select value={category} onChange={(event) => setCategory(event.target.value)}>{activityCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field-label">Session intention<input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Optional: one small next step" /></label>
        <label className="field-label">Related project, if any<input value={project} list="project-list" onChange={(event) => setProject(event.target.value)} placeholder="Optional" /><datalist id="project-list">{projects.filter((item) => !item.archived).map((item) => <option value={item.name} key={item.id} />)}</datalist></label>
        <div className="setup-field-grid"><label className="field-label">Focus duration<select value={duration} onChange={(event) => setDuration(event.target.value)}>{[25, 45, 50, 60, 90].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}<option value="custom">Custom</option></select></label><label className="field-label">Break duration<select value={breakMinutes} onChange={(event) => setBreakMinutes(Number(event.target.value))}>{[5, 8, 10, 15, 20].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}</select></label></div>
        {duration === 'custom' && <label className="field-label">Custom focus minutes<input type="number" min={1} max={240} value={customDuration} onChange={(event) => setCustomDuration(Number(event.target.value))} required /></label>}
        <p className="privacy-hint"><Sparkles size={13} /> Separate check-ins are not part of this focus timer.</p>
        <button type="submit" className="button-primary setup-submit">Start focus session <ArrowRight size={16} /></button>
      </form>
    </section>
  </div>
}

export interface TimerState {
  draft: SessionDraft
  status: 'running' | 'paused' | 'finished'
  phase: 'focus' | 'break'
  secondsLeft: number
  focusSecondsLeft: number
  elapsedFocusSeconds: number
  elapsedBreakSeconds: number
  completed: boolean
}

interface FocusTimerDialogProps {
  timer: TimerState
  onPause: () => void
  onResume: () => void
  onEnd: () => void
  onTakeBreak: () => void
  onSave: () => void
  onClose: () => void
  reminderVisible: boolean
  onSnoozeReminder: () => void
  onDismissReminder: () => void
}

const timerFormat = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, '0')}:${(Math.max(0, seconds) % 60).toString().padStart(2, '0')}`
const formatElapsed = (seconds: number) => `${Math.floor(seconds / 60)}m`

export function FocusTimerDialog({ timer, onPause, onResume, onEnd, onTakeBreak, onSave, onClose, reminderVisible, onSnoozeReminder, onDismissReminder }: FocusTimerDialogProps) {
  const totalFocus = timer.draft.focusMinutes * 60
  const focusRemaining = timer.phase === 'focus' ? timer.secondsLeft : timer.focusSecondsLeft
  const progress = Math.min(100, Math.max(0, ((totalFocus - focusRemaining) / totalFocus) * 100))
  const isFinished = timer.status === 'finished'
  const showingBreak = timer.phase === 'break' && !isFinished
  const title = isFinished ? (timer.completed ? 'Block complete.' : 'Session wrapped.') : showingBreak ? 'Step away for a moment.' : timer.status === 'paused' ? 'Paused. You are right on track.' : 'You are in your focus zone.'

  function handleEndSession() {
    onEnd()
    onSave()
  }

  return <div className="dialog-backdrop timer-backdrop" role="presentation">
    <section className={`dialog-card timer-dialog${isFinished ? ' timer-finished' : ''}`} role="dialog" aria-modal="true" aria-labelledby="timer-title">
      <div className="timer-dialog-top"><button type="button" className="icon-button dialog-back" onClick={onClose} aria-label="Close timer"><ArrowLeft size={18} /></button><span className="timer-status"><i className={timer.status} /> {timer.status === 'running' ? (showingBreak ? 'ON A BREAK' : 'IN FOCUS') : timer.status === 'paused' ? 'PAUSED' : timer.completed ? 'COMPLETE' : 'ENDED EARLY'}</span><span className="timer-session-index">FOCUS SESSION</span></div>
      <div className="timer-micro-orbs" aria-hidden="true"><i /><i /><i /></div>
      {isFinished && <div className="finish-sparkle" aria-hidden="true"><Sparkles size={20} /><span>✦</span><span>✳</span></div>}
      <span className="eyebrow timer-eyebrow">{timer.draft.subject || timer.draft.project || 'Personal focus'} <span>·</span> {timer.draft.category}</span>
      <h2 id="timer-title">{title}</h2>
      <p className="timer-task-label">{timer.draft.goal || timer.draft.description || 'One focused step at a time.'}</p>
      <div className={`timer-ring-wrap${showingBreak ? ' break-ring' : ''}`} style={{ '--timer-progress': `${progress}%` } as React.CSSProperties}>
        <div className="timer-ring"><span className="timer-clock">{timerFormat(timer.secondsLeft)}</span><span className="timer-clock-label">{showingBreak ? 'RESET' : timer.status === 'paused' ? 'PAUSED' : isFinished ? 'DONE' : 'REMAINING'}</span></div>
      </div>
      <div className="timer-stats"><span><small>FOCUS</small><strong>{formatElapsed(timer.elapsedFocusSeconds)} / {timer.draft.focusMinutes}m</strong></span><span><small>BREAK PLAN</small><strong>{timer.draft.breakMinutes}m</strong></span><span><small>STATUS</small><strong>{timer.status.toUpperCase()}</strong></span></div>
      {isFinished ? <div className="finish-flow"><p className="cfi-pending-callout"><Sparkles size={14} /> Existing separate check-in data is used for CFI context; without it the CFI remains pending.</p><button type="button" className="button-primary setup-submit" onClick={onSave}><Check size={16} /> Save session</button></div> : <div className="timer-actions">
        {timer.status === 'running' ? <button type="button" className="button-primary timer-main-action" onClick={onPause}><Pause size={16} /> Pause</button> : <button type="button" className="button-primary timer-main-action" onClick={onResume}><Play size={16} /> Resume</button>}
        <button type="button" className="button-secondary" onClick={onTakeBreak}><Coffee size={16} /> {showingBreak ? 'End break' : 'Take a break'}</button>
        <button type="button" className="timer-end-button" onClick={handleEndSession}><Square size={14} /> End session</button>
      </div>}
      {reminderVisible && !isFinished && <div className="break-reminder" role="status"><span className="reminder-icon"><Coffee size={16} /></span><span><strong>Quick reset?</strong><small>Stretch, sip some water, or rest your eyes.</small></span><button type="button" onClick={onTakeBreak} aria-label="Start a break"><Play size={14} /></button><button type="button" onClick={onSnoozeReminder} aria-label="Snooze break reminder">Snooze</button><button type="button" className="reminder-dismiss" onClick={onDismissReminder} aria-label="Dismiss reminder"><X size={14} /></button></div>}
      <div className="timer-footer"><Timer size={13} /> Activity counts are collected only if you opt in on the Activity page.</div>
    </section>
  </div>
}
