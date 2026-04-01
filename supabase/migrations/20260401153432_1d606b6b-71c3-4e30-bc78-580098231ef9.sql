
-- Table équipement surf
CREATE TABLE public.player_surf_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL DEFAULT 'board',
  board_brand TEXT,
  board_model TEXT,
  board_shaper TEXT,
  board_length_feet NUMERIC,
  board_width_inches NUMERIC,
  board_thickness_inches NUMERIC,
  board_volume_liters NUMERIC,
  board_type TEXT,
  fins_type TEXT,
  fins_brand TEXT,
  fins_model TEXT,
  wetsuit_thickness TEXT,
  wetsuit_brand TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  purchase_date DATE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.surf_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  swell_height_m NUMERIC,
  swell_period_s NUMERIC,
  swell_direction TEXT,
  wind_speed_kmh NUMERIC,
  wind_direction TEXT,
  tide_level TEXT,
  tide_coefficient INTEGER,
  tide_phase TEXT,
  spot_name TEXT,
  spot_quality INTEGER,
  bottom_type TEXT,
  bottom_notes TEXT,
  wave_quality INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.surf_session_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.player_surf_equipment(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.player_surf_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surf_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surf_session_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sel_surf_equip_auth" ON public.player_surf_equipment FOR SELECT TO authenticated USING (public.can_access_category(auth.uid(), category_id));
CREATE POLICY "ins_surf_equip_auth" ON public.player_surf_equipment FOR INSERT TO authenticated WITH CHECK (public.can_access_category(auth.uid(), category_id));
CREATE POLICY "upd_surf_equip_auth" ON public.player_surf_equipment FOR UPDATE TO authenticated USING (public.can_access_category(auth.uid(), category_id));
CREATE POLICY "del_surf_equip_auth" ON public.player_surf_equipment FOR DELETE TO authenticated USING (public.can_access_category(auth.uid(), category_id));
CREATE POLICY "sel_surf_equip_anon" ON public.player_surf_equipment FOR SELECT TO anon USING (public.has_valid_athlete_token_for_player(player_id));
CREATE POLICY "ins_surf_equip_anon" ON public.player_surf_equipment FOR INSERT TO anon WITH CHECK (public.has_valid_athlete_token_for_player(player_id));
CREATE POLICY "upd_surf_equip_anon" ON public.player_surf_equipment FOR UPDATE TO anon USING (public.has_valid_athlete_token_for_player(player_id));
CREATE POLICY "del_surf_equip_anon" ON public.player_surf_equipment FOR DELETE TO anon USING (public.has_valid_athlete_token_for_player(player_id));

CREATE POLICY "sel_surf_cond_auth" ON public.surf_conditions FOR SELECT TO authenticated USING (public.can_access_category(auth.uid(), category_id));
CREATE POLICY "ins_surf_cond_auth" ON public.surf_conditions FOR INSERT TO authenticated WITH CHECK (public.can_access_category(auth.uid(), category_id));
CREATE POLICY "upd_surf_cond_auth" ON public.surf_conditions FOR UPDATE TO authenticated USING (public.can_access_category(auth.uid(), category_id));
CREATE POLICY "del_surf_cond_auth" ON public.surf_conditions FOR DELETE TO authenticated USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "sel_surf_sess_equip_auth" ON public.surf_session_equipment FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.player_surf_equipment e WHERE e.id = equipment_id AND public.can_access_category(auth.uid(), e.category_id)));
CREATE POLICY "ins_surf_sess_equip_auth" ON public.surf_session_equipment FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.player_surf_equipment e WHERE e.id = equipment_id AND public.can_access_category(auth.uid(), e.category_id)));
CREATE POLICY "del_surf_sess_equip_auth" ON public.surf_session_equipment FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.player_surf_equipment e WHERE e.id = equipment_id AND public.can_access_category(auth.uid(), e.category_id)));
CREATE POLICY "sel_surf_sess_equip_anon" ON public.surf_session_equipment FOR SELECT TO anon USING (public.has_valid_athlete_token_for_player(player_id));
CREATE POLICY "ins_surf_sess_equip_anon" ON public.surf_session_equipment FOR INSERT TO anon WITH CHECK (public.has_valid_athlete_token_for_player(player_id));

CREATE TRIGGER update_surf_equipment_updated_at BEFORE UPDATE ON public.player_surf_equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_surf_conditions_updated_at BEFORE UPDATE ON public.surf_conditions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
