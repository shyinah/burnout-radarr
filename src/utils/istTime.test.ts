import { getISTTimeInfo, getContextualSubtitle } from './istTime'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function runTests() {
  console.log('--- Running IST Time & Celestial Greeting Test Suite ---')

  // Test 1: Good night boundary (4:59 AM IST)
  {
    const d = new Date('2026-11-14T04:59:00+05:30')
    const info = getISTTimeInfo(d)
    assert(info.greeting === 'Good night', `Expected "Good night" at 4:59 AM IST, got "${info.greeting}"`)
    assert(info.period === 'night', `Expected period "night", got "${info.period}"`)
    assert(info.xPercent > 70, `Expected moon on right side, got xPercent=${info.xPercent}`)
    console.log('✓ PASS: 4:59 AM IST resolves to Good night with glowing moon')
  }

  // Test 2: Good morning boundary (5:00 AM IST)
  {
    const d = new Date('2026-11-14T05:00:00+05:30')
    const info = getISTTimeInfo(d)
    assert(info.greeting === 'Good morning', `Expected "Good morning" at 5:00 AM IST, got "${info.greeting}"`)
    assert(info.period === 'morning', `Expected period "morning", got "${info.period}"`)
    assert(info.xPercent < 25, `Expected rising sun on left, got xPercent=${info.xPercent}`)
    console.log('✓ PASS: 5:00 AM IST resolves to Good morning with rising sun on left')
  }

  // Test 3: Good morning upper boundary (11:59 AM IST)
  {
    const d = new Date('2026-11-14T11:59:00+05:30')
    const info = getISTTimeInfo(d)
    assert(info.greeting === 'Good morning', `Expected "Good morning" at 11:59 AM IST, got "${info.greeting}"`)
    assert(info.period === 'morning', `Expected period "morning", got "${info.period}"`)
    console.log('✓ PASS: 11:59 AM IST resolves to Good morning')
  }

  // Test 4: Good afternoon boundary (12:00 PM IST)
  {
    const d = new Date('2026-11-14T12:00:00+05:30')
    const info = getISTTimeInfo(d)
    assert(info.greeting === 'Good afternoon', `Expected "Good afternoon" at 12:00 PM IST, got "${info.greeting}"`)
    assert(info.period === 'afternoon', `Expected period "afternoon", got "${info.period}"`)
    assert(Math.abs(info.xPercent - 45) < 5, `Expected sun near zenith center (~45%), got xPercent=${info.xPercent}`)
    assert(info.yPercent <= 20, `Expected sun at apex height, got yPercent=${info.yPercent}`)
    console.log('✓ PASS: 12:00 PM IST resolves to Good afternoon with zenith midday sun at center peak')
  }

  // Test 5: Good afternoon upper boundary (4:59 PM IST)
  {
    const d = new Date('2026-11-14T16:59:00+05:30')
    const info = getISTTimeInfo(d)
    assert(info.greeting === 'Good afternoon', `Expected "Good afternoon" at 4:59 PM IST, got "${info.greeting}"`)
    assert(info.period === 'afternoon', `Expected period "afternoon", got "${info.period}"`)
    console.log('✓ PASS: 4:59 PM IST resolves to Good afternoon')
  }

  // Test 6: Good evening boundary (5:00 PM IST)
  {
    const d = new Date('2026-11-14T17:00:00+05:30')
    const info = getISTTimeInfo(d)
    assert(info.greeting === 'Good evening', `Expected "Good evening" at 5:00 PM IST, got "${info.greeting}"`)
    assert(info.period === 'evening', `Expected period "evening", got "${info.period}"`)
    assert(info.xPercent >= 68, `Expected setting sun transitioning to right, got xPercent=${info.xPercent}`)
    console.log('✓ PASS: 5:00 PM IST resolves to Good evening with setting sun transitioning to right')
  }

  // Test 7: Good evening upper boundary (8:59 PM IST)
  {
    const d = new Date('2026-11-14T20:59:00+05:30')
    const info = getISTTimeInfo(d)
    assert(info.greeting === 'Good evening', `Expected "Good evening" at 8:59 PM IST, got "${info.greeting}"`)
    assert(info.period === 'evening', `Expected period "evening", got "${info.period}"`)
    console.log('✓ PASS: 8:59 PM IST resolves to Good evening')
  }

  // Test 8: Good night boundary (9:00 PM IST)
  {
    const d = new Date('2026-11-14T21:00:00+05:30')
    const info = getISTTimeInfo(d)
    assert(info.greeting === 'Good night', `Expected "Good night" at 9:00 PM IST, got "${info.greeting}"`)
    assert(info.period === 'night', `Expected period "night", got "${info.period}"`)
    assert(info.phaseTitle.includes('Moon'), `Expected glowing moon, got "${info.phaseTitle}"`)
    console.log('✓ PASS: 9:00 PM IST resolves to Good night with glowing moon')
  }

  // Test 9: Midnight (00:00 IST) and late night (2:00 AM IST)
  {
    const d1 = new Date('2026-11-14T00:00:00+05:30')
    const d2 = new Date('2026-11-14T02:30:00+05:30')
    assert(getISTTimeInfo(d1).greeting === 'Good night', 'Expected Good night at midnight')
    assert(getISTTimeInfo(d2).greeting === 'Good night', 'Expected Good night at 2:30 AM')
    console.log('✓ PASS: Midnight and late night resolve safely to Good night')
  }

  // Test 10: Mode contextual subtitles
  {
    const studentSub = getContextualSubtitle('morning', 'student')
    const devSub = getContextualSubtitle('morning', 'developer')
    assert(studentSub.includes('study rhythm'), 'Expected student subtitle to mention study rhythm')
    assert(devSub.includes('coding rhythm'), 'Expected developer subtitle to mention coding rhythm')
    console.log('✓ PASS: Contextual subtitles adapt to student and developer modes')
  }

  console.log('\nResults: 10/10 IST time and celestial tests passed.')
}

runTests()
