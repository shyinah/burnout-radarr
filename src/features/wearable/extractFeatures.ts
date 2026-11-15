export type WearableCountUnit = 'samples' | 'records' | 'participants'

export type WearableMetricInput =
  | {
      kind: 'samples'
      values: readonly unknown[]
      expectedCount?: number
      countUnit?: 'samples' | 'records'
    }
  | {
      kind: 'median'
      value: unknown
      validCount: number
      expectedCount?: number
      countUnit: WearableCountUnit
    }

export interface WearableDailyInput {
  date: string
  source?: string
  provenance?: string
  heartRateBpm?: WearableMetricInput | null
  rmssd?: WearableMetricInput | null
  sleepDurationHours?: WearableMetricInput | null
  sleepEfficiency?: WearableMetricInput | null
  inBedDurationHours?: WearableMetricInput | null
  sleepLatencyHours?: WearableMetricInput | null
  wasoMinutes?: WearableMetricInput | null
  nightAwakeningCount?: WearableMetricInput | null
  steps?: WearableMetricInput | null
}

export type WearableFeatureKey = 'heartRateBpm' | 'rmssd' | 'sleepDurationHours' | 'sleepEfficiency' | 'inBedDurationHours' | 'sleepLatencyHours' | 'wasoMinutes' | 'nightAwakeningCount' | 'steps'
export type WearableFeatureUnit = 'bpm' | 'unspecified' | 'hours' | 'ratio' | 'minutes' | 'count' | 'steps'

export interface WearableAvailability {
  available: boolean
  validMeasurementCount: number
  expectedMeasurementCount: number | null
  countUnit: WearableCountUnit
}

export interface WearableTrend {
  method: 'linear-regression'
  slopePerDay: number
  startDate: string
  endDate: string
  consecutiveValidDays: number
}

export interface WearableDailyMetricFeature {
  /** Daily median where source samples are provided; otherwise the source median. */
  dailyMedian: number | null
  unit: WearableFeatureUnit
  unitNote?: string
  availability: WearableAvailability
  /** Difference from the immediately preceding calendar day; null across gaps/missing values. */
  dayOverDayChange: number | null
  /** Computed only when at least three consecutive calendar days are valid. */
  trend: WearableTrend | null
}

export interface WearableDailyFeature {
  date: string
  source?: string
  provenance?: string
  heartRateBpm: WearableDailyMetricFeature
  rmssd: WearableDailyMetricFeature
  sleepDurationHours: WearableDailyMetricFeature
  sleepEfficiency: WearableDailyMetricFeature
  inBedDurationHours: WearableDailyMetricFeature
  sleepLatencyHours: WearableDailyMetricFeature
  wasoMinutes: WearableDailyMetricFeature
  nightAwakeningCount: WearableDailyMetricFeature
  steps: WearableDailyMetricFeature
}

export interface WearableFeatureExtractionResult {
  dailyFeatures: WearableDailyFeature[]
  excluded: {
    invalidDateRows: number
    duplicateDateGroups: number
  }
}

export const MIN_CONSECUTIVE_DAYS_FOR_TREND = 3

const featureDefinitions: Record<WearableFeatureKey, { unit: WearableFeatureUnit; unitNote?: string }> = {
  heartRateBpm: { unit: 'bpm' },
  rmssd: { unit: 'unspecified', unitNote: 'The source README does not specify an RMSSD unit.' },
  sleepDurationHours: { unit: 'hours' },
  sleepEfficiency: { unit: 'ratio' },
  inBedDurationHours: { unit: 'hours' },
  sleepLatencyHours: { unit: 'hours' },
  wasoMinutes: { unit: 'minutes' },
  nightAwakeningCount: { unit: 'count' },
  steps: { unit: 'steps' },
}

const featureKeys = Object.keys(featureDefinitions) as WearableFeatureKey[]

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function nonNegativeInteger(value: number | undefined): number | null {
  return value !== undefined && Number.isSafeInteger(value) && value >= 0 ? value : null
}

