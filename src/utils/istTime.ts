export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night'

export interface ISTTimeInfo {
  hour: number
  minute: number
  timeString: string
  period: TimePeriod
  greeting: string
  xPercent: number
  yPercent: number
  phaseTitle: string
}

/**
 * Calculates current time and celestial position in Indian Standard Time (IST / Asia/Kolkata).
 */
export function getISTTimeInfo(customDate?: Date): ISTTimeInfo {
  const now = customDate ?? new Date()

  // Format into 24-hour hour & minute in IST
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(now)
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
  const totalMinutes = hour * 60 + minute

  let period: TimePeriod
  let greeting: string
  let phaseTitle: string

  // Time boundaries as requested:
  // Good morning (5:00 AM – 11:59 AM)
  // Good afternoon (12:00 PM – 4:59 PM)
  // Good evening (5:00 PM – 8:59 PM)
  // Good night (9:00 PM – 4:59 AM)
  if (hour >= 5 && hour < 12) {
    period = 'morning'
    greeting = 'Good morning'
    phaseTitle = 'Morning Sun · Rising'
  } else if (hour >= 12 && hour < 17) {
    period = 'afternoon'
    greeting = 'Good afternoon'
    phaseTitle = 'Zenith Sun · Midday Peak'
  } else if (hour >= 17 && hour < 21) {
    period = 'evening'
    greeting = 'Good evening'
    phaseTitle = 'Setting Sun · Golden Hour'
  } else {
    period = 'night'
    greeting = 'Good night'
    phaseTitle = 'Glowing Moon · Night Sky'
  }

  // Display time in 12-hour format with AM/PM
  const displayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const timeString = displayFormatter.format(now)

  // Calculate coordinates (xPercent, yPercent) along the parabolic arc:
  // Left (sunrise/morning) -> Center (noon zenith) -> Right (evening sunset into glowing moon)
  let x: number
  let y: number

  if (period === 'morning') {
    // 5:00 AM (300 mins) to 11:59 AM (719 mins)
    const progress = Math.max(0, Math.min(1, (totalMinutes - 300) / 420))
    x = 18 + progress * 26 // 18% to 44% (left side)
    y = 50 - progress * 30 // 50% down to 20% (rising)
  } else if (period === 'afternoon') {
    // 12:00 PM (720 mins) to 4:59 PM (1019 mins)
    const progress = Math.max(0, Math.min(1, (totalMinutes - 720) / 300))
    x = 44 + progress * 24 // 44% to 68% (center zenith)
    y = 16 + progress * 18 // 16% to 34% (high apex)
  } else if (period === 'evening') {
    // 5:00 PM (1020 mins) to 8:59 PM (1259 mins)
    const progress = Math.max(0, Math.min(1, (totalMinutes - 1020) / 240))
    x = 68 + progress * 18 // 68% to 86% (right side)
    y = 34 + progress * 22 // 34% to 56% (descending sunset)
  } else {
    // Night: Glowing moon positioned on the right
    x = 82
    y = 26
  }

  return {
    hour,
    minute,
    timeString,
    period,
    greeting,
    xPercent: x,
    yPercent: y,
    phaseTitle,
  }
}

export function getContextualSubtitle(period: TimePeriod, mode: 'student' | 'developer'): string {
  if (mode === 'student') {
    switch (period) {
      case 'morning':
        return 'Notice your study rhythm, then make space for what you need today.'
      case 'afternoon':
        return 'Keep your study rhythm steady, and make space for a thoughtful pause.'
      case 'evening':
        return 'Reflect on what you learned today, then make space to wind down.'
      case 'night':
        return 'Notice your rhythm, then make space for deep rest and recovery.'
    }
  } else {
    switch (period) {
      case 'morning':
        return 'Notice your coding rhythm, then make space for what you need today.'
      case 'afternoon':
        return 'Keep your focus rhythm steady, and make space for a thoughtful pause.'
      case 'evening':
        return 'Reflect on the code you shipped today, then make space to wind down.'
      case 'night':
        return 'Notice your rhythm, then make space for deep rest and recovery.'
    }
  }
}
