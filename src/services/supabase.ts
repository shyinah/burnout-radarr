import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface EnvMap {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

function getEnv(): EnvMap {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env
  }
  const globalProc = (globalThis as unknown as { process?: { env?: EnvMap } }).process
  return globalProc?.env ?? {}
}

const env = getEnv()
const supabaseUrl = env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || ''

/**
 * Flag indicating whether valid, non-placeholder Supabase credentials
 * are configured in the environment.
 */
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-publishable-api-key-here'
)

/**
 * Typed Supabase client initialized with project environment variables.
 * If credentials have not yet been provided in .env, a safe placeholder
 * client is initialized to prevent runtime crashes during build or development.
 */
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

export type { SupabaseClient }
