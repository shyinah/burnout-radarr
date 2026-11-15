-- ============================================================================
-- Burnout Radarr: opt-in, privacy-safe browser activity session aggregates
-- No key values, typed text, targets, page contents, or passwords are stored.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.browser_activity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'browser-tab' CHECK (source = 'browser-tab'),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
  key_press_count INTEGER NOT NULL CHECK (key_press_count >= 0),
  mouse_click_count INTEGER NOT NULL CHECK (mouse_click_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT browser_activity_session_time_check CHECK (ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_browser_activity_sessions_user_started
  ON public.browser_activity_sessions (user_id, started_at DESC);

ALTER TABLE public.browser_activity_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.browser_activity_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.browser_activity_sessions TO authenticated;

DROP POLICY IF EXISTS "Users can view own browser activity sessions" ON public.browser_activity_sessions;
CREATE POLICY "Users can view own browser activity sessions"
  ON public.browser_activity_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own browser activity sessions" ON public.browser_activity_sessions;
CREATE POLICY "Users can insert own browser activity sessions"
  ON public.browser_activity_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
