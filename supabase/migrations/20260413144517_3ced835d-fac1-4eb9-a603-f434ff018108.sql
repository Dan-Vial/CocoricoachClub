
-- Add FIS-specific columns to players table
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS fis_ranking integer,
ADD COLUMN IF NOT EXISTS fis_points numeric,
ADD COLUMN IF NOT EXISTS fis_objective text,
ADD COLUMN IF NOT EXISTS fis_objective_date date;

-- Create FIS competitions table
CREATE TABLE public.fis_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  competition_date date NOT NULL,
  end_date date,
  discipline text NOT NULL DEFAULT 'slopestyle',
  level text NOT NULL DEFAULT 'fis',
  location text,
  country text,
  total_participants integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create FIS results table
CREATE TABLE public.fis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  competition_id uuid NOT NULL REFERENCES public.fis_competitions(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  ranking integer,
  fis_points numeric NOT NULL DEFAULT 0,
  score numeric,
  expires_at date,
  is_counting boolean DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, competition_id)
);

-- Create FIS ranking settings table (one per category)
CREATE TABLE public.fis_ranking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL UNIQUE REFERENCES public.categories(id) ON DELETE CASCADE,
  rolling_weeks integer NOT NULL DEFAULT 52,
  max_counting_results integer NOT NULL DEFAULT 5,
  point_multipliers jsonb DEFAULT '{"world_cup": 1.0, "europe_cup": 0.8, "fis": 0.6, "national": 0.4}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fis_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fis_ranking_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for fis_competitions
CREATE POLICY "Category members can view FIS competitions"
ON public.fis_competitions FOR SELECT
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Club admins/coaches can manage FIS competitions"
ON public.fis_competitions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club admins/coaches can update FIS competitions"
ON public.fis_competitions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club admins/coaches can delete FIS competitions"
ON public.fis_competitions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

-- RLS policies for fis_results
CREATE POLICY "Category members can view FIS results"
ON public.fis_results FOR SELECT
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Club admins/coaches can manage FIS results"
ON public.fis_results FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club admins/coaches can update FIS results"
ON public.fis_results FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club admins/coaches can delete FIS results"
ON public.fis_results FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

-- RLS policies for fis_ranking_settings
CREATE POLICY "Category members can view FIS ranking settings"
ON public.fis_ranking_settings FOR SELECT
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Club admins/coaches can manage FIS ranking settings"
ON public.fis_ranking_settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

-- Indexes for performance
CREATE INDEX idx_fis_competitions_category ON public.fis_competitions(category_id);
CREATE INDEX idx_fis_competitions_date ON public.fis_competitions(competition_date);
CREATE INDEX idx_fis_results_player ON public.fis_results(player_id);
CREATE INDEX idx_fis_results_competition ON public.fis_results(competition_id);
CREATE INDEX idx_fis_results_category ON public.fis_results(category_id);
CREATE INDEX idx_fis_results_expires ON public.fis_results(expires_at);

-- Trigger to auto-set expires_at on fis_results
CREATE OR REPLACE FUNCTION public.set_fis_result_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  v_competition_date date;
  v_rolling_weeks integer;
BEGIN
  SELECT competition_date INTO v_competition_date
  FROM public.fis_competitions WHERE id = NEW.competition_id;

  SELECT COALESCE(rolling_weeks, 52) INTO v_rolling_weeks
  FROM public.fis_ranking_settings WHERE category_id = NEW.category_id;

  IF v_rolling_weeks IS NULL THEN
    v_rolling_weeks := 52;
  END IF;

  NEW.expires_at := v_competition_date + (v_rolling_weeks * 7);
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_fis_result_expiry_trigger
BEFORE INSERT OR UPDATE ON public.fis_results
FOR EACH ROW
EXECUTE FUNCTION public.set_fis_result_expiry();

-- Updated_at triggers
CREATE TRIGGER update_fis_competitions_updated_at
BEFORE UPDATE ON public.fis_competitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fis_results_updated_at
BEFORE UPDATE ON public.fis_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fis_ranking_settings_updated_at
BEFORE UPDATE ON public.fis_ranking_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
