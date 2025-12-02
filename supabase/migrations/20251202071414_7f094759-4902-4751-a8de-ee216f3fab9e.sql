-- Add effective play time to matches table
ALTER TABLE public.matches
ADD COLUMN effective_play_time INTEGER;

-- Add new statistics columns to player_match_stats table
ALTER TABLE public.player_match_stats
ADD COLUMN defensive_recoveries INTEGER DEFAULT 0,
ADD COLUMN breakthroughs INTEGER DEFAULT 0,
ADD COLUMN total_contacts INTEGER DEFAULT 0;

-- Update existing records to have default values
UPDATE public.player_match_stats
SET defensive_recoveries = 0
WHERE defensive_recoveries IS NULL;

UPDATE public.player_match_stats
SET breakthroughs = 0
WHERE breakthroughs IS NULL;

UPDATE public.player_match_stats
SET total_contacts = 0
WHERE total_contacts IS NULL;