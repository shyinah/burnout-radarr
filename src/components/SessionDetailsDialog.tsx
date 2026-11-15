import { Activity, Check, X } from 'lucide-react'
import type { SavedSession } from '../services/app-state'
import { isUnifiedCfiExplanation } from '../services/cfi-display.ts'

export function SessionDetailsDialog({ session, onClose }: { session: SavedSession; onClose: () => void }) {
  const risk = session.cfiRiskLevel
    ? session.cfiRiskLevel.charAt(0).toUpperCase() + session.cfiRiskLevel.slice(1)
    : session.cfiScore <= 33
      ? 'Low'
      : session.cfiScore <= 66
        ? 'Moderate'
        : 'High'

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="dialog-card session-details" role="dialog" aria-modal="true" aria-labelledby="session-detail-title">
      <div className="dialog-topline"><span className="dialog-icon"><Activity size={17} /></span><span className="eyebrow">FOCUS SESSION</span><button type="button" className="icon-button dialog-close" onClick={onClose} aria-label="Close session details"><X size={18} /></button></div>
      <h2 id="session-detail-title">{session.title}</h2>
      <p className="dialog-intro">{new Date(session.sessionDate).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}</p>
      <div className="detail-stat-grid"><div><small>FOCUS TIME</small><strong>{session.focusMinutes} min</strong></div><div><small>BREAK PLAN</small><strong>{session.breakMinutes} min</strong></div><div><small>SESSION STATUS</small><strong>{session.completed ? 'Completed' : 'Ended early'}</strong></div><div><small>HOW IT FELT</small><strong>{session.feeling || 'Not recorded'}</strong></div></div>
      <div className="detail-stat-grid detail-context"><div><small>FOCUS AREA</small><strong>{session.subject || session.project || '—'}</strong></div><div><small>ACTIVITY TYPE</small><strong>{session.category || '—'}</strong></div><div><small>SLEEP CHECK-IN</small><strong>{session.checkInContextAvailable === false ? 'Not recorded' : `${session.sleepHours} hours`}</strong></div><div><small>FATIGUE CHECK-IN</small><strong>{session.checkInContextAvailable === false ? 'Not recorded' : session.endFatigue !== undefined ? `${session.perceivedFatigue} → ${session.endFatigue}/10` : `${session.perceivedFatigue}/10`}</strong></div></div>
      {session.goal && <div className="session-goal-note"><small>SESSION INTENTION</small><p>{session.goal}</p></div>}
      <div className="detail-cfi">
        <span className="eyebrow">CFI RECORD</span>
        {session.pendingCFI ? (
          <>
            <p>Pending: the unified CFI requires both a recent subjective check-in and an eligible individual wearable baseline. Missing values are not scored as zero.</p>
            {session.cfiExplanation && session.cfiExplanation.length > 0 && <ul className="cfi-factors session-cfi-explanation">
              {session.cfiExplanation.map((factor, index) => <li key={index}><span className="factor-check"><Check size={10} /></span><span>{factor}</span></li>)}
            </ul>}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <p style={{ margin: 0 }}>
                <strong>{session.cfiScore}/100</strong> · {isUnifiedCfiExplanation(session.cfiExplanation) ? 'Unified experimental indicator, not a clinical diagnosis.' : 'Previously recorded experimental score; historical values are not recalculated.'}
              </p>
              <span className={`risk-pill ${risk.toLowerCase()}`}>
                <span className="risk-dot" />{risk} risk
              </span>
            </div>
            {session.cfiExplanation && session.cfiExplanation.length > 0 && (
              <ul className="cfi-factors" style={{ marginTop: '10px' }}>
                {session.cfiExplanation.map((factor, index) => (
                  <li key={index} style={{ alignItems: 'flex-start' }}>
                    <span className="factor-check" style={{ marginTop: '2px' }}>
                      <Check size={10} />
                    </span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            )}
            {session.cfiRecommendations && session.cfiRecommendations.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <small style={{ color: 'var(--muted)', fontSize: '7px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  PRACTICAL RECOMMENDATIONS
                </small>
                <div style={{ display: 'grid', gap: '6px', marginTop: '6px' }}>
                  {session.cfiRecommendations.map((rec, index) => (
                    <div key={index} style={{ padding: '8px 10px', borderRadius: '10px', background: 'var(--surface-muted)', border: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <strong style={{ fontSize: '9px', color: 'var(--ink)' }}>{rec.title}</strong>
                        <span style={{ fontSize: '7px', textTransform: 'uppercase', padding: '2px 5px', borderRadius: '4px', background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                          {rec.priority} priority
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '8px', color: 'var(--ink-2)', lineHeight: 1.45 }}>
                        {rec.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <button type="button" className="button-secondary detail-close-button" onClick={onClose}>Close details</button>
    </section>
  </div>
}
