-- Create nutrition_entries table for meal and hydration tracking
CREATE TABLE public.nutrition_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'hydration')),
  meal_description TEXT,
  calories INTEGER,
  proteins_g NUMERIC,
  carbs_g NUMERIC,
  fats_g NUMERIC,
  water_ml INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create season_goals table for planning
CREATE TABLE public.season_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('team', 'physical', 'tactical', 'technical')),
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create season_milestones table
CREATE TABLE public.season_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  milestone_date DATE NOT NULL,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('competition', 'training', 'evaluation', 'other')),
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.nutrition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies for nutrition_entries
CREATE POLICY "Club members can view nutrition entries"
  ON public.nutrition_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = nutrition_entries.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can insert nutrition entries"
  ON public.nutrition_entries FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = nutrition_entries.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can update nutrition entries"
  ON public.nutrition_entries FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = nutrition_entries.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can delete nutrition entries"
  ON public.nutrition_entries FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = nutrition_entries.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

-- RLS policies for season_goals
CREATE POLICY "Club members can view season goals"
  ON public.season_goals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = season_goals.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can insert season goals"
  ON public.season_goals FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = season_goals.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can update season goals"
  ON public.season_goals FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = season_goals.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can delete season goals"
  ON public.season_goals FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = season_goals.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

-- RLS policies for season_milestones
CREATE POLICY "Club members can view season milestones"
  ON public.season_milestones FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = season_milestones.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can insert season milestones"
  ON public.season_milestones FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = season_milestones.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can update season milestones"
  ON public.season_milestones FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = season_milestones.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can delete season milestones"
  ON public.season_milestones FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = season_milestones.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

-- Add trigger for updated_at on season_goals
CREATE TRIGGER update_season_goals_updated_at
  BEFORE UPDATE ON public.season_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();