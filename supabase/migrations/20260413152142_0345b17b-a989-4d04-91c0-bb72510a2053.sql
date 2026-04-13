-- Add top riders and race penalty to fis_competitions
ALTER TABLE public.fis_competitions 
  ADD COLUMN IF NOT EXISTS top_rider_1_pts numeric,
  ADD COLUMN IF NOT EXISTS top_rider_2_pts numeric,
  ADD COLUMN IF NOT EXISTS top_rider_3_pts numeric,
  ADD COLUMN IF NOT EXISTS top_rider_4_pts numeric,
  ADD COLUMN IF NOT EXISTS top_rider_5_pts numeric,
  ADD COLUMN IF NOT EXISTS race_penalty numeric;

-- Add calculated fields to fis_results
ALTER TABLE public.fis_results 
  ADD COLUMN IF NOT EXISTS base_points numeric,
  ADD COLUMN IF NOT EXISTS calculated_points numeric;

-- Create FIS points reference table (base points per position)
CREATE TABLE IF NOT EXISTS public.fis_points_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  position integer NOT NULL,
  base_points numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id, position)
);

ALTER TABLE public.fis_points_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view fis_points_reference"
  ON public.fis_points_reference FOR SELECT
  TO authenticated
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Members can manage fis_points_reference"
  ON public.fis_points_reference FOR ALL
  TO authenticated
  USING (public.can_access_category(auth.uid(), category_id))
  WITH CHECK (public.can_access_category(auth.uid(), category_id));