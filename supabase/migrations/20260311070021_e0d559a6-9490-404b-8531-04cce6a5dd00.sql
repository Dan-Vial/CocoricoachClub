DO $$
DECLARE
  rec RECORD;
  v_prev_acute numeric;
  v_prev_chronic numeric;
  v_new_acute numeric;
  v_new_chronic numeric;
  v_new_awcr numeric;
  v_lambda_acute numeric := 0.25;
  v_lambda_chronic numeric := 0.069;
  v_training_load numeric;
BEGIN
  FOR rec IN 
    SELECT id, player_id, session_date, training_load, rpe, duration_minutes
    FROM public.awcr_tracking
    WHERE acute_load IS NULL OR chronic_load IS NULL
    ORDER BY player_id, session_date ASC
  LOOP
    v_training_load := COALESCE(rec.training_load, rec.rpe * rec.duration_minutes);

    SELECT acute_load, chronic_load
    INTO v_prev_acute, v_prev_chronic
    FROM public.awcr_tracking
    WHERE player_id = rec.player_id
      AND session_date < rec.session_date
      AND acute_load IS NOT NULL
      AND chronic_load IS NOT NULL
    ORDER BY session_date DESC
    LIMIT 1;

    IF v_prev_acute IS NULL THEN
      v_prev_acute := v_training_load;
    END IF;
    IF v_prev_chronic IS NULL THEN
      v_prev_chronic := v_training_load;
    END IF;

    v_new_acute := v_lambda_acute * v_training_load + (1 - v_lambda_acute) * v_prev_acute;
    v_new_chronic := v_lambda_chronic * v_training_load + (1 - v_lambda_chronic) * v_prev_chronic;

    IF v_new_chronic > 0 THEN
      v_new_awcr := ROUND((v_new_acute / v_new_chronic)::numeric, 4);
    ELSE
      v_new_awcr := NULL;
    END IF;

    UPDATE public.awcr_tracking
    SET acute_load = ROUND(v_new_acute::numeric, 2),
        chronic_load = ROUND(v_new_chronic::numeric, 2),
        awcr = v_new_awcr
    WHERE id = rec.id;
  END LOOP;
END $$