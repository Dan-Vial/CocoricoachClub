ALTER TABLE public.training_session_blocks
  ADD COLUMN IF NOT EXISTS throwing_implement TEXT,
  ADD COLUMN IF NOT EXISTS implement_weight_g INTEGER;