import { isSupabaseConfigured, supabase } from './supabase.ts'
import type { SavedSession } from './app-state.ts'
import type { Recommendation, UserMode } from '../types/index.ts'
import type { User } from '@supabase/supabase-js'

interface DatabaseCfiRow {
  id?: string
  session_id: string
  user_id: string
  score: number
  risk_level: 'low' | 'moderate' | 'high'
  explanation: string[]
  recommendations: Recommendation[]
  created_at?: string
}

interface DatabaseSessionRow {
  id: string
  user_id: string
  mode: string
  title: string
  subject: string
  project: string
  category: string
  description: string
  goal: string
  focus_minutes: number
  break_minutes: number
  sleep_hours: number | string
  perceived_fatigue: number
  completed: boolean
  feeling: string
  session_date: string
  created_at?: string
  updated_at?: string
  cfi_results?: DatabaseCfiRow | DatabaseCfiRow[] | null
}

/**
 * Maps a Supabase sessions row (with joined cfi_results) into a frontend SavedSession.
 */
export function mapDbSessionToSavedSession(row: DatabaseSessionRow): SavedSession {
  const cfi = Array.isArray(row.cfi_results) ? row.cfi_results[0] : row.cfi_results
  return {
    id: row.id,
    userId: row.user_id,
    mode: (row.mode === 'developer' ? 'developer' : 'student') as UserMode,
    title: row.title || 'Untitled session',
    subject: row.subject || '',
    project: row.project || '',
    category: row.category || '',
    description: row.description || '',
    goal: row.goal || '',
    focusMinutes: row.focus_minutes,
    breakMinutes: row.break_minutes,
    sleepHours: Number(row.sleep_hours),
    perceivedFatigue: row.perceived_fatigue,
    completed: row.completed,
    feeling: row.feeling || 'Steady',
    sessionDate: row.session_date,
    pendingCFI: !cfi,
    cfiScore: cfi ? cfi.score : -1,
    cfiRiskLevel: cfi?.risk_level,
    cfiExplanation: cfi?.explanation,
    cfiRecommendations: cfi?.recommendations,
  }
}

/**
 * Retrieves the currently authenticated Supabase user.
 * Always resolves against the active auth session.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    return data.user
  } catch {
    return null
  }
}

/**
 * Loads cloud sessions and associated CFI results for the authenticated user from Supabase.
 * Enforces ownership filtering and relies on RLS as an additional security guarantee.
 */
export async function fetchCloudSessions(userId: string): Promise<{ sessions: SavedSession[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { sessions: [], error: 'Supabase is not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, cfi_results(*)')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })

    if (error) {
      return { sessions: [], error: error.message }
    }

    const mapped = (data || []).map((row) => mapDbSessionToSavedSession(row as unknown as DatabaseSessionRow))
    return { sessions: mapped }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error loading sessions'
    return { sessions: [], error: message }
  }
}

/**
 * Persists a new or updated session and its CFI results to Supabase.
 * Security requirement: Always uses the verified authenticatedUserId, ignoring any client-provided userId.
 */
export async function saveSessionToCloud(
  session: SavedSession,
  authenticatedUserId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured' }
  }

  if (!authenticatedUserId) {
    return { success: false, error: 'No authenticated user' }
  }

  try {
    // 1. Insert/update session record with verified user_id
    const sessionPayload = {
      id: session.id,
      user_id: authenticatedUserId,
      mode: session.mode,
      title: session.title,
      subject: session.subject || '',
      project: session.project || '',
      category: session.category || '',
      description: session.description || '',
      goal: session.goal || '',
      focus_minutes: session.focusMinutes,
      break_minutes: session.breakMinutes,
      sleep_hours: session.sleepHours,
      perceived_fatigue: session.perceivedFatigue,
      completed: session.completed,
      feeling: session.feeling || 'Steady',
      session_date: session.sessionDate,
    }

    const { error: sessionError } = await supabase
      .from('sessions')
      .upsert(sessionPayload, { onConflict: 'id' })

    if (sessionError) {
      console.error('Failed to save session to Supabase:', sessionError)
      return { success: false, error: sessionError.message }
    }

    // 2. If CFI calculation succeeded, persist CFI results linked by composite (session_id, user_id)
    if (!session.pendingCFI && session.cfiScore >= 0 && session.cfiRiskLevel) {
      const cfiPayload = {
        session_id: session.id,
        user_id: authenticatedUserId,
        score: session.cfiScore,
        risk_level: session.cfiRiskLevel,
        explanation: session.cfiExplanation || [],
        recommendations: session.cfiRecommendations || [],
      }

      const { error: cfiError } = await supabase
        .from('cfi_results')
        .upsert(cfiPayload, { onConflict: 'session_id' })

      if (cfiError) {
        console.error('Failed to save CFI result to Supabase:', cfiError)
        return { success: false, error: cfiError.message }
      }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error saving session'
    return { success: false, error: message }
  }
}

/**
 * Loads user profile data (display name and theme preference) from public.profiles.
 */
export async function fetchUserProfile(userId: string): Promise<{ displayName?: string; theme?: string } | null> {
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, theme')
      .eq('id', userId)
      .maybeSingle()

    if (error || !data) return null
    return {
      displayName: data.display_name,
      theme: data.theme,
    }
  } catch {
    return null
  }
}
