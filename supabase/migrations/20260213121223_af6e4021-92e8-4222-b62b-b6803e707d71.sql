-- Fix sleep_duration check constraint: should allow 1-24 hours, not 1-5
ALTER TABLE public.wellness_tracking DROP CONSTRAINT wellness_tracking_sleep_duration_check;
ALTER TABLE public.wellness_tracking ADD CONSTRAINT wellness_tracking_sleep_duration_check CHECK (sleep_duration >= 1 AND sleep_duration <= 24);