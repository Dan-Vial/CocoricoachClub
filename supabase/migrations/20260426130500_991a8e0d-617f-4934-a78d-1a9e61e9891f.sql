-- Table pour stocker les performances de course/sprint/haies en entraînement
CREATE TABLE public.athletics_sprint_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  block_id UUID REFERENCES public.training_session_blocks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  exercise_type TEXT NOT NULL, -- sprint / acceleration / vitesse_max / endurance_vitesse / haies / demifond / course_elan
  attempt_number INTEGER NOT NULL DEFAULT 1,
  distance_m NUMERIC(6,2) NOT NULL,
  time_seconds NUMERIC(7,3), -- ex: 10.234
  start_type TEXT, -- blocs / debout / lance / trois_points
  load_type TEXT, -- aucun / leste / parachute / traineau / gilet / elastique / descente
  load_kg NUMERIC(5,2), -- charge additionnelle si lestage
  wind_ms NUMERIC(4,2), -- vent en m/s (positif = portant)
  vmax_ms NUMERIC(5,2), -- calculé auto = distance/temps
  is_valid BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sprint_attempts_player ON public.athletics_sprint_attempts(player_id, session_date DESC);
CREATE INDEX idx_sprint_attempts_category ON public.athletics_sprint_attempts(category_id, session_date DESC);
CREATE INDEX idx_sprint_attempts_session ON public.athletics_sprint_attempts(training_session_id);
CREATE INDEX idx_sprint_attempts_exercise ON public.athletics_sprint_attempts(exercise_type, distance_m);

ALTER TABLE public.athletics_sprint_attempts ENABLE ROW LEVEL SECURITY;

-- Trigger pour calculer Vmax automatiquement
CREATE OR REPLACE FUNCTION public.compute_sprint_vmax()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.distance_m IS NOT NULL AND NEW.time_seconds IS NOT NULL AND NEW.time_seconds > 0 THEN
    NEW.vmax_ms := ROUND((NEW.distance_m / NEW.time_seconds)::numeric, 2);
  ELSE
    NEW.vmax_ms := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER compute_sprint_vmax_trigger
BEFORE INSERT OR UPDATE ON public.athletics_sprint_attempts
FOR EACH ROW EXECUTE FUNCTION public.compute_sprint_vmax();

CREATE TRIGGER update_sprint_attempts_updated_at
BEFORE UPDATE ON public.athletics_sprint_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lecture : membres de la catégorie
CREATE POLICY "Category members can view sprint attempts"
ON public.athletics_sprint_attempts
FOR SELECT
USING (public.can_access_category(auth.uid(), category_id));

-- Insertion : staff (admin/coach) ou athlète propriétaire
CREATE POLICY "Staff and owner athlete can insert sprint attempts"
ON public.athletics_sprint_attempts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.club_members cm ON cm.club_id = c.club_id
    WHERE c.id = category_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin','coach')
  )
  OR EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = player_id AND p.user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Staff and owner athlete can update sprint attempts"
ON public.athletics_sprint_attempts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.club_members cm ON cm.club_id = c.club_id
    WHERE c.id = category_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin','coach')
  )
  OR EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = player_id AND p.user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Staff can delete sprint attempts"
ON public.athletics_sprint_attempts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.club_members cm ON cm.club_id = c.club_id
    WHERE c.id = category_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin','coach')
  )
  OR public.is_super_admin(auth.uid())
);