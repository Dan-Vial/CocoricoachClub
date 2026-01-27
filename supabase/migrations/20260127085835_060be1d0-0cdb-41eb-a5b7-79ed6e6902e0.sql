-- Fix search_path for the function we created
CREATE OR REPLACE FUNCTION public.update_stat_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;