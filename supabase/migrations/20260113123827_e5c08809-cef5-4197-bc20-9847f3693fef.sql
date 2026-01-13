-- Ajouter les types de séries et groupe d'exercices
ALTER TABLE public.gym_session_exercises 
ADD COLUMN IF NOT EXISTS set_type TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS group_id TEXT,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS library_exercise_id UUID REFERENCES public.exercise_library(id) ON DELETE SET NULL;

-- Ajouter des exercices pré-remplis à la bibliothèque (table système)
-- On ajoute une colonne pour identifier les exercices système
ALTER TABLE public.exercise_library 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS muscle_groups TEXT[],
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'intermediate',
ADD COLUMN IF NOT EXISTS equipment TEXT[];

-- Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_exercise_library_category ON public.exercise_library(category);
CREATE INDEX IF NOT EXISTS idx_exercise_library_name ON public.exercise_library USING gin(to_tsvector('french', name));
CREATE INDEX IF NOT EXISTS idx_gym_session_exercises_group ON public.gym_session_exercises(group_id);

-- Commentaires pour documenter les types de séries
COMMENT ON COLUMN public.gym_session_exercises.set_type IS 'Type de série: standard, superset, triset, giant_set, emom, tabata, amrap, circuit, drop_set, rest_pause';
COMMENT ON COLUMN public.gym_session_exercises.group_id IS 'ID du groupe pour lier les exercices (superset, triset, etc.)';
COMMENT ON COLUMN public.gym_session_exercises.duration_seconds IS 'Durée en secondes pour EMOM, TABATA, AMRAP';