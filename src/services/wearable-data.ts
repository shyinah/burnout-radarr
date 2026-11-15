import { isSupabaseConfigured, supabase } from './supabase.ts'
import { demoWearableDataSource, type WearableDailyReading } from '../features/wearable/dataSource.ts'
import type { WearableCountUnit, WearableDailyInput, WearableMetricInput } from '../features/wearable/extractFeatures.ts'

export const RESEARCH_WEARABLE_SOURCE = 'anonymized-research-aggregates'

export interface WearableResearchLoadResult {
  readings: readonly WearableDailyReading[]
  source: 'supabase' | 'demo'
  sourceName: string
  warning?: string
}

export interface WearableReading {
  id: string
  userId: string
  source: string
  readingDate: string
  recordedAt: string
  metricName: string
  value: number
  unit: string
  createdAt: string
}

export interface SaveWearableReadingInput {
  id: string
  source: string
  readingDate: string
  recordedAt: string
  metricName: string
  value: number
  unit: string
}

export interface WearableServiceResult<T> {
  data: T | null
  error?: string
}

const featureByMetric = {
  heart_rate_bpm: 'heartRateBpm',
  rmssd: 'rmssd',
  sleep_duration_hours: 'sleepDurationHours',
  sleep_efficiency: 'sleepEfficiency',
  in_bed_duration_hours: 'inBedDurationHours',
  sleep_latency_hours: 'sleepLatencyHours',
  waso_minutes: 'wasoMinutes',
  night_awakening_count: 'nightAwakeningCount',
  steps: 'steps',
} as const satisfies Record<string, Exclude<keyof WearableDailyInput, 'date' | 'source' | 'provenance'>>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function isCountUnit(value: unknown): value is WearableCountUnit {
  return value === 'samples' || value === 'records' || value === 'participants'
}

function isResearchMetric(value: unknown): value is keyof typeof featureByMetric {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(featureByMetric, value)
}

function parseResearchAggregate(value: unknown) {
  if (!isRecord(value)) throw new Error('The wearable research response contains an invalid aggregate.')
  const contributorCount = value.contributor_count
  const expectedCount = value.expected_count
  if (!isRecord(value) ||
    value.source !== RESEARCH_WEARABLE_SOURCE ||
    !isValidDate(value.reading_date) ||
    !isResearchMetric(value.metric_name) ||
    typeof value.value !== 'number' || !Number.isFinite(value.value) ||
    typeof value.unit !== 'string' || value.unit.trim() === '' ||
    value.aggregation_method !== 'median' ||
    typeof contributorCount !== 'number' || !Number.isSafeInteger(contributorCount) || contributorCount < 0 ||
    !(expectedCount === null || (typeof expectedCount === 'number' && Number.isSafeInteger(expectedCount) && expectedCount >= contributorCount)) ||
    !isCountUnit(value.count_unit) ||
    typeof value.provenance !== 'string' || value.provenance.trim() === '') {
    throw new Error('The wearable research response contains an invalid aggregate.')
  }

  return {
    source: value.source,
    date: value.reading_date,
    metricName: value.metric_name,
    value: value.value,
    unit: value.unit,
    contributorCount,
    expectedCount,
    countUnit: value.count_unit,
    provenance: value.provenance,
  }
}

function mapResearchAggregates(rows: readonly unknown[]): WearableDailyReading[] {
  const readings = new Map<string, WearableDailyInput>()
  for (const rawRow of rows) {
    const row = parseResearchAggregate(rawRow)
    let reading = readings.get(row.date)
    if (!reading) {
      reading = { date: row.date, source: row.source, provenance: row.provenance }
      readings.set(row.date, reading)
    }
    const featureKey = featureByMetric[row.metricName]
    const metric: WearableMetricInput = {
      kind: 'median',
      value: row.value,
      validCount: row.contributorCount,
      expectedCount: row.expectedCount ?? undefined,
      countUnit: row.countUnit,
    }
    reading[featureKey] = metric
  }
  return [...readings.values()].sort((a, b) => a.date.localeCompare(b.date))
}

async function getCurrentUserId(): Promise<WearableServiceResult<string>> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) return { data: null, error: 'Unable to verify the authenticated user.' }
    if (!data.user?.id) return { data: null, error: 'An authenticated user is required.' }
    return { data: data.user.id }
  } catch {
    return { data: null, error: 'Unable to verify the authenticated user.' }
  }
}

async function demoFallback(signal?: AbortSignal, warning?: string): Promise<WearableResearchLoadResult> {
  const readings = await demoWearableDataSource.getDailyReadings(signal)
  return {
    readings,
    source: 'demo',
    sourceName: demoWearableDataSource.name,
    ...(warning ? { warning } : {}),
  }
}

