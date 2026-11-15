import { isSupabaseConfigured, supabase } from './supabase.ts'
import type { CheckInAnswerValue, CheckInPeriod, CheckInRecord } from './app-state.ts'
import { checkInQuestions } from './check-in-questions.ts'

export interface PersistedCheckIn extends CheckInRecord {
  userId: string
  timezone: string
  createdAt: string
}

export interface SaveCheckInInput extends CheckInRecord {
  /** IANA timezone used to derive the supplied local calendar date. */
  timezone: string
}

export interface CheckInServiceResult<T> {
  data: T | null
  error?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCheckInPeriod(value: unknown): value is CheckInPeriod {
  return value === 'morning' || value === 'evening'
}

function isLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return false
  }
  return isLocalDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value))
}

function isIanaTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions().timeZone !== ''
  } catch {
    return false
  }
}

function hasExpectedAnswers(period: CheckInPeriod, value: unknown): value is Record<string, CheckInAnswerValue> {
  if (!isRecord(value)) return false

  const questions = checkInQuestions[period]
  const keys = Object.keys(value)
  return keys.length === questions.length && questions.every((question) =>
    Object.prototype.hasOwnProperty.call(value, question.id) &&
    question.options.some((option) => option.value === value[question.id])
  )
}

function isValidSaveInput(value: unknown): value is SaveCheckInInput {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.trim() === '') return false
  return isCheckInPeriod(value.period) &&
    isLocalDate(value.date) &&
    isIanaTimezone(value.timezone) &&
    isTimestamp(value.recordedAt) &&
    typeof value.schemaVersion === 'number' && Number.isSafeInteger(value.schemaVersion) && value.schemaVersion > 0 &&
    hasExpectedAnswers(value.period, value.answers)
}

function isAnswerRecord(value: unknown): value is Record<string, CheckInAnswerValue> {
  return isRecord(value) && Object.values(value).every((answer) => typeof answer === 'string' || typeof answer === 'number')
}

function parseDatabaseCheckIn(value: unknown): PersistedCheckIn {
  if (!isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.user_id !== 'string' ||
    !isCheckInPeriod(value.period) ||
    !isLocalDate(value.local_date) ||
    !isIanaTimezone(value.timezone) ||
    !isTimestamp(value.recorded_at) ||
    !isAnswerRecord(value.answers) ||
    typeof value.schema_version !== 'number' || !Number.isSafeInteger(value.schema_version) || value.schema_version < 1 ||
    !isTimestamp(value.created_at)) {
    throw new Error('The server returned an invalid check-in record.')
  }

  return {
    id: value.id,
    userId: value.user_id,
    period: value.period,
    date: value.local_date,
    timezone: value.timezone,
    recordedAt: value.recorded_at,
    answers: value.answers,
    schemaVersion: value.schema_version,
    createdAt: value.created_at,
  }
}

async function getCurrentUserId(): Promise<CheckInServiceResult<string>> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) return { data: null, error: 'Unable to verify the authenticated user.' }
    if (!data.user?.id) return { data: null, error: 'An authenticated user is required.' }
    return { data: data.user.id }
  } catch {
    return { data: null, error: 'Unable to verify the authenticated user.' }
  }
}

/** Loads only the authenticated user's check-ins; RLS independently enforces ownership. */
export async function fetchCheckInsForCurrentUser(): Promise<CheckInServiceResult<PersistedCheckIn[]>> {
  if (!isSupabaseConfigured) return { data: null, error: 'Supabase is not configured.' }

  const auth = await getCurrentUserId()
  if (!auth.data) return { data: null, error: auth.error ?? 'An authenticated user is required.' }

  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select('id, user_id, period, local_date, timezone, recorded_at, answers, schema_version, created_at')
      .eq('user_id', auth.data)
      .order('local_date', { ascending: false })
      .order('period', { ascending: true })

    if (error) return { data: null, error: error.message }
    const rows: unknown = data ?? []
    if (!Array.isArray(rows)) return { data: null, error: 'The server returned an invalid check-in response.' }
    return { data: rows.map(parseDatabaseCheckIn) }
  } catch {
    return { data: null, error: 'Unable to load check-ins.' }
  }
}

/** Inserts one check-in for the authenticated user; duplicate dates are rejected by the unique constraint. */
export async function saveCheckInForCurrentUser(input: SaveCheckInInput): Promise<CheckInServiceResult<PersistedCheckIn>> {
  if (!isValidSaveInput(input)) return { data: null, error: 'Check-in data is invalid.' }
  if (!isSupabaseConfigured) return { data: null, error: 'Supabase is not configured.' }

  const auth = await getCurrentUserId()
  if (!auth.data) return { data: null, error: auth.error ?? 'An authenticated user is required.' }

  try {
    const { data, error } = await supabase
      .from('check_ins')
      .insert({
        id: input.id,
        user_id: auth.data,
        period: input.period,
        local_date: input.date,
        timezone: input.timezone,
        recorded_at: input.recordedAt,
        answers: input.answers,
        schema_version: input.schemaVersion,
      })
      .select('id, user_id, period, local_date, timezone, recorded_at, answers, schema_version, created_at')
      .single()

    if (error) {
      const errorRecord: unknown = error
      const duplicateConstraint = isRecord(errorRecord) &&
        errorRecord.code === '23505' &&
        ['constraint', 'message', 'details', 'hint'].some((key) => {
          const field = errorRecord[key]
          return typeof field === 'string' && /(^|[^a-z0-9_])check_ins_user_date_period_key([^a-z0-9_]|$)/i.test(field)
        })
      return {
        data: null,
        error: duplicateConstraint
          ? 'A check-in for this period and local date already exists.'
          : error.message,
      }
    }

    return { data: parseDatabaseCheckIn(data) }
  } catch {
    return { data: null, error: 'Unable to save check-in.' }
  }
}
