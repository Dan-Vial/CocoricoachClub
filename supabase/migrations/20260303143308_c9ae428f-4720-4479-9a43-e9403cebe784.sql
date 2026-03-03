
-- Add session_type and calendar_context to gps_objective_templates
ALTER TABLE public.gps_objective_templates 
  ADD COLUMN IF NOT EXISTS session_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS calendar_context text DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.gps_objective_templates.session_type IS 'Type: vitesse, jeu_reduit, technique, contact, match_simulation, recuperation';
COMMENT ON COLUMN public.gps_objective_templates.calendar_context IS 'Context: match_week, no_match, reprise, congestion';
