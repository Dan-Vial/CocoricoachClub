-- Add specialty column for athletics specific events
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS specialty TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.players.specialty IS 'Specific event within a discipline (e.g., 100m for Sprints, 100mH for Hurdles)';