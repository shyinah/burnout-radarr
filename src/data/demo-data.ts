import type { Recommendation } from '../types'
import type { ActionableRecommendation, ActivityDay, CfiDay, FocusSession } from '../types/app'

const dateDaysAgo = (days: number, hour = 14) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

export const demoSessions: FocusSession[] = [
  {
    id: 'demo-1',
    label: 'Research methods',
    mode: 'student',
    focusMinutes: 42,
    breakMinutes: 8,
    sleepHours: 7.5,
    perceivedFatigue: 3,
    sessionDate: dateDaysAgo(0, 9),
    startedAt: dateDaysAgo(0, 9),
    cfiScore: 26,
  },
  {
    id: 'demo-2',
    label: 'Radarr interface',
    mode: 'developer',
    focusMinutes: 54,
    breakMinutes: 10,
    sleepHours: 7,
    perceivedFatigue: 4,
    sessionDate: dateDaysAgo(0, 11),
    startedAt: dateDaysAgo(0, 11),
    cfiScore: 31,
  },
  {
    id: 'demo-3',
    label: 'Literature review',
    mode: 'student',
    focusMinutes: 35,
    breakMinutes: 7,
    sleepHours: 6.5,
    perceivedFatigue: 5,
    sessionDate: dateDaysAgo(1, 15),
    startedAt: dateDaysAgo(1, 15),
    cfiScore: 43,
  },
  {
    id: 'demo-4',
    label: 'API integration',
    mode: 'developer',
    focusMinutes: 48,
    breakMinutes: 9,
    sleepHours: 7.8,
    perceivedFatigue: 3,
    sessionDate: dateDaysAgo(2, 10),
    startedAt: dateDaysAgo(2, 10),
    cfiScore: 24,
  },
  {
    id: 'demo-5',
    label: 'Exam preparation',
    mode: 'student',
    focusMinutes: 29,
    breakMinutes: 6,
    sleepHours: 6.2,
    perceivedFatigue: 6,
    sessionDate: dateDaysAgo(3, 13),
    startedAt: dateDaysAgo(3, 13),
    cfiScore: 52,
  },
]

export const demoActivity: ActivityDay[] = [
  { day: 'Mon', focusMinutes: 86, recoveryMinutes: 22 },
  { day: 'Tue', focusMinutes: 114, recoveryMinutes: 28 },
  { day: 'Wed', focusMinutes: 72, recoveryMinutes: 20 },
  { day: 'Thu', focusMinutes: 132, recoveryMinutes: 34 },
  { day: 'Fri', focusMinutes: 96, recoveryMinutes: 26 },
  { day: 'Sat', focusMinutes: 58, recoveryMinutes: 18 },
  { day: 'Sun', focusMinutes: 42, recoveryMinutes: 14 },
]

export const demoCfiTrend: CfiDay[] = [
  { day: 'Mon', score: 38 },
  { day: 'Tue', score: 34 },
  { day: 'Wed', score: 41 },
  { day: 'Thu', score: 29 },
  { day: 'Fri', score: 32 },
  { day: 'Sat', score: 27 },
  { day: 'Sun', score: 24 },
]

export const demoRecommendations: ActionableRecommendation[] = [
  {
    id: 'rec-1',
    title: 'Keep your next block shorter',
    description: 'Your fatigue check-in is trending up. Try a 25-minute focus block, then take a real screen break.',
    priority: 'high',
    category: 'Pacing',
    actionLabel: 'Start a short session',
    actionPage: 'student',
  },
  {
    id: 'rec-2',
    title: 'Protect your wind-down',
    description: 'Your best sessions follow a steadier sleep routine. Leave a little space between work and bedtime tonight.',
    priority: 'medium',
    category: 'Recovery',
    actionLabel: 'Review your routine',
    actionPage: 'insights',
  },
  {
    id: 'rec-3',
    title: 'A small win still counts',
    description: 'You have shown up consistently this week. One focused block is enough to keep the rhythm going.',
    priority: 'low',
    category: 'Momentum',
    actionLabel: 'View focus sessions',
    actionPage: 'sessions',
  },
]

export const cfiGuidance: Recommendation[] = [
  {
    title: 'Make room for recovery',
    description: 'Take a short, screen-free break before your next focused block.',
    priority: 'high',
  },
  {
    title: 'Keep a steady rhythm',
    description: 'A consistent stop time can make tomorrow feel more manageable.',
    priority: 'medium',
  },
]
