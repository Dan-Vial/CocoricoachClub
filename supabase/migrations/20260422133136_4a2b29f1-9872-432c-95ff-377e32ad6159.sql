
-- ============================================================
-- 1. season_closures : snapshot validé d'une saison clôturée
-- ============================================================
CREATE TABLE IF NOT EXISTS public.season_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  closed_season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE RESTRICT,
  new_season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  closed_by uuid NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  -- Récap au moment de la clôture (jsonb pour flexibilité)
  recap jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, closed_season_id)
);

CREATE INDEX IF NOT EXISTS idx_season_closures_category ON public.season_closures(category_id);
CREATE INDEX IF NOT EXISTS idx_season_closures_season ON public.season_closures(closed_season_id);

ALTER TABLE public.season_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view season closures"
ON public.season_closures FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.id = season_closures.category_id
      AND public.can_access_club(auth.uid(), c.club_id)
  )
);

CREATE POLICY "Coaches can create season closures"
ON public.season_closures FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.id = season_closures.category_id
      AND public.can_modify_club_data(auth.uid(), c.club_id)
  )
);

CREATE POLICY "Coaches can update season closures"
ON public.season_closures FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.id = season_closures.category_id
      AND public.can_modify_club_data(auth.uid(), c.club_id)
  )
);

CREATE POLICY "Super admins can manage season closures"
ON public.season_closures FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================================
-- 2. athletics_minimas : season_id + locked
-- ============================================================
ALTER TABLE public.athletics_minimas
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_athletics_minimas_season ON public.athletics_minimas(season_id);

-- ============================================================
-- 3. athletics_records : season_id + locked
-- ============================================================
ALTER TABLE public.athletics_records
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_athletics_records_season ON public.athletics_records(season_id);

-- ============================================================
-- 4. player_objectives : autoriser le statut "archived"
-- ============================================================
ALTER TABLE public.player_objectives
  DROP CONSTRAINT IF EXISTS player_objectives_status_check;

ALTER TABLE public.player_objectives
  ADD CONSTRAINT player_objectives_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'archived'::text]));

-- ============================================================
-- 5. RPC : close_athletics_season
-- ============================================================
CREATE OR REPLACE FUNCTION public.close_athletics_season(
  _category_id uuid,
  _closed_season_id uuid,
  _new_season_id uuid,
  _notes text DEFAULT NULL,
  _recap jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_club_id uuid;
  v_closure_id uuid;
  v_minimas_copied integer := 0;
  v_records_reset integer := 0;
  v_objectives_archived integer := 0;
  v_new_season_year integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Vérifier permissions
  SELECT club_id INTO v_club_id FROM public.categories WHERE id = _category_id;
  IF v_club_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Catégorie introuvable');
  END IF;

  IF NOT (public.can_modify_club_data(v_user_id, v_club_id) OR public.is_super_admin(v_user_id)) THEN
    RETURN json_build_object('success', false, 'error', 'Permissions insuffisantes');
  END IF;

  -- Empêcher double clôture
  IF EXISTS (
    SELECT 1 FROM public.season_closures
    WHERE category_id = _category_id AND closed_season_id = _closed_season_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Cette saison est déjà clôturée pour cette catégorie');
  END IF;

  -- Récupérer l'année de la nouvelle saison
  SELECT EXTRACT(YEAR FROM start_date)::integer INTO v_new_season_year
  FROM public.seasons WHERE id = _new_season_id;

  -- 1. Créer le snapshot
  INSERT INTO public.season_closures (
    category_id, closed_season_id, new_season_id, closed_by, recap, notes
  ) VALUES (
    _category_id, _closed_season_id, _new_season_id, v_user_id, _recap, _notes
  ) RETURNING id INTO v_closure_id;

  -- 2. Verrouiller les minimas de la saison passée + assigner season_id si manquant
  UPDATE public.athletics_minimas
  SET is_locked = true,
      season_id = COALESCE(season_id, _closed_season_id),
      updated_at = now()
  WHERE category_id = _category_id
    AND (season_id = _closed_season_id OR season_id IS NULL);

  -- 3. Dupliquer les minimas vers la nouvelle saison (modifiables)
  INSERT INTO public.athletics_minimas (
    category_id, discipline, specialty, label, level,
    target_value, unit, lower_is_better, notes,
    season_id, is_locked, created_by
  )
  SELECT
    category_id, discipline, specialty, label, level,
    target_value, unit, lower_is_better, notes,
    _new_season_id, false, v_user_id
  FROM public.athletics_minimas
  WHERE category_id = _category_id
    AND season_id = _closed_season_id;

  GET DIAGNOSTICS v_minimas_copied = ROW_COUNT;

  -- 4. Verrouiller les records de la saison passée + reset SB pour nouvelle saison
  UPDATE public.athletics_records
  SET is_locked = true,
      season_id = COALESCE(season_id, _closed_season_id),
      updated_at = now()
  WHERE category_id = _category_id
    AND (season_id = _closed_season_id OR season_id IS NULL);

  -- Pour chaque athlète/discipline ayant un record dans la saison passée,
  -- créer une nouvelle ligne pour la nouvelle saison qui conserve le PB mais reset le SB
  INSERT INTO public.athletics_records (
    player_id, category_id, discipline, specialty,
    personal_best, personal_best_date, personal_best_location,
    season_best, season_best_date, season_best_location,
    season_year, unit, lower_is_better, notes,
    season_id, is_locked, created_by
  )
  SELECT
    player_id, category_id, discipline, specialty,
    personal_best, personal_best_date, personal_best_location,
    NULL, NULL, NULL,  -- SB reset
    COALESCE(v_new_season_year, season_year + 1),
    unit, lower_is_better, NULL,
    _new_season_id, false, v_user_id
  FROM public.athletics_records
  WHERE category_id = _category_id
    AND season_id = _closed_season_id
  ON CONFLICT (player_id, discipline, specialty, season_year) DO NOTHING;

  GET DIAGNOSTICS v_records_reset = ROW_COUNT;

  -- 5. Archiver les objectifs non terminés de la saison passée
  UPDATE public.player_objectives
  SET status = 'archived', updated_at = now()
  WHERE category_id = _category_id
    AND status IN ('pending', 'in_progress');

  GET DIAGNOSTICS v_objectives_archived = ROW_COUNT;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    v_user_id, 'close_athletics_season', 'category', _category_id,
    jsonb_build_object(
      'closed_season_id', _closed_season_id,
      'new_season_id', _new_season_id,
      'minimas_copied', v_minimas_copied,
      'records_reset', v_records_reset,
      'objectives_archived', v_objectives_archived
    )
  );

  RETURN json_build_object(
    'success', true,
    'closure_id', v_closure_id,
    'minimas_copied', v_minimas_copied,
    'records_reset', v_records_reset,
    'objectives_archived', v_objectives_archived
  );
END;
$function$;

-- ============================================================
-- 6. Trigger updated_at sur season_closures
-- ============================================================
DROP TRIGGER IF EXISTS update_season_closures_updated_at ON public.season_closures;
