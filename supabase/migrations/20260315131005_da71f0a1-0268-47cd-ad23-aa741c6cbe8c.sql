
-- Bowling ball catalog (shared across all users)
CREATE TABLE public.bowling_ball_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  cover_type TEXT NOT NULL DEFAULT 'reactive',
  core_type TEXT NOT NULL DEFAULT 'symmetric',
  rg NUMERIC(4,3) NULL,
  differential NUMERIC(4,3) NULL,
  intermediate_diff NUMERIC(4,3) NULL,
  factory_surface TEXT NULL,
  image_url TEXT NULL,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand, model)
);

-- Player bowling arsenal
CREATE TABLE public.player_bowling_arsenal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  ball_catalog_id UUID REFERENCES public.bowling_ball_catalog(id),
  custom_ball_name TEXT NULL,
  custom_ball_brand TEXT NULL,
  weight_lbs INTEGER NULL,
  purchase_date DATE NULL,
  current_surface TEXT NULL,
  games_played INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bowling spare training exercises
CREATE TABLE public.bowling_spare_training (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  training_session_id UUID NULL REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  exercise_type TEXT NOT NULL, -- 'spare_pin_7', 'spare_pin_10', etc.
  attempts INTEGER NOT NULL DEFAULT 0,
  successes INTEGER NOT NULL DEFAULT 0,
  success_rate NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN attempts > 0 THEN ROUND((successes::numeric / attempts) * 100, 2) ELSE 0 END
  ) STORED,
  ball_arsenal_id UUID NULL REFERENCES public.player_bowling_arsenal(id) ON DELETE SET NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bowling_ball_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_bowling_arsenal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bowling_spare_training ENABLE ROW LEVEL SECURITY;

-- RLS policies for bowling_ball_catalog (readable by all authenticated, writable by creators)
CREATE POLICY "Anyone can read bowling ball catalog" ON public.bowling_ball_catalog
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert custom balls" ON public.bowling_ball_catalog
  FOR INSERT TO authenticated WITH CHECK (is_system = false AND created_by = auth.uid());

-- RLS policies for player_bowling_arsenal
CREATE POLICY "Users can view arsenal via category access" ON public.player_bowling_arsenal
  FOR SELECT TO authenticated USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can manage arsenal via category access" ON public.player_bowling_arsenal
  FOR INSERT TO authenticated WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update arsenal via category access" ON public.player_bowling_arsenal
  FOR UPDATE TO authenticated USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete arsenal via category access" ON public.player_bowling_arsenal
  FOR DELETE TO authenticated USING (public.can_access_category(auth.uid(), category_id));

-- RLS policies for bowling_spare_training
CREATE POLICY "Users can view spare training via category access" ON public.bowling_spare_training
  FOR SELECT TO authenticated USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can insert spare training via category access" ON public.bowling_spare_training
  FOR INSERT TO authenticated WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update spare training via category access" ON public.bowling_spare_training
  FOR UPDATE TO authenticated USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete spare training via category access" ON public.bowling_spare_training
  FOR DELETE TO authenticated USING (public.can_access_category(auth.uid(), category_id));

-- Also allow athlete token access for arsenal viewing
CREATE POLICY "Athletes can view own arsenal via token" ON public.player_bowling_arsenal
  FOR SELECT TO anon USING (public.has_valid_athlete_token_for_player(player_id));

CREATE POLICY "Athletes can view own spare training via token" ON public.bowling_spare_training
  FOR SELECT TO anon USING (public.has_valid_athlete_token_for_player(player_id));
