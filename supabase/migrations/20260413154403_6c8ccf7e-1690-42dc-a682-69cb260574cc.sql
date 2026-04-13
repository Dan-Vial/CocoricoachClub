ALTER TABLE public.fis_competitions
  ADD COLUMN IF NOT EXISTS top_classified_1_pts numeric,
  ADD COLUMN IF NOT EXISTS top_classified_2_pts numeric,
  ADD COLUMN IF NOT EXISTS top_classified_3_pts numeric,
  ADD COLUMN IF NOT EXISTS top_classified_4_pts numeric,
  ADD COLUMN IF NOT EXISTS top_classified_5_pts numeric,
  ADD COLUMN IF NOT EXISTS f_value numeric DEFAULT 0;