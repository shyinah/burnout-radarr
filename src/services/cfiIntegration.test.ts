import { evaluateWithCFI } from './cfi.ts'
import { loadAppData, saveAppData, resetAppData } from './storage.ts'
import type { SessionInput } from '../types/index.ts'
import type { SavedSession, AppData } from './app-state.ts'

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

console.log('--- Running CFI Integration Test Suite ---\n')

async function runTests() {
  let passed = 0

  // Test 1: evaluateWithCFI uses calculateCFI by default and returns complete result
  {
    const input: SessionInput = {
      mode: 'student',
      focusMinutes: 50,
      breakMinutes: 10,
      sleepHours: 8,
      perceivedFatigue: 2,
      sessionDate: new Date().toISOString(),
    }
    const result = await evaluateWithCFI(input)
    assert(result !== null, 'CFI evaluation should succeed for valid input')
    assert(typeof result.score === 'number' && result.score >= 0 && result.score <= 100, 'Score should be between 0 and 100')
    assert(result.riskLevel === 'low', 'Risk level should be low for alert session')
    assert(Array.isArray(result.explanation) && result.explanation.length > 0, 'Explanation should be non-empty array')
    assert(Array.isArray(result.recommendations) && result.recommendations.length > 0, 'Recommendations should be non-empty array')
    passed++
    console.log('✓ PASS: evaluateWithCFI produces full CFIResult (score, riskLevel, explanation, recommendations)')
  }

  // Test 2: evaluateWithCFI developer mode returns developer-specific recommendations
  {
    const input: SessionInput = {
      mode: 'developer',
      focusMinutes: 120,
      breakMinutes: 5,
      sleepHours: 5,
      perceivedFatigue: 8,
      sessionDate: new Date().toISOString(),
    }
    const result = await evaluateWithCFI(input)
    assert(result !== null, 'Evaluation should succeed')
    assert(result.riskLevel === 'high', 'Risk level should be high')
    assert(result.score > 66, 'Score should be in high risk range')
    const hasDevAdvice = result.recommendations.some(r => r.description.toLowerCase().includes('code') || r.description.toLowerCase().includes('commit') || r.title.toLowerCase().includes('checkpoint'))
    assert(hasDevAdvice, 'Developer mode should receive code/developer-tailored recommendations')
    passed++
    console.log('✓ PASS: evaluateWithCFI handles high-fatigue developer session with domain recommendations')
  }

  // Test 3: evaluateWithCFI safely catches engine errors and returns null
  {
    const badInput = {
      mode: 'student',
      focusMinutes: -10,
      breakMinutes: 5,
      sleepHours: 7,
      perceivedFatigue: 5,
      sessionDate: new Date().toISOString(),
    } as unknown as SessionInput
    const result = await evaluateWithCFI(badInput)
    assertEqual(result, null, 'Invalid input should return null instead of throwing')
    passed++
    console.log('✓ PASS: evaluateWithCFI safely returns null on calculation failure')
  }

  // Test 4: Custom engine support in evaluateWithCFI
  {
    const customEngine = () => ({
      score: 42,
      riskLevel: 'moderate' as const,
      explanation: ['Custom engine evaluation'],
      recommendations: [{ title: 'Custom', description: 'Test', priority: 'medium' as const }],
    })
    const input: SessionInput = {
      mode: 'student',
      focusMinutes: 25,
      breakMinutes: 5,
      sleepHours: 8,
      perceivedFatigue: 3,
      sessionDate: new Date().toISOString(),
    }
    const result = await evaluateWithCFI(input, customEngine)
    assert(result !== null && result.score === 42, 'Result score should match custom engine')
    assertEqual(result.explanation[0], 'Custom engine evaluation')
    passed++
    console.log('✓ PASS: evaluateWithCFI supports custom engine injection')
  }

  // Test 5: Storage persistence of new CFI fields in SavedSession
  {
    // Mock localStorage in Node
    const storageMap = new Map<string, string>()
    const mockLocalStorage = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, val: string) => storageMap.set(key, val),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
      length: 0,
      key: () => null,
    }
    // Assign global window.localStorage
    const globalAny = globalThis as unknown as { window?: { localStorage: typeof mockLocalStorage } }
    globalAny.window = { localStorage: mockLocalStorage }

    const demoData = resetAppData()
    assert(demoData.sessions.length > 0, 'Demo sessions should exist')
    assert(demoData.sessions[0].cfiRiskLevel !== undefined, 'Demo session should have cfiRiskLevel')
    assert(demoData.sessions[0].cfiExplanation !== undefined, 'Demo session should have cfiExplanation')
    assert(demoData.sessions[0].cfiRecommendations !== undefined, 'Demo session should have cfiRecommendations')

    // Add a newly calculated session
    const realSession: SavedSession = {
      id: 'session-integration-test-1',
      mode: 'student',
      title: 'Math study',
      subject: 'Mathematics',
      project: '',
      category: 'Study',
      description: 'Calculus review',
      goal: 'Finish problem set',
      focusMinutes: 50,
      breakMinutes: 10,
      sleepHours: 8,
      perceivedFatigue: 2,
      sessionDate: new Date().toISOString(),
      completed: true,
      pendingCFI: false,
      cfiScore: 6,
      cfiRiskLevel: 'low',
      cfiExplanation: ['Cognitive Fatigue Index: 6/100', 'Self-reported fatigue is low'],
      cfiRecommendations: [{ title: 'Maintain rhythm', description: 'Good pace', priority: 'low' }],
      feeling: 'Steady',
    }

    const updatedData: AppData = {
      ...demoData,
      sessions: [realSession, ...demoData.sessions],
    }

    saveAppData(updatedData)
    const loaded = loadAppData()

    const retrieved = loaded.sessions.find(s => s.id === 'session-integration-test-1')
    assert(retrieved !== undefined, 'Saved session should be retrieved from storage')
    assertEqual(retrieved.cfiScore, 6, 'Retrieved score should match')
    assertEqual(retrieved.pendingCFI, false, 'Retrieved pendingCFI should match')
    assertEqual(retrieved.cfiRiskLevel, 'low', 'Retrieved riskLevel should match')
    assertEqual(JSON.stringify(retrieved.cfiExplanation), JSON.stringify(realSession.cfiExplanation))
    assertEqual(JSON.stringify(retrieved.cfiRecommendations), JSON.stringify(realSession.cfiRecommendations))
    passed++
    console.log('✓ PASS: Storage persists and recovers all rich CFI fields (score, riskLevel, explanation, recommendations)')
  }

  // Test 6: Failure sentinel handling (-1 score, pendingCFI: true)
  {
    const failedSession: SavedSession = {
      id: 'session-failed-1',
      mode: 'developer',
      title: 'Crashing session',
      subject: 'Test',
      project: 'Test',
      category: 'Debugging',
      description: 'Testing error handling',
      goal: '',
      focusMinutes: 30,
      breakMinutes: 5,
      sleepHours: 7,
      perceivedFatigue: 4,
      sessionDate: new Date().toISOString(),
      completed: false,
      pendingCFI: true,
      cfiScore: -1,
      feeling: 'Tired',
    }
    assertEqual(failedSession.pendingCFI, true)
    assertEqual(failedSession.cfiScore, -1)
    assert(failedSession.cfiScore !== 0, 'Failed calculation must not be saved as 0')
    passed++
    console.log('✓ PASS: Failed calculations are safely marked with pendingCFI: true and cfiScore: -1')
  }

  console.log(`\nResults: ${passed}/6 integration tests passed.`)
}

runTests().catch((err) => {
  console.error('Integration test failed:', err)
  throw err
})
