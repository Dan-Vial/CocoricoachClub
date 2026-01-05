-- Create GPS data table for storing imported tracking data
CREATE TABLE public.gps_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_name TEXT,
  source TEXT DEFAULT 'manual', -- 'catapult', 'statsports', 'manual'
  
  -- Core metrics
  total_distance_m NUMERIC,
  high_speed_distance_m NUMERIC, -- >5.5 m/s
  sprint_distance_m NUMERIC, -- >7 m/s
  max_speed_ms NUMERIC,
  avg_speed_ms NUMERIC,
  
  -- Load metrics
  player_load NUMERIC,
  accelerations INTEGER,
  decelerations INTEGER,
  high_intensity_accelerations INTEGER,
  high_intensity_decelerations INTEGER,
  
  -- Time metrics
  duration_minutes NUMERIC,
  time_zone_1_min NUMERIC, -- 0-2 m/s
  time_zone_2_min NUMERIC, -- 2-4 m/s
  time_zone_3_min NUMERIC, -- 4-5.5 m/s
  time_zone_4_min NUMERIC, -- 5.5-7 m/s
  time_zone_5_min NUMERIC, -- >7 m/s
  
  -- Sprint metrics
  sprint_count INTEGER,
  max_sprint_distance_m NUMERIC,
  
  -- Additional data
  raw_data JSONB, -- Store original CSV data for reference
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gps_sessions ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_gps_sessions_category ON public.gps_sessions(category_id);
CREATE INDEX idx_gps_sessions_player ON public.gps_sessions(player_id);
CREATE INDEX idx_gps_sessions_date ON public.gps_sessions(session_date);

-- RLS Policies
CREATE POLICY "Users can view GPS data for their categories"
ON public.gps_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON c.club_id = cl.id
    LEFT JOIN public.club_members cm ON cl.id = cm.club_id
    LEFT JOIN public.category_members catm ON c.id = catm.category_id
    WHERE c.id = gps_sessions.category_id
    AND (cl.user_id = auth.uid() OR cm.user_id = auth.uid() OR catm.user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert GPS data for their categories"
ON public.gps_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON c.club_id = cl.id
    LEFT JOIN public.club_members cm ON cl.id = cm.club_id
    LEFT JOIN public.category_members catm ON c.id = catm.category_id
    WHERE c.id = gps_sessions.category_id
    AND (cl.user_id = auth.uid() OR cm.user_id = auth.uid() OR catm.user_id = auth.uid())
  )
);

CREATE POLICY "Users can update GPS data for their categories"
ON public.gps_sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON c.club_id = cl.id
    LEFT JOIN public.club_members cm ON cl.id = cm.club_id
    LEFT JOIN public.category_members catm ON c.id = catm.category_id
    WHERE c.id = gps_sessions.category_id
    AND (cl.user_id = auth.uid() OR cm.user_id = auth.uid() OR catm.user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete GPS data for their categories"
ON public.gps_sessions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON c.club_id = cl.id
    LEFT JOIN public.club_members cm ON cl.id = cm.club_id
    LEFT JOIN public.category_members catm ON c.id = catm.category_id
    WHERE c.id = gps_sessions.category_id
    AND (cl.user_id = auth.uid() OR cm.user_id = auth.uid() OR catm.user_id = auth.uid())
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_gps_sessions_updated_at
BEFORE UPDATE ON public.gps_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();