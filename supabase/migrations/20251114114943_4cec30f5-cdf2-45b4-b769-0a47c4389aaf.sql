-- Ensure players table has birth_year column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'players' 
    AND column_name = 'birth_year'
  ) THEN
    ALTER TABLE public.players ADD COLUMN birth_year INTEGER;
  END IF;
END $$;

-- Ensure player_measurements table exists
CREATE TABLE IF NOT EXISTS public.player_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT at_least_one_measurement CHECK (weight_kg IS NOT NULL OR height_cm IS NOT NULL)
);

-- Enable RLS on player_measurements if not already enabled
ALTER TABLE public.player_measurements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view player measurements of accessible clubs" ON public.player_measurements;
DROP POLICY IF EXISTS "Club owners can insert player measurements" ON public.player_measurements;
DROP POLICY IF EXISTS "Club owners can update player measurements" ON public.player_measurements;
DROP POLICY IF EXISTS "Club owners can delete player measurements" ON public.player_measurements;

-- Create RLS policies for player_measurements
CREATE POLICY "Users can view player measurements of accessible clubs"
ON public.player_measurements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = player_measurements.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  )
);

CREATE POLICY "Club owners can insert player measurements"
ON public.player_measurements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = player_measurements.category_id
    AND clubs.user_id = auth.uid()
  )
);

CREATE POLICY "Club owners can update player measurements"
ON public.player_measurements FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = player_measurements.category_id
    AND clubs.user_id = auth.uid()
  )
);

CREATE POLICY "Club owners can delete player measurements"
ON public.player_measurements FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = player_measurements.category_id
    AND clubs.user_id = auth.uid()
  )
);