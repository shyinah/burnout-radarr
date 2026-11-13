import type { SessionInput, CFIResult, Recommendation } from '../../types/index.ts';

/**
 * Cognitive Fatigue Index (CFI) Engine
 *
 * A transparent, deterministic, rule-based calculator that estimates cognitive
 * fatigue concern on a 0–100 scale based on three weighted factors:
 *   1. Self-reported fatigue: 50%
 *   2. Sleep deficit: 25% (using 8 hours as an experimental reference baseline, not a universal requirement)
 *   3. Break deficit: 25% (using ~1 min break per 5 min focus as a prototype heuristic, not a scientifically established requirement)
 *
 * Note: This index is an exploratory productivity and wellness heuristic. It is neither
 * diagnostic nor medically validated, and does not use AI/machine learning.
 */

// Experimental reference constants
const REFERENCE_SLEEP_HOURS = 8; // Experimental reference baseline, not a universal requirement
const FOCUS_MINUTES_PER_BREAK_MINUTE = 5; // Prototype heuristic: ~1 min break per 5 min focus

const FATIGUE_SCALE_MIN = 1;
const FATIGUE_SCALE_MAX = 10;

const WEIGHT_FATIGUE = 50; // 50% max points
const WEIGHT_SLEEP = 25;   // 25% max points
const WEIGHT_BREAKS = 25;  // 25% max points

/**
 * Pure function to calculate the Cognitive Fatigue Index (CFI) from a session check-in.
 *
 * Missing or invalid required inputs are explicitly rejected with descriptive errors
 * to ensure incomplete check-ins cannot produce misleadingly reassuring results.
 *
 * @param input - The session details (mode, sleep, focus, breaks, perceived fatigue)
 * @returns CFIResult containing score (0-100), riskLevel, explanation, and recommendations
 * @throws TypeError if a required input is missing, non-finite, or of invalid type
 * @throws RangeError if a numeric input is outside its permitted range
 */
