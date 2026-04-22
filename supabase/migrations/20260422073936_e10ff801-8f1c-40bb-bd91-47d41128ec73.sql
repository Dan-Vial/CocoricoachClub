ALTER TABLE public.periodization_cycles
  ADD COLUMN IF NOT EXISTS dominant_quality text,
  ADD COLUMN IF NOT EXISTS load_pattern text,
  ADD COLUMN IF NOT EXISTS fatigue_target text,
  ADD COLUMN IF NOT EXISTS sessions_per_week smallint;