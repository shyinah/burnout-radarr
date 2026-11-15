import { useEffect, useMemo, useState } from 'react'
import { Activity, CalendarDays, Footprints, HeartPulse, MoonStar, Watch } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  extractWearableFeatures,
  MIN_CONSECUTIVE_DAYS_FOR_TREND,
  type WearableDailyMetricFeature,
} from '../features/wearable/extractFeatures'
import type { WearableDailyReading } from '../features/wearable/dataSource'
import { fetchWearableReadingsForCurrentUser, fetchWearableResearchData, type WearableReading } from '../services/wearable-data.ts'

type ViewMode = 'daily' | 'weekly'
type TrendKey = 'heartRateBpm' | 'rmssd' | 'sleepDurationHours' | 'sleepEfficiencyPercent'
type ChartReading = {
  date: string
  heartRateBpm: number | null
  rmssd: number | null
  sleepDurationHours: number | null
  sleepEfficiencyPercent: number | null
}

function formatDay(date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString(undefined, { ...options, timeZone: 'UTC' })
}

function metricValue(feature: WearableDailyMetricFeature | undefined, multiplier = 1, decimals = 1) {
  return feature?.dailyMedian === null || feature?.dailyMedian === undefined
    ? '—'
    : (feature.dailyMedian * multiplier).toFixed(decimals)
}

function measurementCount(feature: WearableDailyMetricFeature | undefined) {
  if (!feature?.availability.available) return 'No valid source values'
  const { validMeasurementCount, expectedMeasurementCount, countUnit } = feature.availability
  return expectedMeasurementCount === null
    ? `${validMeasurementCount} valid ${countUnit}`
    : `${validMeasurementCount} / ${expectedMeasurementCount} ${countUnit}`
}

function dailyChange(feature: WearableDailyMetricFeature | undefined, unit: string, multiplier = 1) {
  if (feature?.dayOverDayChange === null || feature?.dayOverDayChange === undefined) return 'No previous-day comparison'
  const change = feature.dayOverDayChange * multiplier
  return `Day change ${change >= 0 ? '+' : ''}${change.toFixed(2)} ${unit}`
}

function trendDescription(feature: WearableDailyMetricFeature | undefined, unit: string, multiplier = 1) {
  if (!feature?.trend) return `Trend needs ${MIN_CONSECUTIVE_DAYS_FOR_TREND} consecutive valid days`
  const { slopePerDay, consecutiveValidDays } = feature.trend
  const displaySlope = slopePerDay * multiplier
  return `Slope ${displaySlope >= 0 ? '+' : ''}${displaySlope.toFixed(2)} ${unit}/day · ${consecutiveValidDays} valid days`
}

function DataMetric({
  icon: Icon,
  label,
  value,
  unit,
  count,
  change,
  tone,
}: {
  icon: typeof HeartPulse
  label: string
  value: string
  unit: string
  count: string
  change: string
  tone: string
}) {
  return <article className={`wearable-overview-metric ${tone}`}>
    <div className="wearable-overview-metric-top"><span className="wearable-overview-icon"><Icon size={17} /></span><span>{label}</span></div>
    <div className="wearable-overview-value"><strong>{value}</strong><span>{unit}</span></div>
    <div className="wearable-overview-context"><span>{count}</span><span>{change}</span></div>
  </article>
}

function CoverageMetric({ label, feature, displayUnit, multiplier = 1, decimals = 1 }: {
  label: string
  feature: WearableDailyMetricFeature
  displayUnit: string
  multiplier?: number
  decimals?: number
}) {
  return <div className={`wearable-sleep-detail${feature.availability.available ? '' : ' is-missing'}`}>
    <span>{label}</span>
    <strong>{metricValue(feature, multiplier, decimals)} <small>{displayUnit}</small></strong>
    <em>{measurementCount(feature)}</em>
  </div>
}

