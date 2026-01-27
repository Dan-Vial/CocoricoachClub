-- Add GPS Player Load column to awcr_tracking for dual tracking (RPE + GPS)
ALTER TABLE public.awcr_tracking 
ADD COLUMN IF NOT EXISTS gps_player_load numeric DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.awcr_tracking.gps_player_load IS 'Player Load value from GPS tracking (Catapult/STATSports) - displayed as supplementary metric alongside RPE × duration calculation';