import { selectDashboardCfiState } from './cfi-display.ts'
import type { SavedSession } from './app-state.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[FAIL] ${message}`)
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`[FAIL] ${message}: expected ${String(expected)}, got ${String(actual)}`)
}

function makeSession(input: {
  id: string
  date: string
  score: number
  pending: boolean
  explanation: string[]
}): SavedSession {
  return {
    id: input.id,
    userId: 'user-cfi',
    mode: 'student',
    title: input.id,
    subject: '',
    project: '',
    category: 'Work',
    description: '',
    goal: '',
    focusMinutes: 45,
    breakMinutes: 10,
    sleepHours: 0,
    perceivedFatigue: 1,
    sessionDate: input.date,
    completed: true,
    pendingCFI: input.pending,
    cfiScore: input.score,
    cfiRiskLevel: input.pending ? undefined : 'moderate',
    cfiExplanation: input.explanation,
    feeling: 'Not recorded',
  }
}

const unifiedExplanation = [
  'Unified CFI: 54/100 (moderate descriptive band).',
  'Subjective fatigue indicator: 60/100 from 2/2 responses, recorded 2026-11-15T09:00:00.000Z.',
  'rmssd individual reading (watch-alpha; ms): 37 ms; personal baseline from 14 valid daily readings.',
  'Wearable domain: 48/100, averaging 2 eligible individual signals.',
  'Browser activity context only (0% scoring weight): 300 seconds, 12 key presses, 4 clicks.',
]

const complete = makeSession({ id: 'unified-session', date: '2026-11-15T10:00:00.000Z', score: 54, pending: false, explanation: unifiedExplanation })
const completeState = selectDashboardCfiState([complete])
assertEqual(completeState.status, 'scored', 'complete unified result is displayed as scored')
assertEqual(completeState.latestSession?.cfiScore, 54, 'latest CFI score is selected')
assert(completeState.sections.subjective.length === 1, 'subjective contribution is separated')
assert(completeState.sections.wearable.length === 2, 'wearable measurement and domain contribution are separated')
assert(completeState.sections.activity.length === 1, 'browser activity remains a separate context section')
assert(completeState.sections.activity[0].includes('0% scoring weight'), 'browser context is explicitly non-scoring')
console.log('✓ Dashboard selection separates unified score contributions and activity context')

const pending = makeSession({
  id: 'pending-session',
  date: '2026-11-16T10:00:00.000Z',
  score: -1,
  pending: true,
  explanation: [
    'Unified CFI is an experimental indicator.',
    'Subjective fatigue indicator: 60/100 from current responses.',
    'Wearable domain unavailable: insufficient baseline history.',
    'Unified CFI pending: both domains are required.',
  ],
})
const pendingState = selectDashboardCfiState([complete, pending])
assertEqual(pendingState.status, 'pending', 'newer incomplete session is not replaced by an older score')
assertEqual(pendingState.latestSession?.cfiScore, -1, 'pending score sentinel remains internal, not shown as a zero score')
assertEqual(pendingState.latestScoredSession?.cfiScore, 54, 'last actual score is retained separately')
assert(pendingState.sections.pendingReasons.length >= 2, 'pending reasons are available to the UI')
console.log('✓ New pending session is explicit; previous score remains separately available')

const historical = makeSession({
  id: 'old-cfi',
  date: '2025-01-01T10:00:00.000Z',
  score: 25,
  pending: false,
  explanation: ['Overall Cognitive Fatigue Index is 25/100.', 'Recorded sleep (8h) meets the old reference baseline.'],
})
const historicalState = selectDashboardCfiState([historical])
assertEqual(historicalState.status, 'scored', 'historical score remains displayable')
assertEqual(historicalState.isUnified, false, 'historical score is not misidentified as unified')
assertEqual(historicalState.latestSession?.cfiScore, 25, 'historical score is not recalculated')
console.log('✓ Historical score stays unchanged and is distinguishable from unified CFI')

const emptyState = selectDashboardCfiState([])
assertEqual(emptyState.status, 'empty', 'empty data has an explicit empty state')
assertEqual(emptyState.latestSession, null, 'empty state contains no fabricated record')
console.log('✓ Empty history never becomes a zero score')

console.log('\nResults: 4/4 CFI display checks passed.')
