import { calculateUnifiedCFI, normalizeSubjectiveRating, type UnifiedCFIInput } from './unified-cfi.ts'
import type { PersistedCheckIn } from './check-ins.ts'
import type { WearableReading } from './wearable-data.ts'
import type { BrowserActivitySession } from '../types/activity.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[FAIL] ${message}`)
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`[FAIL] ${message}: expected ${String(expected)}, got ${String(actual)}`)
}

const userId = 'user-test'
const evaluatedAt = '2026-11-15T12:00:00.000Z'
const emptyActivity: BrowserActivitySession[] = []

function makeCheckIn(overrides: Partial<PersistedCheckIn> = {}): PersistedCheckIn {
  return {
    id: 'checkin-1',
    userId,
    period: 'morning',
    date: '2026-11-15',
    recordedAt: '2026-11-15T11:00:00.000Z',
    timezone: 'Etc/UTC',
    createdAt: '2026-11-15T11:00:01.000Z',
    schemaVersion: 1,
    answers: { energy: 2, sleepQuality: 3, mood: 'neutral', readiness: 4, pace: 'steady' },
    ...overrides,
  }
}

function makeReading(input: {
  id: string
  date: string
  value: number
  metricName?: string
  unit?: string
  source?: string
  userId?: string
  time?: string
}): WearableReading {
  const recordedAt = `${input.date}T${input.time ?? '10:00:00'}.000Z`
  return {
    id: input.id,
    userId: input.userId ?? userId,
    source: input.source ?? 'device-alpha',
    readingDate: input.date,
    recordedAt,
    metricName: input.metricName ?? 'rmssd',
    value: input.value,
    unit: input.unit ?? 'ms',
    createdAt: recordedAt,
  }
}

function baselineDates(): string[] {
  const firstDay = new Date('2026-11-15T00:00:00.000Z')
  firstDay.setUTCDate(firstDay.getUTCDate() - 14)
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(firstDay)
    date.setUTCDate(date.getUTCDate() + index)
    return date.toISOString().slice(0, 10)
  })
}

function makeWearableReadings(): WearableReading[] {
  const readings: WearableReading[] = []
  baselineDates().forEach((date, index) => {
    readings.push(makeReading({ id: `rmssd-${index}`, date, value: index % 2 === 0 ? 40 : 50 }))
    readings.push(makeReading({ id: `sleep-${index}`, date, value: index % 2 === 0 ? 7 : 8, metricName: 'sleep_duration_hours', unit: 'hours', source: 'sleep-device' }))
  })
  readings.push(makeReading({ id: 'rmssd-current', date: '2026-11-15', value: 35, time: '11:30:00' }))
  readings.push(makeReading({ id: 'sleep-current', date: '2026-11-15', value: 6, metricName: 'sleep_duration_hours', unit: 'hours', source: 'sleep-device', time: '11:30:00' }))
  return readings
}

function makeInput(overrides: Partial<UnifiedCFIInput> = {}): UnifiedCFIInput {
  return {
    userId,
    evaluatedAt,
    checkIns: [makeCheckIn()],
    wearableReadings: makeWearableReadings(),
    browserActivitySessions: emptyActivity,
    ...overrides,
  }
}

console.log('--- Running Unified CFI Tests ---\n')
let passed = 0

assertEqual(normalizeSubjectiveRating(1), 100, 'lowest subjective rating maps to highest indicator')
assertEqual(normalizeSubjectiveRating(3), 50, 'middle subjective rating maps to midpoint')
assertEqual(normalizeSubjectiveRating(5), 0, 'highest subjective rating maps to zero indicator')
assertEqual(normalizeSubjectiveRating(0), null, 'out-of-range rating is unavailable')
passed++
console.log('✓ Subjective normalization and invalid values')

const completeResult = calculateUnifiedCFI(makeInput())
assert(completeResult.score !== null, 'fresh subjective and wearable domains produce a score')
assert(completeResult.coverage.complete, 'both required domains are covered')
assert(completeResult.explanation.some((line) => line.includes('Subjective fatigue indicator')), 'explanation labels subjective proxy')
assert(completeResult.explanation.some((line) => line.includes('device-alpha') && line.includes('14 valid daily readings')), 'wearable provenance and baseline coverage are explained')
assert(completeResult.explanation.some((line) => line.includes('0% scoring weight')), 'browser activity remains contextual')
passed++
console.log('✓ Baseline scoring, domain weights, provenance, coverage, and activity context')

const activitySession: BrowserActivitySession = {
  id: 'activity-1',
  userId,
  source: 'browser-tab',
  startedAt: '2026-11-15T09:00:00.000Z',
  endedAt: '2026-11-15T10:00:00.000Z',
  durationSeconds: 3600,
  keyPressCount: 400,
  mouseClickCount: 80,
  createdAt: '2026-11-15T10:00:01.000Z',
}
const withActivity = calculateUnifiedCFI(makeInput({ browserActivitySessions: [activitySession] }))
assertEqual(withActivity.score, completeResult.score, 'browser activity must never change the score')
assert(withActivity.explanation.some((line) => line.includes('400 key presses')), 'recent browser activity appears as context')
passed++
console.log('✓ Browser activity is contextual and has zero score effect')

