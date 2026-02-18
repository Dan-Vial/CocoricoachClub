
CREATE OR REPLACE FUNCTION public.auto_create_athlete_access_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.athlete_access_tokens (player_id, category_id, created_by, is_active)
  VALUES (NEW.id, NEW.category_id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_athlete_access_token
AFTER INSERT ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_athlete_access_token();
