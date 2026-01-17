-- Add sport_data column to store sport-specific statistics as JSON
ALTER TABLE public.player_match_stats 
ADD COLUMN IF NOT EXISTS sport_data JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the column
COMMENT ON COLUMN public.player_match_stats.sport_data IS 'Stores sport-specific statistics as JSON (for basketball, judo, bowling, aviron, etc.)';