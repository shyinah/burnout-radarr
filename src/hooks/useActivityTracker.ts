import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActivityMetrics } from '../types/activity.ts'

function emptyMetrics(startedAt: number | null = null): ActivityMetrics {
  return { keyPressCount: 0, mouseClickCount: 0, startedAt, elapsedSeconds: 0 }
}

export interface UseActivityTrackerReturn {
  metrics: ActivityMetrics
  isTracking: boolean
  start: () => void
  stop: () => ActivityMetrics | null
  reset: () => void
}

/**
 * Opt-in, tab-scoped tracking. The key handler counts keydown events without
 * inspecting event properties; the mouse handler counts primary mouse clicks
 * without reading targets, coordinates, or other event contents.
 */
export function useActivityTracker(): UseActivityTrackerReturn {
  const [metrics, setMetrics] = useState<ActivityMetrics>(() => emptyMetrics())
  const [isTracking, setIsTracking] = useState(false)
  const startedAtRef = useRef<number | null>(null)
  const metricsRef = useRef(metrics)

  const start = useCallback(() => {
    const startedAt = Date.now()
    const nextMetrics = emptyMetrics(startedAt)
    startedAtRef.current = startedAt
    metricsRef.current = nextMetrics
    setMetrics(nextMetrics)
    setIsTracking(true)
  }, [])

  const stop = useCallback(() => {
    const startedAt = startedAtRef.current
    if (startedAt === null) return null
    const finalMetrics = { ...metricsRef.current, startedAt, elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000) }
    metricsRef.current = finalMetrics
    setMetrics(finalMetrics)
    startedAtRef.current = null
    setIsTracking(false)
    return finalMetrics
  }, [])

  const reset = useCallback(() => {
    if (startedAtRef.current !== null) return
    const nextMetrics = emptyMetrics()
    metricsRef.current = nextMetrics
    setMetrics(nextMetrics)
  }, [])

  useEffect(() => {
    if (!isTracking) return

    const countKeyPress = () => {
      if (startedAtRef.current === null) return
      if (document.visibilityState !== 'visible') return
      const nextMetrics = { ...metricsRef.current, keyPressCount: metricsRef.current.keyPressCount + 1 }
      metricsRef.current = nextMetrics
      setMetrics(nextMetrics)
    }

    const countMouseClick = (event: MouseEvent) => {
      if (startedAtRef.current === null) return
      if (typeof PointerEvent === 'undefined' || !(event instanceof PointerEvent)) return
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      if (document.visibilityState !== 'visible') return
      const nextMetrics = { ...metricsRef.current, mouseClickCount: metricsRef.current.mouseClickCount + 1 }
      metricsRef.current = nextMetrics
      setMetrics(nextMetrics)
    }

    const interval = window.setInterval(() => {
      const startedAt = startedAtRef.current
      if (startedAt === null) return
      const nextMetrics = { ...metricsRef.current, elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000) }
      metricsRef.current = nextMetrics
      setMetrics(nextMetrics)
    }, 1000)

    window.addEventListener('keydown', countKeyPress)
    window.addEventListener('click', countMouseClick)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('keydown', countKeyPress)
      window.removeEventListener('click', countMouseClick)
    }
  }, [isTracking])

  return { metrics, isTracking, start, stop, reset }
}
