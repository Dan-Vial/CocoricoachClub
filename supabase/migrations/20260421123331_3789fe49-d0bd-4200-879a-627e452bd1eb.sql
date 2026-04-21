-- Create player_medals table
CREATE TABLE public.player_medals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  medal_type TEXT NOT NULL CHECK (medal_type IN ('gold', 'silver', 'bronze', 'ranking', 'title')),
  rank INTEGER,
  custom_title TEXT,
  team_label TEXT,
  group_id UUID,
  notes TEXT,
  awarded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_player_medals_player ON public.player_medals(player_id);
CREATE INDEX idx_player_medals_match ON public.player_medals(match_id);
CREATE INDEX idx_player_medals_category ON public.player_medals(category_id);
CREATE INDEX idx_player_medals_group ON public.player_medals(group_id);

-- Enable RLS
ALTER TABLE public.player_medals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view medals in their accessible categories"
ON public.player_medals FOR SELECT
USING (public.can_access_category(auth.uid(), category_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can create medals in their categories"
ON public.player_medals FOR INSERT
WITH CHECK (
  public.can_access_category(auth.uid(), category_id) 
  AND auth.uid() = created_by
);

CREATE POLICY "Users can update medals in their categories"
ON public.player_medals FOR UPDATE
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete medals in their categories"
ON public.player_medals FOR DELETE
USING (public.can_access_category(auth.uid(), category_id));

-- Trigger to update updated_at
CREATE TRIGGER update_player_medals_updated_at
BEFORE UPDATE ON public.player_medals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();