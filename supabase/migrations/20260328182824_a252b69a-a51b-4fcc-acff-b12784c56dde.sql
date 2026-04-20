-- Clean up duplicate oil patterns per match (keep latest)
DELETE FROM public.bowling_oil_patterns a
USING public.bowling_oil_patterns b
WHERE a.match_id = b.match_id
  AND a.match_id IS NOT NULL
  AND a.created_at < b.created_at;

-- Add unique constraint on match_id (allow nulls)
CREATE UNIQUE INDEX IF NOT EXISTS bowling_oil_patterns_match_id_unique ON public.bowling_oil_patterns (match_id) WHERE match_id IS NOT NULL;