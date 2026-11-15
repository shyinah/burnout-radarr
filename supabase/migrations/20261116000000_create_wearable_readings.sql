-- ============================================================================
-- Burnout Radarr: private wearable readings and public research aggregates
-- Research cohorts are stored separately and contain no participant identifiers.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wearable_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (length(trim(source)) > 0),
  reading_date DATE NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  metric_name TEXT NOT NULL CHECK (length(trim(metric_name)) > 0),
  value DOUBLE PRECISION NOT NULL CHECK (value > '-Infinity'::DOUBLE PRECISION AND value < 'Infinity'::DOUBLE PRECISION),
  unit TEXT NOT NULL CHECK (length(trim(unit)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wearable_readings_user_source_metric_time_key UNIQUE (user_id, source, metric_name, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_wearable_readings_user_date
  ON public.wearable_readings (user_id, reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_readings_user_metric_time
  ON public.wearable_readings (user_id, metric_name, recorded_at DESC);

ALTER TABLE public.wearable_readings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.wearable_readings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.wearable_readings TO authenticated;

DROP POLICY IF EXISTS "Users can view own wearable readings" ON public.wearable_readings;
CREATE POLICY "Users can view own wearable readings"
  ON public.wearable_readings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wearable readings" ON public.wearable_readings;
CREATE POLICY "Users can insert own wearable readings"
  ON public.wearable_readings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Non-identifiable cohort medians are intentionally separate from user-owned readings.
CREATE TABLE IF NOT EXISTS public.wearable_research_aggregates (
  source TEXT NOT NULL CHECK (length(trim(source)) > 0),
  reading_date DATE NOT NULL,
  metric_name TEXT NOT NULL CHECK (metric_name IN (
    'heart_rate_bpm', 'rmssd', 'sleep_duration_hours', 'sleep_efficiency',
    'in_bed_duration_hours', 'sleep_latency_hours', 'waso_minutes',
    'night_awakening_count', 'steps'
  )),
  value DOUBLE PRECISION NOT NULL CHECK (value > '-Infinity'::DOUBLE PRECISION AND value < 'Infinity'::DOUBLE PRECISION),
  unit TEXT NOT NULL CHECK (length(trim(unit)) > 0),
  aggregation_method TEXT NOT NULL CHECK (aggregation_method = 'median'),
  contributor_count INTEGER NOT NULL CHECK (contributor_count >= 0),
  expected_count INTEGER CHECK (expected_count IS NULL OR expected_count >= contributor_count),
  count_unit TEXT NOT NULL CHECK (count_unit IN ('samples', 'records', 'participants')),
  provenance TEXT NOT NULL CHECK (length(trim(provenance)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source, reading_date, metric_name)
);

CREATE INDEX IF NOT EXISTS idx_wearable_research_date
  ON public.wearable_research_aggregates (reading_date DESC);

ALTER TABLE public.wearable_research_aggregates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.wearable_research_aggregates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.wearable_research_aggregates TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view wearable research aggregates" ON public.wearable_research_aggregates;
CREATE POLICY "Anyone can view wearable research aggregates"
  ON public.wearable_research_aggregates FOR SELECT TO anon, authenticated
  USING (true);

-- Seed only the existing anonymized daily cohort medians; no individual readings or IDs.
INSERT INTO public.wearable_research_aggregates (
  source, reading_date, metric_name, value, unit, aggregation_method,
  contributor_count, expected_count, count_unit, provenance
) VALUES
  ('anonymized-research-aggregates', '2021-03-26', 'heart_rate_bpm', 75.67, 'bpm', 'median', 41, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-26', 'rmssd', 75.77, 'unspecified', 'median', 41, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-26', 'sleep_duration_hours', 7.6667, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-26', 'sleep_efficiency', 0.9615, 'ratio', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-26', 'in_bed_duration_hours', 8, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-26', 'sleep_latency_hours', 0.3333, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-26', 'waso_minutes', 0, 'minutes', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-26', 'night_awakening_count', 0, 'count', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),

  ('anonymized-research-aggregates', '2021-03-27', 'heart_rate_bpm', 75.81, 'bpm', 'median', 44, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-27', 'rmssd', 74.35, 'unspecified', 'median', 44, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-27', 'sleep_duration_hours', 8.5, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-27', 'sleep_efficiency', 0.9741, 'ratio', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-27', 'in_bed_duration_hours', 9.1667, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-27', 'sleep_latency_hours', 0.25, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-27', 'waso_minutes', 0, 'minutes', 'median', 48, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-27', 'night_awakening_count', 0, 'count', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),

  ('anonymized-research-aggregates', '2021-03-28', 'heart_rate_bpm', 76, 'bpm', 'median', 47, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-28', 'rmssd', 65.73, 'unspecified', 'median', 47, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-28', 'sleep_duration_hours', 8.5, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-28', 'sleep_efficiency', 0.9574, 'ratio', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-28', 'in_bed_duration_hours', 9.3333, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-28', 'sleep_latency_hours', 0.3333, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-28', 'waso_minutes', 0, 'minutes', 'median', 48, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-28', 'night_awakening_count', 0, 'count', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),

  ('anonymized-research-aggregates', '2021-03-29', 'heart_rate_bpm', 77.45, 'bpm', 'median', 46, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-29', 'rmssd', 72.82, 'unspecified', 'median', 46, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-29', 'sleep_duration_hours', 7.0833, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-29', 'sleep_efficiency', 0.9429, 'ratio', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-29', 'in_bed_duration_hours', 7.75, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-29', 'sleep_latency_hours', 0.5, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-29', 'waso_minutes', 0, 'minutes', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-29', 'night_awakening_count', 0, 'count', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),

  ('anonymized-research-aggregates', '2021-03-30', 'heart_rate_bpm', 79.58, 'bpm', 'median', 45, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-30', 'rmssd', 76.37, 'unspecified', 'median', 45, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-30', 'sleep_duration_hours', 7.5833, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-30', 'sleep_efficiency', 0.9524, 'ratio', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-30', 'in_bed_duration_hours', 8.3333, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-30', 'sleep_latency_hours', 0.4, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-30', 'waso_minutes', 0, 'minutes', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-30', 'night_awakening_count', 0, 'count', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),

  ('anonymized-research-aggregates', '2021-03-31', 'heart_rate_bpm', 77.3, 'bpm', 'median', 47, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-31', 'rmssd', 74.02, 'unspecified', 'median', 47, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-31', 'sleep_duration_hours', 7.5, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-31', 'sleep_efficiency', 0.9559, 'ratio', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-31', 'in_bed_duration_hours', 8.25, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-31', 'sleep_latency_hours', 0.3333, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-31', 'waso_minutes', 0, 'minutes', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-03-31', 'night_awakening_count', 0, 'count', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),

  ('anonymized-research-aggregates', '2021-04-01', 'heart_rate_bpm', 78.93, 'bpm', 'median', 48, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-04-01', 'rmssd', 75.84, 'unspecified', 'median', 48, 49, 'participants', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-04-01', 'sleep_duration_hours', 7.75, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-04-01', 'sleep_efficiency', 0.9545, 'ratio', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-04-01', 'in_bed_duration_hours', 8.0833, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-04-01', 'sleep_latency_hours', 0.3333, 'hours', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-04-01', 'waso_minutes', 0, 'minutes', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.'),
  ('anonymized-research-aggregates', '2021-04-01', 'night_awakening_count', 0, 'count', 'median', 49, 49, 'records', 'Existing in-repository anonymized cohort daily median fixture; no participant identifiers or raw participant rows.')
ON CONFLICT (source, reading_date, metric_name) DO NOTHING;
