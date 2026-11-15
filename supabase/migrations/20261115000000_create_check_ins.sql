-- ============================================================================
-- Burnout Radarr: authenticated morning and evening check-in persistence
-- Forward-only addition; existing tables and records are unchanged.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  local_date DATE NOT NULL,
  timezone TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answers JSONB NOT NULL,
  schema_version SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_ins_period_check CHECK (period IN ('morning', 'evening')),
  CONSTRAINT check_ins_timezone_not_empty CHECK (length(trim(timezone)) > 0),
  CONSTRAINT check_ins_answers_object_check CHECK (jsonb_typeof(answers) = 'object'),
  CONSTRAINT check_ins_schema_version_check CHECK (schema_version > 0),
  CONSTRAINT check_ins_user_date_period_key UNIQUE (user_id, local_date, period)
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.check_ins FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.check_ins TO authenticated;

DROP POLICY IF EXISTS "Users can view own check-ins" ON public.check_ins;
CREATE POLICY "Users can view own check-ins"
  ON public.check_ins FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own check-ins" ON public.check_ins;
CREATE POLICY "Users can insert own check-ins"
  ON public.check_ins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
