-- Table for custom statistics defined by users for their categories
CREATE TABLE public.custom_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  short_label TEXT NOT NULL,
  category_type TEXT NOT NULL DEFAULT 'general', -- scoring, attack, defense, general
  measurement_type TEXT NOT NULL DEFAULT 'number', -- number, time, percentage, distance, speed, weight
  min_value NUMERIC,
  max_value NUMERIC,
  unit TEXT, -- e.g., "km", "m/s", "kg", "sec", etc.
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, key)
);

-- Enable RLS
ALTER TABLE public.custom_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users who can access the category can view custom stats
CREATE POLICY "Users can view custom stats for accessible categories"
ON public.custom_stats
FOR SELECT
USING (can_access_category(auth.uid(), category_id));

-- Policy: Users who can modify club data can manage custom stats
CREATE POLICY "Users can manage custom stats for their categories"
ON public.custom_stats
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

-- Add custom_stats to category_stat_preferences to also track enabled custom stats
ALTER TABLE public.category_stat_preferences 
ADD COLUMN IF NOT EXISTS enabled_custom_stats TEXT[] DEFAULT '{}'::TEXT[];