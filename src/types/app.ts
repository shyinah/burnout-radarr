import type { SessionRecord } from './index'

export type AppPage =
  | 'overview'
  | 'student'
  | 'developer'
  | 'sessions'
  | 'insights'
  | 'recommendations'
  | 'settings'

export type Theme = 'light' | 'dark'

export interface FocusSession extends SessionRecord {
  label: string
  startedAt: string
}

export interface SessionDefaults {
  focusMinutes: number
  breakMinutes: number
}

export interface ActivityDay {
  day: string
  focusMinutes: number
  recoveryMinutes: number
}

export interface CfiDay {
  day: string
  score: number
}

export interface ActionableRecommendation {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  category: string
  actionLabel: string
  actionPage: AppPage
}
