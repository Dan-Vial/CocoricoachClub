-- Add discipline column to fis_objectives
ALTER TABLE public.fis_objectives
ADD COLUMN discipline text DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.fis_objectives.discipline IS 'Optional discipline filter for the objective (e.g. big_air, slopestyle, halfpipe)';