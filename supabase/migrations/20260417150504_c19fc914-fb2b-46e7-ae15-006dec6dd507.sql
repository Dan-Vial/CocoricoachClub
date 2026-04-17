ALTER TABLE public.gym_session_exercises
  ADD COLUMN IF NOT EXISTS drop_sets jsonb,
  ADD COLUMN IF NOT EXISTS cluster_sets jsonb,
  ADD COLUMN IF NOT EXISTS method text;