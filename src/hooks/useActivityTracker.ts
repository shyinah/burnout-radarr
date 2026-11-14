import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from 'react'
import type { ActivityMetrics, ActivityTrackerAPI } from '../types/activity.ts'

const INITIAL_METRICS: ActivityMetrics = {
  keystrokesPerMinute: 0,
  clicksPerMinute: 0,
  totalKeystrokes: 0,
  totalClicks: 0,
  lastActiveTimestamp: Date.now(),
  isActive: false,
  sessionDurationSeconds: 0,
  sampleTimestamp: Date.now(),
}

export interface UseActivityTrackerOptions {
  /** Whether tracking should start automatically on mount (default: true) */
  autoStart?: boolean
  /** Idle threshold in milliseconds to consider user inactive (default: 15000ms / 15s) */
  idleThresholdMs?: number
  /** Callback invoked on every metrics update */
  onUpdate?: (metrics: ActivityMetrics) => void
}

export interface UseActivityTrackerReturn {
  /** Real-time metrics snapshot */
  metrics: ActivityMetrics
  /** Shorthand: Keystrokes per minute (rolling 60s) */
  kpm: number
  /** Shorthand: Clicks per minute (rolling 60s) */
  cpm: number
  /** Whether the tracker is actively recording */
  isTracking: boolean
  /** Whether running inside Electron desktop environment with native global tracking */
  isElectron: boolean
  /** Start or resume activity tracking */
  start: () => Promise<void>
  /** Stop or pause activity tracking */
  stop: () => Promise<void>
  /** Reset session counters and sliding window */
  reset: () => Promise<void>
}

function getElectronTrackerAPI(): ActivityTrackerAPI | undefined {
  if (typeof window === 'undefined') return undefined
  return window.electron?.activityTracker ?? window.api?.activityTracker
}

function checkIsElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(getElectronTrackerAPI())
}

const emptySubscribe = () => () => {}

/**
 * Custom React hook for subscribing to background keyboard and mouse activity metrics.
 * 
 * In Electron: Connects to the main process via IPC exposed in preload (window.electron.activityTracker).
 * In Browser (Vite dev): Gracefully falls back to window-level events so UI development works seamlessly.
 */
export function useActivityTracker(options: UseActivityTrackerOptions = {}): UseActivityTrackerReturn {
  const { autoStart = true, idleThresholdMs = 15000, onUpdate } = options

  const [metrics, setMetrics] = useState<ActivityMetrics>(INITIAL_METRICS)
  const [isTracking, setIsTracking] = useState<boolean>(autoStart)

  // Derived synchronously without triggering cascading render effects
  const isElectron = useSyncExternalStore(emptySubscribe, checkIsElectron, () => false)

  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  // Start tracking
  const start = useCallback(async () => {
    const api = getElectronTrackerAPI()
    if (api) {
      await api.startTracking()
    }
    setIsTracking(true)
  }, [])

  // Stop tracking
  const stop = useCallback(async () => {
    const api = getElectronTrackerAPI()
    if (api) {
      await api.stopTracking()
    }
    setIsTracking(false)
  }, [])

  // Reset tracking
  const reset = useCallback(async () => {
    const api = getElectronTrackerAPI()
    if (api) {
      await api.resetMetrics()
    }
    setMetrics({
      ...INITIAL_METRICS,
      lastActiveTimestamp: Date.now(),
      sampleTimestamp: Date.now(),
    })
  }, [])

  useEffect(() => {
    const api = getElectronTrackerAPI()

    if (api) {
      // 1. Fetch initial snapshot
      api.getMetrics().then((initial) => {
        if (initial) {
          setMetrics(initial)
          onUpdateRef.current?.(initial)
        }
      }).catch((err) => {
        console.warn('[ActivityTracker] Failed to get initial metrics:', err)
      })

      // 2. Subscribe to real-time IPC updates from Electron main process
      const unsubscribe = api.onActivityUpdate((newMetrics) => {
        setMetrics(newMetrics)
        onUpdateRef.current?.(newMetrics)
      })

      if (autoStart) {
        api.startTracking().catch(console.error)
      }

      return () => {
        unsubscribe()
      }
    }

    // --- Browser Fallback Mode (For Vite development outside Electron) ---
    if (!isTracking) return

    const keyTimestamps: number[] = []
    const clickTimestamps: number[] = []
    let totalKeys = 0
    let totalClicks = 0
    let lastActive = Date.now()
    const sessionStart = Date.now()

    const onKeyDown = () => {
      const now = Date.now()
      keyTimestamps.push(now)
      totalKeys += 1
      lastActive = now
    }

    const onMouseDown = () => {
      const now = Date.now()
      clickTimestamps.push(now)
      totalClicks += 1
      lastActive = now
    }

    window.addEventListener('keydown', onKeyDown, { passive: true })
    window.addEventListener('mousedown', onMouseDown, { passive: true })

    const interval = window.setInterval(() => {
      const now = Date.now()
      const windowStart = now - 60000

      while (keyTimestamps.length > 0 && keyTimestamps[0] < windowStart) {
        keyTimestamps.shift()
      }
      while (clickTimestamps.length > 0 && clickTimestamps[0] < windowStart) {
        clickTimestamps.shift()
      }

      const updated: ActivityMetrics = {
        keystrokesPerMinute: keyTimestamps.length,
        clicksPerMinute: clickTimestamps.length,
        totalKeystrokes: totalKeys,
        totalClicks: totalClicks,
        lastActiveTimestamp: lastActive,
        isActive: now - lastActive < idleThresholdMs,
        sessionDurationSeconds: Math.floor((now - sessionStart) / 1000),
        sampleTimestamp: now,
      }

      setMetrics(updated)
      onUpdateRef.current?.(updated)
    }, 1000)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onMouseDown)
      window.clearInterval(interval)
    }
  }, [autoStart, isTracking, idleThresholdMs])

  return {
    metrics,
    kpm: metrics.keystrokesPerMinute,
    cpm: metrics.clicksPerMinute,
    isTracking,
    isElectron,
    start,
    stop,
    reset,
  }
}
