-- Add start_date column to test_reminders table
ALTER TABLE public.test_reminders 
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;