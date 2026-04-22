-- Add multi-discipline support for athletes (athletisme, etc.)
-- Legacy `discipline` / `specialty` columns remain the "primary" discipline (kept in sync with the first array entry)
-- New arrays hold the full list of disciplines/specialties an athlete practices.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS disciplines text[] NULL,
  ADD COLUMN IF NOT EXISTS specialties text[] NULL;

COMMENT ON COLUMN public.players.disciplines IS 'List of athletics disciplines (e.g. {sprint, lancers}). The first element mirrors the legacy `discipline` column.';
COMMENT ON COLUMN public.players.specialties IS 'List of athletics specialties matching disciplines (same length / order). The first element mirrors the legacy `specialty` column.';

-- Backfill: lift existing single discipline into the array form so the UI sees consistent data immediately.
UPDATE public.players
SET disciplines = ARRAY[discipline]
WHERE discipline IS NOT NULL
  AND (disciplines IS NULL OR array_length(disciplines, 1) IS NULL);

UPDATE public.players
SET specialties = ARRAY[specialty]
WHERE specialty IS NOT NULL
  AND (specialties IS NULL OR array_length(specialties, 1) IS NULL);