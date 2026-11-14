import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Code2, Coffee, Pause, Play, Sparkles, Square, Timer, X } from 'lucide-react'
import type { ProjectItem, SessionDraft } from '../services/app-state'

interface SessionSetupDialogProps {
  mode: 'student' | 'developer'
  defaultFocus: number
  defaultBreak: number
  projects: ProjectItem[]
  onClose: () => void
  onStart: (draft: SessionDraft) => void
}

const studySubjects = ['Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'Biology', 'Other']
const workCategories = ['Coding', 'Debugging', 'Research', 'Documentation', 'Learning', 'Other']

export function SessionSetupDialog({ mode, defaultFocus, defaultBreak, projects, onClose, onStart }: SessionSetupDialogProps) {
  const [subject, setSubject] = useState('Mathematics')
  const [customSubject, setCustomSubject] = useState('')
  const [project, setProject] = useState(projects.find((item) => !item.archived)?.name ?? '')
  const [category, setCategory] = useState(mode === 'student' ? 'Study' : 'Coding')
  const [goal, setGoal] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState(String(defaultFocus))
  const [customDuration, setCustomDuration] = useState(defaultFocus)
  const [breakMinutes, setBreakMinutes] = useState(defaultBreak)
  const [sleepHours, setSleepHours] = useState(7)
  const [fatigue, setFatigue] = useState(3)
  const isCustomSubject = subject === 'Other'
  const focusMinutes = duration === 'custom' ? customDuration : Number(duration)
  const resolvedSubject = isCustomSubject ? customSubject.trim() : subject

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!focusMinutes || focusMinutes < 1 || focusMinutes > 240) return
    const title = mode === 'student' ? goal.trim() || `${resolvedSubject} study` : description.trim() || `${category} session`
    onStart({ mode, title, subject: mode === 'student' ? resolvedSubject : project.trim(), project: mode === 'developer' ? project.trim() : '', category, description: description.trim(), goal: goal.trim(), focusMinutes, breakMinutes, sleepHours, perceivedFatigue: fatigue })
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className={`dialog-card setup-dialog ${mode}-dialog`} role="dialog" aria-modal="true" aria-labelledby="setup-title">
      <div className="dialog-topline"><span className="dialog-mode-icon">{mode === 'student' ? <BookOpen size={17} /> : <Code2 size={17} />}</span><span className="eyebrow">{mode === 'student' ? 'STUDY SPACE' : 'DEVELOPER CONSOLE'}</span><button type="button" className="icon-button dialog-close" onClick={onClose} aria-label="Close session setup"><X size={18} /></button></div>
      <h2 id="setup-title">{mode === 'student' ? 'Settle into a study session.' : 'Configure a focus block.'}</h2>
      <p className="dialog-intro">{mode === 'student' ? 'Pick a subject and a pace that feels doable.' : 'Choose a project, set an intention, then get into it.'}</p>
      <form onSubmit={handleSubmit} className="setup-form">
        {mode === 'student' ? <>
          <label className="field-label">Subject<select value={subject} onChange={(event) => setSubject(event.target.value)}>{studySubjects.map((item) => <option key={item}>{item}</option>)}</select></label>
          {isCustomSubject && <label className="field-label">Your subject<input value={customSubject} onChange={(event) => setCustomSubject(event.target.value)} placeholder="e.g. Art history" required autoFocus /></label>}
          <label className="field-label">What would you like to work on?<input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Optional: a small session goal" /></label>
        </> : <>
          <label className="field-label">Project<input value={project} list="project-list" onChange={(event) => setProject(event.target.value)} placeholder="Name your project" required /><datalist id="project-list">{projects.filter((item) => !item.archived).map((item) => <option value={item.name} key={item.id} />)}</datalist></label>
          <label className="field-label">Work category<select value={category} onChange={(event) => setCategory(event.target.value)}>{workCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="field-label">Task description<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is the next small step?" /></label>
        </>}
        <div className="setup-field-grid"><label className="field-label">Focus duration<select value={duration} onChange={(event) => setDuration(event.target.value)}>{[25, 45, 50, 60, 90].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}<option value="custom">Custom</option></select></label><label className="field-label">Break duration<select value={breakMinutes} onChange={(event) => setBreakMinutes(Number(event.target.value))}>{[5, 8, 10, 15, 20].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}</select></label></div>
        {duration === 'custom' && <label className="field-label">Custom focus minutes<input type="number" min={1} max={240} value={customDuration} onChange={(event) => setCustomDuration(Number(event.target.value))} required /></label>}
        <div className="setup-field-grid wellness-fields"><label className="field-label">Sleep last night <span className="field-unit">hours</span><input type="number" min={0} max={16} step={0.5} value={sleepHours} onChange={(event) => setSleepHours(Number(event.target.value))} /></label><label className="field-label">Current fatigue <span className="field-unit">{fatigue}/10</span><input aria-label={`Perceived fatigue, ${fatigue} out of 10`} type="range" min={1} max={10} value={fatigue} onChange={(event) => setFatigue(Number(event.target.value))} /><span className="range-hint"><span>Plenty of energy</span><span>Need a pause</span></span></label></div>
        <p className="privacy-hint"><Sparkles size={13} /> Your check-in is private and just for reflection.</p>
        <button type="submit" className={`button-primary setup-submit ${mode === 'developer' ? 'developer-primary' : 'student-primary'}`} disabled={mode === 'student' && isCustomSubject && !customSubject.trim()}>{mode === 'student' ? 'Start my session' : 'Initialize session'} <ArrowRight size={16} /></button>
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
  onSave: (feeling: string, endFatigue?: number) => void
  onClose: () => void
  reminderVisible: boolean
  onSnoozeReminder: () => void
  onDismissReminder: () => void
}

const timerFormat = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, '0')}:${(Math.max(0, seconds) % 60).toString().padStart(2, '0')}`
const formatElapsed = (seconds: number) => `${Math.floor(seconds / 60)}m`

export function FocusTimerDialog({ timer, onPause, onResume, onEnd, onTakeBreak, onSave, onClose, reminderVisible, onSnoozeReminder, onDismissReminder }: FocusTimerDialogProps) {
  const [feeling, setFeeling] = useState('Steady')
  const [showEndModal, setShowEndModal] = useState(false)
  const [endFatigue, setEndFatigue] = useState<number>(timer.draft.perceivedFatigue ?? 4)
  const totalFocus = timer.draft.focusMinutes * 60
  const focusRemaining = timer.phase === 'focus' ? timer.secondsLeft : timer.focusSecondsLeft
  const progress = Math.min(100, Math.max(0, ((totalFocus - focusRemaining) / totalFocus) * 100))
  const isFinished = timer.status === 'finished'
  const showingBreak = timer.phase === 'break' && !isFinished
  const title = isFinished ? (timer.completed ? 'Block complete.' : 'Session wrapped.') : showingBreak ? 'Step away for a moment.' : timer.status === 'paused' ? 'Paused. You are right on track.' : 'You are in your focus zone.'

  function handleEndSession() {
    onPause()
    setShowEndModal(true)
  }

  function confirmEndSession() {
    setShowEndModal(false)
    onEnd()
    onSave(feeling, endFatigue)
  }

  function cancelEndModal() {
    setShowEndModal(false)
    if (timer.status === 'running') {
      onResume()
    }
  }

  return <div className="dialog-backdrop timer-backdrop" role="presentation">
    <section className={`dialog-card timer-dialog ${timer.draft.mode}-dialog${isFinished ? ' timer-finished' : ''}`} role="dialog" aria-modal="true" aria-labelledby="timer-title">
      <div className="timer-dialog-top"><button type="button" className="icon-button dialog-back" onClick={onClose} aria-label="Close timer"><ArrowLeft size={18} /></button><span className="timer-status"><i className={timer.status} /> {timer.status === 'running' ? (showingBreak ? 'ON A BREAK' : 'IN FOCUS') : timer.status === 'paused' ? 'PAUSED' : timer.completed ? 'COMPLETE' : 'ENDED EARLY'}</span><span className="timer-session-index">SESSION / {timer.draft.mode === 'student' ? 'STUDY' : 'DEV'}</span></div>
      <div className="timer-micro-orbs" aria-hidden="true"><i /><i /><i /></div>
      {isFinished && <div className="finish-sparkle" aria-hidden="true"><Sparkles size={20} /><span>✦</span><span>✳</span></div>}
      <span className="eyebrow timer-eyebrow">{timer.draft.mode === 'student' ? timer.draft.subject : timer.draft.project} <span>·</span> {timer.draft.category}</span>
      <h2 id="timer-title">{title}</h2>
      <p className="timer-task-label">{timer.draft.goal || timer.draft.description || (timer.draft.mode === 'student' ? 'One page, one problem, one step.' : 'One focused step at a time.')}</p>
      <div className={`timer-ring-wrap${showingBreak ? ' break-ring' : ''}`} style={{ '--timer-progress': `${progress}%` } as React.CSSProperties}>
        <div className="timer-ring"><span className="timer-clock">{timerFormat(timer.secondsLeft)}</span><span className="timer-clock-label">{showingBreak ? 'RESET' : timer.status === 'paused' ? 'PAUSED' : isFinished ? 'DONE' : 'REMAINING'}</span></div>
      </div>
      <div className="timer-stats"><span><small>FOCUS</small><strong>{formatElapsed(timer.elapsedFocusSeconds)} / {timer.draft.focusMinutes}m</strong></span><span><small>BREAK PLAN</small><strong>{timer.draft.breakMinutes}m</strong></span><span><small>STATUS</small><strong>{timer.status.toUpperCase()}</strong></span></div>
      {isFinished ? <div className="finish-flow"><label className="field-label">How did this session feel?<select value={feeling} onChange={(event) => setFeeling(event.target.value)}><option>Steady</option><option>Focused</option><option>A little tired</option><option>More energized</option><option>Challenging</option></select></label><p className="cfi-pending-callout"><Sparkles size={14} /> Session will be evaluated with the Cognitive Fatigue Index engine upon save.</p><button type="button" className={`button-primary setup-submit ${timer.draft.mode === 'developer' ? 'developer-primary' : 'student-primary'}`} onClick={handleEndSession}><Check size={16} /> Save session</button></div> : <div className="timer-actions">
        {timer.status === 'running' ? <button type="button" className="button-primary timer-main-action" onClick={onPause}><Pause size={16} /> Pause</button> : <button type="button" className="button-primary timer-main-action" onClick={onResume}><Play size={16} /> Resume</button>}
        <button type="button" className="button-secondary" onClick={onTakeBreak}><Coffee size={16} /> {showingBreak ? 'End break' : 'Take a break'}</button>
        <button type="button" className="timer-end-button" onClick={handleEndSession}><Square size={14} /> End session</button>
      </div>}
      {reminderVisible && !isFinished && <div className="break-reminder" role="status"><span className="reminder-icon"><Coffee size={16} /></span><span><strong>Quick reset?</strong><small>Stretch, sip some water, or rest your eyes.</small></span><button type="button" onClick={onTakeBreak} aria-label="Start a break"><Play size={14} /></button><button type="button" onClick={onSnoozeReminder} aria-label="Snooze break reminder">Snooze</button><button type="button" className="reminder-dismiss" onClick={onDismissReminder} aria-label="Dismiss reminder"><X size={14} /></button></div>}
      <div className="timer-footer"><Timer size={13} /> A mindful estimate. No activity is tracked automatically.</div>
    </section>

    {showEndModal && (
      <div className="post-session-backdrop fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="end-fatigue-title">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md w-full relative z-50 border border-slate-100 text-slate-800">
          <button
            type="button"
            onClick={cancelEndModal}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-colors"
            aria-label="Cancel"
          >
            <X size={18} />
          </button>

          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
            SESSION CHECK-OUT
          </span>

          <h3 id="end-fatigue-title" className="text-xl font-semibold text-slate-800 mb-6 leading-tight">
            Session complete. How is your fatigue level now?
          </h3>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-slate-700">Post-Session Fatigue</span>
              <span className="font-bold text-slate-800">{endFatigue} / 10</span>
            </div>
            <input
              aria-label={`Post-session fatigue, ${endFatigue} out of 10`}
              type="range"
              min={1}
              max={10}
              value={endFatigue}
              onChange={(event) => setEndFatigue(Number(event.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-800"
            />
            <div className="flex justify-between w-full text-[11px] font-medium text-slate-400 mt-2 uppercase tracking-wide">
              <span>Plenty of energy</span>
              <span>Need a pause</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mt-6 mb-2">
              How did this session feel?
            </label>
            <select
              value={feeling}
              onChange={(event) => setFeeling(event.target.value)}
              className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all appearance-none"
            >
              <option>Steady</option>
              <option>Focused</option>
              <option>A little tired</option>
              <option>More energized</option>
              <option>Challenging</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-50">
            <button
              type="button"
              onClick={cancelEndModal}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmEndSession}
              className="px-6 py-2.5 rounded-xl text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 shadow-sm transition-colors"
            >
              Save &amp; Finish
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
}
