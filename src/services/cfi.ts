import { calculateCFI } from '../features/cfi/calculateCFI.ts'
import type { CFIResult, SessionInput } from '../types/index.ts'

export type CFIEngine = (input: SessionInput) => CFIResult | Promise<CFIResult>

export { calculateCFI }

/**
 * Evaluates a session check-in using the Cognitive Fatigue Index (CFI) engine.
 * Defaults to the pure deterministic calculateCFI engine.
 *
 * @param input - Valid SessionInput with mode, sleepHours, focusMinutes, breakMinutes, perceivedFatigue
 * @param engine - Optional custom CFI engine (defaults to calculateCFI)
 * @returns Promise resolving to CFIResult or null if evaluation fails
 */
export async function evaluateWithCFI(
  input: SessionInput,
  engine: CFIEngine = calculateCFI,
): Promise<CFIResult | null> {
  try {
    return await engine(input)
  } catch (error) {
    console.error('CFI evaluation error:', error)
    return null
  }
}
