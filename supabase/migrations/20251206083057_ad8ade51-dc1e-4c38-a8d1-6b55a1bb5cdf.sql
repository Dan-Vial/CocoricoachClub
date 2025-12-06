-- Add gender field to categories table
ALTER TABLE public.categories 
ADD COLUMN gender text NOT NULL DEFAULT 'masculine';

-- Create menstrual cycle tracking table
CREATE TABLE public.menstrual_cycles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  cycle_start_date date NOT NULL,
  cycle_length_days integer DEFAULT 28,
  period_length_days integer DEFAULT 5,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(player_id, cycle_start_date)
);

-- Create menstrual symptoms tracking table
CREATE TABLE public.menstrual_symptoms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  tracking_date date NOT NULL DEFAULT CURRENT_DATE,
  cycle_day integer,
  phase text, -- 'menstruation', 'follicular', 'ovulation', 'luteal'
  energy_level integer CHECK (energy_level >= 1 AND energy_level <= 5),
  pain_level integer CHECK (pain_level >= 1 AND pain_level <= 5),
  mood_level integer CHECK (mood_level >= 1 AND mood_level <= 5),
  sleep_quality integer CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  symptoms text[], -- crampes, maux de tête, fatigue, etc.
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(player_id, tracking_date)
);

-- Enable RLS
ALTER TABLE public.menstrual_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menstrual_symptoms ENABLE ROW LEVEL SECURITY;

-- RLS policies for menstrual_cycles
CREATE POLICY "Club members can view menstrual cycles"
  ON public.menstrual_cycles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = menstrual_cycles.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can insert menstrual cycles"
  ON public.menstrual_cycles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = menstrual_cycles.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can update menstrual cycles"
  ON public.menstrual_cycles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = menstrual_cycles.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can delete menstrual cycles"
  ON public.menstrual_cycles FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = menstrual_cycles.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

-- RLS policies for menstrual_symptoms
CREATE POLICY "Club members can view menstrual symptoms"
  ON public.menstrual_symptoms FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = menstrual_symptoms.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can insert menstrual symptoms"
  ON public.menstrual_symptoms FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = menstrual_symptoms.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can update menstrual symptoms"
  ON public.menstrual_symptoms FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = menstrual_symptoms.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can delete menstrual symptoms"
  ON public.menstrual_symptoms FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = menstrual_symptoms.category_id
    AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));