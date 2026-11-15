import type { SavedSession } from './app-state.ts'

export interface CfiExplanationSections {
  subjective: string[]
  wearable: string[]
  activity: string[]
  other: string[]
  pendingReasons: string[]
}

export interface DashboardCfiState {
  status: 'empty' | 'pending' | 'scored'
  latestSession: SavedSession | null
  latestScoredSession: SavedSession | null
  isUnified: boolean
  sections: CfiExplanationSections
}

function isScored(session: SavedSession): boolean {
  return !session.pendingCFI && Number.isFinite(session.cfiScore) && session.cfiScore >= 0 && session.cfiScore <= 100
}

export function isUnifiedCfiExplanation(explanation: readonly string[] | undefined): boolean {
  return Boolean(explanation?.some((line) =>
    line.startsWith('Unified CFI:') ||
    line.startsWith('Unified CFI pending:') ||
    line.startsWith('Subjective fatigue indicator:') ||
    line.startsWith('Wearable domain:')
  ))
}

export function splitCfiExplanation(explanation: readonly string[] | undefined): CfiExplanationSections {
  const sections: CfiExplanationSections = { subjective: [], wearable: [], activity: [], other: [], pendingReasons: [] }
  for (const line of explanation ?? []) {
    if (line.startsWith('Subjective fatigue indicator:')) sections.subjective.push(line)
    else if (line.startsWith('Browser activity')) sections.activity.push(line)
    else if (line.startsWith('Wearable domain:') || line.startsWith('rmssd individual reading') || line.startsWith('sleep_duration_hours individual reading')) sections.wearable.push(line)
    else sections.other.push(line)

    if (/unavailable|pending|missing data|no fresh/i.test(line)) sections.pendingReasons.push(line)
  }
  return sections
}

export function selectDashboardCfiState(sessions: readonly SavedSession[]): DashboardCfiState {
  const ordered = [...sessions].sort((a, b) => {
    const aTime = Date.parse(a.sessionDate)
    const bTime = Date.parse(b.sessionDate)
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
  })
  const latestSession = ordered[0] ?? null
  const latestScoredSession = ordered.find(isScored) ?? null

  if (!latestSession) {
    return {
      status: 'empty',
      latestSession: null,
      latestScoredSession: null,
      isUnified: false,
      sections: splitCfiExplanation(undefined),
    }
  }

  const sections = splitCfiExplanation(latestSession.cfiExplanation)
  return {
    status: isScored(latestSession) ? 'scored' : 'pending',
    latestSession,
    latestScoredSession,
    isUnified: isUnifiedCfiExplanation(latestSession.cfiExplanation),
    sections,
  }
}
