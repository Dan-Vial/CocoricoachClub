-- Table pour le suivi de composition corporelle
CREATE TABLE public.body_composition (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  body_fat_percentage NUMERIC,
  muscle_mass_kg NUMERIC,
  bmi NUMERIC GENERATED ALWAYS AS (
    CASE WHEN height_cm > 0 THEN weight_kg / ((height_cm / 100) * (height_cm / 100)) ELSE NULL END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les tests spécifiques rugby
CREATE TABLE public.rugby_specific_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  test_type TEXT NOT NULL, -- 'yo_yo_ir1', 'yo_yo_ir2', 'bronco', '5_10_5', 't_test'
  -- Yo-Yo test
  yo_yo_level TEXT,
  yo_yo_distance_m INTEGER,
  -- Bronco test
  bronco_time_seconds NUMERIC,
  -- Agility tests
  agility_time_seconds NUMERIC,
  -- Notes
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les benchmarks pré-saison par poste
CREATE TABLE public.position_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  position TEXT NOT NULL, -- 'pilier', 'talonneur', 'deuxieme_ligne', 'flanker', 'numero_8', 'demi_melee', 'demi_ouverture', 'centre', 'ailier', 'arriere'
  -- Speed benchmarks
  sprint_40m_elite NUMERIC,
  sprint_40m_good NUMERIC,
  -- Yo-Yo benchmarks
  yo_yo_level_elite TEXT,
  yo_yo_level_good TEXT,
  -- Strength benchmarks
  squat_ratio_elite NUMERIC, -- ratio poids soulevé / poids corps
  squat_ratio_good NUMERIC,
  bench_ratio_elite NUMERIC,
  bench_ratio_good NUMERIC,
  -- Body composition benchmarks
  body_fat_max NUMERIC,
  muscle_mass_min_ratio NUMERIC, -- ratio masse musculaire / poids corps
  -- Jump benchmarks
  cmj_cm_elite INTEGER,
  cmj_cm_good INTEGER,
  -- Notes
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, position)
);

-- Table pour le score de disponibilité joueur
CREATE TABLE public.player_availability_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Composantes du score (0-100)
  awcr_score INTEGER,
  wellness_score INTEGER,
  injury_score INTEGER,
  fatigue_score INTEGER,
  -- Score global
  overall_score INTEGER,
  availability_status TEXT NOT NULL DEFAULT 'available', -- 'available', 'limited', 'unavailable'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, score_date)
);

-- Enable RLS
ALTER TABLE public.body_composition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rugby_specific_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_availability_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for body_composition
CREATE POLICY "Club members can view body composition"
ON public.body_composition FOR SELECT
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = body_composition.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can insert body composition"
ON public.body_composition FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = body_composition.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can update body composition"
ON public.body_composition FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = body_composition.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can delete body composition"
ON public.body_composition FOR DELETE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = body_composition.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

-- RLS policies for rugby_specific_tests
CREATE POLICY "Club members can view rugby specific tests"
ON public.rugby_specific_tests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = rugby_specific_tests.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can insert rugby specific tests"
ON public.rugby_specific_tests FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = rugby_specific_tests.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can update rugby specific tests"
ON public.rugby_specific_tests FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = rugby_specific_tests.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can delete rugby specific tests"
ON public.rugby_specific_tests FOR DELETE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = rugby_specific_tests.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

-- RLS policies for position_benchmarks
CREATE POLICY "Club members can view position benchmarks"
ON public.position_benchmarks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = position_benchmarks.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can insert position benchmarks"
ON public.position_benchmarks FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = position_benchmarks.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can update position benchmarks"
ON public.position_benchmarks FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = position_benchmarks.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can delete position benchmarks"
ON public.position_benchmarks FOR DELETE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = position_benchmarks.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

-- RLS policies for player_availability_scores
CREATE POLICY "Club members can view availability scores"
ON public.player_availability_scores FOR SELECT
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = player_availability_scores.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can insert availability scores"
ON public.player_availability_scores FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = player_availability_scores.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can update availability scores"
ON public.player_availability_scores FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = player_availability_scores.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can delete availability scores"
ON public.player_availability_scores FOR DELETE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = player_availability_scores.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

-- Add position field to players table
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS position TEXT;