import { calculateCFI } from '../../services/cfi.ts'
import type { CFIResult, SessionInput } from '../../types/index.ts'
import type { SavedSession, SessionDraft } from '../../services/app-state.ts'

/**
 * Developer Mode Session Management
 *
 * Provides lifecycle tracking for deep work and coding sessions.
 * Note: Burnout Radarr respects developer privacy. This tool relies exclusively
 * on conscious manual check-ins and timer blocks. No automatic keyboard, mouse,
 * or background workstation telemetry is gathered.
 */

export interface DeveloperSessionDraft {
  mode: 'developer'
  project: string
  category: string
  focusMinutes: number
  breakMinutes: number
  sleepHours: number
  perceivedFatigue: number
  description?: string
  title?: string
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
 * Validates a developer session check-in draft before session start.
 */
export function validateDeveloperDraft(draft: unknown): ValidationResult {
  const errors: string[] = []
  if (!draft || typeof draft !== 'object') {
    return { valid: false, errors: ['A developer session draft object is required.'] }
  }

  const candidate = draft as Partial<DeveloperSessionDraft>

  if (!candidate.project || typeof candidate.project !== 'string' || !candidate.project.trim()) {
    errors.push('A valid project name is required.')
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
 * Initializes an active coding session from a validated draft.
 */
export function createDeveloperSession(draft: DeveloperSessionDraft): ActiveSessionState {
  const validation = validateDeveloperDraft(draft)
  if (!validation.valid) {
    throw new Error(`Invalid developer session draft: ${validation.errors.join(' ')}`)
  }

  const project = draft.project.trim()
  const category = draft.category?.trim() || 'Coding'
  const description = draft.description?.trim() || ''
  const title = draft.title?.trim() || description || `${category} on ${project}`
  const focusSeconds = Math.round(draft.focusMinutes * 60)

  const sessionDraft: SessionDraft = {
    mode: 'developer',
    title,
    subject: project,
    project,
    category,
    description,
    goal: '',
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
 * Pauses an ongoing developer session.
 */
export function pauseDeveloperSession(state: ActiveSessionState): ActiveSessionState {
  if (state.status !== 'running') return state
  return {
    ...state,
    status: 'paused',
  }
}

/**
 * Resumes a paused developer session.
 */
export function resumeDeveloperSession(state: ActiveSessionState): ActiveSessionState {
  if (state.status !== 'paused') return state
  return {
    ...state,
    status: 'running',
  }
}

/**
 * Transitions between coding focus and rest pause.
 */
export function takeDeveloperBreak(state: ActiveSessionState): ActiveSessionState {
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
 * Concludes a developer session early before timer expiration.
 */
export function endDeveloperSessionEarly(state: ActiveSessionState): ActiveSessionState {
  return {
    ...state,
    status: 'finished',
    completed: false,
  }
}

/**
 * Completes a developer coding session, computes its Cognitive Fatigue Index,
 * and builds a persistent SavedSession record.
 */
export async function completeDeveloperSession(
  state: ActiveSessionState,
  feeling = 'Steady',
  customId?: string,
): Promise<{ session: SavedSession; cfiResult: CFIResult | null }> {
  const recordedFocus = state.completed
    ? state.draft.focusMinutes
    : Math.max(1, Math.round(state.elapsedFocusSeconds / 60))

  const sessionInput: SessionInput = {
    userId: 'local-user',
    mode: 'developer',
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
    console.error('CFI evaluation error in completeDeveloperSession:', error)
  }

  const session: SavedSession = {
    ...sessionInput,
    id: customId || crypto.randomUUID(),
    title: state.draft.title,
    subject: state.draft.project,
    project: state.draft.project,
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
