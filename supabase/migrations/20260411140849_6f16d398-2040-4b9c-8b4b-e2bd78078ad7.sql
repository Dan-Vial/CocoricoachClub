
-- Auto-link training sessions to periodization cycles based on date
CREATE OR REPLACE FUNCTION public.auto_link_session_to_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cycle_id uuid;
BEGIN
  -- Find the most specific (shortest duration) cycle that contains this session date
  SELECT id INTO v_cycle_id
  FROM public.periodization_cycles
  WHERE category_id = NEW.category_id
    AND NEW.session_date >= start_date
    AND NEW.session_date <= end_date
  ORDER BY (end_date - start_date) ASC
  LIMIT 1;

  NEW.periodization_cycle_id := v_cycle_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_link_session_cycle
BEFORE INSERT OR UPDATE OF session_date ON public.training_sessions
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_session_to_cycle();
