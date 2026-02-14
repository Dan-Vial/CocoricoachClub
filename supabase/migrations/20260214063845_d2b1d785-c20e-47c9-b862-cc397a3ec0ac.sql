-- Add pain_zone column to store the body area category (haut du corps, bas du corps, tête, maladie)
ALTER TABLE public.wellness_tracking ADD COLUMN pain_zone text;
