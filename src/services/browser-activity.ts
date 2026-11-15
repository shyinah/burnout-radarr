import { isSupabaseConfigured, supabase } from './supabase.ts'
import type { ActivityMetrics, BrowserActivitySession, BrowserActivitySessionInput, LocalBrowserActivitySession } from '../types/activity.ts'

const LOCAL_ACTIVITY_KEY = 'burnout-radarr-browser-activity-local-v1'

export interface BrowserActivityServiceResult<T> {
  data: T | null
  error?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function isValidInput(value: unknown): value is BrowserActivitySessionInput {
  return isRecord(value) &&
    typeof value.id === 'string' && value.id.trim() !== '' &&
    value.source === 'browser-tab' &&
    isTimestamp(value.startedAt) && isTimestamp(value.endedAt) &&
    Date.parse(value.endedAt) >= Date.parse(value.startedAt) &&
    typeof value.durationSeconds === 'number' && Number.isSafeInteger(value.durationSeconds) && value.durationSeconds >= 0 &&
    typeof value.keyPressCount === 'number' && Number.isSafeInteger(value.keyPressCount) && value.keyPressCount >= 0 &&
    typeof value.mouseClickCount === 'number' && Number.isSafeInteger(value.mouseClickCount) && value.mouseClickCount >= 0
}

function parseCloudActivitySession(value: unknown): BrowserActivitySession {
  if (!isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.user_id !== 'string' ||
    value.source !== 'browser-tab' ||
    !isTimestamp(value.started_at) ||
    !isTimestamp(value.ended_at) ||
    Date.parse(value.ended_at) < Date.parse(value.started_at) ||
    typeof value.duration_seconds !== 'number' || !Number.isSafeInteger(value.duration_seconds) || value.duration_seconds < 0 ||
    typeof value.key_press_count !== 'number' || !Number.isSafeInteger(value.key_press_count) || value.key_press_count < 0 ||
    typeof value.mouse_click_count !== 'number' || !Number.isSafeInteger(value.mouse_click_count) || value.mouse_click_count < 0 ||
    !isTimestamp(value.created_at)) {
    throw new Error('The activity response contains an invalid session.')
  }
  return {
    id: value.id,
    userId: value.user_id,
    source: 'browser-tab',
    startedAt: value.started_at,
    endedAt: value.ended_at,
    durationSeconds: value.duration_seconds,
    keyPressCount: value.key_press_count,
    mouseClickCount: value.mouse_click_count,
    createdAt: value.created_at,
  }
}

async function getCurrentUserId(): Promise<BrowserActivityServiceResult<string>> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) return { data: null, error: 'Unable to verify the authenticated user.' }
    if (!data.user?.id) return { data: null, error: 'An authenticated user is required.' }
    return { data: data.user.id }
  } catch {
    return { data: null, error: 'Unable to verify the authenticated user.' }
  }
}

/** Loads only the active user's privacy-safe aggregate activity sessions; RLS also enforces ownership. */
export async function fetchBrowserActivitySessionsForCurrentUser(signal?: AbortSignal): Promise<BrowserActivityServiceResult<BrowserActivitySession[]>> {
  if (!isSupabaseConfigured) return { data: null, error: 'Supabase is not configured.' }
  const auth = await getCurrentUserId()
  if (!auth.data) return { data: null, error: auth.error ?? 'An authenticated user is required.' }

  try {
    const { data, error } = await supabase
      .from('browser_activity_sessions')
      .select('id, user_id, source, started_at, ended_at, duration_seconds, key_press_count, mouse_click_count, created_at')
      .eq('user_id', auth.data)
      .order('started_at', { ascending: false })
      .limit(100)
      .abortSignal(signal ?? new AbortController().signal)
    if (error) return { data: null, error: error.message }
    const rows: unknown = data ?? []
    if (!Array.isArray(rows)) return { data: null, error: 'The activity response is invalid.' }
    return { data: rows.map(parseCloudActivitySession) }
  } catch {
    return { data: null, error: 'Unable to load browser activity sessions.' }
  }
}

