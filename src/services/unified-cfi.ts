import type { BrowserActivitySession } from '../types/activity.ts'
import type { PersistedCheckIn } from './check-ins.ts'
import type { WearableReading } from './wearable-data.ts'

export const SUBJECTIVE_FRESHNESS_HOURS = 24
export const WEARABLE_FRESHNESS_HOURS = 24
export const BASELINE_WINDOW_DAYS = 28
export const MIN_BASELINE_DAYS = 14
export const ROBUST_SCALE_FACTOR = 1.4826
export const MAX_SCORE_PER_ROBUST_DEVIATION = 50
export const RESEARCH_WEARABLE_SOURCE = 'anonymized-research-aggregates'

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_SCORE = 0
const MAX_SCORE = 100

export interface UnifiedCFIInput {
  userId: string
  evaluatedAt: string
  checkIns: readonly PersistedCheckIn[]
  wearableReadings: readonly WearableReading[]
  browserActivitySessions: readonly BrowserActivitySession[]
}

export interface UnifiedCFICoverage {
  subjectiveDomain: boolean
  subjectiveItems: number
  expectedSubjectiveItems: number
  wearableDomain: boolean
  wearableSignals: number
  expectedWearableSignals: number
  complete: boolean
}

export interface UnifiedCFIResult {
  score: number | null
  riskLevel: 'low' | 'moderate' | 'high' | null
  explanation: string[]
  coverage: UnifiedCFICoverage
}

interface SubjectiveComponent {
  score: number
  period: 'morning' | 'evening'
  date: string
  recordedAt: string
  timezone: string
  responses: { questionId: string; value: number; score: number }[]
  availableItems: number
  expectedItems: number
}

export interface WearableComponent {
  score: number
  metricName: 'rmssd' | 'sleep_duration_hours'
  source: string
  unit: 'ms' | 'hours'
  readingDate: string
  recordedAt: string
  currentValue: number
  baselineMedian: number
  baselineMad: number
  baselineMadScale: 'log' | 'linear'
  baselineDays: number
  standardizedDeficit: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteDate(value: string): number | null {
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function ageIsWithin(value: string, evaluatedAt: number, freshnessMs: number): boolean {
  const timestamp = finiteDate(value)
  return timestamp !== null && timestamp <= evaluatedAt && evaluatedAt - timestamp <= freshnessMs
}

function median(values: readonly number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function medianAbsoluteDeviation(values: readonly number[], center: number): number | null {
  return median(values.map((value) => Math.abs(value - center)))
}

export function normalizeSubjectiveRating(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) return null
  return 25 * (5 - value)
}

function subjectiveComponent(checkIns: readonly PersistedCheckIn[], userId: string, evaluatedAt: number): SubjectiveComponent | null {
  const eligible = checkIns
    .filter((record) => record.userId === userId &&
      (record.period === 'morning' || record.period === 'evening') &&
      isIsoDate(record.date) &&
      typeof record.timezone === 'string' && record.timezone.trim() !== '' &&
      ageIsWithin(record.recordedAt, evaluatedAt, SUBJECTIVE_FRESHNESS_HOURS * 60 * 60 * 1000))
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))

  const record = eligible[0]
  if (!record || !isRecord(record.answers)) return null

  const questionIds = record.period === 'morning' ? ['energy', 'readiness'] : ['energy', 'concentration', 'overall']
  const responses = questionIds.flatMap((questionId) => {
    const value = record.answers[questionId]
    const score = normalizeSubjectiveRating(value)
    return score === null || typeof value !== 'number' ? [] : [{ questionId, value, score }]
  })
  if (!responses.length) return null

  return {
    score: responses.reduce((total, response) => total + response.score, 0) / responses.length,
    period: record.period,
    date: record.date,
    recordedAt: record.recordedAt,
    timezone: record.timezone,
    responses,
    availableItems: responses.length,
    expectedItems: questionIds.length,
  }
}

function canonicalUnit(metricName: string, unit: string): 'ms' | 'hours' | null {
  const normalized = unit.trim().toLowerCase()
  if (metricName === 'rmssd' && ['ms', 'millisecond', 'milliseconds'].includes(normalized)) return 'ms'
  if (metricName === 'sleep_duration_hours' && ['h', 'hr', 'hour', 'hours'].includes(normalized)) return 'hours'
  return null
}