export function calculateCFI(input: SessionInput): CFIResult {
  // 1. Explicit validation of required inputs
  if (!input || typeof input !== 'object') {
    throw new TypeError('Invalid input: A valid SessionInput object is required.');
  }

  if (input.mode !== 'student' && input.mode !== 'developer') {
    throw new TypeError("Invalid mode: mode must be either 'student' or 'developer'.");
  }

  if (
    input.perceivedFatigue === undefined ||
    input.perceivedFatigue === null ||
    !Number.isFinite(input.perceivedFatigue)
  ) {
    throw new TypeError(
      'Invalid perceivedFatigue: perceivedFatigue is required and must be a finite number.'
    );
  }

  if (input.perceivedFatigue < FATIGUE_SCALE_MIN || input.perceivedFatigue > FATIGUE_SCALE_MAX) {
    throw new RangeError(
      `Invalid perceivedFatigue: perceivedFatigue must be between ${FATIGUE_SCALE_MIN} and ${FATIGUE_SCALE_MAX}.`
    );
  }

  if (
    input.sleepHours === undefined ||
    input.sleepHours === null ||
    !Number.isFinite(input.sleepHours)
  ) {
    throw new TypeError('Invalid sleepHours: sleepHours is required and must be a finite number.');
  }

  if (input.sleepHours < 0 || input.sleepHours > 24) {
    throw new RangeError('Invalid sleepHours: sleepHours must be between 0 and 24.');
  }

  if (
    input.focusMinutes === undefined ||
    input.focusMinutes === null ||
    !Number.isFinite(input.focusMinutes)
  ) {
    throw new TypeError(
      'Invalid focusMinutes: focusMinutes is required and must be a finite number.'
    );
  }

  if (input.focusMinutes < 0) {
    throw new RangeError('Invalid focusMinutes: focusMinutes cannot be negative.');
  }

  if (
    input.breakMinutes === undefined ||
    input.breakMinutes === null ||
    !Number.isFinite(input.breakMinutes)
  ) {
    throw new TypeError(
      'Invalid breakMinutes: breakMinutes is required and must be a finite number.'
    );
  }

  if (input.breakMinutes < 0) {
    throw new RangeError('Invalid breakMinutes: breakMinutes cannot be negative.');
  }

  // 2. Factor 1: Self-reported fatigue (50% weight)
  // Perceived fatigue is rated 1-10.
  // 1 = fully alert/minimal fatigue (0% concern), 10 = extreme fatigue (100% concern).
  const fatigueRatio = (input.perceivedFatigue - FATIGUE_SCALE_MIN) / (FATIGUE_SCALE_MAX - FATIGUE_SCALE_MIN);
  const fatigueScore = fatigueRatio * WEIGHT_FATIGUE;

  // 3. Factor 2: Sleep deficit relative to reference baseline (25% weight)
  // 8 hours is used as an experimental reference baseline for comparison, not a universal individual requirement.
  const sleepDeficit = Math.max(0, REFERENCE_SLEEP_HOURS - input.sleepHours);
  const sleepDeficitRatio = Math.min(1, sleepDeficit / REFERENCE_SLEEP_HOURS);
  const sleepScore = sleepDeficitRatio * WEIGHT_SLEEP;

  // 4. Factor 3: Break deficit relative to focus duration (25% weight)
  // Evaluated against a prototype heuristic of ~1 min break per 5 min focus, not a scientifically established requirement.
  let breakScore = 0;
  let targetBreakMinutes = 0;
  let breakDeficit = 0;

  if (input.focusMinutes > 0) {
    targetBreakMinutes = input.focusMinutes / FOCUS_MINUTES_PER_BREAK_MINUTE;
    breakDeficit = Math.max(0, targetBreakMinutes - input.breakMinutes);
    const breakDeficitRatio = Math.min(1, breakDeficit / targetBreakMinutes);
    breakScore = breakDeficitRatio * WEIGHT_BREAKS;
  }

  // 5. Total Score calculation: clamp between 0 and 100, round to integer
  const rawTotalScore = fatigueScore + sleepScore + breakScore;
  const score = Math.round(Math.min(100, Math.max(0, rawTotalScore)));

  // 6. Classify risk level
  // 0-33: low, 34-66: moderate, 67-100: high
  let riskLevel: 'low' | 'moderate' | 'high';
  if (score <= 33) {
    riskLevel = 'low';
  } else if (score <= 66) {
    riskLevel = 'moderate';
  } else {
    riskLevel = 'high';
  }

  // 7. Generate transparent, precise explanations
  // Individual contributions are reported with 1 decimal precision to avoid misleading rounding sums.
  const explanation: string[] = [];

  explanation.push(
    `Overall Cognitive Fatigue Index is ${score}/100 (unrounded component sum: ${rawTotalScore.toFixed(1)}), indicating a ${riskLevel} fatigue risk.`
  );

  // Fatigue explanation
  if (input.perceivedFatigue >= 8) {
    explanation.push(
      `Self-reported fatigue is elevated (${input.perceivedFatigue}/10), contributing ${fatigueScore.toFixed(1)} of 50.0 possible points.`
    );
  } else if (input.perceivedFatigue >= 4) {
    explanation.push(
      `Self-reported fatigue is moderate (${input.perceivedFatigue}/10), contributing ${fatigueScore.toFixed(1)} of 50.0 possible points.`
    );
  } else {
    explanation.push(
      `Self-reported fatigue is low (${input.perceivedFatigue}/10), contributing ${fatigueScore.toFixed(1)} of 50.0 possible points.`
    );
  }

  // Sleep explanation: clarify experimental reference baseline
  if (sleepDeficit > 0) {
    const deficitHours = (REFERENCE_SLEEP_HOURS - input.sleepHours).toFixed(1);
    explanation.push(
      `Recorded sleep (${input.sleepHours}h) was ${deficitHours}h below the experimental reference baseline (${REFERENCE_SLEEP_HOURS}h, used for comparison rather than a universal requirement), contributing ${sleepScore.toFixed(1)} of 25.0 possible points.`
    );
  } else {
    explanation.push(
      `Recorded sleep (${input.sleepHours}h) meets or exceeds the experimental reference baseline (${REFERENCE_SLEEP_HOURS}h), contributing 0.0 of 25.0 possible points.`
    );
  }

  // Break explanation: clarify prototype heuristic
  if (input.focusMinutes === 0) {
    explanation.push(
      `No active focus duration recorded, resulting in 0.0 break deficit points.`
    );
  } else if (breakDeficit > 0) {
    explanation.push(
      `Break balance: ${input.breakMinutes} min taken vs. ~${targetBreakMinutes.toFixed(1)} min suggested by the prototype 1:5 break-to-focus heuristic (${input.focusMinutes} min focus), contributing ${breakScore.toFixed(1)} of 25.0 possible points.`
    );
  } else {
    explanation.push(
      `Break balance: ${input.breakMinutes} min taken satisfies the prototype 1:5 break-to-focus heuristic for ${input.focusMinutes} min of focus (contributing 0.0 of 25.0 possible points).`
    );
  }

  // 8. Generate actionable, practical recommendations with cautious language
  const recommendations: Recommendation[] = [];
  const mode = input.mode;

  // High fatigue trigger
  if (input.perceivedFatigue >= 7) {
    if (mode === 'developer') {
      recommendations.push({
        title: 'Step Away from the Keyboard',
        description:
          'Working through elevated fatigue can make sustained concentration on complex code more challenging. Consider saving your progress and taking a 20–30 minute offline pause to rest.',
        priority: 'high',
      });
    } else {
      recommendations.push({
        title: 'Take an Immediate Study Break',
        description:
          'Studying through elevated fatigue can make absorbing new concepts more difficult. Consider stepping away from study materials and screens for at least 20 minutes to rest.',
        priority: 'high',
      });
    }
  }

  // Sleep deficit trigger
  if (input.sleepHours < 6) {
    recommendations.push({
      title: 'Prioritize Sleep Recovery Tonight',
      description:
        'Getting less sleep than the 8-hour experimental reference baseline may make it harder to maintain daily focus. Consider allowing more time for rest tonight.',
      priority: 'high',
    });
  } else if (input.sleepHours < REFERENCE_SLEEP_HOURS) {
    recommendations.push({
      title: 'Adjust Sleep Schedule',
      description: `You recorded ${(REFERENCE_SLEEP_HOURS - input.sleepHours).toFixed(1)} hours less than the experimental 8-hour reference baseline. Adding 30–60 minutes of rest tonight may help support tomorrow's focus.`,
      priority: 'medium',
    });
  }

  // Break deficit trigger
  if (input.focusMinutes >= 45 && breakDeficit > 0) {
    if (mode === 'developer') {
      recommendations.push({
        title: 'Consider 50/10 Coding Intervals',
        description:
          'As a practical suggestion based on our prototype 1:5 pacing heuristic, you might try taking a 10-minute break for roughly every 50 minutes of deep coding to help pace your work and maintain comfort.',
        priority: riskLevel === 'high' ? 'high' : 'medium',
      });
    } else {
      recommendations.push({
        title: 'Consider Pomodoro Study Intervals',
        description:
          'As a practical suggestion based on our prototype 1:5 pacing heuristic, you might try dividing study blocks into 25–50 minute sessions followed by a 5–10 minute break to help pace your study session.',
        priority: riskLevel === 'high' ? 'high' : 'medium',
      });
    }
  }

  // General pacing recommendations if few specific issues triggered
  if (riskLevel === 'high' && recommendations.length === 0) {
    recommendations.push({
      title: 'Consider a Recovery Break',
      description:
        'Your combined check-in factors place this session in the high fatigue risk zone. Consider stepping back from high-intensity tasks to allow time for recovery.',
      priority: 'high',
    });
  } else if (riskLevel === 'moderate' && recommendations.length === 0) {
    recommendations.push({
      title: 'Pace Your Remaining Tasks',
      description:
        'Fatigue indicators suggest pacing is warranted. Consider scheduling complex tasks during your peak energy hours and tackling lighter tasks when energy dips.',
      priority: 'medium',
    });
  } else if (riskLevel === 'low') {
    if (mode === 'developer') {
      recommendations.push({
        title: 'Maintain Your Coding Rhythm',
        description:
          'Your focus and rest balance is in an optimal zone. Continue taking regular short pauses as you develop.',
        priority: 'low',
      });
    } else {
      recommendations.push({
        title: 'Maintain Your Study Rhythm',
        description:
          'Your study intervals and sleep balance appear well-managed. Continue taking regular short pauses as a practical way to pace your study sessions.',
        priority: 'low',
      });
    }

    recommendations.push({
      title: 'Hydration and Ergonomics Check',
      description:
        'Even during smooth flow sessions, remember to hydrate and stretch periodically to reduce physical strain.',
      priority: 'low',
    });
  }

  return {
    score,
    riskLevel,
    explanation,
    recommendations,
  };
}
