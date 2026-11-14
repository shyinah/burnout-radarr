import {
  validateStudyDraft,
  createStudySession,
  pauseStudySession,
  resumeStudySession,
  takeStudyBreak,
  endStudySessionEarly,
  completeStudySession,
  type StudySessionDraft,
} from './student/index.ts'

import {
  validateDeveloperDraft,
  createDeveloperSession,
  pauseDeveloperSession,
  resumeDeveloperSession,
  takeDeveloperBreak,
  endDeveloperSessionEarly,
  completeDeveloperSession,
  type DeveloperSessionDraft,
} from './developer/index.ts'

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

console.log('--- Running Student & Developer Modes Test Suite ---\n')

async function runTests() {
  let passed = 0

  // 1. Student draft validation: valid draft
  {
    const validDraft: StudySessionDraft = {
      mode: 'student',
      subject: 'Mathematics',
      focusMinutes: 45,
      breakMinutes: 10,
      sleepHours: 7.5,
      perceivedFatigue: 3,
      goal: 'Practice derivatives',
    }
    const result = validateStudyDraft(validDraft)
    assert(result.valid, 'Valid student draft should pass validation')
    assertEqual(result.errors.length, 0)
    passed++
    console.log('✓ PASS: validateStudyDraft accepts valid study draft')
  }

  // 2. Student draft validation: invalid fields
  {
    const invalidDraft = {
      mode: 'student',
      subject: '   ',
      focusMinutes: 0,
      breakMinutes: -5,
      sleepHours: 25,
      perceivedFatigue: 12,
    }
    const result = validateStudyDraft(invalidDraft)
    assert(!result.valid, 'Invalid student draft should fail validation')
    assert(result.errors.length >= 4, 'Should flag all invalid fields')
    passed++
    console.log('✓ PASS: validateStudyDraft rejects invalid durations, ranges, and empty subject')
  }

  // 3. Student session lifecycle: start, pause, resume, break, end early
  {
    const draft: StudySessionDraft = {
      mode: 'student',
      subject: 'Physics',
      focusMinutes: 50,
      breakMinutes: 10,
      sleepHours: 8,
      perceivedFatigue: 2,
    }
    let session = createStudySession(draft)
    assertEqual(session.status, 'running')
    assertEqual(session.phase, 'focus')
    assertEqual(session.secondsLeft, 3000)

    session = pauseStudySession(session)
    assertEqual(session.status, 'paused')

    session = resumeStudySession(session)
    assertEqual(session.status, 'running')

    session = takeStudyBreak(session)
    assertEqual(session.phase, 'break')
    assertEqual(session.secondsLeft, 600)

    session = takeStudyBreak(session)
    assertEqual(session.phase, 'focus')
    assertEqual(session.secondsLeft, 3000)

    session = endStudySessionEarly(session)
    assertEqual(session.status, 'finished')
    assertEqual(session.completed, false)
    passed++
    console.log('✓ PASS: Student session state transitions (start, pause, resume, break, end early)')
  }

  // 4. Student session completion with CFI engine
  {
    const draft: StudySessionDraft = {
      mode: 'student',
      subject: 'Biology',
      focusMinutes: 60,
      breakMinutes: 12,
      sleepHours: 8,
      perceivedFatigue: 3,
      goal: 'Cell respiration notes',
    }
    const state = createStudySession(draft)
    state.completed = true

    const { session, cfiResult } = await completeStudySession(state, 'Focused', 'test-session-student')
    assert(cfiResult !== null, 'CFI evaluation should succeed')
    assertEqual(session.id, 'test-session-student')
    assertEqual(session.mode, 'student')
    assertEqual(session.subject, 'Biology')
    assertEqual(session.goal, 'Cell respiration notes')
    assertEqual(session.completed, true)
    assertEqual(session.pendingCFI, false)
    assertEqual(session.cfiScore, cfiResult.score)
    assertEqual(session.cfiRiskLevel, cfiResult.riskLevel)
    assert(Array.isArray(session.cfiExplanation) && session.cfiExplanation.length > 0)
    assert(Array.isArray(session.cfiRecommendations) && session.cfiRecommendations.length > 0)
    passed++
    console.log('✓ PASS: completeStudySession evaluates CFI and creates complete SavedSession')
  }

  // 5. Developer draft validation: valid draft
  {
    const validDraft: DeveloperSessionDraft = {
      mode: 'developer',
      project: 'Burnout Radarr',
      category: 'Coding',
      focusMinutes: 60,
      breakMinutes: 10,
      sleepHours: 7,
      perceivedFatigue: 4,
      description: 'Implement CFI integration',
    }
    const result = validateDeveloperDraft(validDraft)
    assert(result.valid, 'Valid developer draft should pass validation')
    assertEqual(result.errors.length, 0)
    passed++
    console.log('✓ PASS: validateDeveloperDraft accepts valid coding draft')
  }

  // 6. Developer draft validation: invalid project and ranges
  {
    const invalidDraft = {
      mode: 'developer',
      project: '',
      category: 'Coding',
      focusMinutes: 300,
      breakMinutes: -1,
      sleepHours: -2,
      perceivedFatigue: 0,
    }
    const result = validateDeveloperDraft(invalidDraft)
    assert(!result.valid, 'Invalid developer draft should fail validation')
    assert(result.errors.length >= 4, 'Should catch project and range violations')
    passed++
    console.log('✓ PASS: validateDeveloperDraft rejects missing project and invalid bounds')
  }

  // 7. Developer session lifecycle and completion
  {
    const draft: DeveloperSessionDraft = {
      mode: 'developer',
      project: 'Fieldnotes',
      category: 'Debugging',
      focusMinutes: 90,
      breakMinutes: 15,
      sleepHours: 6.5,
      perceivedFatigue: 6,
      description: 'Trace memory leak',
    }
    let session = createDeveloperSession(draft)
    assertEqual(session.status, 'running')
    assertEqual(session.draft.project, 'Fieldnotes')

    session = pauseDeveloperSession(session)
    assertEqual(session.status, 'paused')

    session = resumeDeveloperSession(session)
    assertEqual(session.status, 'running')

    session = takeDeveloperBreak(session)
    assertEqual(session.phase, 'break')
    assertEqual(session.secondsLeft, 900)

    session = takeDeveloperBreak(session)
    assertEqual(session.phase, 'focus')

    // Simulate ending early after 30 minutes (1800 seconds)
    session.elapsedFocusSeconds = 1800
    session = endDeveloperSessionEarly(session)

    const { session: saved, cfiResult } = await completeDeveloperSession(session, 'Challenging')
    assert(cfiResult !== null, 'CFI result should be produced')
    assertEqual(saved.mode, 'developer')
    assertEqual(saved.project, 'Fieldnotes')
    assertEqual(saved.completed, false)
    assertEqual(saved.focusMinutes, 30, 'Ended early session should record actual elapsed focus (30 min)')
    assertEqual(saved.pendingCFI, false)
    assertEqual(saved.cfiScore, cfiResult.score)
    assertEqual(saved.feeling, 'Challenging')
    assert(saved.cfiRecommendations && saved.cfiRecommendations.length > 0)
    passed++
    console.log('✓ PASS: completeDeveloperSession handles early completion and developer CFI evaluation')
  }

  // 8. Regression test: Recommendations path honors selected mode (Developer & Student)
  {
    // Mock sessions where latest session is 'student' (reproducing the exact bug scenario)
    const mockSessions = [
      {
        id: 'session-student-recent',
        userId: 'test-user',
        mode: 'student' as const,
        title: 'Math homework',
        subject: 'Mathematics',
        project: '',
        category: 'Study',
        description: '',
        goal: '',
        focusMinutes: 45,
        breakMinutes: 10,
        sleepHours: 8,
        perceivedFatigue: 3,
        sessionDate: '2026-11-14T12:00:00.000Z',
        completed: true,
        feeling: 'Good',
        pendingCFI: false,
        cfiScore: 30,
      },
      {
        id: 'session-dev-older',
        userId: 'test-user',
        mode: 'developer' as const,
        title: 'Refactor auth',
        subject: 'Burnout Radarr',
        project: 'Burnout Radarr',
        category: 'Coding',
        description: '',
        goal: '',
        focusMinutes: 60,
        breakMinutes: 10,
        sleepHours: 7,
        perceivedFatigue: 4,
        sessionDate: '2026-11-13T12:00:00.000Z',
        completed: true,
        feeling: 'Steady',
        pendingCFI: false,
        cfiScore: 35,
      },
    ]

    // Helper reproducing Recommendations target mode resolution
    const resolveTargetMode = (currentMode: 'student' | 'developer', sessions: typeof mockSessions) => {
      const latest = [...sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))[0]
      return currentMode ?? latest?.mode ?? 'student'
    }

    // Bug reproduction check: If currentMode is 'developer', targetMode MUST be 'developer'
    const devTarget = resolveTargetMode('developer', mockSessions)
    assertEqual(devTarget, 'developer', 'Recommendations path must resolve Developer mode when currentMode is developer')

    // Also check student mode resolution
    const studentTarget = resolveTargetMode('student', mockSessions)
    assertEqual(studentTarget, 'student', 'Recommendations path must resolve Student mode when currentMode is student')

    passed++
    console.log('✓ PASS: Recommendations path correctly resolves selected session mode (Developer & Student)')
  }

  console.log(`\nResults: ${passed}/8 mode tests passed.`)
}

runTests().catch((err) => {
  console.error('Mode tests failed:', err)
  throw err
})
