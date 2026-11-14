import { calculateCFI } from './calculateCFI.ts';
import type { SessionInput } from '../../types/index.ts';

// Self-contained test assertion helpers
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message} - Expected: ${String(expected)}, Got: ${String(actual)}`);
  }
}

function assertThrows(
  fn: () => void,
  expectedErrorType?: { new (...args: never[]): Error },
  message?: string
): void {
  try {
    fn();
  } catch (err) {
    if (expectedErrorType && !(err instanceof expectedErrorType)) {
      throw new Error(
        `[FAIL] ${message || 'Expected error'}: Threw ${(err as Error).name} instead of ${expectedErrorType.name}`,
        { cause: err }
      );
    }
    return;
  }
  throw new Error(`[FAIL] ${message || 'Expected function to throw, but it succeeded'}`);
}

function runTests() {
  console.log('--- Running Cognitive Fatigue Index (CFI) Test Suite ---\n');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      passed++;
      console.log(`✓ PASS: ${name}`);
    } catch (err) {
      console.error(`✗ FAIL: ${name}`);
      console.error((err as Error).message);
    }
  }

  // 1. Low Risk Cases & Boundaries (0-33)
  test('Low Risk: Ideal session achieves 0 CFI score and low risk', () => {
    const input: SessionInput = {
      mode: 'student',
      focusMinutes: 50,
      breakMinutes: 10,
      sleepHours: 8,
      perceivedFatigue: 1,
      sessionDate: '2026-11-13',
    };
    const result = calculateCFI(input);
    assertEqual(result.score, 0, 'Score should be 0 for ideal input');
    assertEqual(result.riskLevel, 'low', 'Risk level should be low');
    assert(result.explanation.length >= 4, 'Should provide at least 4 explanatory points');
    assert(result.recommendations.length > 0, 'Should provide recommendations');
    assert(result.recommendations.every((r) => r.priority === 'low'), 'Ideal session should have low priority tips');
  });

  test('Risk Boundary: Score at 33 classified as low risk', () => {
    // fatigue 5 => (4/9)*50 = 22.222
    // sleep 7 => (1/8)*25 = 3.125
    // focus 100, break 14 => target 20, deficit 6/20 => 0.3 * 25 = 7.5
    // raw = 22.222 + 3.125 + 7.5 = 32.847 => rounds to 33
    const input: SessionInput = {
      mode: 'student',
      focusMinutes: 100,
      breakMinutes: 14,
      sleepHours: 7,
      perceivedFatigue: 5,
      sessionDate: '2026-11-13',
    };
    const result = calculateCFI(input);
    assertEqual(result.score, 33, 'Boundary score should be exactly 33');
    assertEqual(result.riskLevel, 'low', 'Boundary score 33 must be classified as low risk');
  });

  // 2. Moderate Risk Cases & Boundaries (34-66)
  test('Risk Boundary: Score at 34 classified as moderate risk', () => {
    // fatigue 5 => 22.222
    // sleep 6.8 => (1.2/8)*25 = 3.75
    // focus 100, break 13.7 => target 20, deficit 6.3/20 => 0.315 * 25 = 7.875
    // raw = 22.222 + 3.75 + 7.875 = 33.847 => rounds to 34
    const input: SessionInput = {
      mode: 'developer',
      focusMinutes: 100,
      breakMinutes: 13.7,
      sleepHours: 6.8,
      perceivedFatigue: 5,
      sessionDate: '2026-11-13',
    };
    const result = calculateCFI(input);
    assertEqual(result.score, 34, 'Boundary score should be exactly 34');
    assertEqual(result.riskLevel, 'moderate', 'Boundary score 34 must be classified as moderate risk');
  });

  test('Risk Boundary: Score at 66 classified as moderate risk', () => {
    // fatigue 8 => (7/9)*50 = 38.889
    // sleep 4.2 => (3.8/8)*25 = 11.875
    // focus 100, break 7.8 => target 20, deficit 12.2/20 => 0.61 * 25 = 15.25
    // raw = 38.889 + 11.875 + 15.25 = 66.014 => rounds to 66
    const input: SessionInput = {
      mode: 'developer',
      focusMinutes: 100,
      breakMinutes: 7.8,
      sleepHours: 4.2,
      perceivedFatigue: 8,
      sessionDate: '2026-11-13',
    };
    const result = calculateCFI(input);
    assertEqual(result.score, 66, 'Boundary score should be exactly 66');
    assertEqual(result.riskLevel, 'moderate', 'Boundary score 66 must be classified as moderate risk');
  });

  // 3. High Risk Cases & Boundaries (67-100)
  test('Risk Boundary: Score at 67 classified as high risk', () => {
    // fatigue 8 => 38.889
    // sleep 4.0 => (4.0/8)*25 = 12.500
    // focus 100, break 7.5 => target 20, deficit 12.5/20 => 0.625 * 25 = 15.625
    // raw = 38.889 + 12.5 + 15.625 = 67.014 => rounds to 67
    const input: SessionInput = {
      mode: 'developer',
      focusMinutes: 100,
      breakMinutes: 7.5,
      sleepHours: 4.0,
      perceivedFatigue: 8,
      sessionDate: '2026-11-13',
    };
    const result = calculateCFI(input);
    assertEqual(result.score, 67, 'Boundary score should be exactly 67');
    assertEqual(result.riskLevel, 'high', 'Boundary score 67 must be classified as high risk');
  });

  test('Risk Boundary: Score at 100 classified as high risk', () => {
    const input: SessionInput = {
      mode: 'student',
      focusMinutes: 120,
      breakMinutes: 0,
      sleepHours: 0,
      perceivedFatigue: 10,
      sessionDate: '2026-11-13',
    };
    const result = calculateCFI(input);
    assertEqual(result.score, 100, 'Maximum inputs should reach 100');
    assertEqual(result.riskLevel, 'high', 'Boundary score 100 must be classified as high risk');
  });

  // 4. Determinism
  test('Determinism: Identical inputs produce strictly identical outputs', () => {
    const input: SessionInput = {
      mode: 'developer',
      focusMinutes: 75,
      breakMinutes: 15,
      sleepHours: 7,
      perceivedFatigue: 4,
      sessionDate: '2026-11-13',
    };
    const run1 = calculateCFI(input);
    const run2 = calculateCFI(input);

    assertEqual(run1.score, run2.score, 'Scores must be identical');
    assertEqual(run1.riskLevel, run2.riskLevel, 'Risk levels must be identical');
    assertEqual(JSON.stringify(run1.explanation), JSON.stringify(run2.explanation), 'Explanations must be identical');
    assertEqual(JSON.stringify(run1.recommendations), JSON.stringify(run2.recommendations), 'Recommendations must be identical');
  });

  // 5. Zero Focus Duration
  test('Zero focus duration: Handled safely without division by zero or break penalty', () => {
    const input: SessionInput = {
      mode: 'student',
      focusMinutes: 0,
      breakMinutes: 0,
      sleepHours: 8,
      perceivedFatigue: 1,
      sessionDate: '2026-11-13',
    };
    const result = calculateCFI(input);
    assertEqual(result.score, 0, 'Zero focus with ideal sleep and fatigue gives 0');
    assertEqual(result.riskLevel, 'low', 'Zero focus risk should be low');
    assert(result.explanation.some((e) => e.includes('No active focus duration')), 'Should note zero focus');
  });

  // 6. Explicit Handling of Missing Values (No silent replacements)
  test('Missing values: Throws TypeError when input object is missing', () => {
    assertThrows(() => calculateCFI(null as unknown as SessionInput), TypeError);
    assertThrows(() => calculateCFI(undefined as unknown as SessionInput), TypeError);
  });

  test('Missing values: Throws TypeError when perceivedFatigue is missing or undefined', () => {
    const input = {
      mode: 'student',
      focusMinutes: 50,
      breakMinutes: 10,
      sleepHours: 8,
      sessionDate: '2026-11-13',
    } as unknown as SessionInput;
    assertThrows(() => calculateCFI(input), TypeError, 'Missing perceivedFatigue must throw');
  });

  test('Missing values: Throws TypeError when sleepHours is missing', () => {
    const input = {
      mode: 'student',
      focusMinutes: 50,
      breakMinutes: 10,
      perceivedFatigue: 5,
      sessionDate: '2026-11-13',
    } as unknown as SessionInput;
    assertThrows(() => calculateCFI(input), TypeError, 'Missing sleepHours must throw');
  });

  test('Missing values: Throws TypeError when focusMinutes or breakMinutes is missing', () => {
    const noFocus = {
      mode: 'developer',
      breakMinutes: 10,
      sleepHours: 7,
      perceivedFatigue: 5,
      sessionDate: '2026-11-13',
    } as unknown as SessionInput;
    assertThrows(() => calculateCFI(noFocus), TypeError, 'Missing focusMinutes must throw');

    const noBreak = {
      mode: 'developer',
      focusMinutes: 50,
      sleepHours: 7,
      perceivedFatigue: 5,
      sessionDate: '2026-11-13',
    } as unknown as SessionInput;
    assertThrows(() => calculateCFI(noBreak), TypeError, 'Missing breakMinutes must throw');
  });

  test('Missing values: Throws TypeError when mode is invalid or missing', () => {
    const invalidMode = {
      mode: 'unknown',
      focusMinutes: 50,
      breakMinutes: 10,
      sleepHours: 8,
      perceivedFatigue: 3,
      sessionDate: '2026-11-13',
    } as unknown as SessionInput;
    assertThrows(() => calculateCFI(invalidMode), TypeError, 'Invalid mode must throw');
  });

  // 7. NaN and Infinity Handling
  test('NaN inputs: Explicitly rejected with TypeError', () => {
    const base: SessionInput = {
      mode: 'student',
      focusMinutes: 50,
      breakMinutes: 10,
      sleepHours: 8,
      perceivedFatigue: 5,
      sessionDate: '2026-11-13',
    };
    assertThrows(() => calculateCFI({ ...base, perceivedFatigue: Number.NaN }), TypeError);
    assertThrows(() => calculateCFI({ ...base, sleepHours: Number.NaN }), TypeError);
    assertThrows(() => calculateCFI({ ...base, focusMinutes: Number.NaN }), TypeError);
    assertThrows(() => calculateCFI({ ...base, breakMinutes: Number.NaN }), TypeError);
  });

  test('Infinity inputs: Explicitly rejected with TypeError', () => {
    const base: SessionInput = {
      mode: 'developer',
      focusMinutes: 50,
      breakMinutes: 10,
      sleepHours: 8,
      perceivedFatigue: 5,
      sessionDate: '2026-11-13',
    };
    assertThrows(() => calculateCFI({ ...base, perceivedFatigue: Number.POSITIVE_INFINITY }), TypeError);
    assertThrows(() => calculateCFI({ ...base, sleepHours: Number.POSITIVE_INFINITY }), TypeError);
    assertThrows(() => calculateCFI({ ...base, focusMinutes: Number.POSITIVE_INFINITY }), TypeError);
    assertThrows(() => calculateCFI({ ...base, breakMinutes: Number.NEGATIVE_INFINITY }), TypeError);
  });

  // 8. Negative Inputs
  test('Negative inputs: Explicitly rejected with RangeError', () => {
    const base: SessionInput = {
      mode: 'developer',
      focusMinutes: 50,
      breakMinutes: 10,
      sleepHours: 8,
      perceivedFatigue: 5,
      sessionDate: '2026-11-13',
    };
    assertThrows(() => calculateCFI({ ...base, focusMinutes: -10 }), RangeError, 'Negative focusMinutes must throw');
    assertThrows(() => calculateCFI({ ...base, breakMinutes: -5 }), RangeError, 'Negative breakMinutes must throw');
    assertThrows(() => calculateCFI({ ...base, sleepHours: -2 }), RangeError, 'Negative sleepHours must throw');
    assertThrows(() => calculateCFI({ ...base, perceivedFatigue: -1 }), RangeError, 'Negative perceivedFatigue must throw');
  });

  // 9. Values Outside Permitted Ranges
  test('Values outside permitted ranges: Explicitly rejected with RangeError', () => {
    const base: SessionInput = {
      mode: 'student',
      focusMinutes: 50,
      breakMinutes: 10,
      sleepHours: 8,
      perceivedFatigue: 5,
      sessionDate: '2026-11-13',
    };
    assertThrows(() => calculateCFI({ ...base, perceivedFatigue: 0 }), RangeError, 'Fatigue 0 must throw (scale is 1-10)');
    assertThrows(() => calculateCFI({ ...base, perceivedFatigue: 11 }), RangeError, 'Fatigue 11 must throw');
    assertThrows(() => calculateCFI({ ...base, sleepHours: 25 }), RangeError, 'Sleep > 24h must throw');
  });

  // 10. Precise Explanations & Wording Checks
  test('Explanations: Uses precise 1-decimal reporting and clarifies experimental baseline', () => {
    const input: SessionInput = {
      mode: 'student',
      focusMinutes: 60,
      breakMinutes: 5,
      sleepHours: 6.5,
      perceivedFatigue: 6,
      sessionDate: '2026-11-13',
    };
    const result = calculateCFI(input);
    assert(result.explanation.some((e) => e.includes('experimental reference baseline')), 'Should mention experimental baseline');
    assert(result.explanation.some((e) => e.includes('prototype 1:5 break-to-focus heuristic')), 'Should mention prototype heuristic');
    assert(result.explanation.some((e) => e.includes('unrounded component sum')), 'Should clarify unrounded component sum');
  });

  // 11. Mode-Specific Recommendations & Cautious Language
  test('Recommendations: Student mode receives cautious, study-tailored advice', () => {
    const input: SessionInput = {
      mode: 'student',
      focusMinutes: 90,
      breakMinutes: 0,
      sleepHours: 5,
      perceivedFatigue: 8,
      sessionDate: '2026-11-13',
    };
    const result = calculateCFI(input);
    assert(result.recommendations.some((r) => r.description.toLowerCase().includes('study')), 'Student recommendation should mention study');
    // Ensure no unsupported causal claims
    assert(!result.recommendations.some((r) => r.description.includes('significantly increases syntax')), 'No causal coding error claim');
    assert(!result.recommendations.some((r) => r.description.includes('limits memory retention')), 'No causal memory retention claim');
  });

  test('Recommendations: Developer mode receives cautious, code-tailored advice', () => {
    const input: SessionInput = {
      mode: 'developer',
      focusMinutes: 90,
      breakMinutes: 0,
      sleepHours: 5,
      perceivedFatigue: 8,
      sessionDate: '2026-11-13',
    };
    const result = calculateCFI(input);
    assert(result.recommendations.some((r) => r.description.toLowerCase().includes('code') || r.description.toLowerCase().includes('keyboard')), 'Developer recommendation should mention code/keyboard');
    // Ensure no unsupported causal claims
    assert(!result.recommendations.some((r) => r.description.includes('significantly increases syntax')), 'No causal coding error claim');
  });

  console.log(`\nResults: ${passed}/${total} tests passed.`);
  if (passed !== total) {
    throw new Error(`Test suite failed: ${total - passed} test(s) failed.`);
  }
}

// Execute tests
runTests();
