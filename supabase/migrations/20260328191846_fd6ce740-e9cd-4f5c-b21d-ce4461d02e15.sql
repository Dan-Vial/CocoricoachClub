
ALTER TABLE public.player_bowling_arsenal
  ADD COLUMN IF NOT EXISTS custom_rg numeric NULL,
  ADD COLUMN IF NOT EXISTS custom_differential numeric NULL,
  ADD COLUMN IF NOT EXISTS custom_intermediate_diff numeric NULL,
  ADD COLUMN IF NOT EXISTS balance_type text NULL;
