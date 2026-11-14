import { calculateCFI } from '../../services/cfi.ts'
import type { CFIResult, SessionInput } from '../../types/index.ts'
import type { SavedSession, SessionDraft } from '../../services/app-state.ts'

export interface StudySessionDraft {
  mode: 'student'
  subject: string
  focusMinutes: number
  breakMinutes: number
  sleepHours: number
  perceivedFatigue: number
  goal?: string
  title?: string
  category?: string
  description?: string
  userId?: string
}

export interface ActiveSessionState {
  draft: SessionDraft
  status: 'running' | 'paused' | 'finished'
  phase: 'focus' | 'break'
  secondsLeft: number
  focusSecondsLeft: number
  elapsedFocusSeconds: number
  elapsedBreakSeconds: number
  completed: boolean
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates a study session check-in draft before starting.
 */
export function validateStudyDraft(draft: unknown): ValidationResult {
  const errors: string[] = []
  if (!draft || typeof draft !== 'object') {
    return { valid: false, errors: ['A study session draft object is required.'] }
  }

  const candidate = draft as Partial<StudySessionDraft>

  if (!candidate.subject || typeof candidate.subject !== 'string' || !candidate.subject.trim()) {
    errors.push('A valid study subject is required.')
  }

  if (typeof candidate.focusMinutes !== 'number' || !Number.isFinite(candidate.focusMinutes) || candidate.focusMinutes < 1 || candidate.focusMinutes > 240) {
    errors.push('Focus duration must be a number between 1 and 240 minutes.')
  }

  if (typeof candidate.breakMinutes !== 'number' || !Number.isFinite(candidate.breakMinutes) || candidate.breakMinutes < 0) {
    errors.push('Break duration must be a non-negative number of minutes.')
  }

  if (typeof candidate.sleepHours !== 'number' || !Number.isFinite(candidate.sleepHours) || candidate.sleepHours < 0 || candidate.sleepHours > 24) {
    errors.push('Sleep hours must be between 0 and 24.')
  }

  if (typeof candidate.perceivedFatigue !== 'number' || !Number.isFinite(candidate.perceivedFatigue) || candidate.perceivedFatigue < 1 || candidate.perceivedFatigue > 10) {
    errors.push('Perceived fatigue must be between 1 and 10.')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Creates and initializes an active study session from a validated draft.
 */
export function createStudySession(draft: StudySessionDraft): ActiveSessionState {
  const validation = validateStudyDraft(draft)
  if (!validation.valid) {
    throw new Error(`Invalid study session draft: ${validation.errors.join(' ')}`)
  }

  const subject = draft.subject.trim()
  const title = draft.title?.trim() || draft.goal?.trim() || `${subject} study`
  const category = draft.category?.trim() || 'Study'
  const goal = draft.goal?.trim() || ''
  const description = draft.description?.trim() || title
  const focusSeconds = Math.round(draft.focusMinutes * 60)

  const sessionDraft: SessionDraft = {
    mode: 'student',
    title,
    subject,
    project: '',
    category,
    description,
    goal,
    focusMinutes: draft.focusMinutes,
    breakMinutes: draft.breakMinutes,
    sleepHours: draft.sleepHours,
    perceivedFatigue: draft.perceivedFatigue,
  }

  return {
    draft: sessionDraft,
    status: 'running',
    phase: 'focus',
    secondsLeft: focusSeconds,
    focusSecondsLeft: focusSeconds,
    elapsedFocusSeconds: 0,
    elapsedBreakSeconds: 0,
    completed: false,
  }
}

/**
 * Pauses an ongoing active study session timer.
 */
export function pauseStudySession(state: ActiveSessionState): ActiveSessionState {
  if (state.status !== 'running') return state
  return {
    ...state,
    status: 'paused',
  }
}

/**
 * Resumes a paused study session timer.
 */
export function resumeStudySession(state: ActiveSessionState): ActiveSessionState {
  if (state.status !== 'paused') return state
  return {
    ...state,
    status: 'running',
  }
}

/**
 * Toggles or transitions between study focus and rest phases.
 */
export function takeStudyBreak(state: ActiveSessionState): ActiveSessionState {
  if (state.phase === 'break') {
    return {
      ...state,
      phase: 'focus',
      secondsLeft: state.focusSecondsLeft,
    }
  }
  return {
    ...state,
    phase: 'break',
    secondsLeft: Math.round(state.draft.breakMinutes * 60),
  }
}

/**
 * Marks a study session as finished early before timer completion.
 */
export function endStudySessionEarly(state: ActiveSessionState): ActiveSessionState {
  return {
    ...state,
    status: 'finished',
    completed: false,
  }
}

/**
 * Completes a study session, evaluates it with the Cognitive Fatigue Index (CFI) engine,
 * and builds a persistent SavedSession record.
 */
export async function completeStudySession(
  state: ActiveSessionState,
  feeling = 'Steady',
  customId?: string,
): Promise<{ session: SavedSession; cfiResult: CFIResult | null }> {
  // If completed normally, record the planned focus minutes; if ended early, record actual elapsed focus minutes
  const recordedFocus = state.completed
    ? state.draft.focusMinutes
    : Math.max(1, Math.round(state.elapsedFocusSeconds / 60))

  const sessionInput: SessionInput = {
    userId: 'local-user',
    mode: 'student',
    focusMinutes: recordedFocus,
    breakMinutes: state.draft.breakMinutes,
    sleepHours: state.draft.sleepHours,
    perceivedFatigue: state.draft.perceivedFatigue,
    sessionDate: new Date().toISOString(),
  }

  // Pure deterministic evaluation with CFI engine, guarded safely against malformed input
  let cfiResult: CFIResult | null = null
  try {
    cfiResult = calculateCFI(sessionInput)
  } catch (error) {
    console.error('CFI evaluation error in completeStudySession:', error)
  }

  const session: SavedSession = {
    ...sessionInput,
    id: customId || crypto.randomUUID(),
    title: state.draft.title,
    subject: state.draft.subject,
    project: '',
    category: state.draft.category,
    description: state.draft.description,
    goal: state.draft.goal,
    completed: state.completed,
    pendingCFI: !cfiResult,
    cfiScore: cfiResult ? cfiResult.score : -1,
    cfiRiskLevel: cfiResult?.riskLevel,
    cfiExplanation: cfiResult?.explanation,
    cfiRecommendations: cfiResult?.recommendations,
    feeling,
  }

  return { session, cfiResult }
}