const staleCheckIn = calculateUnifiedCFI(makeInput({ checkIns: [makeCheckIn({ recordedAt: '2026-11-13T10:00:00.000Z' })] }))
assertEqual(staleCheckIn.score, null, 'stale check-in prevents unified score')
assert(!staleCheckIn.coverage.subjectiveDomain, 'stale subjective domain is unavailable')
passed++
console.log('✓ Stale subjective evidence is not scored')

const missingCheckIn = calculateUnifiedCFI(makeInput({ checkIns: [] }))
assertEqual(missingCheckIn.score, null, 'missing check-in prevents unified score')
assert(!missingCheckIn.coverage.subjectiveDomain && missingCheckIn.coverage.wearableDomain, 'wearable remains visible while missing subjective domain keeps CFI pending')
passed++
console.log('✓ Missing check-in produces a pending unified score')

const noWearable = calculateUnifiedCFI(makeInput({ wearableReadings: [] }))
assertEqual(noWearable.score, null, 'missing wearable domain prevents unified score')
assert(noWearable.coverage.subjectiveDomain && !noWearable.coverage.wearableDomain, 'available subjective data is retained without imputing wearable')
assert(noWearable.explanation.some((line) => line.includes('Missing data is not imputed')), 'missing data explanation is explicit')
passed++
console.log('✓ Missing wearable data remains missing; no unified score is generated')

const staleWearable = calculateUnifiedCFI(makeInput({
  wearableReadings: makeWearableReadings().map((reading) => reading.readingDate === '2026-11-15'
    ? { ...reading, recordedAt: '2026-11-14T10:00:00.000Z' }
    : reading),
}))
assertEqual(staleWearable.score, null, 'stale current wearable data prevents unified score')
assert(!staleWearable.coverage.wearableDomain, 'stale wearable domain is unavailable')
passed++
console.log('✓ Stale wearable measurements are excluded')

const zeroMadReadings = baselineDates().map((date, index) => makeReading({ id: `flat-${index}`, date, value: 40 }))
zeroMadReadings.push(makeReading({ id: 'flat-current', date: '2026-11-15', value: 20, time: '11:30:00' }))
const zeroMad = calculateUnifiedCFI(makeInput({ wearableReadings: zeroMadReadings }))
assertEqual(zeroMad.score, null, 'zero-MAD baseline is not assigned an invented denominator')
assert(!zeroMad.coverage.wearableDomain, 'zero-MAD signal is unavailable')
passed++
console.log('✓ Zero-MAD baseline is explicitly unavailable')

const shortBaseline = calculateUnifiedCFI(makeInput({
  wearableReadings: makeWearableReadings().filter((reading) => reading.metricName !== 'sleep_duration_hours').slice(-14),
}))
assertEqual(shortBaseline.score, null, 'fewer than the minimum baseline days is unavailable')
assert(!shortBaseline.coverage.wearableDomain, 'insufficient baseline leaves wearable domain unavailable')
passed++
console.log('✓ Insufficient baseline history produces a pending score')

const differentSource = baselineDates().map((date, index) => makeReading({ id: `other-${index}`, date, value: 40 + index % 2 * 10, source: 'device-beta' }))
differentSource.push(makeReading({ id: 'new-source-current', date: '2026-11-15', value: 30, source: 'device-alpha', time: '11:30:00' }))
const sourceMismatch = calculateUnifiedCFI(makeInput({ wearableReadings: differentSource }))
assertEqual(sourceMismatch.score, null, 'baseline from another source is not mixed with current reading')
passed++
console.log('✓ Source mismatch cannot borrow another device baseline')

const wrongUnits = makeWearableReadings().map((reading) => reading.metricName === 'rmssd' ? { ...reading, unit: 'seconds' } : reading)
const unitMismatch = calculateUnifiedCFI(makeInput({ wearableReadings: wrongUnits }))
assert(unitMismatch.score !== null && unitMismatch.coverage.wearableSignals === 1, 'unsupported RMSSD unit is excluded while the independent valid sleep signal remains eligible')
assert(!unitMismatch.explanation.some((line) => line.startsWith('rmssd individual reading')), 'unsupported unit is not described as an accepted CFI input')
passed++
console.log('✓ Unsupported or mismatched units are excluded')

const researchOnly = makeWearableReadings().map((reading) => ({ ...reading, source: 'anonymized-research-aggregates' }))
const researchExcluded = calculateUnifiedCFI(makeInput({ wearableReadings: researchOnly }))
assertEqual(researchExcluded.score, null, 'research cohort data is not used as personal wearable evidence')
passed++
console.log('✓ Research aggregates are excluded from individual scoring')

const wrongOwner = calculateUnifiedCFI(makeInput({
  checkIns: [makeCheckIn({ userId: 'other-user' })],
  wearableReadings: makeWearableReadings().map((reading) => ({ ...reading, userId: 'other-user' })),
}))
assertEqual(wrongOwner.score, null, 'another user’s records are not consumed')
passed++
console.log('✓ Other-account records are excluded')

console.log(`\nResults: ${passed}/13 unified CFI checks passed.`)
