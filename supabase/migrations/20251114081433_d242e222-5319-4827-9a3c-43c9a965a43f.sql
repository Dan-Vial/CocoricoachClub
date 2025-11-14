-- Add birth_year to players table
ALTER TABLE public.players
ADD COLUMN birth_year integer;

-- Create player_measurements table for tracking weight and height over time
CREATE TABLE public.player_measurements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric,
  height_cm numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_measurements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_measurements
CREATE POLICY "Users can view player measurements of accessible clubs"
  ON public.player_measurements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN clubs ON clubs.id = categories.club_id
      WHERE categories.id = player_measurements.category_id
      AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
    )
  );

CREATE POLICY "Club owners can insert player measurements"
  ON public.player_measurements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories
      JOIN clubs ON clubs.id = categories.club_id
      WHERE categories.id = player_measurements.category_id
      AND clubs.user_id = auth.uid()
    )
  );

CREATE POLICY "Club owners can update player measurements"
  ON public.player_measurements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN clubs ON clubs.id = categories.club_id
      WHERE categories.id = player_measurements.category_id
      AND clubs.user_id = auth.uid()
    )
  );

CREATE POLICY "Club owners can delete player measurements"
  ON public.player_measurements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN clubs ON clubs.id = categories.club_id
      WHERE categories.id = player_measurements.category_id
      AND clubs.user_id = auth.uid()
    )
  );

-- Create index for better query performance
CREATE INDEX idx_player_measurements_player_id ON public.player_measurements(player_id);
CREATE INDEX idx_player_measurements_date ON public.player_measurements(measurement_date DESC);