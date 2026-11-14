import { BookOpen, Code2, X } from 'lucide-react'
import type { SavedSession } from '../services/app-state'

export function SessionDetailsDialog({ session, onClose }: { session: SavedSession; onClose: () => void }) {
  const Icon = session.mode === 'student' ? BookOpen : Code2
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className={`dialog-card session-details ${session.mode}-dialog`} role="dialog" aria-modal="true" aria-labelledby="session-detail-title">
      <div className="dialog-topline"><span className="dialog-mode-icon"><Icon size={17} /></span><span className="eyebrow">{session.mode === 'student' ? 'STUDY SESSION' : 'DEVELOPER SESSION'}</span><button type="button" className="icon-button dialog-close" onClick={onClose} aria-label="Close session details"><X size={18} /></button></div>
      <h2 id="session-detail-title">{session.title}</h2>
      <p className="dialog-intro">{new Date(session.sessionDate).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}</p>
      <div className="detail-stat-grid"><div><small>FOCUS TIME</small><strong>{session.focusMinutes} min</strong></div><div><small>BREAK PLAN</small><strong>{session.breakMinutes} min</strong></div><div><small>SESSION STATUS</small><strong>{session.completed ? 'Completed' : 'Ended early'}</strong></div><div><small>HOW IT FELT</small><strong>{session.feeling || 'Not recorded'}</strong></div></div>
      <div className="detail-stat-grid detail-context"><div><small>{session.mode === 'student' ? 'SUBJECT' : 'PROJECT'}</small><strong>{session.subject || session.project || '—'}</strong></div><div><small>CATEGORY</small><strong>{session.category || '—'}</strong></div><div><small>SLEEP CHECK-IN</small><strong>{session.sleepHours} hours</strong></div><div><small>FATIGUE CHECK-IN</small><strong>{session.endFatigue !== undefined ? `${session.perceivedFatigue} → ${session.endFatigue}/10` : `${session.perceivedFatigue}/10`}</strong></div></div>
      {session.goal && <div className="session-goal-note"><small>SESSION INTENTION</small><p>{session.goal}</p></div>}
      <div className="detail-cfi"><span className="eyebrow">CFI RECORD</span>{session.pendingCFI ? <p>Pending: no scoring engine is connected, so this session was not scored.</p> : <p><strong>{session.cfiScore}/100</strong> · Experimental wellness estimate, not a diagnosis.</p>}</div>
      <button type="button" className="button-secondary detail-close-button" onClick={onClose}>Close details</button>
    </section>
  </div>
}