function isResearchOrDemoSource(source: string): boolean {
  const normalized = source.trim().toLowerCase()
  return normalized === RESEARCH_WEARABLE_SOURCE ||
    normalized.includes('research') || normalized.includes('cohort') || normalized.includes('demo')
}

function isReadingForOwnerAndMetric(
  reading: WearableReading,
  userId: string,
  metricName: WearableComponent['metricName'],
): boolean {
  return reading.userId === userId &&
    reading.metricName === metricName &&
    typeof reading.source === 'string' && reading.source.trim().length >= 2 &&
    !isResearchOrDemoSource(reading.source) &&
    canonicalUnit(reading.metricName, reading.unit) !== null &&
    Number.isFinite(reading.value) &&
    (metricName === 'rmssd' ? reading.value > 0 : reading.value >= 0) &&
    isIsoDate(reading.readingDate) &&
    finiteDate(reading.recordedAt) !== null
}

function sourceDateConsistent(reading: WearableReading): boolean {
  const recordedAt = finiteDate(reading.recordedAt)
  if (recordedAt === null) return false
  const recordedDate = new Date(recordedAt).toISOString().slice(0, 10)
  const sourceDate = Date.parse(`${reading.readingDate}T00:00:00.000Z`)
  return Math.abs(Date.parse(`${recordedDate}T00:00:00.000Z`) - sourceDate) <= DAY_MS
}

function transformMetric(value: number, metricName: WearableComponent['metricName']): number {
  return metricName === 'rmssd' ? Math.log(value) : value
}

function scoreWearableMetric(
  readings: readonly WearableReading[],
  userId: string,
  metricName: WearableComponent['metricName'],
  evaluatedAt: number,
): WearableComponent | null {
  const eligible = readings.filter((reading) =>
    isReadingForOwnerAndMetric(reading, userId, metricName) &&
    sourceDateConsistent(reading) &&
    finiteDate(reading.recordedAt)! <= evaluatedAt
  )
  if (!eligible.length) return null

  const currentReading = [...eligible].sort((a, b) =>
    b.readingDate.localeCompare(a.readingDate) || Date.parse(b.recordedAt) - Date.parse(a.recordedAt)
  )[0]
  const currentTimestamp = finiteDate(currentReading.recordedAt)
  if (currentTimestamp === null || evaluatedAt - currentTimestamp > WEARABLE_FRESHNESS_HOURS * 60 * 60 * 1000) return null

  const unit = canonicalUnit(metricName, currentReading.unit)
  if (!unit) return null

  const sameSeries = eligible.filter((reading) =>
    reading.source === currentReading.source && canonicalUnit(metricName, reading.unit) === unit
  )
  const dailyValues = new Map<string, number[]>()
  for (const reading of sameSeries) {
    const values = dailyValues.get(reading.readingDate) ?? []
    values.push(transformMetric(reading.value, metricName))
    dailyValues.set(reading.readingDate, values)
  }
  const currentValues = dailyValues.get(currentReading.readingDate)
  const currentValue = currentValues ? median(currentValues.map((value) =>
    metricName === 'rmssd' ? Math.exp(value) : value
  )) : null
  if (currentValue === null) return null

  const currentDay = Date.parse(`${currentReading.readingDate}T00:00:00.000Z`)
  const earliestBaselineDay = currentDay - BASELINE_WINDOW_DAYS * DAY_MS
  const baselineValues = [...dailyValues.entries()]
    .filter(([date]) => {
      const day = Date.parse(`${date}T00:00:00.000Z`)
      return day >= earliestBaselineDay && day < currentDay
    })
    .map(([, values]) => median(values))
    .filter((value): value is number => value !== null)
  if (baselineValues.length < MIN_BASELINE_DAYS) return null

  const baselineMedianTransformed = median(baselineValues.map((value) => transformMetric(value, metricName)))
  if (baselineMedianTransformed === null) return null
  const baselineMad = medianAbsoluteDeviation(baselineValues.map((value) => transformMetric(value, metricName)), baselineMedianTransformed)
  if (baselineMad === null || baselineMad === 0) return null

  const transformedCurrent = transformMetric(currentValue, metricName)
  const standardizedDeficit = Math.max(0, (baselineMedianTransformed - transformedCurrent) / (ROBUST_SCALE_FACTOR * baselineMad))
  const score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, standardizedDeficit * MAX_SCORE_PER_ROBUST_DEVIATION))
  const baselineMedian = metricName === 'rmssd' ? Math.exp(baselineMedianTransformed) : baselineMedianTransformed
  return {
    score,
    metricName,
    source: currentReading.source,
    unit,
    readingDate: currentReading.readingDate,
    recordedAt: currentReading.recordedAt,
    currentValue,
    baselineMedian,
    baselineMad,
    baselineMadScale: metricName === 'rmssd' ? 'log' : 'linear',
    baselineDays: baselineValues.length,
    standardizedDeficit,
  }
}

