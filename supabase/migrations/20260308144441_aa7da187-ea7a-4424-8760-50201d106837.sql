
-- Function to compute EWMA-based acute/chronic loads and AWCR ratio
-- Uses EWMA with lambda_acute=0.25 and lambda_chronic=0.069
CREATE OR REPLACE FUNCTION public.compute_ewma_loads()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prev_acute numeric;
  v_prev_chronic numeric;
  v_new_acute numeric;
  v_new_chronic numeric;
  v_new_awcr numeric;
  v_lambda_acute numeric := 0.25;
  v_lambda_chronic numeric := 0.069;
  v_training_load numeric;
BEGIN
  -- training_load is computed by the existing compute_training_load trigger
  v_training_load := COALESCE(NEW.training_load, NEW.rpe * NEW.duration_minutes);

  -- Get the most recent previous record for this player (before this session date)
  SELECT acute_load, chronic_load
  INTO v_prev_acute, v_prev_chronic
  FROM public.awcr_tracking
  WHERE player_id = NEW.player_id
    AND session_date < NEW.session_date
    AND acute_load IS NOT NULL
    AND chronic_load IS NOT NULL
  ORDER BY session_date DESC
  LIMIT 1;

  -- If no previous data, initialize with training_load
  IF v_prev_acute IS NULL THEN
    v_prev_acute := v_training_load;
  END IF;
  IF v_prev_chronic IS NULL THEN
    v_prev_chronic := v_training_load;
  END IF;

  -- EWMA calculation
  v_new_acute := v_lambda_acute * v_training_load + (1 - v_lambda_acute) * v_prev_acute;
  v_new_chronic := v_lambda_chronic * v_training_load + (1 - v_lambda_chronic) * v_prev_chronic;

  -- Compute AWCR ratio
  IF v_new_chronic > 0 THEN
    v_new_awcr := ROUND((v_new_acute / v_new_chronic)::numeric, 4);
  ELSE
    v_new_awcr := NULL;
  END IF;

  -- Update the record
  NEW.acute_load := ROUND(v_new_acute::numeric, 2);
  NEW.chronic_load := ROUND(v_new_chronic::numeric, 2);
  NEW.awcr := v_new_awcr;

  RETURN NEW;
END;
$$;

-- Create BEFORE INSERT trigger (runs after compute_training_load which also runs BEFORE INSERT)
-- Drop if exists first
DROP TRIGGER IF EXISTS trigger_compute_ewma_loads ON public.awcr_tracking;

CREATE TRIGGER trigger_compute_ewma_loads
  BEFORE INSERT ON public.awcr_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_ewma_loads();
