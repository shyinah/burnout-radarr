import type { ActivityTrackerAPI } from './activity.ts'

declare global {
  interface Window {
    electron?: {
      activityTracker?: ActivityTrackerAPI
      [key: string]: unknown
    }
    api?: {
      activityTracker?: ActivityTrackerAPI
      [key: string]: unknown
    }
  }
}

export {}
