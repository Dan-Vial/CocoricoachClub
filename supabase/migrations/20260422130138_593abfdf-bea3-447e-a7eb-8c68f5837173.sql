ALTER TABLE public.athletics_minimas
ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'national';

CREATE INDEX IF NOT EXISTS idx_athletics_minimas_level ON public.athletics_minimas(level);