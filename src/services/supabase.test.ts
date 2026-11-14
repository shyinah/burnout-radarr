import { isSupabaseConfigured, supabase } from './supabase.ts'

function assert(condition: unknown, message = 'Assertion failed'): asserts condition {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`)
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message || 'Assertion failed'} - Expected: ${String(expected)}, Got: ${String(actual)}`)
  }
}

console.log('--- Running Supabase Verification Suite ---\n')

async function runTests() {
  let passed = 0

  // 1. Check that VITE_SUPABASE_URL is read correctly
  {
    const clientUrl = (supabase as unknown as { supabaseUrl?: string }).supabaseUrl
    assert(typeof clientUrl === 'string' && clientUrl.length > 0, 'Supabase URL must be present')
    assert(clientUrl.startsWith('https://'), 'Supabase URL must start with https://')
    assert(clientUrl.includes('reokjsvzvpnhtcjbkvko.supabase.co'), 'Supabase URL must match project domain')
    passed++
    console.log('✓ PASS: VITE_SUPABASE_URL is loaded and matches the configured project URL')
  }

  // 2. Check that VITE_SUPABASE_ANON_KEY is read correctly without exposing it
  {
    const clientKey = (supabase as unknown as { supabaseKey?: string }).supabaseKey
    assert(typeof clientKey === 'string' && clientKey.length > 0, 'Publishable key must be a non-empty string')
    assert(clientKey !== 'your-anon-publishable-api-key-here', 'Publishable key must not be placeholder')
    assert(clientKey !== 'placeholder', 'Publishable key must not be fallback default')
    assert(clientKey.length > 20, 'Publishable key length is valid')
    passed++
    console.log('✓ PASS: VITE_SUPABASE_ANON_KEY is loaded correctly (redacted for security)')
  }

  // 3. Verify that isSupabaseConfigured evaluates to true
  {
    assertEqual(isSupabaseConfigured, true, 'isSupabaseConfigured must evaluate to true')
    passed++
    console.log('✓ PASS: isSupabaseConfigured evaluates to true')
  }

  // 4. Check that the Supabase client initializes successfully with expected modules
  {
    assert(supabase !== null && supabase !== undefined, 'Supabase client must be initialized')
    assertEqual(typeof supabase.from, 'function', 'Client must expose from() database query builder')
    assertEqual(typeof supabase.auth, 'object', 'Client must expose auth module')
    assertEqual(typeof supabase.storage, 'object', 'Client must expose storage module')
    passed++
    console.log('✓ PASS: Supabase client is initialized successfully with query and auth interfaces')
  }

  console.log(`\nResults: ${passed}/4 Supabase verification checks passed.`)
}

runTests().catch((err) => {
  console.error('Supabase verification failed:', err)
  throw err
})
