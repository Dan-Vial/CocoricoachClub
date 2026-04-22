-- Athletics: track event start order on lineup and add wind direction + RP flag on rounds
ALTER TABLE public.match_lineups
  ADD COLUMN IF NOT EXISTS start_order integer;

ALTER TABLE public.competition_rounds
  ADD COLUMN IF NOT EXISTS wind_direction text,
  ADD COLUMN IF NOT EXISTS is_personal_record boolean NOT NULL DEFAULT false;