import type { CFIResult, SessionInput } from '../types'

export function estimateCfi(input: Pick<SessionInput, 'sleepHours' | 'perceivedFatigue' | 'focusMinutes'>): CFIResult {
  const fatigueLoad = Math.max(0, input.perceivedFatigue - 1) * 5.2
  const sleepLoad = Math.max(0, 7.5 - input.sleepHours) * 5.5
  const longSessionLoad = Math.max(0, input.focusMinutes - 45) * 0.16
  const score = Math.round(Math.min(96, Math.max(8, 18 + fatigueLoad + sleepLoad + longSessionLoad)))
  const riskLevel = score < 36 ? 'low' : score < 66 ? 'moderate' : 'high'

  const explanation = [
    `Self-reported fatigue: ${input.perceivedFatigue}/10`,
    `${input.sleepHours.toFixed(1)} hours of sleep logged`,
    `${input.focusMinutes} minutes in this focus block`,
  ]

  const recommendations = [
    {
      title: riskLevel === 'low' ? 'Keep your current pace' : 'Make your next block lighter',
      description: riskLevel === 'low'
        ? 'Your recent check-in looks steady. Keep pairing focused work with real recovery.'
        : 'Try a shorter focus block and take a screen-free break before continuing.',
      priority: riskLevel === 'high' ? 'high' as const : 'medium' as const,
    },
    {
      title: 'Check in with yourself',
      description: 'This estimate is a reflection aid, not a diagnosis. Your own experience comes first.',
      priority: 'low' as const,
    },
  ]

  return { score, riskLevel, explanation, recommendations }
}

export const getRiskLabel = (risk: CFIResult['riskLevel']) => {
  if (risk === 'low') return 'Steady'
  if (risk === 'moderate') return 'Take it gently'
  return 'Recovery needed'
}
