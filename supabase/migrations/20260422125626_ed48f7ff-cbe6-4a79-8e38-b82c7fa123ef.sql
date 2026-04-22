
-- Athletics minimas: federation thresholds per category & discipline
CREATE TABLE IF NOT EXISTS public.athletics_minimas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  specialty TEXT,
  label TEXT NOT NULL DEFAULT 'Minima fédéral',
  target_value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'sec',
  lower_is_better BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athletics_minimas_category ON public.athletics_minimas(category_id);
CREATE INDEX IF NOT EXISTS idx_athletics_minimas_discipline ON public.athletics_minimas(discipline, specialty);

ALTER TABLE public.athletics_minimas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view minimas in their category"
  ON public.athletics_minimas FOR SELECT
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Coaches can insert minimas"
  ON public.athletics_minimas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_id
        AND public.can_modify_club_data(auth.uid(), c.club_id)
    )
  );

CREATE POLICY "Coaches can update minimas"
  ON public.athletics_minimas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_id
        AND public.can_modify_club_data(auth.uid(), c.club_id)
    )
  );

CREATE POLICY "Coaches can delete minimas"
  ON public.athletics_minimas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_id
        AND public.can_modify_club_data(auth.uid(), c.club_id)
    )
  );

CREATE TRIGGER trg_athletics_minimas_updated_at
  BEFORE UPDATE ON public.athletics_minimas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Athletics records: personal best and season best per player per discipline
CREATE TABLE IF NOT EXISTS public.athletics_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  specialty TEXT,
  personal_best NUMERIC,
  personal_best_date DATE,
  personal_best_location TEXT,
  season_best NUMERIC,
  season_best_date DATE,
  season_best_location TEXT,
  season_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INTEGER,
  unit TEXT NOT NULL DEFAULT 'sec',
  lower_is_better BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (player_id, discipline, specialty, season_year)
);

CREATE INDEX IF NOT EXISTS idx_athletics_records_player ON public.athletics_records(player_id);
CREATE INDEX IF NOT EXISTS idx_athletics_records_category ON public.athletics_records(category_id);

ALTER TABLE public.athletics_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view records in their category"
  ON public.athletics_records FOR SELECT
  USING (
    public.can_access_category(auth.uid(), category_id)
    OR public.has_valid_athlete_token_for_player(player_id)
  );

CREATE POLICY "Coaches can insert records"
  ON public.athletics_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_id
        AND public.can_modify_club_data(auth.uid(), c.club_id)
    )
  );

CREATE POLICY "Coaches can update records"
  ON public.athletics_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_id
        AND public.can_modify_club_data(auth.uid(), c.club_id)
    )
  );

CREATE POLICY "Coaches can delete records"
  ON public.athletics_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_id
        AND public.can_modify_club_data(auth.uid(), c.club_id)
    )
  );

CREATE TRIGGER trg_athletics_records_updated_at
  BEFORE UPDATE ON public.athletics_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
