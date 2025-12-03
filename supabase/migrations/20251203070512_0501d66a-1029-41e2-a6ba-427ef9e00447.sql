-- Create wellness tracking table
CREATE TABLE public.wellness_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_quality INTEGER NOT NULL CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  sleep_duration INTEGER NOT NULL CHECK (sleep_duration >= 1 AND sleep_duration <= 5),
  general_fatigue INTEGER NOT NULL CHECK (general_fatigue >= 1 AND general_fatigue <= 5),
  stress_level INTEGER NOT NULL CHECK (stress_level >= 1 AND stress_level <= 5),
  soreness_upper_body INTEGER NOT NULL CHECK (soreness_upper_body >= 1 AND soreness_upper_body <= 5),
  soreness_lower_body INTEGER NOT NULL CHECK (soreness_lower_body >= 1 AND soreness_lower_body <= 5),
  has_specific_pain BOOLEAN NOT NULL DEFAULT false,
  pain_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, tracking_date)
);

-- Enable RLS
ALTER TABLE public.wellness_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Club owners can view wellness tracking"
ON public.wellness_tracking FOR SELECT
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = wellness_tracking.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club owners can insert wellness tracking"
ON public.wellness_tracking FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = wellness_tracking.category_id
  AND clubs.user_id = auth.uid()
));

CREATE POLICY "Club owners can update wellness tracking"
ON public.wellness_tracking FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = wellness_tracking.category_id
  AND clubs.user_id = auth.uid()
));

CREATE POLICY "Club owners can delete wellness tracking"
ON public.wellness_tracking FOR DELETE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = wellness_tracking.category_id
  AND clubs.user_id = auth.uid()
));