import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
/**
 * GlobalInputTracker
 *
 * Runs entirely in the Electron main process without blocking the UI thread.
 * Listens to operating-system-level keyboard and mouse events using native global hooks
 * (e.g. uiohook-napi) and computes real-time sliding-window metrics (KPM and CPM).
 */
export class GlobalInputTracker extends EventEmitter {
    keyTimestamps = [];
    clickTimestamps = [];
    totalKeys = 0;
    totalClicks = 0;
    sessionStartTime = Date.now();
    lastActiveTimestamp = Date.now();
    isRunning = false;
    emitTimer = null;
    idleThresholdMs;
    emitIntervalMs;
    // Native hook reference
    hookInstance = null;
    constructor(options = {}) {
        super();
        this.idleThresholdMs = options.idleThresholdMs ?? 15000;
        this.emitIntervalMs = options.emitIntervalMs ?? 1000;
    }
    /**
     * Initializes the native input hook library if available.
     */
    initNativeHook() {
        if (this.hookInstance)
            return true;
        try {
            // Dynamic import to prevent crash if native binaries are not yet compiled
            const uiohookModule = require('uiohook-napi');
            this.hookInstance = ('uIOhook' in uiohookModule && uiohookModule.uIOhook)
                ? uiohookModule.uIOhook
                : uiohookModule;
            if (this.hookInstance && typeof this.hookInstance.on === 'function') {
                this.hookInstance.on('keydown', () => this.recordKeystroke());
                this.hookInstance.on('click', () => this.recordClick());
                return true;
            }
        }
        catch {
            console.warn('[ActivityTracker] uiohook-napi not loaded. Run "npm install uiohook-napi" for native system-wide input tracking.');
        }
        return false;
    }
    recordKeystroke() {
        if (!this.isRunning)
            return;
        const now = Date.now();
        this.keyTimestamps.push(now);
        this.totalKeys += 1;
        this.lastActiveTimestamp = now;
    }
    recordClick() {
        if (!this.isRunning)
            return;
        const now = Date.now();
        this.clickTimestamps.push(now);
        this.totalClicks += 1;
        this.lastActiveTimestamp = now;
    }
    /**
     * Start tracking global inputs.
     */
    start() {
        if (this.isRunning)
            return true;
        this.isRunning = true;
        this.sessionStartTime = Date.now();
        this.lastActiveTimestamp = Date.now();
        this.initNativeHook();
        if (this.hookInstance && typeof this.hookInstance.start === 'function') {
            try {
                this.hookInstance.start();
            }
            catch (err) {
                console.warn('[ActivityTracker] Failed to start native hook:', err);
            }
        }
        // Periodic 1-second sliding-window aggregation and emission
        this.emitTimer = setInterval(() => {
            const metrics = this.getMetrics();
            this.emit('update', metrics);
        }, this.emitIntervalMs);
        return true;
    }
    /**
     * Stop tracking global inputs.
     */
    stop() {
        if (!this.isRunning)
            return true;
        this.isRunning = false;
        if (this.emitTimer) {
            clearInterval(this.emitTimer);
            this.emitTimer = null;
        }
        if (this.hookInstance && typeof this.hookInstance.stop === 'function') {
            try {
                this.hookInstance.stop();
            }
            catch (err) {
                console.warn('[ActivityTracker] Failed to stop native hook:', err);
            }
        }
        return true;
    }
    /**
     * Reset session totals and clear the sliding window.
     */
    reset() {
        const now = Date.now();
        this.keyTimestamps = [];
        this.clickTimestamps = [];
        this.totalKeys = 0;
        this.totalClicks = 0;
        this.sessionStartTime = now;
        this.lastActiveTimestamp = now;
        this.emit('update', this.getMetrics());
    }
    /**
     * Calculate current metrics across the sliding 60-second window.
     */
    getMetrics() {
        const now = Date.now();
        const windowStart = now - 60000;
        // Prune timestamps older than 60 seconds
        while (this.keyTimestamps.length > 0 && this.keyTimestamps[0] < windowStart) {
            this.keyTimestamps.shift();
        }
        while (this.clickTimestamps.length > 0 && this.clickTimestamps[0] < windowStart) {
            this.clickTimestamps.shift();
        }
        const elapsed = this.isRunning
            ? Math.floor((now - this.sessionStartTime) / 1000)
            : 0;
        return {
            keystrokesPerMinute: this.keyTimestamps.length,
            clicksPerMinute: this.clickTimestamps.length,
            totalKeystrokes: this.totalKeys,
            totalClicks: this.totalClicks,
            lastActiveTimestamp: this.lastActiveTimestamp,
            isActive: this.isRunning && now - this.lastActiveTimestamp < this.idleThresholdMs,
            sessionDurationSeconds: elapsed,
            sampleTimestamp: now,
        };
    }
    get isActive() {
        return this.isRunning;
    }
}
