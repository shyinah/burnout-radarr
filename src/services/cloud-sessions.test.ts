import { mapDbSessionToSavedSession } from './cloud-sessions.ts'
import { loadLocalBrowserActivitySessions, preserveLocalBrowserActivitySession } from './browser-activity.ts'
import { selectDashboardCfiState } from './cfi-display.ts'
import { backupGuestData, loadAppData, restoreGuestData, saveAppData } from './storage.ts'
import type { AppData, CheckInRecord } from './app-state.ts'

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
    assertEqual(session.cfiExplanation?.[0], 'Moderate fatigue detected', 'Historical explanation must load unchanged')
    assert(Array.isArray(session.cfiRecommendations) && session.cfiRecommendations.length === 1, 'Recommendations must be present')
    passed++
    console.log('✓ PASS: mapDbSessionToSavedSession correctly transforms joined Supabase session & CFI rows')
  }

  // Test 1b: Unified CFI explanation persisted in cfi_results maps back after cloud refresh
  {
    const explanation = [
      'Unified CFI: 54/100 (moderate descriptive band).',
      'Subjective fatigue indicator: 60/100 from 2/2 responses.',
      'rmssd individual reading (watch-alpha; ms): 37 ms; personal baseline from 14 valid daily readings.',
      'Browser activity context only (0% scoring weight): 300 seconds.',
    ]
    const session = mapDbSessionToSavedSession({
      id: 'unified-refresh-session',
      user_id: 'user-unified',
      mode: 'student',
      title: 'Focus session',
      subject: '',
      project: '',
      category: 'Work',
      description: '',
      goal: '',
      focus_minutes: 45,
      break_minutes: 10,
      sleep_hours: 0,
      perceived_fatigue: 1,
      completed: true,
      feeling: 'Not recorded',
      session_date: '2026-11-15T10:00:00.000Z',
      cfi_results: {
        session_id: 'unified-refresh-session',
        user_id: 'user-unified',
        score: 54,
        risk_level: 'moderate',
        explanation,
        recommendations: [],
      },
    })
    assertEqual(session.cfiScore, 54, 'Unified score reloads from existing cfi_results score field')
    assertEqual(JSON.stringify(session.cfiExplanation), JSON.stringify(explanation), 'Contributions and context reload unchanged')
    const display = selectDashboardCfiState([session])
    assertEqual(display.status, 'scored', 'Refreshed unified session remains displayable')
    assertEqual(display.sections.activity.length, 1, 'Refreshed browser context remains separate')
    passed++
    console.log('✓ PASS: Unified CFI score and explanation survive cloud refresh through existing cfi_results columns')
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
      checkIns: [],
      legacyDailyCheckIns: [],
    }

    const guestCheckIn: CheckInRecord = {
      id: 'guest-morning-check-in',
      period: 'morning',
      date: '2026-11-14',
      recordedAt: '2026-11-14T08:00:00.000Z',
      schemaVersion: 1,
      answers: { energy: 3, sleepQuality: 4, mood: 'neutral', readiness: 3, pace: 'steady' },
    }
    guestData.checkIns = [guestCheckIn]

    const legacyCheckIn = {
      id: 'legacy-check-in',
      recordedAt: new Date().toISOString(),
      sleepHours: 7.5,
      fatigue: 4,
      note: 'Previously saved reflection',
    }
    storageStore.set('burnout-radarr-demo-v1', JSON.stringify({ ...guestData, checkIns: [legacyCheckIn] }))
    const migratedData = loadAppData()
    assertEqual(migratedData.checkIns.length, 0, 'Legacy single-form check-ins are not treated as morning/evening entries')
    assertEqual(migratedData.legacyDailyCheckIns[0]?.id, legacyCheckIn.id, 'Legacy check-in data is preserved during migration')

    // Save as guest data
    saveAppData(guestData)
    backupGuestData(guestData)

    // Simulate logged-in user overwriting active storage with cloud data
    saveAppData({
      ...guestData,
      preferences: { ...guestData.preferences, name: 'Cloud User' },
      sessions: [],
      checkIns: [],
    })

    // Now restore guest data (simulating logout)
    const restored = restoreGuestData()
    assertEqual(restored.preferences.name, 'Guest User', 'Guest name must be restored on logout')
    assertEqual(restored.sessions.length, 1, 'Guest sessions must be restored intact on logout')
    assertEqual(restored.sessions[0].id, 'guest-1', 'Guest session ID preserved')
    assertEqual(restored.checkIns[0]?.id, guestCheckIn.id, 'Guest check-ins must remain separate from cloud check-ins and restore intact')

    // Clean up
    if (originalWindow) globalThis.window = originalWindow
    else Reflect.deleteProperty(globalThis, 'window')
    passed++
    console.log('✓ PASS: LocalStorage backup and restore preserve local workspace and offline sessions across auth cycles')
  }

  // Test 4: Opt-in activity fallback is retained locally without an account association
  {
    const storageStore = new Map<string, string>()
    const originalWindow = globalThis.window
    globalThis.window = {
      localStorage: {
        getItem: (key: string) => storageStore.get(key) ?? null,
        setItem: (key: string, value: string) => storageStore.set(key, value),
        removeItem: (key: string) => storageStore.delete(key),
        clear: () => storageStore.clear(),
        key: () => null,
        length: storageStore.size,
      },
    } as unknown as Window & typeof globalThis

    const localActivity = {
      id: 'local-activity-1',
      source: 'browser-tab' as const,
      startedAt: '2026-11-14T08:00:00.000Z',
      endedAt: '2026-11-14T08:05:00.000Z',
      durationSeconds: 300,
      keyPressCount: 18,
      mouseClickCount: 7,
      savedAt: '2026-11-14T08:05:00.000Z',
    }
    assert(preserveLocalBrowserActivitySession(localActivity), 'Local activity fallback should be stored')
    const restoredActivity = loadLocalBrowserActivitySessions()[0]
    assertEqual(restoredActivity?.id, localActivity.id, 'Local activity session should be retained')
    assert(!restoredActivity || !('userId' in restoredActivity), 'Local activity session must not be assigned to an account')

    if (originalWindow) globalThis.window = originalWindow
    else Reflect.deleteProperty(globalThis, 'window')
    passed++
    console.log('✓ PASS: Offline activity aggregates remain local and unlinked to any account')
  }

  console.log(`\nResults: ${passed}/5 cloud session and storage fallback tests passed.`)
}

runTests().catch((err) => {
  console.error('Test suite failed:', err)
  throw err
})
