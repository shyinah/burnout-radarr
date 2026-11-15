import { createDemoData, type AppData, type CheckInRecord, type DailyCheckIn } from './app-state.ts'

const STORAGE_KEY = 'burnout-radarr-demo-v1'
const GUEST_BACKUP_KEY = 'burnout-radarr-guest-backup-v1'

type StoredAppData = Partial<Omit<AppData, 'checkIns' | 'legacyDailyCheckIns'>> & {
  checkIns?: unknown
  legacyDailyCheckIns?: unknown
}

function isCheckInRecord(value: unknown): value is CheckInRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<CheckInRecord>
  return typeof record.id === 'string' &&
    (record.period === 'morning' || record.period === 'evening') &&
    typeof record.date === 'string' &&
    typeof record.recordedAt === 'string' &&
    record.schemaVersion === 1 &&
    !!record.answers && typeof record.answers === 'object' && !Array.isArray(record.answers)
}

function isLegacyDailyCheckIn(value: unknown): value is DailyCheckIn {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<DailyCheckIn>
  return typeof record.id === 'string' && typeof record.recordedAt === 'string' &&
    typeof record.sleepHours === 'number' && typeof record.fatigue === 'number' && typeof record.note === 'string'
}

function normalizeStoredData(parsed: StoredAppData): AppData {
  const defaults = createDemoData()
  const { checkIns: storedCheckIns, legacyDailyCheckIns: storedLegacyCheckIns, ...rest } = parsed
  const checkInValues = Array.isArray(storedCheckIns) ? storedCheckIns : []
  const checkIns = checkInValues.filter(isCheckInRecord)
  const legacyDailyCheckIns = [
    ...(Array.isArray(storedLegacyCheckIns) ? storedLegacyCheckIns.filter(isLegacyDailyCheckIn) : []),
    ...checkInValues.filter(isLegacyDailyCheckIn),
  ]

  return {
    ...defaults,
    ...rest,
    preferences: { ...defaults.preferences, ...rest.preferences },
    workLogs: Array.isArray(rest.workLogs) ? rest.workLogs : [],
    checkIns,
    legacyDailyCheckIns,
  }
}

export function loadAppData(): AppData {
  if (typeof window === 'undefined') return createDemoData()

  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (!value) return createDemoData()
    const parsed = JSON.parse(value) as StoredAppData
    if (!Array.isArray(parsed.sessions) || !parsed.preferences || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.projects)) {
      return createDemoData()
    }
    return normalizeStoredData(parsed)
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
      const parsed = JSON.parse(backup) as StoredAppData
      if (Array.isArray(parsed.sessions) && parsed.preferences) {
        return normalizeStoredData(parsed)
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