/** Inserts a tab-scoped aggregate using the current auth session; callers cannot supply an owner. */
export async function saveBrowserActivitySessionForCurrentUser(input: BrowserActivitySessionInput): Promise<BrowserActivityServiceResult<BrowserActivitySession>> {
  if (!isValidInput(input)) return { data: null, error: 'Browser activity session data is invalid.' }
  if (!isSupabaseConfigured) return { data: null, error: 'Supabase is not configured.' }
  const auth = await getCurrentUserId()
  if (!auth.data) return { data: null, error: auth.error ?? 'An authenticated user is required.' }

  try {
    const { data, error } = await supabase
      .from('browser_activity_sessions')
      .insert({
        id: input.id,
        user_id: auth.data,
        source: input.source,
        started_at: input.startedAt,
        ended_at: input.endedAt,
        duration_seconds: input.durationSeconds,
        key_press_count: input.keyPressCount,
        mouse_click_count: input.mouseClickCount,
      })
      .select('id, user_id, source, started_at, ended_at, duration_seconds, key_press_count, mouse_click_count, created_at')
      .single()
    if (error) return { data: null, error: error.message }
    return { data: parseCloudActivitySession(data) }
  } catch {
    return { data: null, error: 'Unable to save browser activity session.' }
  }
}

function isLocalActivitySession(value: unknown): value is LocalBrowserActivitySession {
  return isRecord(value) && isValidInput(value) && isTimestamp(value.savedAt)
}

/** Local records have no owner and are deliberately never auto-uploaded after login. */
export function loadLocalBrowserActivitySessions(): LocalBrowserActivitySession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_ACTIVITY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isLocalActivitySession) : []
  } catch {
    return []
  }
}

function storeLocalBrowserActivitySession(record: LocalBrowserActivitySession): boolean {
  if (typeof window === 'undefined') return false
  try {
    const current = loadLocalBrowserActivitySessions().filter((item) => item.id !== record.id)
    window.localStorage.setItem(LOCAL_ACTIVITY_KEY, JSON.stringify([record, ...current].slice(0, 100)))
    return true
  } catch {
    return false
  }
}

export function preserveLocalBrowserActivitySession(record: LocalBrowserActivitySession): boolean {
  return isLocalActivitySession(record) && storeLocalBrowserActivitySession(record)
}

function createActivitySessionInput(metrics: ActivityMetrics): BrowserActivitySessionInput | null {
  if (metrics.startedAt === null || !Number.isFinite(metrics.startedAt)) {
    return null
  }
  const endedAt = new Date()
  const startedAt = new Date(metrics.startedAt)
  if (!Number.isFinite(startedAt.getTime())) return null
  return {
    id: crypto.randomUUID(),
    source: 'browser-tab',
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationSeconds: Math.max(metrics.elapsedSeconds, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)),
    keyPressCount: metrics.keyPressCount,
    mouseClickCount: metrics.mouseClickCount,
  }
}

/** Preserves activity locally when auth changes before a session can safely be attributed. */
export function preserveOptInActivitySessionLocally(metrics: ActivityMetrics): LocalBrowserActivitySession | null {
  try {
    const input = createActivitySessionInput(metrics)
    if (!input) return null
    const localRecord: LocalBrowserActivitySession = { ...input, savedAt: new Date().toISOString() }
    return preserveLocalBrowserActivitySession(localRecord) ? localRecord : null
  } catch {
    return null
  }
}

/** Saves a stopped opt-in session to cloud; on failure, preserves it locally without an owner. */
export async function persistOptInActivitySession(metrics: ActivityMetrics): Promise<{
  cloudRecord?: BrowserActivitySession
  localRecord?: LocalBrowserActivitySession
  error?: string
}> {
  try {
    const input = createActivitySessionInput(metrics)
    if (!input) return { error: 'The activity session has no valid start time.' }

    const cloudResult = await saveBrowserActivitySessionForCurrentUser(input)
    if (cloudResult.data) return { cloudRecord: cloudResult.data }

    const localRecord: LocalBrowserActivitySession = { ...input, savedAt: new Date().toISOString() }
    if (preserveLocalBrowserActivitySession(localRecord)) {
      return { localRecord, error: cloudResult.error }
    }
    return { error: `${cloudResult.error ?? 'Cloud save failed.'} The local fallback could not be stored.` }
  } catch {
    return { error: 'The activity session could not be saved.' }
  }
}
