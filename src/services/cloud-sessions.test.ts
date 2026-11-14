import { mapDbSessionToSavedSession } from './cloud-sessions.ts'
import { backupGuestData, restoreGuestData, saveAppData } from './storage.ts'
import type { AppData } from './app-state.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`)
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message || 'Assertion failed'} - Expected: ${String(expected)}, Got: ${String(actual)}`)
  }
}

console.log('--- Running Cloud Sessions & Storage Fallback Suite ---\n')

async function runTests() {
  let passed = 0

  // Test 1: mapDbSessionToSavedSession correctly transforms complete row with joined CFI result
  {
    const dbRow = {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: 'user-abc',
      mode: 'developer',
      title: 'Fix auth session sync',
      subject: 'Burnout Radarr',
      project: 'Burnout Radarr',
      category: 'Debugging',
      description: 'Resolved state race condition',
      goal: 'Sync sessions to cloud',
      focus_minutes: 55,
      break_minutes: 10,
      sleep_hours: '7.5',
      perceived_fatigue: 4,
      completed: true,
      feeling: 'Accomplished',
      session_date: '2026-11-13T20:00:00.000Z',
      cfi_results: {
        session_id: '11111111-1111-1111-1111-111111111111',
        user_id: 'user-abc',
        score: 42,
        risk_level: 'moderate' as const,
        explanation: ['Moderate fatigue detected', 'Sleep meets baseline'],
        recommendations: [{ title: 'Take a breather', description: 'Rest your eyes', priority: 'medium' as const }],
      },
    }

    const session = mapDbSessionToSavedSession(dbRow)
    assertEqual(session.id, '11111111-1111-1111-1111-111111111111', 'Session ID must match')
    assertEqual(session.userId, 'user-abc', 'User ID must match')
    assertEqual(session.mode, 'developer', 'Mode must be developer')
    assertEqual(session.focusMinutes, 55, 'Focus minutes must be 55')
    assertEqual(session.sleepHours, 7.5, 'Sleep hours must be parsed as float')
    assertEqual(session.pendingCFI, false, 'pendingCFI must be false when cfi_results exist')
    assertEqual(session.cfiScore, 42, 'cfiScore must match')
    assertEqual(session.cfiRiskLevel, 'moderate', 'Risk level must match')
    assert(Array.isArray(session.cfiExplanation) && session.cfiExplanation.length === 2, 'Explanations must be present')
    assert(Array.isArray(session.cfiRecommendations) && session.cfiRecommendations.length === 1, 'Recommendations must be present')
    passed++
    console.log('✓ PASS: mapDbSessionToSavedSession correctly transforms joined Supabase session & CFI rows')
  }

  // Test 2: mapDbSessionToSavedSession handles missing CFI (pending state)
  {
    const dbRow = {
      id: '22222222-2222-2222-2222-222222222222',
      user_id: 'user-xyz',
      mode: 'student',
      title: 'Physics problem set',
      subject: 'Physics',
      project: '',
      category: 'Study',
      description: 'Chapter 5 problems',
      goal: 'Complete odd problems',
      focus_minutes: 40,
      break_minutes: 5,
      sleep_hours: 6,
      perceived_fatigue: 7,
      completed: false,
      feeling: 'Tired',
      session_date: '2026-11-13T21:00:00.000Z',
      cfi_results: null,
    }

    const session = mapDbSessionToSavedSession(dbRow)
    assertEqual(session.pendingCFI, true, 'pendingCFI must be true when cfi_results is null')
    assertEqual(session.cfiScore, -1, 'cfiScore must default to -1 when pending')
    assertEqual(session.cfiRiskLevel, undefined, 'Risk level must be undefined')
    assertEqual(session.completed, false, 'Completed flag must match')
    passed++
    console.log('✓ PASS: mapDbSessionToSavedSession safely flags pending CFI when no evaluation row exists')
  }

  // Test 3: LocalStorage backup and restore preserve guest data on logout
  {
    // Mock minimal localStorage in memory for node test environment
    const storageStore = new Map<string, string>()
    const originalWindow = globalThis.window
    globalThis.window = {
      localStorage: {
        getItem: (k: string) => storageStore.get(k) ?? null,
        setItem: (k: string, v: string) => storageStore.set(k, v),
        removeItem: (k: string) => storageStore.delete(k),
        clear: () => storageStore.clear(),
        key: () => null,
        length: storageStore.size,
      },
    } as unknown as Window & typeof globalThis

    const guestData: AppData = {
      preferences: {
        name: 'Guest User',
        defaultMode: 'student',
        theme: 'light',
        focusMinutes: 50,
        breakMinutes: 10,
        breakReminders: true,
        notifications: true,
      },
      sessions: [
        {
          id: 'guest-1',
          userId: 'local-user',
          mode: 'student',
          title: 'Local session',
          subject: 'Math',
          project: '',
          category: 'Study',
          description: '',
          goal: '',
          focusMinutes: 25,
          breakMinutes: 5,
          sleepHours: 8,
          perceivedFatigue: 2,
          sessionDate: new Date().toISOString(),
          completed: true,
          feeling: 'Great',
          pendingCFI: false,
          cfiScore: 20,
        },
      ],
      tasks: [],
      projects: [],
      workLogs: [],
    }

    // Save as guest data
    saveAppData(guestData)
    backupGuestData(guestData)

    // Simulate logged-in user overwriting active storage with cloud data
    saveAppData({
      ...guestData,
      preferences: { ...guestData.preferences, name: 'Cloud User' },
      sessions: [],
    })

    // Now restore guest data (simulating logout)
    const restored = restoreGuestData()
    assertEqual(restored.preferences.name, 'Guest User', 'Guest name must be restored on logout')
    assertEqual(restored.sessions.length, 1, 'Guest sessions must be restored intact on logout')
    assertEqual(restored.sessions[0].id, 'guest-1', 'Guest session ID preserved')

    // Clean up
    if (originalWindow) globalThis.window = originalWindow
    passed++
    console.log('✓ PASS: LocalStorage backup and restore preserve local workspace and offline sessions across auth cycles')
  }

  console.log(`\nResults: ${passed}/3 cloud session and storage fallback tests passed.`)
}

runTests().catch((err) => {
  console.error('Test suite failed:', err)
  throw err
})
