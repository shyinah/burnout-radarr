import { useEffect, useState } from 'react'
import { Moon, Sun, Sunset, Sunrise, RefreshCw } from 'lucide-react'
import {
  getISTTimeInfo,
  getContextualSubtitle,
  type TimePeriod,
} from '../utils/istTime'

export interface GreetingBannerProps {
  name?: string
  mode: 'student' | 'developer'
}

export function GreetingBanner({ name, mode }: GreetingBannerProps) {
  // Live IST time state
  const [now, setNow] = useState(() => new Date())
  // Optional preview mode for testing all 4 celestial states
  const [previewPeriod, setPreviewPeriod] = useState<TimePeriod | null>(null)

  // Real-time tick every 30 seconds to maintain accurate IST time
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // Resolve time info (either live or simulated preview)
  const timeInfo = (() => {
    if (!previewPeriod) return getISTTimeInfo(now)
    // Create synthetic date for the preview period
    const simulated = new Date()
    if (previewPeriod === 'morning') simulated.setHours(8, 30, 0, 0)
    else if (previewPeriod === 'afternoon') simulated.setHours(13, 30, 0, 0)
    else if (previewPeriod === 'evening') simulated.setHours(18, 15, 0, 0)
    else simulated.setHours(22, 30, 0, 0)
    return getISTTimeInfo(simulated)
  })()

  const subtitle = getContextualSubtitle(timeInfo.period, mode)

  // Cycle preview periods for effortless visual inspection
  function cyclePreview() {
    if (!previewPeriod) setPreviewPeriod('morning')
    else if (previewPeriod === 'morning') setPreviewPeriod('afternoon')
    else if (previewPeriod === 'afternoon') setPreviewPeriod('evening')
    else if (previewPeriod === 'evening') setPreviewPeriod('night')
    else setPreviewPeriod(null)
  }

  return (
    <header className={`greeting-banner period-${timeInfo.period} ${mode}-banner`} role="banner">
      {/* Background celestial ambient glow */}
      <div className="celestial-ambient-backdrop" aria-hidden="true" />

      {/* Main greeting and typography */}
      <div className="greeting-main-content">
        <div className="greeting-eyebrow-row">
          <span className="eyebrow">
            {mode === 'student' ? 'STUDENT RADARR' : 'DEVELOPER RADARR'}
          </span>
          <span className="greeting-divider-bullet" aria-hidden="true">·</span>
          <button
            type="button"
            className="ist-live-pill"
            onClick={cyclePreview}
            title="Calculated in Indian Standard Time (IST). Click to preview celestial phases."
          >
            <span className={`ist-live-dot dot-${timeInfo.period}`} />
            <span>{timeInfo.timeString} IST</span>
            {previewPeriod && <span className="preview-indicator">preview</span>}
          </button>
        </div>

        <h1 className="greeting-title">
          {timeInfo.greeting}
          {name ? <span className="greeting-name">, {name}</span> : ''}.
        </h1>

        <p className="greeting-subtitle">{subtitle}</p>

        {previewPeriod && (
          <div className="preview-reset-bar">
            <span>Simulating {timeInfo.greeting}</span>
            <button
              type="button"
              className="preview-reset-btn"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewPeriod(null)
              }}
            >
              <RefreshCw size={11} /> Reset to Live IST
            </button>
          </div>
        )}
      </div>

      {/* Right side: Celestial visual animation and mode tag */}
      <div className="greeting-aside">
        <div
          className="celestial-sky-stage"
          onClick={cyclePreview}
          title="Celestial Arc: Smooth transition from sunrise (left) to noon zenith (center) to evening dusk and glowing moon (right). Click to cycle phases."
          role="img"
          aria-label={`Celestial body animation: ${timeInfo.phaseTitle}`}
        >
          {/* Parabolic orbital track */}
          <svg className="celestial-orbit-svg" viewBox="0 0 200 65" fill="none" preserveAspectRatio="none">
            <path
              d="M 16 54 Q 100 10 184 54"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 4"
              className="celestial-orbit-track"
            />
          </svg>

          {/* Sub-markers for trajectory orientation */}
          <div className="celestial-horizon-markers" aria-hidden="true">
            <span className="marker-dawn">5 AM</span>
            <span className="marker-noon">12 PM</span>
            <span className="marker-dusk">9 PM</span>
          </div>

          {/* Night stars (glowing when in night or evening) */}
          {timeInfo.period === 'night' && (
            <div className="celestial-night-stars" aria-hidden="true">
              <span className="celestial-star star-1">✦</span>
              <span className="celestial-star star-2">★</span>
              <span className="celestial-star star-3">✦</span>
              <span className="celestial-star star-4">·</span>
              <span className="celestial-star star-5">★</span>
            </div>
          )}

          {/* Animated celestial body moving along the arc */}
          <div
            className={`celestial-body body-${timeInfo.period}`}
            style={{
              left: `${timeInfo.xPercent}%`,
              top: `${timeInfo.yPercent}%`,
            }}
          >
            <div className={`celestial-halo halo-${timeInfo.period}`} />
            <div className={`celestial-core core-${timeInfo.period}`}>
              {timeInfo.period === 'morning' ? (
                <Sunrise size={18} className="celestial-icon text-amber-500" />
              ) : timeInfo.period === 'afternoon' ? (
                <Sun size={20} className="celestial-icon text-amber-500" />
              ) : timeInfo.period === 'evening' ? (
                <Sunset size={19} className="celestial-icon text-orange-500" />
              ) : (
                <Moon size={18} className="celestial-icon text-indigo-200 fill-indigo-100" />
              )}
            </div>
          </div>

          {/* Bottom phase caption */}
          <div className="celestial-stage-caption">
            <span className="phase-text">{timeInfo.phaseTitle}</span>
          </div>
        </div>

        <span className="demo-tag">
          <span className="demo-dot" /> {mode === 'student' ? 'STUDENT MODE' : 'DEVELOPER MODE'}
        </span>
      </div>
    </header>
  )
}
