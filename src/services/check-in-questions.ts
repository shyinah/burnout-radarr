import type { CheckInAnswerValue, CheckInPeriod } from './app-state.ts'

export interface CheckInQuestion {
  id: string
  prompt: string
  type: 'rating' | 'choice'
  options: { value: CheckInAnswerValue; label: string }[]
}

const rating = (labels: string[]) => labels.map((label, index) => ({ value: index + 1, label }))

export const checkInQuestions: Record<CheckInPeriod, CheckInQuestion[]> = {
  morning: [
    { id: 'energy', prompt: 'How is your energy at the start of today?', type: 'rating', options: rating(['Very low', 'Low', 'Okay', 'Good', 'Very high']) },
    { id: 'sleepQuality', prompt: 'How was your sleep last night?', type: 'rating', options: rating(['Very poor', 'Poor', 'Fair', 'Good', 'Very good']) },
    { id: 'mood', prompt: 'How would you describe your mood this morning?', type: 'choice', options: [{ value: 'low', label: 'Low' }, { value: 'slightly-low', label: 'A little low' }, { value: 'neutral', label: 'Neutral' }, { value: 'good', label: 'Good' }, { value: 'very-good', label: 'Very good' }] },
    { id: 'readiness', prompt: 'How ready do you feel for the day ahead?', type: 'rating', options: rating(['Not ready', 'A little ready', 'Somewhat ready', 'Mostly ready', 'Very ready']) },
    { id: 'pace', prompt: 'What pace feels right for today?', type: 'choice', options: [{ value: 'gentle', label: 'Gentle' }, { value: 'steady', label: 'Steady' }, { value: 'focused', label: 'Focused' }, { value: 'flexible', label: 'Flexible' }, { value: 'unsure', label: 'Not sure yet' }] },
  ],
  evening: [
    { id: 'energy', prompt: 'How is your energy at the end of today?', type: 'rating', options: rating(['Very low', 'Low', 'Okay', 'Good', 'Very high']) },
    { id: 'workload', prompt: 'How demanding did today’s workload feel?', type: 'rating', options: rating(['Very light', 'Light', 'Manageable', 'Heavy', 'Very heavy']) },
    { id: 'concentration', prompt: 'How well were you able to concentrate today?', type: 'rating', options: rating(['Very difficult', 'Difficult', 'Mixed', 'Well', 'Very well']) },
    { id: 'breaks', prompt: 'How often did you take breaks or pauses today?', type: 'choice', options: [{ value: 'none', label: 'Not at all' }, { value: 'once', label: 'Once' }, { value: 'few', label: 'A few times' }, { value: 'regularly', label: 'Regularly' }, { value: 'as-needed', label: 'As needed' }] },
    { id: 'overall', prompt: 'Overall, how did today feel?', type: 'choice', options: [{ value: 'very-difficult', label: 'Very difficult' }, { value: 'difficult', label: 'Difficult' }, { value: 'mixed', label: 'Mixed' }, { value: 'good', label: 'Good' }, { value: 'very-good', label: 'Very good' }] },
  ],
}