function TrendChart({
  data,
  dataKey,
  selectedDate,
  selectedValue,
  title,
  subtitle,
  color,
  unit,
  decimals = 1,
}: {
  data: ChartReading[]
  dataKey: TrendKey
  selectedDate?: string
  selectedValue: number | null
  title: string
  subtitle: string
  color: string
  unit: string
  decimals?: number
}) {
  return <section className="panel wearable-chart-panel">
    <div className="wearable-chart-heading">
      <div><h3>{title}</h3><p>{subtitle}</p></div>
      <span className="wearable-chart-key"><i style={{ backgroundColor: color }} /> Daily median</span>
    </div>
    <div className="wearable-chart" role="img" aria-label={`${title} daily cohort trend for ${data.length} research dates`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 14, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 5" />
          <XAxis dataKey="date" tickFormatter={(value: string) => formatDay(value)} axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-label)', fontSize: 10 }} dy={8} minTickGap={12} />
          <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-label)', fontSize: 9 }} width={43} />
          <Tooltip
            labelFormatter={(value) => formatDay(String(value), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 13, color: 'var(--ink)', boxShadow: 'var(--shadow-card)', fontSize: 10 }}
            formatter={(value) => [typeof value === 'number' ? `${value.toFixed(decimals)} ${unit}` : 'No reading', title]}
          />
          <Line type="monotone" dataKey={dataKey} name={title} stroke={color} strokeWidth={2.75} dot={{ r: 3.5, fill: color, strokeWidth: 0 }} activeDot={{ r: 5.5 }} connectNulls={false} />
          {selectedDate && selectedValue !== null && <ReferenceDot x={selectedDate} y={selectedValue} r={6} fill={color} stroke="var(--surface)" strokeWidth={2} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  </section>
}

function HistoryValue({ feature, multiplier = 1, decimals = 1, unit }: {
  feature: WearableDailyMetricFeature
  multiplier?: number
  decimals?: number
  unit: string
}) {
  return <span className="wearable-history-value">
    <strong>{metricValue(feature, multiplier, decimals)}{feature.availability.available ? ` ${unit}` : ''}</strong>
    <small>{feature.availability.available ? `n=${feature.availability.validMeasurementCount} ${feature.availability.countUnit}` : 'No valid records'}</small>
  </span>
}

