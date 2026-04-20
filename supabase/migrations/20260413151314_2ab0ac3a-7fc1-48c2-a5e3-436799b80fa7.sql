ALTER TABLE public.players ADD COLUMN IF NOT EXISTS fis_code text;

CREATE INDEX IF NOT EXISTS idx_players_fis_code ON public.players (fis_code) WHERE fis_code IS NOT NULL;