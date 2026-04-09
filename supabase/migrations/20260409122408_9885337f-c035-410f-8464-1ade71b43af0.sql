
CREATE OR REPLACE FUNCTION public.transfer_player_with_history(
  _player_id uuid,
  _from_category_id uuid,
  _to_category_id uuid,
  _reason text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_player_user_id uuid;
  v_club_id uuid;
  v_from_club_id uuid;
  v_to_club_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Verify both categories belong to the same club
  SELECT club_id INTO v_from_club_id FROM public.categories WHERE id = _from_category_id;
  SELECT club_id INTO v_to_club_id FROM public.categories WHERE id = _to_category_id;

  IF v_from_club_id IS NULL OR v_to_club_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Catégorie introuvable');
  END IF;

  IF v_from_club_id != v_to_club_id THEN
    RETURN json_build_object('success', false, 'error', 'Les deux catégories doivent appartenir au même club');
  END IF;

  v_club_id := v_from_club_id;

  -- Check permissions
  IF NOT (public.can_modify_club_data(v_user_id, v_club_id) OR public.is_super_admin(v_user_id)) THEN
    RETURN json_build_object('success', false, 'error', 'Permissions insuffisantes');
  END IF;

  -- Get player's user_id if they have an account
  SELECT user_id INTO v_player_user_id FROM public.players WHERE id = _player_id;

  -- 1. Create transfer record
  INSERT INTO public.player_transfers (player_id, from_category_id, to_category_id, reason, notes, transferred_by)
  VALUES (_player_id, _from_category_id, _to_category_id, _reason, _notes, v_user_id);

  -- 2. Update main player record
  UPDATE public.players SET category_id = _to_category_id WHERE id = _player_id;

  -- 3. Update player_categories
  UPDATE public.player_categories 
  SET is_primary = false 
  WHERE player_id = _player_id AND category_id = _from_category_id;

  INSERT INTO public.player_categories (player_id, category_id, club_id, is_primary, status)
  VALUES (_player_id, _to_category_id, v_club_id, true, 'accepted')
  ON CONFLICT (player_id, category_id) DO UPDATE SET is_primary = true, status = 'accepted';

  -- 4. Update category_members for athlete with user account
  IF v_player_user_id IS NOT NULL THEN
    INSERT INTO public.category_members (category_id, user_id, role, invited_by)
    VALUES (_to_category_id, v_player_user_id, 'athlete', v_user_id)
    ON CONFLICT (category_id, user_id) DO NOTHING;
  END IF;

  -- 5. Deactivate old access tokens and create new one
  UPDATE public.athlete_access_tokens 
  SET is_active = false 
  WHERE player_id = _player_id AND category_id = _from_category_id;

  INSERT INTO public.athlete_access_tokens (player_id, category_id, created_by, is_active)
  VALUES (_player_id, _to_category_id, v_user_id, true);

  -- 6. Migrate ALL historical data to new category
  UPDATE public.academic_absences SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.academic_grades SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.admin_documents SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.athlete_exercise_logs SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.awcr_tracking SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.body_composition SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.bowling_spare_training SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.gathering_wellness_assessments SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.generic_tests SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.gps_sessions SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.gym_session_exercises SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.hrv_records SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.injuries SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.jump_tests SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.medical_records SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.menstrual_cycles SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.menstrual_symptoms SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.mental_assessments SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.mental_goals SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.mental_prep_sessions SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.mobility_tests SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.nutrition_entries SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_academic_profiles SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_academic_tracking SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_availability_scores SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_bowling_arsenal SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_caps SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_contacts SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_development_plans SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_evaluations SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_measurements SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_objectives SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_padel_equipment SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_performance_references SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_rehab_protocols SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_selections SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_ski_equipment SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.player_surf_equipment SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.precision_training SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.recovery_journal SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.rehab_calendar_events SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.return_to_play_protocols SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.rugby_specific_tests SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.smart_alerts SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.speed_tests SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.staff_notes SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.strength_tests SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.tennis_drill_training SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.training_attendance SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;
  UPDATE public.wellness_tracking SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;

  -- Also handle concussion_protocols (has category_id + player_id but no FK name pattern match)
  UPDATE public.concussion_protocols SET category_id = _to_category_id WHERE player_id = _player_id AND category_id = _from_category_id;

  RETURN json_build_object('success', true);
END;
$$;
