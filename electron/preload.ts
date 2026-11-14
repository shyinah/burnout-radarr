console.log('Preload script injected successfully')

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { ActivityMetrics, ActivityTrackerAPI } from '../src/types/activity.ts'

/**
 * Activity Tracker Preload Bridge
 * 
 * Safely bridges Electron's IPC channels to the renderer process via contextBridge.
 * Adheres strictly to isolation rules: renderer never gets direct Node/Electron access.
 */
const activityTrackerAPI: ActivityTrackerAPI = {
  onActivityUpdate: (callback: (metrics: ActivityMetrics) => void) => {
    const handler = (_event: IpcRendererEvent, metrics: ActivityMetrics) => {
      callback(metrics)
    }
    ipcRenderer.on('activity:update', handler)
    return () => {
      ipcRenderer.removeListener('activity:update', handler)
    }
  },

  getMetrics: (): Promise<ActivityMetrics> => {
    return ipcRenderer.invoke('activity:get-metrics')
  },

  startTracking: (): Promise<boolean> => {
    return ipcRenderer.invoke('activity:start')
  },

  stopTracking: (): Promise<boolean> => {
    return ipcRenderer.invoke('activity:stop')
  },

  resetMetrics: (): Promise<void> => {
    return ipcRenderer.invoke('activity:reset')
  },
}

// Safely expose to renderer under both 'electron' and 'api' namespaces
try {
  contextBridge.exposeInMainWorld('electron', {
    activityTracker: activityTrackerAPI,
  })

  contextBridge.exposeInMainWorld('api', {
    activityTracker: activityTrackerAPI,
  })
} catch {
  // If running in a context where contextBridge is already defined or partially set up
  if (typeof window !== 'undefined') {
    const win = window as unknown as Record<string, Record<string, unknown>>
    win.electron = {
      ...(win.electron || {}),
      activityTracker: activityTrackerAPI,
    }
    win.api = {
      ...(win.api || {}),
      activityTracker: activityTrackerAPI,
    }
  }
}
