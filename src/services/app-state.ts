import type { Recommendation, SessionRecord, UserMode } from '../types/index.ts'

export type AppPage = 'overview' | 'check-in' | 'wearable' | 'activity' | 'insights' | 'settings'
export type AppTheme = 'light' | 'dark' | 'system'

export interface SavedSession extends SessionRecord {
  title: string
  subject: string
  project: string
  category: string
  description: string
  goal: string
  completed: boolean
  pendingCFI: boolean
  feeling: string
  endFatigue?: number
  /** False when legacy required storage fields contain compatibility sentinels, not check-in data. */
  checkInContextAvailable?: boolean
  /** Session was kept locally because the current database schema requires check-in values. */
  localOnly?: boolean
  cfiRiskLevel?: 'low' | 'moderate' | 'high'
  cfiExplanation?: string[]
  cfiRecommendations?: Recommendation[]
}

export interface StudyTask {
  id: string
  title: string
  subject: string
  minutes: number
  completed: boolean
}

export interface ProjectItem {
  id: string
  name: string
  detail: string
  color: string
  archived: boolean
}

export interface WorkLogItem {
  id: string
  project: string
  category: string
  description: string
  date: string
}

export interface DailyCheckIn {
  id: string
  recordedAt: string
  sleepHours: number
  fatigue: number
  note: string
}

export type CheckInPeriod = 'morning' | 'evening'
export type CheckInAnswerValue = string | number

/** Versioned, period-specific answers shaped for local storage and future provider sync. */
export interface CheckInRecord {
  id: string
  period: CheckInPeriod
  date: string
  recordedAt: string
  schemaVersion: number
  answers: Record<string, CheckInAnswerValue>
}

export interface AppPreferences {
  name: string
  defaultMode: UserMode
  theme: AppTheme
  focusMinutes: number
  breakMinutes: number
  breakReminders: boolean
  notifications: boolean
}

export interface AppData {
  sessions: SavedSession[]
  tasks: StudyTask[]
  projects: ProjectItem[]
  workLogs: WorkLogItem[]
  checkIns: CheckInRecord[]
  /** Previous single-form check-ins are retained for existing CFI/session history compatibility. */
  legacyDailyCheckIns: DailyCheckIn[]
  preferences: AppPreferences
}

export interface FocusSessionDraft {
  title: string
  subject: string
  project: string
  category: string
  description: string
  goal: string
  focusMinutes: number
  breakMinutes: number
}

export interface SessionDraft extends FocusSessionDraft {
  /** Legacy classification and check-in contract used by existing session helpers. */
  mode?: UserMode
  /** Legacy input contract; the unified timer fills these from the latest separate check-in. */
  sleepHours: number
  perceivedFatigue: number
}

const dateAt = (daysAgo: number, hour: number) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const sampleSession = (input: {
  id: string
  daysAgo: number
  hour: number
  mode: UserMode
  title: string
  subject: string
  project?: string
  category: string
  focusMinutes: number
  breakMinutes: number
  sleepHours: number
  fatigue: number
  score: number
  completed?: boolean
}): SavedSession => ({
  id: input.id,
  userId: 'demo-user',
  mode: input.mode,
  title: input.title,
  subject: input.subject,
  project: input.project ?? '',
  category: input.category,
  description: input.title,
  goal: '',
  focusMinutes: input.focusMinutes,
  breakMinutes: input.breakMinutes,
  sleepHours: input.sleepHours,
  perceivedFatigue: input.fatigue,
  sessionDate: dateAt(input.daysAgo, input.hour),
  cfiScore: input.score,
  cfiRiskLevel: input.score <= 33 ? 'low' : input.score <= 66 ? 'moderate' : 'high',
  cfiExplanation: [
    `Overall Cognitive Fatigue Index is ${input.score}/100, indicating a ${input.score <= 33 ? 'low' : input.score <= 66 ? 'moderate' : 'high'} fatigue risk.`,
    `Self-reported fatigue: ${input.fatigue}/10`,
    `Recorded sleep: ${input.sleepHours} hours`,
    `Break duration: ${input.breakMinutes} minutes planned`,
  ],
  cfiRecommendations: [
    {
      title: input.score > 66 ? 'Recovery break' : input.score > 33 ? 'Pace your focus' : 'Steady rhythm',
      description: input.score > 66
        ? 'Consider taking time to step back and rest before resuming.'
        : 'Continue with balanced focus blocks and short breaks.',
      priority: input.score > 66 ? 'high' : input.score > 33 ? 'medium' : 'low',
    },
  ],
  completed: input.completed ?? true,
  pendingCFI: false,
  feeling: 'Steady',
})

