-- Add end_time column to training_sessions table
ALTER TABLE public.training_sessions 
ADD COLUMN session_end_time time without time zone;

-- Rename session_time to session_start_time for clarity
ALTER TABLE public.training_sessions 
RENAME COLUMN session_time TO session_start_time;