/** Loads only public, anonymized cohort aggregates; the bundled demo remains the offline fallback. */
export async function fetchWearableResearchData(signal?: AbortSignal): Promise<WearableResearchLoadResult> {
  if (signal?.aborted) throw new DOMException('The wearable request was cancelled.', 'AbortError')
  if (!isSupabaseConfigured) return demoFallback(signal)

  try {
    const { data, error } = await supabase
      .from('wearable_research_aggregates')
      .select('source, reading_date, metric_name, value, unit, aggregation_method, contributor_count, expected_count, count_unit, provenance')
      .eq('source', RESEARCH_WEARABLE_SOURCE)
      .order('reading_date', { ascending: true })
      .abortSignal(signal ?? new AbortController().signal)

    if (signal?.aborted) throw new DOMException('The wearable request was cancelled.', 'AbortError')
    if (error) return demoFallback(signal, 'Supabase research data is unavailable; showing the bundled demo instead.')

    const rows: unknown = data ?? []
    if (!Array.isArray(rows) || rows.length === 0) {
      return demoFallback(signal, 'No research aggregates are stored in Supabase yet; showing the bundled demo instead.')
    }

    return {
      readings: mapResearchAggregates(rows),
      source: 'supabase',
      sourceName: 'Supabase · anonymized research aggregates',
    }
  } catch (error) {
    if (signal?.aborted) throw error
    return demoFallback(signal, 'Supabase research data could not be loaded; showing the bundled demo instead.')
  }
}

function parseWearableReading(value: unknown): WearableReading {
  if (!isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.user_id !== 'string' ||
    typeof value.source !== 'string' ||
    !isValidDate(value.reading_date) ||
    !isValidTimestamp(value.recorded_at) ||
    typeof value.metric_name !== 'string' ||
    typeof value.value !== 'number' || !Number.isFinite(value.value) ||
    typeof value.unit !== 'string' ||
    !isValidTimestamp(value.created_at)) {
    throw new Error('The wearable response contains an invalid reading.')
  }
  return {
    id: value.id,
    userId: value.user_id,
    source: value.source,
    readingDate: value.reading_date,
    recordedAt: value.recorded_at,
    metricName: value.metric_name,
    value: value.value,
    unit: value.unit,
    createdAt: value.created_at,
  }
}

/** Fetches individual readings from the active session only; RLS independently enforces ownership. */
export async function fetchWearableReadingsForCurrentUser(signal?: AbortSignal): Promise<WearableServiceResult<WearableReading[]>> {
  if (!isSupabaseConfigured) return { data: null, error: 'Supabase is not configured.' }
  const auth = await getCurrentUserId()
  if (!auth.data) return { data: null, error: auth.error ?? 'An authenticated user is required.' }

  try {
    const { data, error } = await supabase
      .from('wearable_readings')
      .select('id, user_id, source, reading_date, recorded_at, metric_name, value, unit, created_at')
      .eq('user_id', auth.data)
      .order('recorded_at', { ascending: false })
      .limit(1000)
      .abortSignal(signal ?? new AbortController().signal)
    if (error) return { data: null, error: error.message }
    const rows: unknown = data ?? []
    if (!Array.isArray(rows)) return { data: null, error: 'The wearable response is invalid.' }
    return { data: rows.map(parseWearableReading) }
  } catch {
    return { data: null, error: 'Unable to load your individual wearable readings.' }
  }
}

function isValidSaveInput(value: unknown): value is SaveWearableReadingInput {
  return isRecord(value) &&
    typeof value.id === 'string' && value.id.trim() !== '' &&
    typeof value.source === 'string' && value.source.trim() !== '' &&
    isValidDate(value.readingDate) && isValidTimestamp(value.recordedAt) &&
    typeof value.metricName === 'string' && value.metricName.trim() !== '' &&
    typeof value.value === 'number' && Number.isFinite(value.value) &&
    typeof value.unit === 'string' && value.unit.trim() !== ''
}

/** Inserts an individual reading with the owner derived only from Supabase auth. */
export async function saveWearableReadingForCurrentUser(input: SaveWearableReadingInput): Promise<WearableServiceResult<WearableReading>> {
  if (!isValidSaveInput(input)) return { data: null, error: 'Wearable reading data is invalid.' }
  if (!isSupabaseConfigured) return { data: null, error: 'Supabase is not configured.' }
  const auth = await getCurrentUserId()
  if (!auth.data) return { data: null, error: auth.error ?? 'An authenticated user is required.' }

  try {
    const { data, error } = await supabase
      .from('wearable_readings')
      .insert({
        id: input.id,
        user_id: auth.data,
        source: input.source,
        reading_date: input.readingDate,
        recorded_at: input.recordedAt,
        metric_name: input.metricName,
        value: input.value,
        unit: input.unit,
      })
      .select('id, user_id, source, reading_date, recorded_at, metric_name, value, unit, created_at')
      .single()
    if (error) return { data: null, error: error.message }
    return { data: parseWearableReading(data) }
  } catch {
    return { data: null, error: 'Unable to save the wearable reading.' }
  }
}
