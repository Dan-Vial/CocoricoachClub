
ALTER TABLE public.bowling_spare_training DROP COLUMN IF EXISTS success_rate;

ALTER TABLE public.bowling_spare_training ADD COLUMN success_rate numeric DEFAULT 0;

CREATE OR REPLACE FUNCTION public.compute_spare_success_rate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.attempts > 0 THEN
    NEW.success_rate := ROUND((NEW.successes::numeric / NEW.attempts * 100), 2);
  ELSE
    NEW.success_rate := 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_spare_success_rate
  BEFORE INSERT OR UPDATE ON public.bowling_spare_training
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_spare_success_rate();

UPDATE public.bowling_spare_training 
SET success_rate = ROUND((successes::numeric / NULLIF(attempts, 0) * 100), 2)
WHERE attempts > 0;
