/**
 * Activity Tracker Data Contracts
 * 
 * Defines the metrics and IPC communication interface for background
 * keyboard and mouse tracking used in Cognitive Fatigue Index (CFI) analysis.
 */

export interface ActivityMetrics {
  /** Keystrokes per minute calculated across a rolling 60-second window */
  keystrokesPerMinute: number
  /** Mouse clicks per minute calculated across a rolling 60-second window */
  clicksPerMinute: number
  /** Total cumulative keystrokes recorded during the active session */
  totalKeystrokes: number
  /** Total cumulative mouse clicks recorded during the active session */
  totalClicks: number
  /** Epoch timestamp (ms) of the most recent user interaction (keyboard or mouse) */
  lastActiveTimestamp: number
  /** Whether the user has produced input within the activity threshold (default 15s) */
  isActive: boolean
  /** Total elapsed duration of the tracking session in seconds */
  sessionDurationSeconds: number
  /** Epoch timestamp (ms) when this metric snapshot was produced */
  sampleTimestamp: number
}

export interface ActivityTrackerAPI {
  /** Subscribe to real-time metric broadcasts (emitted periodically, e.g. every 1s) */
  onActivityUpdate: (callback: (metrics: ActivityMetrics) => void) => () => void
  /** Retrieve the latest activity metrics snapshot on demand */
  getMetrics: () => Promise<ActivityMetrics>
  /** Start the global input tracker */
  startTracking: () => Promise<boolean>
  /** Stop the global input tracker */
  stopTracking: () => Promise<boolean>
  /** Reset session counters and clear the sliding window */
  resetMetrics: () => Promise<void>
}
