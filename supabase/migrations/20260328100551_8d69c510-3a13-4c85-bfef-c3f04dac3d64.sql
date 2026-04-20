
-- Table for precision exercise types (system defaults + custom per category)
CREATE TABLE public.precision_exercise_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sport TEXT NOT NULL,
  sub_discipline TEXT,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, value)
);

-- Table for precision training records (generic version of bowling_spare_training)
CREATE TABLE public.precision_training (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  exercise_type_id UUID REFERENCES public.precision_exercise_types(id) ON DELETE SET NULL,
  exercise_label TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  successes INTEGER NOT NULL DEFAULT 0,
  success_rate NUMERIC,
  notes TEXT,
  ball_arsenal_id UUID REFERENCES public.player_bowling_arsenal(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for auto-computing success_rate
CREATE OR REPLACE FUNCTION public.compute_precision_success_rate()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.attempts > 0 THEN
    NEW.success_rate := ROUND((NEW.successes::numeric / NEW.attempts * 100), 2);
  ELSE
    NEW.success_rate := 0;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER tr_compute_precision_success_rate
  BEFORE INSERT OR UPDATE ON public.precision_training
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_precision_success_rate();

-- RLS
ALTER TABLE public.precision_exercise_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precision_training ENABLE ROW LEVEL SECURITY;

-- Precision exercise types: readable by category members, writable by staff
CREATE POLICY "Users can view precision exercises for their categories"
  ON public.precision_exercise_types FOR SELECT
  TO authenticated
  USING (
    is_system = true 
    OR category_id IS NULL 
    OR public.can_access_category(auth.uid(), category_id)
  );

CREATE POLICY "Staff can manage custom precision exercises"
  ON public.precision_exercise_types FOR INSERT
  TO authenticated
  WITH CHECK (
    category_id IS NOT NULL AND public.can_access_category(auth.uid(), category_id)
  );

CREATE POLICY "Staff can update custom precision exercises"
  ON public.precision_exercise_types FOR UPDATE
  TO authenticated
  USING (
    is_system = false AND category_id IS NOT NULL AND public.can_access_category(auth.uid(), category_id)
  );

CREATE POLICY "Staff can delete custom precision exercises"
  ON public.precision_exercise_types FOR DELETE
  TO authenticated
  USING (
    is_system = false AND category_id IS NOT NULL AND public.can_access_category(auth.uid(), category_id)
  );

-- Precision training: category access
CREATE POLICY "Users can view precision training for their categories"
  ON public.precision_training FOR SELECT
  TO authenticated
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can insert precision training"
  ON public.precision_training FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update own precision training"
  ON public.precision_training FOR UPDATE
  TO authenticated
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete precision training"
  ON public.precision_training FOR DELETE
  TO authenticated
  USING (public.can_access_category(auth.uid(), category_id));

-- Seed system default precision exercises per sport/sub-discipline
INSERT INTO public.precision_exercise_types (sport, sub_discipline, label, value, is_system) VALUES
-- Rugby
('rugby', NULL, 'Pénalités', 'rugby_penalties', true),
('rugby', NULL, 'Transformations', 'rugby_conversions', true),
('rugby', NULL, 'Drop', 'rugby_drop', true),
('rugby', NULL, 'Coup de pied de zone', 'rugby_zone_kick', true),
('rugby', NULL, 'Passes courtes', 'rugby_short_pass', true),
('rugby', NULL, 'Passes longues', 'rugby_long_pass', true),
('rugby', NULL, 'Touches (lanceurs)', 'rugby_lineout_throw', true),
('rugby', NULL, 'Chandelles', 'rugby_up_and_under', true),

-- Football
('football', NULL, 'Tirs cadrés', 'football_shots_on_target', true),
('football', NULL, 'Penalties', 'football_penalties', true),
('football', NULL, 'Coups francs', 'football_free_kicks', true),
('football', NULL, 'Centres', 'football_crosses', true),
('football', NULL, 'Passes longues', 'football_long_passes', true),
('football', NULL, 'Corners', 'football_corners', true),

-- Handball
('handball', NULL, 'Tirs cadrés', 'handball_shots_on_target', true),
('handball', NULL, 'Penalties (7m)', 'handball_penalties', true),
('handball', NULL, 'Passes lobées', 'handball_lob_passes', true),
('handball', NULL, 'Tirs en suspension', 'handball_jump_shots', true),

-- Basketball
('basketball', NULL, 'Lancers francs', 'basketball_free_throws', true),
('basketball', NULL, 'Tirs à 3 points', 'basketball_three_pointers', true),
('basketball', NULL, 'Tirs mi-distance', 'basketball_mid_range', true),
('basketball', NULL, 'Lay-ups', 'basketball_layups', true),

-- Volleyball
('volleyball', NULL, 'Services', 'volleyball_serves', true),
('volleyball', NULL, 'Services flottants', 'volleyball_float_serves', true),
('volleyball', NULL, 'Services smashés', 'volleyball_jump_serves', true),
('volleyball', NULL, 'Réceptions', 'volleyball_receptions', true),

-- Tennis
('tennis', NULL, 'Premier service', 'tennis_first_serve', true),
('tennis', NULL, 'Second service', 'tennis_second_serve', true),
('tennis', NULL, 'Coup droit croisé', 'tennis_forehand_cross', true),
('tennis', NULL, 'Revers long de ligne', 'tennis_backhand_line', true),
('tennis', NULL, 'Volée', 'tennis_volley', true),
('tennis', NULL, 'Amortis', 'tennis_drop_shot', true),

-- Padel
('padel', NULL, 'Services', 'padel_serves', true),
('padel', NULL, 'Bandeja', 'padel_bandeja', true),
('padel', NULL, 'Víbora', 'padel_vibora', true),
('padel', NULL, 'Lob', 'padel_lob', true),
('padel', NULL, 'Volée', 'padel_volley', true),
('padel', NULL, 'Par 3', 'padel_par3', true),

-- Judo
('judo', NULL, 'Projections (Nage-Waza)', 'judo_projections', true),
('judo', NULL, 'Immobilisations (Osae-Waza)', 'judo_immobilizations', true),
('judo', NULL, 'Balayages (Ashi-Waza)', 'judo_sweeps', true),
('judo', NULL, 'Enchaînements', 'judo_combinations', true),

-- Natation
('natation', NULL, 'Départs plongeon', 'natation_dive_starts', true),
('natation', NULL, 'Virages', 'natation_turns', true),
('natation', NULL, 'Coulées', 'natation_streamlines', true),

-- Ski
('ski', NULL, 'Passages de portes', 'ski_gates', true),
('ski', NULL, 'Virages courts', 'ski_short_turns', true),
('ski', NULL, 'Virages longs', 'ski_long_turns', true),

-- Aviron
('aviron', NULL, 'Cadence cible', 'aviron_target_rate', true),
('aviron', NULL, 'Départs', 'aviron_starts', true),

-- Triathlon
('triathlon', NULL, 'Transitions T1', 'triathlon_t1', true),
('triathlon', NULL, 'Transitions T2', 'triathlon_t2', true),

-- CrossFit / Hyrox
('crossfit', NULL, 'Double-unders', 'crossfit_double_unders', true),
('crossfit', NULL, 'Muscle-ups', 'crossfit_muscle_ups', true),
('crossfit', NULL, 'Wall Balls', 'crossfit_wall_balls', true),

-- Bowling (existing system can use these too)
('bowling', NULL, 'Quille 7', 'bowling_pin_7', true),
('bowling', NULL, 'Quille 10', 'bowling_pin_10', true),
('bowling', NULL, 'Spares généraux', 'bowling_spare_general', true),
('bowling', NULL, 'Poche', 'bowling_pocket', true),

-- Athlétisme Sprint
('athletisme', 'sprints', 'Départs (réaction)', 'ath_sprint_starts', true),
('athletisme', 'sprints', 'Passage de témoin', 'ath_sprint_relay', true),
('athletisme', 'sprints', 'Technique de haie', 'ath_sprint_hurdle_drill', true),

-- Athlétisme Haies
('athletisme', 'haies', 'Passages de haie', 'ath_haies_clearance', true),
('athletisme', 'haies', 'Rythme inter-haies', 'ath_haies_rhythm', true),

-- Athlétisme Lancers
('athletisme', 'lancers', 'Précision zone cible', 'ath_lancers_target', true),
('athletisme', 'lancers', 'Régularité de marque', 'ath_lancers_consistency', true),

-- Athlétisme Sauts
('athletisme', 'sauts_longueur', 'Course d''élan', 'ath_sauts_approach', true),
('athletisme', 'sauts_longueur', 'Impulsion', 'ath_sauts_takeoff', true),
('athletisme', 'sauts_hauteur', 'Franchissement', 'ath_hauteur_clearance', true),

-- Athlétisme Demi-fond / Fond
('athletisme', 'demi_fond', 'Allures cibles', 'ath_demifond_pace', true),
('athletisme', 'fond', 'Allures cibles', 'ath_fond_pace', true),
('athletisme', 'trail', 'Montées techniques', 'ath_trail_climbs', true);
