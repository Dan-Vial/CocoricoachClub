-- Table pour les préférences de statistiques par catégorie
CREATE TABLE public.category_stat_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  sport_type TEXT NOT NULL,
  enabled_stats TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(category_id)
);

-- Enable RLS
ALTER TABLE public.category_stat_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view stat preferences for categories they have access to
CREATE POLICY "Users can view category stat preferences" 
ON public.category_stat_preferences 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.category_members 
    WHERE category_members.category_id = category_stat_preferences.category_id 
    AND category_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.club_members cm ON cm.club_id = c.club_id
    WHERE c.id = category_stat_preferences.category_id
    AND cm.user_id = auth.uid()
  )
);

-- Only admins/coaches can insert/update stat preferences
CREATE POLICY "Admins can manage category stat preferences" 
ON public.category_stat_preferences 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.category_members 
    WHERE category_members.category_id = category_stat_preferences.category_id 
    AND category_members.user_id = auth.uid()
    AND category_members.role IN ('admin', 'coach')
  )
  OR EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.club_members cm ON cm.club_id = c.club_id
    WHERE c.id = category_stat_preferences.category_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'coach')
  )
);

-- Table pour les overrides de stats par compétition
CREATE TABLE public.match_stat_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  enabled_stats TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id)
);

-- Enable RLS
ALTER TABLE public.match_stat_overrides ENABLE ROW LEVEL SECURITY;

-- Users can view match stat overrides for matches in their categories
CREATE POLICY "Users can view match stat overrides" 
ON public.match_stat_overrides 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    JOIN public.category_members cm ON cm.category_id = m.category_id
    WHERE m.id = match_stat_overrides.match_id
    AND cm.user_id = auth.uid()
  )
);

-- Admins can manage match stat overrides
CREATE POLICY "Admins can manage match stat overrides" 
ON public.match_stat_overrides 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    JOIN public.category_members cm ON cm.category_id = m.category_id
    WHERE m.id = match_stat_overrides.match_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'coach')
  )
);

-- Add training_session_id to gps_sessions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gps_sessions' 
    AND column_name = 'training_session_id'
  ) THEN
    ALTER TABLE public.gps_sessions 
    ADD COLUMN training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gps_sessions_training_session_id 
ON public.gps_sessions(training_session_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_stat_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_stat_preferences_updated_at
BEFORE UPDATE ON public.category_stat_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_stat_preferences_updated_at();