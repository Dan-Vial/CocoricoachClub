-- Add planned_intensity column to training_sessions for RPE comparison
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS planned_intensity integer CHECK (planned_intensity >= 1 AND planned_intensity <= 10);

-- Add comment for documentation
COMMENT ON COLUMN public.training_sessions.planned_intensity IS 'Planned session intensity (RPE 1-10) set by coach for comparison with actual player RPE';