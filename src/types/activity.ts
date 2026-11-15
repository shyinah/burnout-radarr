/** Count-only browser-app activity metrics, held in memory for the opt-in tracking session. */

export interface ActivityMetrics {
  keyPressCount: number
  mouseClickCount: number
  /** Epoch start time (ms); null until tracking begins. */
  startedAt: number | null
  elapsedSeconds: number
}

export interface BrowserActivitySessionInput {
  id: string
  source: 'browser-tab'
  startedAt: string
  endedAt: string
  durationSeconds: number
  keyPressCount: number
  mouseClickCount: number
}

export interface BrowserActivitySession extends BrowserActivitySessionInput {
  userId: string
  createdAt: string
}

/** Local fallback deliberately has no user ID and is never automatically uploaded. */
export interface LocalBrowserActivitySession extends BrowserActivitySessionInput {
  savedAt: string
}
