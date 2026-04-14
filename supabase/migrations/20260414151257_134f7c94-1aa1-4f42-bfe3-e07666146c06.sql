-- Add WSPL columns to fis_results
ALTER TABLE public.fis_results 
  ADD COLUMN IF NOT EXISTS wspl_points numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wspl_pl integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wspl_stars integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_riders integer DEFAULT NULL;

-- Ensure fis_competitions has total_participants column
ALTER TABLE public.fis_competitions
  ADD COLUMN IF NOT EXISTS wspl_pl integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wspl_stars integer DEFAULT NULL;