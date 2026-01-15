-- Ajouter les colonnes pour les zones du corps et thèmes aux programmes
ALTER TABLE public.training_programs
ADD COLUMN IF NOT EXISTS body_zone TEXT, -- lower_body, upper_body, full_body, push, pull, shoulders, etc.
ADD COLUMN IF NOT EXISTS theme TEXT, -- force, hypertrophie, vitesse, puissance, reathletisation, terrain
ADD COLUMN IF NOT EXISTS reathletisation_phase TEXT; -- phase_1, phase_2, phase_3, phase_4

-- Ajouter les colonnes pour planifier les jours des séances
ALTER TABLE public.program_sessions
ADD COLUMN IF NOT EXISTS scheduled_day INTEGER; -- 1 = Lundi, 2 = Mardi, ..., 7 = Dimanche

-- Ajouter le support pour les tests RM dans les exercices du programme
ALTER TABLE public.program_exercises
ADD COLUMN IF NOT EXISTS is_rm_test BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rm_test_type TEXT, -- 1rm, 3rm, 5rm
ADD COLUMN IF NOT EXISTS drop_sets JSONB; -- Pour stocker les configurations de drop sets/pyramides/clusters

-- Ajouter les colonnes cluster à program_exercises
ALTER TABLE public.program_exercises
ADD COLUMN IF NOT EXISTS cluster_sets JSONB; -- Pour stocker les configurations de clusters