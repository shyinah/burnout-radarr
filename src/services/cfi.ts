import type { CFIResult, SessionInput } from '../types'

export type CFIEngine = (input: SessionInput) => CFIResult | Promise<CFIResult>

export async function evaluateWithCFI(
  input: SessionInput,
  engine?: CFIEngine,
): Promise<CFIResult | null> {
  if (!engine) return null
  return engine(input)
}
