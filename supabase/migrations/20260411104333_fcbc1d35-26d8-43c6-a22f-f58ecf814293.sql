
CREATE TABLE public.bowling_oil_pattern_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  oil_pattern_id UUID NOT NULL REFERENCES public.bowling_oil_patterns(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(oil_pattern_id, player_id)
);

ALTER TABLE public.bowling_oil_pattern_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view oil pattern assignments"
ON public.bowling_oil_pattern_players FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage oil pattern assignments"
ON public.bowling_oil_pattern_players FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete oil pattern assignments"
ON public.bowling_oil_pattern_players FOR DELETE
TO authenticated
USING (true);
