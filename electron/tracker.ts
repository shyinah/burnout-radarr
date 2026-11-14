import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import type { ActivityMetrics } from '../src/types/activity.ts'

const require = createRequire(import.meta.url)

export interface TrackerOptions {
  /** Idle threshold in ms to consider the user inactive (default: 15,000ms) */
  idleThresholdMs?: number
  /** Metric emission interval in ms (default: 1,000ms) */
  emitIntervalMs?: number
}

interface NativeHookInstance {
  on(event: string, listener: (...args: unknown[]) => void): void
  start?(): void
  stop?(): void
}

/**
 * GlobalInputTracker
 * 
 * Runs entirely in the Electron main process without blocking the UI thread.
 * Listens to operating-system-level keyboard and mouse events using native global hooks
 * (e.g. uiohook-napi) and computes real-time sliding-window metrics (KPM and CPM).
 */
export class GlobalInputTracker extends EventEmitter {
  private keyTimestamps: number[] = []
  private clickTimestamps: number[] = []
  private totalKeys = 0
  private totalClicks = 0
  private sessionStartTime: number = Date.now()
  private lastActiveTimestamp: number = Date.now()
  private isRunning = false
  private emitTimer: NodeJS.Timeout | null = null
  private idleThresholdMs: number
  private emitIntervalMs: number
  // Native hook reference
  private hookInstance: NativeHookInstance | null = null

  constructor(options: TrackerOptions = {}) {
    super()
    this.idleThresholdMs = options.idleThresholdMs ?? 15000
    this.emitIntervalMs = options.emitIntervalMs ?? 1000
  }

  /**
   * Initializes the native input hook library if available.
   */
  private initNativeHook(): boolean {
    if (this.hookInstance) return true

    try {
      // Dynamic import to prevent crash if native binaries are not yet compiled
      const uiohookModule = require('uiohook-napi') as { uIOhook?: NativeHookInstance } | NativeHookInstance
      this.hookInstance = ('uIOhook' in uiohookModule && uiohookModule.uIOhook)
        ? uiohookModule.uIOhook
        : (uiohookModule as NativeHookInstance)

      if (this.hookInstance && typeof this.hookInstance.on === 'function') {
        this.hookInstance.on('keydown', () => this.recordKeystroke())
        this.hookInstance.on('click', () => this.recordClick())
        return true
      }
    } catch {
      console.warn(
        '[ActivityTracker] uiohook-napi not loaded. Run "npm install uiohook-napi" for native system-wide input tracking.'
      )
    }
    return false
  }

  public recordKeystroke(): void {
    if (!this.isRunning) return
    const now = Date.now()
    this.keyTimestamps.push(now)
    this.totalKeys += 1
    this.lastActiveTimestamp = now
  }

  public recordClick(): void {
    if (!this.isRunning) return
    const now = Date.now()
    this.clickTimestamps.push(now)
    this.totalClicks += 1
    this.lastActiveTimestamp = now
  }

  /**
   * Start tracking global inputs.
   */
  public start(): boolean {
    if (this.isRunning) return true
    this.isRunning = true
    this.sessionStartTime = Date.now()
    this.lastActiveTimestamp = Date.now()

    this.initNativeHook()
    if (this.hookInstance && typeof this.hookInstance.start === 'function') {
      try {
        this.hookInstance.start()
      } catch (err) {
        console.warn('[ActivityTracker] Failed to start native hook:', err)
      }
    }

    // Periodic 1-second sliding-window aggregation and emission
    this.emitTimer = setInterval(() => {
      const metrics = this.getMetrics()
      this.emit('update', metrics)
    }, this.emitIntervalMs)

    return true
  }

  /**
   * Stop tracking global inputs.
   */
  public stop(): boolean {
    if (!this.isRunning) return true
    this.isRunning = false

    if (this.emitTimer) {
      clearInterval(this.emitTimer)
      this.emitTimer = null
    }

    if (this.hookInstance && typeof this.hookInstance.stop === 'function') {
      try {
        this.hookInstance.stop()
      } catch (err) {
        console.warn('[ActivityTracker] Failed to stop native hook:', err)
      }
    }

    return true
  }

  /**
   * Reset session totals and clear the sliding window.
   */
  public reset(): void {
    const now = Date.now()
    this.keyTimestamps = []
    this.clickTimestamps = []
    this.totalKeys = 0
    this.totalClicks = 0
    this.sessionStartTime = now
    this.lastActiveTimestamp = now
    this.emit('update', this.getMetrics())
  }

  /**
   * Calculate current metrics across the sliding 60-second window.
   */
  public getMetrics(): ActivityMetrics {
    const now = Date.now()
    const windowStart = now - 60000

    // Prune timestamps older than 60 seconds
    while (this.keyTimestamps.length > 0 && this.keyTimestamps[0] < windowStart) {
      this.keyTimestamps.shift()
    }
    while (this.clickTimestamps.length > 0 && this.clickTimestamps[0] < windowStart) {
      this.clickTimestamps.shift()
    }

    const elapsed = this.isRunning
      ? Math.floor((now - this.sessionStartTime) / 1000)
      : 0

    return {
      keystrokesPerMinute: this.keyTimestamps.length,
      clicksPerMinute: this.clickTimestamps.length,
      totalKeystrokes: this.totalKeys,
      totalClicks: this.totalClicks,
      lastActiveTimestamp: this.lastActiveTimestamp,
      isActive: this.isRunning && now - this.lastActiveTimestamp < this.idleThresholdMs,
      sessionDurationSeconds: elapsed,
      sampleTimestamp: now,
    }
  }

  public get isActive(): boolean {
    return this.isRunning
  }
}