export const DEFAULT_PREFERENCES: AppPreferences = {
  name: 'Taylor',
  defaultMode: 'student',
  theme: 'light',
  focusMinutes: 50,
  breakMinutes: 10,
  breakReminders: true,
  notifications: true,
}

export function createDemoData(): AppData {
  return {
    preferences: { ...DEFAULT_PREFERENCES },
    sessions: [
      sampleSession({ id: 'demo-1', daysAgo: 0, hour: 9, mode: 'student', title: 'Algebra problem set', subject: 'Mathematics', category: 'Study', focusMinutes: 48, breakMinutes: 10, sleepHours: 7.5, fatigue: 3, score: 42 }),
      sampleSession({ id: 'demo-2', daysAgo: 0, hour: 11, mode: 'student', title: 'Cell structure notes', subject: 'Biology', category: 'Study', focusMinutes: 35, breakMinutes: 8, sleepHours: 7.5, fatigue: 4, score: 39 }),
      sampleSession({ id: 'demo-3', daysAgo: 1, hour: 14, mode: 'developer', title: 'Refactor navigation state', subject: 'Orbit Notes', project: 'Orbit Notes', category: 'Coding', focusMinutes: 72, breakMinutes: 12, sleepHours: 7, fatigue: 4, score: 41 }),
      sampleSession({ id: 'demo-4', daysAgo: 1, hour: 10, mode: 'student', title: 'Electromagnetism review', subject: 'Physics', category: 'Study', focusMinutes: 54, breakMinutes: 10, sleepHours: 7, fatigue: 5, score: 44 }),
      sampleSession({ id: 'demo-5', daysAgo: 2, hour: 15, mode: 'developer', title: 'Trace sync edge case', subject: 'Fieldnotes', project: 'Fieldnotes', category: 'Debugging', focusMinutes: 46, breakMinutes: 9, sleepHours: 6.5, fatigue: 5, score: 48 }),
      sampleSession({ id: 'demo-6', daysAgo: 3, hour: 9, mode: 'student', title: 'Organic chemistry flashcards', subject: 'Chemistry', category: 'Review', focusMinutes: 40, breakMinutes: 10, sleepHours: 8, fatigue: 2, score: 35 }),
      sampleSession({ id: 'demo-7', daysAgo: 4, hour: 13, mode: 'developer', title: 'Read API migration notes', subject: 'Orbit Notes', project: 'Orbit Notes', category: 'Research', focusMinutes: 63, breakMinutes: 10, sleepHours: 6, fatigue: 6, score: 51 }),
      sampleSession({ id: 'demo-8', daysAgo: 5, hour: 11, mode: 'student', title: 'Data structures practice', subject: 'Computer Science', category: 'Practice', focusMinutes: 58, breakMinutes: 12, sleepHours: 7.5, fatigue: 3, score: 40 }),
      sampleSession({ id: 'demo-9', daysAgo: 6, hour: 10, mode: 'developer', title: 'Document component API', subject: 'Fieldnotes', project: 'Fieldnotes', category: 'Documentation', focusMinutes: 38, breakMinutes: 8, sleepHours: 7, fatigue: 4, score: 43 }),
    ],
    tasks: [
      { id: 'task-1', title: 'Review chapter 6 notes', subject: 'Physics', minutes: 35, completed: true },
      { id: 'task-2', title: 'Practice integration problems', subject: 'Mathematics', minutes: 50, completed: false },
      { id: 'task-3', title: 'Make a chemistry summary sheet', subject: 'Chemistry', minutes: 25, completed: false },
    ],
    projects: [
      { id: 'project-1', name: 'Orbit Notes', detail: 'A calmer space for ideas', color: 'lilac', archived: false },
      { id: 'project-2', name: 'Fieldnotes', detail: 'Personal knowledge garden', color: 'sage', archived: false },
    ],
    workLogs: [
      { id: 'log-1', project: 'Orbit Notes', category: 'Coding', description: 'Refactored navigation state', date: dateAt(0, 11) },
      { id: 'log-2', project: 'Fieldnotes', category: 'Debugging', description: 'Traced sync edge case', date: dateAt(1, 15) },
    ],
    checkIns: [],
    legacyDailyCheckIns: [],
  }
}
