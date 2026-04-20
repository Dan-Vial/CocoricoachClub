
CREATE TABLE public.kicking_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  kick_type TEXT NOT NULL DEFAULT 'penalty',
  zone_x NUMERIC NOT NULL DEFAULT 50,
  zone_y NUMERIC NOT NULL DEFAULT 50,
  zone_label TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  half INTEGER DEFAULT 1,
  minute INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kicking_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kicking attempts in their categories"
ON public.kicking_attempts FOR SELECT
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can create kicking attempts"
ON public.kicking_attempts FOR INSERT
TO authenticated
WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update kicking attempts"
ON public.kicking_attempts FOR UPDATE
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete kicking attempts"
ON public.kicking_attempts FOR DELETE
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

CREATE INDEX idx_kicking_attempts_match ON public.kicking_attempts(match_id);
CREATE INDEX idx_kicking_attempts_player ON public.kicking_attempts(player_id);
CREATE INDEX idx_kicking_attempts_category ON public.kicking_attempts(category_id);
