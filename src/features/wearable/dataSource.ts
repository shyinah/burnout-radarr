import type { WearableDailyInput, WearableMetricInput } from './extractFeatures'

export type WearableDailyReading = WearableDailyInput

export interface WearableDataSource {
  readonly mode: 'demo' | 'live'
  readonly name: string
  getDailyReadings(signal?: AbortSignal): Promise<readonly WearableDailyReading[]>
}

// Daily medians derived across the research cohort (no participant IDs or raw rows).
// HR/RMSSD values are medians of participant-level daily medians; sleep values are
// daily diary medians. Counts are contributors with valid measurements; steps are
// omitted because the source coverage was sparse.
const cohortMedian = (value: number, validCount: number, countUnit: 'participants' | 'records'): WearableMetricInput => ({
  kind: 'median',
  value,
  validCount,
  expectedCount: 49,
  countUnit,
})

const anonymizedResearchFixture: readonly WearableDailyReading[] = [
  {
    date: '2021-03-26', heartRateBpm: cohortMedian(75.67, 41, 'participants'), rmssd: cohortMedian(75.77, 41, 'participants'),
    sleepDurationHours: cohortMedian(7.6667, 49, 'records'), sleepEfficiency: cohortMedian(0.9615, 49, 'records'),
    inBedDurationHours: cohortMedian(8, 49, 'records'), sleepLatencyHours: cohortMedian(0.3333, 49, 'records'), wasoMinutes: cohortMedian(0, 49, 'records'), nightAwakeningCount: cohortMedian(0, 49, 'records'),
  },
  {
    date: '2021-03-27', heartRateBpm: cohortMedian(75.81, 44, 'participants'), rmssd: cohortMedian(74.35, 44, 'participants'),
    sleepDurationHours: cohortMedian(8.5, 49, 'records'), sleepEfficiency: cohortMedian(0.9741, 49, 'records'),
    inBedDurationHours: cohortMedian(9.1667, 49, 'records'), sleepLatencyHours: cohortMedian(0.25, 49, 'records'), wasoMinutes: cohortMedian(0, 48, 'records'), nightAwakeningCount: cohortMedian(0, 49, 'records'),
  },
  {
    date: '2021-03-28', heartRateBpm: cohortMedian(76, 47, 'participants'), rmssd: cohortMedian(65.73, 47, 'participants'),
    sleepDurationHours: cohortMedian(8.5, 49, 'records'), sleepEfficiency: cohortMedian(0.9574, 49, 'records'),
    inBedDurationHours: cohortMedian(9.3333, 49, 'records'), sleepLatencyHours: cohortMedian(0.3333, 49, 'records'), wasoMinutes: cohortMedian(0, 48, 'records'), nightAwakeningCount: cohortMedian(0, 49, 'records'),
  },
  {
    date: '2021-03-29', heartRateBpm: cohortMedian(77.45, 46, 'participants'), rmssd: cohortMedian(72.82, 46, 'participants'),
    sleepDurationHours: cohortMedian(7.0833, 49, 'records'), sleepEfficiency: cohortMedian(0.9429, 49, 'records'),
    inBedDurationHours: cohortMedian(7.75, 49, 'records'), sleepLatencyHours: cohortMedian(0.5, 49, 'records'), wasoMinutes: cohortMedian(0, 49, 'records'), nightAwakeningCount: cohortMedian(0, 49, 'records'),
  },
  {
    date: '2021-03-30', heartRateBpm: cohortMedian(79.58, 45, 'participants'), rmssd: cohortMedian(76.37, 45, 'participants'),
    sleepDurationHours: cohortMedian(7.5833, 49, 'records'), sleepEfficiency: cohortMedian(0.9524, 49, 'records'),
    inBedDurationHours: cohortMedian(8.3333, 49, 'records'), sleepLatencyHours: cohortMedian(0.4, 49, 'records'), wasoMinutes: cohortMedian(0, 49, 'records'), nightAwakeningCount: cohortMedian(0, 49, 'records'),
  },
  {
    date: '2021-03-31', heartRateBpm: cohortMedian(77.3, 47, 'participants'), rmssd: cohortMedian(74.02, 47, 'participants'),
    sleepDurationHours: cohortMedian(7.5, 49, 'records'), sleepEfficiency: cohortMedian(0.9559, 49, 'records'),
    inBedDurationHours: cohortMedian(8.25, 49, 'records'), sleepLatencyHours: cohortMedian(0.3333, 49, 'records'), wasoMinutes: cohortMedian(0, 49, 'records'), nightAwakeningCount: cohortMedian(0, 49, 'records'),
  },
  {
    date: '2021-04-01', heartRateBpm: cohortMedian(78.93, 48, 'participants'), rmssd: cohortMedian(75.84, 48, 'participants'),
    sleepDurationHours: cohortMedian(7.75, 49, 'records'), sleepEfficiency: cohortMedian(0.9545, 49, 'records'),
    inBedDurationHours: cohortMedian(8.0833, 49, 'records'), sleepLatencyHours: cohortMedian(0.3333, 49, 'records'), wasoMinutes: cohortMedian(0, 49, 'records'), nightAwakeningCount: cohortMedian(0, 49, 'records'),
  },
]

export const demoWearableDataSource: WearableDataSource = {
  mode: 'demo',
  name: 'Anonymized research aggregates',
  async getDailyReadings(signal) {
    if (signal?.aborted) throw new DOMException('The wearable demo request was cancelled.', 'AbortError')
    return anonymizedResearchFixture.map((reading) => ({ ...reading }))
  },
}

// Swap this source for a provider adapter later; the page consumes normalized readings only.
export const activeWearableDataSource: WearableDataSource = demoWearableDataSource
