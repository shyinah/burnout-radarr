-- ============================================================================
-- Burnout Radarr: Minimal Hackathon MVP Schema
-- Tables: profiles, sessions, cfi_results
-- Safe to rerun (Idempotent)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Profiles & Preferences
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Taylor',
  default_mode TEXT NOT NULL DEFAULT 'student' CHECK (default_mode IN ('student', 'developer')),
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  focus_minutes INTEGER NOT NULL DEFAULT 50 CHECK (focus_minutes > 0),
  break_minutes INTEGER NOT NULL DEFAULT 10 CHECK (break_minutes >= 0),
  break_reminders BOOLEAN NOT NULL DEFAULT true,
  notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 2. Sessions (Student & Developer)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('student', 'developer')),
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  project TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  goal TEXT NOT NULL DEFAULT '',
  focus_minutes INTEGER NOT NULL CHECK (focus_minutes >= 0),
  break_minutes INTEGER NOT NULL CHECK (break_minutes >= 0),
  sleep_hours NUMERIC(4, 2) NOT NULL CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
  perceived_fatigue INTEGER NOT NULL CHECK (perceived_fatigue >= 1 AND perceived_fatigue <= 10),
  completed BOOLEAN NOT NULL DEFAULT true,
  feeling TEXT NOT NULL DEFAULT 'Steady',
  session_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Composite unique constraint enables strict composite FK in cfi_results
  CONSTRAINT sessions_id_user_id_key UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON public.sessions (user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_mode ON public.sessions (user_id, mode);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
CREATE POLICY "Users can insert own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;
CREATE POLICY "Users can delete own sessions"
  ON public.sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. CFI Results (1:1 with Sessions & Ownership Guarded)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cfi_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high')),
  explanation JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Schema-level enforcement: guarantees session_id belongs to the exact same user_id
  CONSTRAINT fk_cfi_session_user FOREIGN KEY (session_id, user_id)
    REFERENCES public.sessions(id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cfi_results_session ON public.cfi_results (session_id);
CREATE INDEX IF NOT EXISTS idx_cfi_results_user ON public.cfi_results (user_id);

ALTER TABLE public.cfi_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cfi_results" ON public.cfi_results;
CREATE POLICY "Users can view own cfi_results"
  ON public.cfi_results FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cfi_results" ON public.cfi_results;
CREATE POLICY "Users can insert own cfi_results"
  ON public.cfi_results FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own cfi_results" ON public.cfi_results;
CREATE POLICY "Users can update own cfi_results"
  ON public.cfi_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own cfi_results" ON public.cfi_results;
CREATE POLICY "Users can delete own cfi_results"
  ON public.cfi_results FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Hardened Automatic Profile Creation Trigger
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      'Taylor'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Restrict function execution to administrative trigger execution only
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