export function WearableDataPage({ userId }: { userId: string }) {
  const [readings, setReadings] = useState<readonly WearableDailyReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [researchSource, setResearchSource] = useState<'supabase' | 'demo'>('demo')
  const [researchSourceName, setResearchSourceName] = useState('Anonymized research aggregates')
  const [sourceWarning, setSourceWarning] = useState('')
  const [personalReadings, setPersonalReadings] = useState<WearableReading[]>([])
  const [personalLoading, setPersonalLoading] = useState(true)
  const [personalError, setPersonalError] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('weekly')
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    void fetchWearableResearchData(controller.signal).then((result) => {
      if (!active) return
      setReadings(result.readings)
      setResearchSource(result.source)
      setResearchSourceName(result.sourceName)
      setSourceWarning(result.warning ?? '')
    }).catch((loadError: unknown) => {
      if (active && !controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'Research readings could not be loaded.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    void fetchWearableReadingsForCurrentUser(controller.signal).then((result) => {
      if (!active) return
      if (result.data === null) setPersonalError(result.error ?? 'Individual wearable readings could not be loaded.')
      else setPersonalReadings(result.data)
    }).catch(() => {
      if (active) setPersonalError('Individual wearable readings could not be loaded.')
    }).finally(() => {
      if (active) setPersonalLoading(false)
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [userId])

  const extraction = useMemo(() => extractWearableFeatures(readings), [readings])
  const dailyFeatures = extraction.dailyFeatures
  const latest = dailyFeatures.at(-1)
  const selected = dailyFeatures.find((feature) => feature.date === selectedDate) ?? latest
  const chartData = useMemo<ChartReading[]>(() => dailyFeatures.map((feature) => ({
    date: feature.date,
    heartRateBpm: feature.heartRateBpm.dailyMedian,
    rmssd: feature.rmssd.dailyMedian,
    sleepDurationHours: feature.sleepDurationHours.dailyMedian,
    sleepEfficiencyPercent: feature.sleepEfficiency.dailyMedian === null ? null : feature.sleepEfficiency.dailyMedian * 100,
  })), [dailyFeatures])
  const period = dailyFeatures.length
    ? `${formatDay(dailyFeatures[0].date, { month: 'short', day: 'numeric', year: 'numeric' })} – ${formatDay(dailyFeatures[dailyFeatures.length - 1].date, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : ''

  return <div className="content-page wearable-page">
    <div className="page-title-row wearable-page-title">
      <div><span className="eyebrow">WEARABLE INSIGHTS</span><h1>Wearable Data</h1><p>Historical research summaries, presented as a smartwatch-data demo.</p></div>
      <span className="wearable-mode-badge"><span /> {researchSource === 'supabase' ? 'RESEARCH DATA · SUPABASE' : 'DEMO · NOT CONNECTED'}</span>
    </div>

    <section className="panel wearable-demo-banner">
      <span className="wearable-demo-banner-icon"><Watch size={18} /></span>
      <div><strong>{researchSource === 'supabase' ? 'Supabase research aggregates · no smartwatch connected' : 'Research demo data · no smartwatch connected'}</strong><p>These are anonymized daily cohort aggregates—not live readings, individual participant records, or data from the signed-in user.</p>{sourceWarning && <p role="status">{sourceWarning}</p>}</div>
      <span className="wearable-demo-source">{researchSourceName}</span>
    </section>

    <section className="panel wearable-account-readings" aria-label="Your individual wearable readings">
      <strong>Your account readings</strong>
      {personalLoading ? <p role="status">Loading private wearable readings…</p> : personalError ? <p role="alert">{personalError}</p> : personalReadings.length ? <p>{personalReadings.length} individual readings stored for your account. Latest: {personalReadings[0].metricName} · {new Date(personalReadings[0].recordedAt).toLocaleString()}.</p> : <p>No individual device readings are stored for your account. No smartwatch is connected.</p>}
    </section>

    {loading ? <div className="panel wearable-loading" role="status">Loading research summaries…</div> : error ? <div className="panel wearable-load-error" role="alert">{error}</div> : dailyFeatures.length === 0 ? <div className="panel wearable-loading">No valid daily demo features are available.</div> : <>
      <section className="wearable-toolbar" aria-label="Wearable date range controls">
        <div className="wearable-toolbar-context"><CalendarDays size={16} /><div><strong>{viewMode === 'weekly' ? 'Seven-day history' : 'Daily summary'}</strong><span>{period} · research source dates</span></div></div>
        <div className="wearable-view-switch" role="group" aria-label="Choose daily or weekly view">
          <button type="button" className={viewMode === 'daily' ? 'selected' : ''} aria-pressed={viewMode === 'daily'} onClick={() => setViewMode('daily')}>Daily</button>
          <button type="button" className={viewMode === 'weekly' ? 'selected' : ''} aria-pressed={viewMode === 'weekly'} onClick={() => setViewMode('weekly')}>Weekly</button>
        </div>
      </section>

      {viewMode === 'daily' && <nav className="wearable-day-selector" aria-label="Select a research date">
        {dailyFeatures.map((feature) => <button key={feature.date} type="button" aria-pressed={selected?.date === feature.date} className={selected?.date === feature.date ? 'selected' : ''} onClick={() => setSelectedDate(feature.date)}>
          <small>{formatDay(feature.date, { weekday: 'short' })}</small><strong>{formatDay(feature.date)}</strong>
        </button>)}
      </nav>}

      {selected && <>
        <div className="wearable-reading-heading"><div><span className="eyebrow">{viewMode === 'daily' ? 'SELECTED DAY' : 'LATEST AVAILABLE DAY'}</span><h2>{formatDay(selected.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2></div><span>{selected.provenance ?? 'Daily cohort medians'} · not individual device readings</span></div>

        <div className="wearable-overview-grid">
          <DataMetric icon={HeartPulse} label="Heart rate" value={metricValue(selected.heartRateBpm)} unit="bpm" count={measurementCount(selected.heartRateBpm)} change={dailyChange(selected.heartRateBpm, 'bpm')} tone="rose" />
          <DataMetric icon={Activity} label="HRV · RMSSD" value={metricValue(selected.rmssd)} unit="source unit unspecified" count={measurementCount(selected.rmssd)} change={dailyChange(selected.rmssd, 'source units')} tone="violet" />
          <DataMetric icon={MoonStar} label="Sleep duration" value={metricValue(selected.sleepDurationHours)} unit="hours" count={measurementCount(selected.sleepDurationHours)} change={dailyChange(selected.sleepDurationHours, 'h')} tone="blue" />
          <DataMetric icon={MoonStar} label="Sleep efficiency" value={metricValue(selected.sleepEfficiency, 100)} unit="percent" count={measurementCount(selected.sleepEfficiency)} change={dailyChange(selected.sleepEfficiency, 'percentage points', 100)} tone="sage" />
        </div>

        <div className="wearable-section-heading"><div><span className="eyebrow">HEART &amp; HRV</span><h2>Daily physiological summaries</h2></div><span>{period}</span></div>
        <div className="wearable-chart-grid">
          <TrendChart data={chartData} dataKey="heartRateBpm" selectedDate={viewMode === 'daily' ? selected.date : undefined} selectedValue={selected.heartRateBpm.dailyMedian} title="Heart rate" subtitle={`Daily median · beats per minute · ${trendDescription(selected.heartRateBpm, 'bpm')}`} color="#9a584e" unit="bpm" />
          <TrendChart data={chartData} dataKey="rmssd" selectedDate={viewMode === 'daily' ? selected.date : undefined} selectedValue={selected.rmssd.dailyMedian} title="HRV · RMSSD" subtitle={`Daily median · source unit unspecified · ${trendDescription(selected.rmssd, 'source units')}`} color="#8b754d" unit="source units" />
        </div>

        <section className="wearable-sleep-section">
          <div className="wearable-section-heading"><div><span className="eyebrow">SLEEP DIARY</span><h2>Sleep and overnight context</h2></div><span>Diary-record medians · counts shown per field</span></div>
          <div className="wearable-sleep-detail-grid">
            <CoverageMetric label="Time in bed" feature={selected.inBedDurationHours} displayUnit="h" />
            <CoverageMetric label="Sleep latency" feature={selected.sleepLatencyHours} displayUnit="h" />
            <CoverageMetric label="Wake after sleep onset" feature={selected.wasoMinutes} displayUnit="min" decimals={0} />
            <CoverageMetric label="Night awakenings" feature={selected.nightAwakeningCount} displayUnit="count" decimals={0} />
          </div>
          <div className="wearable-chart-grid wearable-sleep-charts">
              <TrendChart data={chartData} dataKey="sleepDurationHours" selectedDate={viewMode === 'daily' ? selected.date : undefined} selectedValue={selected.sleepDurationHours.dailyMedian} title="Sleep duration" subtitle={`Daily diary median · hours · ${trendDescription(selected.sleepDurationHours, 'h')}`} color="#607e88" unit="h" />
              <TrendChart data={chartData} dataKey="sleepEfficiencyPercent" selectedDate={viewMode === 'daily' ? selected.date : undefined} selectedValue={selected.sleepEfficiency.dailyMedian === null ? null : selected.sleepEfficiency.dailyMedian * 100} title="Sleep efficiency" subtitle={`Diary ratio displayed as percent · ${trendDescription(selected.sleepEfficiency, '%', 100)}`} color="#718064" unit="%" />
          </div>
        </section>

        <section className="panel wearable-history-panel">
          <div className="wearable-section-heading"><div><span className="eyebrow">READING HISTORY</span><h2>Daily source summaries</h2></div><span>{dailyFeatures.length} dates · cohort-level values</span></div>
          <div className="wearable-history-scroll"><table className="wearable-history-table"><thead><tr>
            <th>Date</th><th>Heart rate</th><th>RMSSD</th><th>Sleep</th><th>Efficiency</th><th>In bed</th><th>Latency</th><th>WASO</th><th>Night awakenings</th>
          </tr></thead><tbody>{dailyFeatures.map((feature) => <tr key={feature.date} className={feature.date === selected.date ? 'selected' : ''}>
            <td><button type="button" className="wearable-history-date" onClick={() => { setSelectedDate(feature.date); setViewMode('daily') }}>{formatDay(feature.date, { month: 'short', day: 'numeric', year: 'numeric' })}</button></td>
            <td><HistoryValue feature={feature.heartRateBpm} unit="bpm" /></td>
            <td><HistoryValue feature={feature.rmssd} unit="source units" /></td>
            <td><HistoryValue feature={feature.sleepDurationHours} unit="h" /></td>
            <td><HistoryValue feature={feature.sleepEfficiency} multiplier={100} unit="%" /></td>
            <td><HistoryValue feature={feature.inBedDurationHours} unit="h" /></td>
            <td><HistoryValue feature={feature.sleepLatencyHours} unit="h" /></td>
            <td><HistoryValue feature={feature.wasoMinutes} decimals={0} unit="min" /></td>
            <td><HistoryValue feature={feature.nightAwakeningCount} decimals={0} unit="" /></td>
          </tr>)}</tbody></table></div>
          <p className="wearable-history-note">Each value is a daily cohort median. “n” is the number of valid source contributors for that metric; missing values are left unavailable.</p>
        </section>

        <div className="panel wearable-activity-limitation dark:bg-stone-900 dark:border-stone-700"><Footprints size={18} /><div><strong className="text-stone-800 dark:text-stone-200">Activity data is not summarized</strong><p className="text-stone-600 dark:text-stone-400">Step readings in the source are too sparse for a representative daily trend. No missing activity values have been filled or estimated.</p></div></div>
        <section className="wearable-source-note"><strong>About this research data</strong><p>{researchSourceName}. No participant IDs or raw participant rows are displayed. Heart rate uses bpm; sleep duration, time in bed, and latency use hours; WASO uses minutes; efficiency is a ratio shown as a percentage. RMSSD units are unspecified by the source documentation.</p></section>
        {(extraction.excluded.invalidDateRows > 0 || extraction.excluded.duplicateDateGroups > 0) && <p className="wearable-source-note">Some source rows were excluded due to invalid or duplicate dates.</p>}
      </>}
    </>}
  </div>
}
