-- Table for storing individual rounds/bouts/games within a competition
CREATE TABLE public.competition_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  opponent_name TEXT,
  result TEXT, -- 'win', 'loss', 'draw'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, player_id, round_number)
);

-- Table for storing stats per round
CREATE TABLE public.competition_round_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.competition_rounds(id) ON DELETE CASCADE,
  stat_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.competition_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_round_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for competition_rounds
CREATE POLICY "Users can view competition rounds for their categories"
ON public.competition_rounds
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN categories c ON m.category_id = c.id
    JOIN clubs cl ON c.club_id = cl.id
    WHERE m.id = competition_rounds.match_id
    AND (
      cl.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = cl.id AND cm.user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM category_members catm WHERE catm.category_id = c.id AND catm.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can insert competition rounds for their categories"
ON public.competition_rounds
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN categories c ON m.category_id = c.id
    JOIN clubs cl ON c.club_id = cl.id
    WHERE m.id = competition_rounds.match_id
    AND (
      cl.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = cl.id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'coach')) OR
      EXISTS (SELECT 1 FROM category_members catm WHERE catm.category_id = c.id AND catm.user_id = auth.uid() AND catm.role IN ('admin', 'coach'))
    )
  )
);

CREATE POLICY "Users can update competition rounds for their categories"
ON public.competition_rounds
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN categories c ON m.category_id = c.id
    JOIN clubs cl ON c.club_id = cl.id
    WHERE m.id = competition_rounds.match_id
    AND (
      cl.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = cl.id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'coach')) OR
      EXISTS (SELECT 1 FROM category_members catm WHERE catm.category_id = c.id AND catm.user_id = auth.uid() AND catm.role IN ('admin', 'coach'))
    )
  )
);

CREATE POLICY "Users can delete competition rounds for their categories"
ON public.competition_rounds
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN categories c ON m.category_id = c.id
    JOIN clubs cl ON c.club_id = cl.id
    WHERE m.id = competition_rounds.match_id
    AND (
      cl.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = cl.id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'coach')) OR
      EXISTS (SELECT 1 FROM category_members catm WHERE catm.category_id = c.id AND catm.user_id = auth.uid() AND catm.role IN ('admin', 'coach'))
    )
  )
);

-- Create policies for competition_round_stats (similar pattern)
CREATE POLICY "Users can view competition round stats"
ON public.competition_round_stats
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM competition_rounds cr
    JOIN matches m ON cr.match_id = m.id
    JOIN categories c ON m.category_id = c.id
    JOIN clubs cl ON c.club_id = cl.id
    WHERE cr.id = competition_round_stats.round_id
    AND (
      cl.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = cl.id AND cm.user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM category_members catm WHERE catm.category_id = c.id AND catm.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can insert competition round stats"
ON public.competition_round_stats
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM competition_rounds cr
    JOIN matches m ON cr.match_id = m.id
    JOIN categories c ON m.category_id = c.id
    JOIN clubs cl ON c.club_id = cl.id
    WHERE cr.id = competition_round_stats.round_id
    AND (
      cl.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = cl.id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'coach')) OR
      EXISTS (SELECT 1 FROM category_members catm WHERE catm.category_id = c.id AND catm.user_id = auth.uid() AND catm.role IN ('admin', 'coach'))
    )
  )
);

CREATE POLICY "Users can update competition round stats"
ON public.competition_round_stats
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM competition_rounds cr
    JOIN matches m ON cr.match_id = m.id
    JOIN categories c ON m.category_id = c.id
    JOIN clubs cl ON c.club_id = cl.id
    WHERE cr.id = competition_round_stats.round_id
    AND (
      cl.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = cl.id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'coach')) OR
      EXISTS (SELECT 1 FROM category_members catm WHERE catm.category_id = c.id AND catm.user_id = auth.uid() AND catm.role IN ('admin', 'coach'))
    )
  )
);

CREATE POLICY "Users can delete competition round stats"
ON public.competition_round_stats
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM competition_rounds cr
    JOIN matches m ON cr.match_id = m.id
    JOIN categories c ON m.category_id = c.id
    JOIN clubs cl ON c.club_id = cl.id
    WHERE cr.id = competition_round_stats.round_id
    AND (
      cl.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = cl.id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'coach')) OR
      EXISTS (SELECT 1 FROM category_members catm WHERE catm.category_id = c.id AND catm.user_id = auth.uid() AND catm.role IN ('admin', 'coach'))
    )
  )
);

-- Create index for performance
CREATE INDEX idx_competition_rounds_match_player ON public.competition_rounds(match_id, player_id);
CREATE INDEX idx_competition_round_stats_round ON public.competition_round_stats(round_id);

-- Create trigger for timestamps
CREATE TRIGGER update_competition_rounds_updated_at
BEFORE UPDATE ON public.competition_rounds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competition_round_stats_updated_at
BEFORE UPDATE ON public.competition_round_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();