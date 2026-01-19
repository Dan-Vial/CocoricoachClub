-- Add Aviron/Judo specific columns to matches table
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'team', -- 'individual' or 'team'
ADD COLUMN IF NOT EXISTS age_category TEXT, -- 'U19', 'Senior', 'Master'...
ADD COLUMN IF NOT EXISTS distance_meters INTEGER; -- 1000, 1500, 2000 for Aviron

-- Add columns to match_lineups for boat/crew information (Aviron)
ALTER TABLE public.match_lineups
ADD COLUMN IF NOT EXISTS boat_type TEXT, -- '1x', '2x', '4-', '8+'...
ADD COLUMN IF NOT EXISTS crew_role TEXT, -- 'rameur', 'barreur'
ADD COLUMN IF NOT EXISTS seat_position INTEGER; -- seat number 1-8

-- Add phase and conditions columns to competition_rounds for races/fights
ALTER TABLE public.competition_rounds
ADD COLUMN IF NOT EXISTS phase TEXT, -- 'serie', 'repechage', 'demi', 'finale', 'poules', 'quart'
ADD COLUMN IF NOT EXISTS lane INTEGER, -- Couloir for Aviron
ADD COLUMN IF NOT EXISTS wind_conditions TEXT, -- Vent
ADD COLUMN IF NOT EXISTS current_conditions TEXT, -- Courant
ADD COLUMN IF NOT EXISTS temperature_celsius NUMERIC, -- Température
ADD COLUMN IF NOT EXISTS final_time_seconds NUMERIC, -- Temps final in seconds
ADD COLUMN IF NOT EXISTS ranking INTEGER, -- Classement
ADD COLUMN IF NOT EXISTS gap_to_first TEXT; -- Écart au 1er (% or seconds)