import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, ClipboardCheck, Clock, Lock, MoonStar, Sparkles, Sun } from 'lucide-react'
import type { CheckInAnswerValue, CheckInPeriod, CheckInRecord } from '../services/app-state'
import { checkInQuestions as questionSets, type CheckInQuestion } from '../services/check-in-questions.ts'
import { fetchCheckInsForCurrentUser, saveCheckInForCurrentUser, type PersistedCheckIn } from '../services/check-ins.ts'

const EVENING_START_HOUR = 18

const periodCopy: Record<CheckInPeriod, { title: string; description: string }> = {
  morning: { title: 'Morning check-in', description: 'A quick read on how you are starting the day.' },
  evening: { title: 'Evening check-in', description: 'A short reflection on how the day went.' },
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function displayDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function answerLabel(question: CheckInQuestion | undefined, answer: CheckInAnswerValue) {
  return question?.options.find((option) => option.value === answer)?.label ?? String(answer)
}

export function CheckInPage({ userId, guestRecords }: { userId: string; guestRecords: CheckInRecord[] }) {
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours())
  const [period, setPeriod] = useState<CheckInPeriod>(() => new Date().getHours() >= EVENING_START_HOUR ? 'evening' : 'morning')
  const [today, setToday] = useState(localDateKey)
  const [answersByPeriod, setAnswersByPeriod] = useState<Record<CheckInPeriod, Record<string, CheckInAnswerValue>>>({ morning: {}, evening: {} })
  const [cloudRecords, setCloudRecords] = useState<PersistedCheckIn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const submittingKey = useRef<string | null>(null)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setToday(localDateKey())
      setCurrentHour(new Date().getHours())
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true

    void fetchCheckInsForCurrentUser()
      .then((result) => {
        if (!active) return
        if (result.data === null) {
          setLoadError(result.error ?? 'Unable to load your check-ins.')
        } else if (result.data.some((record) => record.userId !== userId)) {
          setLoadError('The check-in response did not match the signed-in account.')
        } else {
          setCloudRecords(result.data)
        }
      })
      .catch(() => {
        if (active) setLoadError('Unable to load your check-ins. Please try again.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [userId, refreshKey])

  const questions = questionSets[period]
  const answers = answersByPeriod[period]
  const existingToday = cloudRecords.find((record) => record.period === period && record.date === today)
  const recentRecords = [...cloudRecords]
    .filter((record) => record.period === period)
    .sort((a, b) => b.date.localeCompare(a.date) || b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, 7)
  const recentGuestRecords = [...guestRecords]
    .filter((record) => record.period === period)
    .sort((a, b) => b.date.localeCompare(a.date) || b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, 7)
  const complete = questions.every((question) => question.options.some((option) => option.value === answers[question.id]))
  const isEveningAvailable = currentHour >= EVENING_START_HOUR
  const isMorningAvailable = currentHour < EVENING_START_HOUR
  const isCurrentPeriodAvailable = period === 'evening' ? isEveningAvailable : isMorningAvailable

  function selectAnswer(questionId: string, value: CheckInAnswerValue) {
    setAnswersByPeriod((current) => ({ ...current, [period]: { ...current[period], [questionId]: value } }))
    setMessage('')
    setIsError(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isLoading || isSaving) return
    if (period === 'evening' && currentHour < EVENING_START_HOUR) {
      setMessage('Evening check-in is only available after 6:00 PM.')
      setIsError(true)
      return
    }
    if (period === 'morning' && currentHour >= EVENING_START_HOUR) {
      setMessage('Morning check-in is closed for today. Please complete your evening check-in.')
      setIsError(true)
      return
    }
    if (existingToday) {
      setMessage('This check-in has already been submitted today. You can review it below.')
      setIsError(true)
      return
    }
    if (!complete) {
      setMessage('Please answer all five questions before submitting.')
      setIsError(true)
      return
    }

    const key = `${period}:${today}`
    if (submittingKey.current === key) return
    submittingKey.current = key
    setIsSaving(true)
    setMessage('')
    setIsError(false)
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const result = await saveCheckInForCurrentUser({
        id: crypto.randomUUID(),
        period,
        date: today,
        recordedAt: new Date().toISOString(),
        schemaVersion: 1,
        answers: { ...answers },
        timezone,
      })

      if (!result.data || result.data.userId !== userId) {
        const errorMessage = result.error ?? 'The saved check-in could not be confirmed for this account.'
        setMessage(errorMessage.includes('already exists')
          ? 'This check-in was already submitted for this period and date. Refreshing your history.'
          : errorMessage)
        setIsError(true)
        setIsLoading(true)
        setLoadError('')
        setRefreshKey((current) => current + 1)
        return
      }

      const savedRecord = result.data
      setCloudRecords((current) => [
        savedRecord,
        ...current.filter((record) =>
          record.id !== savedRecord.id && !(record.period === savedRecord.period && record.date === savedRecord.date)
        ),
      ])
      setAnswersByPeriod((current) => ({ ...current, [period]: {} }))
      setMessage(`${periodCopy[period].title} saved to your account for ${displayDate(today)}.`)
      setIsError(false)
      setLoadError('')
    } catch {
      setMessage('Unable to save your check-in. Please check your connection and try again.')
      setIsError(true)
      setIsLoading(true)
      setLoadError('')
      setRefreshKey((current) => current + 1)
    } finally {
      submittingKey.current = null
      setIsSaving(false)
    }
  }

  const PeriodIcon = period === 'morning' ? Sun : MoonStar

  return <div className="content-page">
    <div className="page-title-row"><div><span className="eyebrow">A MOMENT FOR YOU</span><h1>Morning &amp; Evening Check-ins</h1><p>Two short reflections to help you notice how your day is going.</p></div><span className="demo-tag"><ClipboardCheck size={13} /> PRIVATE REFLECTION</span></div>

    <section className="panel check-in-panel check-in-workspace">
      {isLoading && <p role="status">Loading your check-in history…</p>}
      {loadError && <p role="alert">{loadError} <button type="button" className="button-secondary" onClick={() => { setLoadError(''); setIsLoading(true); setRefreshKey((current) => current + 1) }}>Try again</button></p>}
      <div className="check-in-period-tabs" role="tablist" aria-label="Choose a daily check-in">
        {(['morning', 'evening'] as const).map((item) => {
          const ItemIcon = item === 'morning' ? Sun : MoonStar
          const hasSubmitted = cloudRecords.some((record) => record.period === item && record.date === today)
          const isAvailable = item === 'evening' ? isEveningAvailable : isMorningAvailable
          const statusText = hasSubmitted
            ? 'Submitted today'
            : isAvailable
              ? 'Available now'
              : item === 'evening'
                ? 'Opens at 6:00 PM'
                : 'Closed at 6:00 PM'

          return <button
            key={item}
            type="button"
            role="tab"
            id={`${item}-check-in-tab`}
            aria-selected={period === item}
            aria-controls="daily-check-in-panel"
            className={`check-in-period-tab${period === item ? ' selected' : ''}${!isAvailable && !hasSubmitted ? ' is-locked' : ''}`}
            onClick={() => { setPeriod(item); setMessage(''); setIsError(false) }}
          >
            <ItemIcon size={16} />
            <span className="check-in-tab-title">
              {periodCopy[item].title}
              {!isAvailable && !hasSubmitted && <Lock size={11} className="check-in-tab-lock" aria-label="Locked" />}
            </span>
            <small>{statusText}</small>
          </button>
        })}
      </div>

      <div id="daily-check-in-panel" role="tabpanel" aria-labelledby={`${period}-check-in-tab`} className="check-in-period-content">
        <div className="check-in-period-heading"><span className="check-in-period-icon"><PeriodIcon size={18} /></span><div><h2>{periodCopy[period].title}</h2><p>{periodCopy[period].description} · {displayDate(today)}</p></div></div>

        {existingToday ? (
          <div className="check-in-submitted-notice" role="status">
            <Check size={16} />
            <span>This check-in is already saved to your account for today. You can review your answers below; another response cannot be submitted for this check-in and date.</span>
          </div>
        ) : !isCurrentPeriodAvailable ? (
          <div className="check-in-locked-notice" role="status">
            <span className="check-in-locked-icon"><Clock size={18} /></span>
            <div className="check-in-locked-body">
              <h3>{period === 'evening' ? 'Evening check-in opens at 6:00 PM' : 'Morning check-in closed for today'}</h3>
              <p>
                {period === 'evening'
                  ? 'Take your time through the day. Once 6:00 PM arrives, this space will open for your reflection on how the day went.'
                  : 'Morning reflections are available earlier in the day (before 6:00 PM). Please switch to your Evening check-in to reflect on how today went.'}
              </p>
              <div className="check-in-locked-footer">
                <span className="check-in-locked-hint">
                  <Sparkles size={13} /> {period === 'evening' ? 'Evening window: 6:00 PM – Midnight' : 'Morning window: 12:00 AM – 6:00 PM'}
                </span>
                <button
                  type="button"
                  className="text-action check-in-switch-action"
                  onClick={() => {
                    setPeriod(period === 'evening' ? 'morning' : 'evening')
                    setMessage('')
                    setIsError(false)
                  }}
                >
                  Switch to {period === 'evening' ? 'Morning' : 'Evening'} check-in &rarr;
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form className="check-in-question-form" onSubmit={submit}>
            <div className="check-in-question-list">
              {questions.map((question, index) => <fieldset className="check-in-question" key={question.id}>
                <legend><span>{index + 1}</span><strong>{question.prompt}</strong></legend>
                {question.type === 'rating' && <span className="check-in-scale-hint">Choose one rating from 1 to 5</span>}
                <div className="check-in-options">
                  {question.options.map((option) => <label className={`check-in-option${answers[question.id] === option.value ? ' selected' : ''}`} key={String(option.value)}>
                    <input type="radio" name={`${period}-${question.id}`} value={String(option.value)} checked={answers[question.id] === option.value} onChange={() => selectAnswer(question.id, option.value)} />
                    <span>{option.label}</span>
                  </label>)}
                </div>
              </fieldset>)}
            </div>
            {message && <p className={`check-in-form-message${isError ? ' is-error' : ''}`} role={isError ? 'alert' : 'status'}>{message}</p>}
            <div className="check-in-submit-row"><p>Exactly five responses · saved to your account after confirmation.</p><button type="submit" className="button-primary" disabled={!complete || isLoading || isSaving}>{isSaving ? 'Saving…' : `Save ${periodCopy[period].title}`}</button></div>
          </form>
        )}

        {existingToday && message && <p className={`check-in-form-message${isError ? ' is-error' : ''}`} role={isError ? 'alert' : 'status'}>{message}</p>}

        <section className="check-in-history" aria-label={`Recent ${period} responses`}>
          <div className="check-in-history-heading"><div><span className="eyebrow">YOUR RESPONSES</span><h3>Recent {period} check-ins</h3></div><span>{recentRecords.length} shown</span></div>
          {recentRecords.length ? <div className="check-in-history-list">{recentRecords.map((record) => <details className="check-in-history-item" key={record.id} open={record.date === today}>
            <summary><span><strong>{displayDate(record.date)}</strong><small>Submitted {new Date(record.recordedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></span><span>{record.date === today ? 'Today' : 'Review answers'}</span></summary>
            <ol>{questions.map((question) => <li key={question.id}><span>{question.prompt}</span><strong>{answerLabel(question, record.answers[question.id])}</strong></li>)}</ol>
          </details>)}</div> : <p className="check-in-history-empty">No {period} check-ins submitted yet.</p>}
        </section>

        {recentGuestRecords.length > 0 && <section className="check-in-history" aria-label={`Unlinked local ${period} responses`}>
          <div className="check-in-history-heading"><div><span className="eyebrow">ON THIS DEVICE ONLY</span><h3>Unlinked local {period} check-ins</h3></div><span>Not synced</span></div>
          <p>These saved responses remain local and have not been associated with your account.</p>
          <div className="check-in-history-list">{recentGuestRecords.map((record) => <details className="check-in-history-item" key={record.id}>
            <summary><span><strong>{displayDate(record.date)}</strong><small>Saved on this device</small></span><span>Not synced</span></summary>
            <ol>{questions.map((question) => <li key={question.id}><span>{question.prompt}</span><strong>{answerLabel(question, record.answers[question.id])}</strong></li>)}</ol>
          </details>)}</div>
        </section>}
      </div>

      <p className="check-in-disclaimer">These questions are for personal reflection only. They are not medical questions or a clinically validated assessment.</p>
    </section>
  </div>
}
