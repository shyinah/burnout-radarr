console.log('Preload script injected successfully');
import { contextBridge, ipcRenderer } from 'electron';
/**
 * Activity Tracker Preload Bridge
 *
 * Safely bridges Electron's IPC channels to the renderer process via contextBridge.
 * Adheres strictly to isolation rules: renderer never gets direct Node/Electron access.
 */
const activityTrackerAPI = {
    onActivityUpdate: (callback) => {
        const handler = (_event, metrics) => {
            callback(metrics);
        };
        ipcRenderer.on('activity:update', handler);
        return () => {
            ipcRenderer.removeListener('activity:update', handler);
        };
    },
    getMetrics: () => {
        return ipcRenderer.invoke('activity:get-metrics');
    },
    startTracking: () => {
        return ipcRenderer.invoke('activity:start');
    },
    stopTracking: () => {
        return ipcRenderer.invoke('activity:stop');
    },
    resetMetrics: () => {
        return ipcRenderer.invoke('activity:reset');
    },
};
// Safely expose to renderer under both 'electron' and 'api' namespaces
try {
    contextBridge.exposeInMainWorld('electron', {
        activityTracker: activityTrackerAPI,
    });
    contextBridge.exposeInMainWorld('api', {
        activityTracker: activityTrackerAPI,
    });
}
catch {
    // If running in a context where contextBridge is already defined or partially set up
    if (typeof window !== 'undefined') {
        const win = window;
        win.electron = {
            ...(win.electron || {}),
            activityTracker: activityTrackerAPI,
        };
        win.api = {
            ...(win.api || {}),
            activityTracker: activityTrackerAPI,
        };
    }
}
