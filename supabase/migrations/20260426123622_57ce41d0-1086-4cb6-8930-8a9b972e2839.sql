-- Table pour stocker les performances de lancer en entraînement
CREATE TABLE public.athletics_throwing_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  block_id UUID REFERENCES public.training_session_blocks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  implement TEXT NOT NULL, -- javelot/poids/disque/marteau
  implement_weight_g INTEGER, -- poids du matériel utilisé
  attempt_number INTEGER NOT NULL DEFAULT 1, -- numéro d'essai dans la séance
  distance_m NUMERIC(6,2), -- distance en mètres (ex: 47.85)
  is_valid BOOLEAN NOT NULL DEFAULT true, -- false = essai mordu/raté
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_throwing_attempts_player ON public.athletics_throwing_attempts(player_id, session_date DESC);
CREATE INDEX idx_throwing_attempts_category ON public.athletics_throwing_attempts(category_id, session_date DESC);
CREATE INDEX idx_throwing_attempts_session ON public.athletics_throwing_attempts(training_session_id);
CREATE INDEX idx_throwing_attempts_implement ON public.athletics_throwing_attempts(implement, implement_weight_g);

ALTER TABLE public.athletics_throwing_attempts ENABLE ROW LEVEL SECURITY;

-- Lecture : membres de la catégorie
CREATE POLICY "Category members can view throwing attempts"
ON public.athletics_throwing_attempts
FOR SELECT
USING (public.can_access_category(auth.uid(), category_id));

-- Insertion : staff (admin/coach) ou athlète propriétaire
CREATE POLICY "Staff and owner athlete can insert throwing attempts"
ON public.athletics_throwing_attempts
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

-- Mise à jour : staff ou athlète propriétaire
CREATE POLICY "Staff and owner athlete can update throwing attempts"
ON public.athletics_throwing_attempts
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

-- Suppression : staff uniquement
CREATE POLICY "Staff can delete throwing attempts"
ON public.athletics_throwing_attempts
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

CREATE TRIGGER update_throwing_attempts_updated_at
BEFORE UPDATE ON public.athletics_throwing_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();