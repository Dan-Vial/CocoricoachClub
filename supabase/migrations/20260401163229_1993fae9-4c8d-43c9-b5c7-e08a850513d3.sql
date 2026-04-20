
-- Table for padel equipment (rackets, shoes, accessories)
CREATE TABLE public.player_padel_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  equipment_type TEXT NOT NULL DEFAULT 'racket',
  racket_brand TEXT,
  racket_model TEXT,
  racket_weight_g INTEGER,
  racket_shape TEXT,
  racket_balance TEXT,
  racket_surface TEXT,
  shoe_brand TEXT,
  shoe_model TEXT,
  accessory_type TEXT,
  accessory_brand TEXT,
  accessory_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session equipment linking table
CREATE TABLE public.padel_session_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES public.player_padel_equipment(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_padel_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.padel_session_equipment ENABLE ROW LEVEL SECURITY;

-- RLS for player_padel_equipment
CREATE POLICY "Category members can manage padel equipment"
ON public.player_padel_equipment
FOR ALL
TO authenticated
USING (public.can_access_category(auth.uid(), category_id))
WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Athlete token access for padel equipment"
ON public.player_padel_equipment
FOR SELECT
TO anon, authenticated
USING (public.has_valid_athlete_token_for_player(player_id));

-- RLS for padel_session_equipment
CREATE POLICY "Category members can manage padel session equipment"
ON public.padel_session_equipment
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.player_padel_equipment pe
    WHERE pe.id = equipment_id
    AND public.can_access_category(auth.uid(), pe.category_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.player_padel_equipment pe
    WHERE pe.id = equipment_id
    AND public.can_access_category(auth.uid(), pe.category_id)
  )
);

CREATE POLICY "Athlete token access for padel session equipment"
ON public.padel_session_equipment
FOR SELECT
TO anon, authenticated
USING (public.has_valid_athlete_token_for_player(player_id));
