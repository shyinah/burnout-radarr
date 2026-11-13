import { createDemoData, type AppData } from './app-state'

const STORAGE_KEY = 'burnout-radarr-demo-v1'

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

export function resetAppData() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // The reset still restores the in-memory demo state if storage is unavailable.
  }
  return createDemoData()
}