function median(values: readonly number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function readMetric(input: WearableMetricInput | null | undefined, key: WearableFeatureKey): WearableDailyMetricFeature {
  const definition = featureDefinitions[key]
  let value: number | null = null
  let validMeasurementCount = 0
  let expectedMeasurementCount: number | null = null
  let countUnit: WearableCountUnit = 'samples'

  if (input?.kind === 'samples') {
    const validValues = input.values.map(finiteNumber).filter((sample): sample is number => sample !== null)
    value = median(validValues)
    validMeasurementCount = validValues.length
    expectedMeasurementCount = nonNegativeInteger(input.expectedCount)
    countUnit = input.countUnit ?? 'samples'
  } else if (input?.kind === 'median') {
    const suppliedValue = finiteNumber(input.value)
    validMeasurementCount = nonNegativeInteger(input.validCount) ?? 0
    expectedMeasurementCount = nonNegativeInteger(input.expectedCount)
    countUnit = input.countUnit
    value = suppliedValue !== null && validMeasurementCount > 0 ? suppliedValue : null
  }

  return {
    dailyMedian: value,
    unit: definition.unit,
    ...(definition.unitNote ? { unitNote: definition.unitNote } : {}),
    availability: {
      available: value !== null,
      validMeasurementCount,
      expectedMeasurementCount,
      countUnit,
    },
    dayOverDayChange: null,
    trend: null,
  }
}

function previousDate(date: string) {
  const previous = new Date(`${date}T00:00:00.000Z`)
  previous.setUTCDate(previous.getUTCDate() - 1)
  return previous.toISOString().slice(0, 10)
}

function regressionSlope(values: readonly number[]) {
  const count = values.length
  const sumX = (count * (count - 1)) / 2
  const sumXX = (count * (count - 1) * (2 * count - 1)) / 6
  const sumY = values.reduce((sum, value) => sum + value, 0)
  const sumXY = values.reduce((sum, value, index) => sum + index * value, 0)
  const denominator = count * sumXX - sumX * sumX
  return denominator ? (count * sumXY - sumX * sumY) / denominator : 0
}

/**
 * Convert provider-normalized daily inputs into features. The function has no
 * dependency on the demo fixture and accepts either raw samples or a provider's
 * already-aggregated median with its valid/expected count metadata.
 */
export function extractWearableFeatures(readings: readonly WearableDailyInput[]): WearableFeatureExtractionResult {
  const byDate = new Map<string, WearableDailyInput>()
  const duplicateDates = new Set<string>()
  let invalidDateRows = 0

  for (const reading of readings) {
    if (!isIsoDate(reading.date)) {
      invalidDateRows += 1
      continue
    }
    if (byDate.has(reading.date)) {
      duplicateDates.add(reading.date)
      continue
    }
    byDate.set(reading.date, reading)
  }

  for (const duplicateDate of duplicateDates) byDate.delete(duplicateDate)

  const dailyFeatures = [...byDate.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, reading]): WearableDailyFeature => ({
      date,
      ...(reading.source ? { source: reading.source } : {}),
      ...(reading.provenance ? { provenance: reading.provenance } : {}),
      heartRateBpm: readMetric(reading.heartRateBpm, 'heartRateBpm'),
      rmssd: readMetric(reading.rmssd, 'rmssd'),
      sleepDurationHours: readMetric(reading.sleepDurationHours, 'sleepDurationHours'),
      sleepEfficiency: readMetric(reading.sleepEfficiency, 'sleepEfficiency'),
      inBedDurationHours: readMetric(reading.inBedDurationHours, 'inBedDurationHours'),
      sleepLatencyHours: readMetric(reading.sleepLatencyHours, 'sleepLatencyHours'),
      wasoMinutes: readMetric(reading.wasoMinutes, 'wasoMinutes'),
      nightAwakeningCount: readMetric(reading.nightAwakeningCount, 'nightAwakeningCount'),
      steps: readMetric(reading.steps, 'steps'),
    }))

  const featureByDate = new Map(dailyFeatures.map((feature) => [feature.date, feature]))
  for (const feature of dailyFeatures) {
    for (const key of featureKeys) {
      const current = feature[key]
      const currentValue = current.dailyMedian
      if (currentValue === null) continue

      const priorDate = previousDate(feature.date)
      const priorValue = featureByDate.get(priorDate)?.[key].dailyMedian
      if (priorValue !== undefined && priorValue !== null) current.dayOverDayChange = currentValue - priorValue

      const consecutiveValues: number[] = [currentValue]
      let cursorDate = feature.date
      while (true) {
        cursorDate = previousDate(cursorDate)
        const previousFeature = featureByDate.get(cursorDate)
        const previousValue = previousFeature?.[key].dailyMedian
        if (previousValue === undefined || previousValue === null) break
        consecutiveValues.unshift(previousValue)
      }

      if (consecutiveValues.length >= MIN_CONSECUTIVE_DAYS_FOR_TREND) {
        const startDate = new Date(`${feature.date}T00:00:00.000Z`)
        startDate.setUTCDate(startDate.getUTCDate() - consecutiveValues.length + 1)
        current.trend = {
          method: 'linear-regression',
          slopePerDay: regressionSlope(consecutiveValues),
          startDate: startDate.toISOString().slice(0, 10),
          endDate: feature.date,
          consecutiveValidDays: consecutiveValues.length,
        }
      }
    }
  }

  return {
    dailyFeatures,
    excluded: {
      invalidDateRows,
      duplicateDateGroups: duplicateDates.size,
    },
  }
}
