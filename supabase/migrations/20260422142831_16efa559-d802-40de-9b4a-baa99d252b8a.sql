ALTER TABLE public.match_lineups
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS specialty text;

ALTER TABLE public.match_lineups
  DROP CONSTRAINT IF EXISTS match_lineups_match_id_player_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS match_lineups_match_player_event_key
  ON public.match_lineups (
    match_id,
    player_id,
    COALESCE(discipline, ''),
    COALESCE(specialty, '')
  );