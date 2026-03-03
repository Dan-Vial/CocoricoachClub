
ALTER TABLE public.training_session_blocks 
ADD COLUMN IF NOT EXISTS session_type text,
ADD COLUMN IF NOT EXISTS objective text,
ADD COLUMN IF NOT EXISTS target_intensity text,
ADD COLUMN IF NOT EXISTS volume text,
ADD COLUMN IF NOT EXISTS contact_charge text;

COMMENT ON COLUMN public.training_session_blocks.session_type IS 'Type de séance: technique, physique, mixte, vitesse, contact, jeu_reduit, simulation_match';
COMMENT ON COLUMN public.training_session_blocks.objective IS 'Objectif principal: aerobie, anaerobie, vitesse_explosivite, force_contact, tactique, technique';
COMMENT ON COLUMN public.training_session_blocks.target_intensity IS 'Intensité cible: faible, moderee, elevee, tres_elevee';
COMMENT ON COLUMN public.training_session_blocks.volume IS 'Volume: court, moyen, long';
COMMENT ON COLUMN public.training_session_blocks.contact_charge IS 'Charge contact (rugby): aucun, faible, modere, eleve';
