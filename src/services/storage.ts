import { createDemoData, type AppData } from './app-state.ts'

const STORAGE_KEY = 'burnout-radarr-demo-v1'
const GUEST_BACKUP_KEY = 'burnout-radarr-guest-backup-v1'

export function loadAppData(): AppData {
  if (typeof window === 'undefined') return createDemoData()

  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (!value) return createDemoData()
    const parsed = JSON.parse(value) as Partial<AppData>
    if (!Array.isArray(parsed.sessions) || !parsed.preferences || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.projects)) {
      return createDemoData()
    }
    return {
      ...createDemoData(),
      ...parsed,
      preferences: { ...createDemoData().preferences, ...parsed.preferences },
      workLogs: Array.isArray(parsed.workLogs) ? parsed.workLogs : [],
    }
  } catch {
    return createDemoData()
  }
}

export function saveAppData(data: AppData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage can be unavailable in private browsing; in-memory app state still works.
  }
}

/**
 * Backs up current local/guest data before logging into a cloud account.
 */
export function backupGuestData(data: AppData) {
  try {
    window.localStorage.setItem(GUEST_BACKUP_KEY, JSON.stringify(data))
  } catch {
    // Storage can be unavailable in private browsing
  }
}

/**
 * Restores guest data upon logout so local demo and offline sessions are never lost.
 */
export function restoreGuestData(): AppData {
  try {
    const backup = window.localStorage.getItem(GUEST_BACKUP_KEY)
    if (backup) {
      const parsed = JSON.parse(backup) as Partial<AppData>
      if (Array.isArray(parsed.sessions) && parsed.preferences) {
        return {
          ...createDemoData(),
          ...parsed,
          preferences: { ...createDemoData().preferences, ...parsed.preferences },
          workLogs: Array.isArray(parsed.workLogs) ? parsed.workLogs : [],
        }
      }
    }
  } catch {
    // Fall back to clean default demo data
  }
  return createDemoData()
}

export function resetAppData() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(GUEST_BACKUP_KEY)
  } catch {
    // The reset still restores the in-memory demo state if storage is unavailable.
  }
  return createDemoData()
}
