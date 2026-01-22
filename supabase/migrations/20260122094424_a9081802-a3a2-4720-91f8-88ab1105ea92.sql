-- Add parent_match_id to allow grouping matches under a competition
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS parent_match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_matches_parent_match_id ON public.matches(parent_match_id);

-- Add comment
COMMENT ON COLUMN public.matches.parent_match_id IS 'References parent competition for sub-matches (e.g., matches within World Cup)';