function riskLevelFor(score: number): 'low' | 'moderate' | 'high' {
  if (score <= 33) return 'low'
  if (score <= 66) return 'moderate'
  return 'high'
}

function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals)
}

function activityContext(sessions: readonly BrowserActivitySession[], userId: string, evaluatedAt: number): string[] {
  const windowStart = evaluatedAt - DAY_MS
  const recent = sessions
    .filter((session) => session.userId === userId &&
      Number.isFinite(Date.parse(session.startedAt)) &&
      Number.isFinite(Date.parse(session.endedAt)) &&
      Date.parse(session.endedAt) >= windowStart &&
      Date.parse(session.endedAt) <= evaluatedAt &&
      Date.parse(session.startedAt) <= evaluatedAt)
    .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))
    .slice(0, 3)

  if (!recent.length) return ['Browser activity: no recent authenticated activity session is available; this source has 0% scoring weight.']
  return recent.map((session) =>
    `Browser activity context only (0% scoring weight): ${session.source}, ${session.startedAt}–${session.endedAt}; ${session.durationSeconds} seconds, ${session.keyPressCount} key presses, ${session.mouseClickCount} mouse clicks. It is not interpreted as fatigue and is not added to focus-session duration.`
  )
}

/**
 * Creates a new-session indicator from current-account evidence only. This is a
 * transparent, non-clinical heuristic; it never consumes research cohort rows.
 */
export function calculateUnifiedCFI(input: UnifiedCFIInput): UnifiedCFIResult {
  const explanation: string[] = [
    'Unified CFI is an experimental, non-clinical fatigue indicator; it is not a diagnosis or a clinically validated scale.',
  ]
  const evaluatedAt = finiteDate(input.evaluatedAt)
  if (!input.userId || evaluatedAt === null) {
    explanation.push('Unified CFI unavailable: authenticated user or valid evaluation timestamp is missing.')
    return {
      score: null,
      riskLevel: null,
      explanation: [...explanation, ...activityContext(input.browserActivitySessions, input.userId, evaluatedAt ?? 0)],
      coverage: { subjectiveDomain: false, subjectiveItems: 0, expectedSubjectiveItems: 0, wearableDomain: false, wearableSignals: 0, expectedWearableSignals: 2, complete: false },
    }
  }

  const subjective = subjectiveComponent(input.checkIns, input.userId, evaluatedAt)
  const wearableComponents = (['rmssd', 'sleep_duration_hours'] as const)
    .map((metric) => scoreWearableMetric(input.wearableReadings, input.userId, metric, evaluatedAt))
    .filter((component): component is WearableComponent => component !== null)
  const wearable = wearableComponents.length
    ? wearableComponents.reduce((total, component) => total + component.score, 0) / wearableComponents.length
    : null
  const complete = subjective !== null && wearable !== null

  if (subjective) {
    const contribution = complete ? subjective.score * 0.5 : null
    const responseDetails = subjective.responses.map((response) => `${response.questionId}=${response.value}→${formatNumber(response.score)}/100`).join(', ')
    explanation.push(
      `Subjective fatigue indicator: ${formatNumber(subjective.score)}/100 from ${subjective.availableItems}/${subjective.expectedItems} applicable ${subjective.period} check-in responses [${responseDetails}] (each valid 1–5 response maps to 25 × (5 − response)), recorded ${subjective.recordedAt} (${subjective.date}, ${subjective.timezone}). ${complete ? `Provisional contribution: ${formatNumber(contribution!)} points at 50% weight.` : 'No unified score is generated because the wearable domain is unavailable.'} This is not a clinically validated scale.`
    )
  } else {
    explanation.push(`Subjective fatigue indicator unavailable: no valid morning/evening check-in within the last ${SUBJECTIVE_FRESHNESS_HOURS} hours for this account.`)
  }

  for (const component of wearableComponents) {
    const signalWeight = 1 / wearableComponents.length
    const share = complete ? component.score * 0.5 * signalWeight : null
    explanation.push(
      `${component.metricName} individual reading (${component.source}; ${component.unit}) for ${component.readingDate}, recorded ${component.recordedAt}: ${formatNumber(component.currentValue, 2)} ${component.unit}; personal baseline median ${formatNumber(component.baselineMedian, 2)} ${component.unit}, MAD ${formatNumber(component.baselineMad, 3)} ${component.baselineMadScale === 'log' ? '(log RMSSD scale)' : `(${component.unit})`} from ${component.baselineDays} valid daily readings in the prior ${BASELINE_WINDOW_DAYS} days. Downward standardized deviation ${formatNumber(component.standardizedDeficit)}; signal indicator ${formatNumber(component.score)}/100. ${complete ? `Provisional weighted contribution: ${formatNumber(share!)} points.` : 'No unified score is generated because the subjective domain is unavailable.'}`
    )
  }
  if (!wearableComponents.length) {
    explanation.push(`Wearable domain unavailable: no fresh, supported individual RMSSD (ms) or sleep-duration (hours) reading with ${MIN_BASELINE_DAYS} valid same-source baseline days and nonzero baseline MAD. Anonymized cohort aggregates and demo data are never used as individual readings.`)
  } else {
    explanation.push(`Wearable domain: ${formatNumber(wearable!)} / 100, averaging ${wearableComponents.length} eligible individual signal(s) within one capped domain; available signals share the domain equally. Each signal uses max(0, downward robust z-score) × 50, capped at 100; the cap is reached at two robust standard deviations below baseline. The 50% domain weight and scaling are provisional engineering choices.`)
  }

  explanation.push(...activityContext(input.browserActivitySessions, input.userId, evaluatedAt))
  if (!complete) {
    explanation.push('Unified CFI pending: both the subjective and wearable domains are required. Missing data is not imputed or scored as zero.')
    return {
      score: null,
      riskLevel: null,
      explanation,
      coverage: {
        subjectiveDomain: subjective !== null,
        subjectiveItems: subjective?.availableItems ?? 0,
        expectedSubjectiveItems: subjective?.expectedItems ?? 0,
        wearableDomain: wearable !== null,
        wearableSignals: wearableComponents.length,
        expectedWearableSignals: 2,
        complete: false,
      },
    }
  }

  const score = Math.round(subjective.score * 0.5 + wearable! * 0.5)
  const riskLevel = riskLevelFor(score)
  explanation.unshift(`Unified CFI: ${score}/100 (${riskLevel} descriptive band; existing display boundaries, not clinical thresholds). Provisional score = 50% subjective indicator + 50% wearable domain.`)
  explanation.push('Research context: Yoshikawa et al. (2025) found HRV RMSSD and fatigue VAS to be distinct, complementary indicators in a controlled task; Bourdillon et al. (2021) found HRV changes during controlled partial sleep deprivation. Neither study validates this formula, its weights, its personal-baseline normalization, or consumer-wearable readings.')

  return {
    score,
    riskLevel,
    explanation,
    coverage: {
      subjectiveDomain: true,
      subjectiveItems: subjective.availableItems,
      expectedSubjectiveItems: subjective.expectedItems,
      wearableDomain: true,
      wearableSignals: wearableComponents.length,
      expectedWearableSignals: 2,
      complete: true,
    },
  }
}
