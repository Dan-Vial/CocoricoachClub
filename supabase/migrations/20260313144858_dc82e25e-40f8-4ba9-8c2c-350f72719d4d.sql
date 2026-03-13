
-- HRV and Heart Rate Zone tracking table
CREATE TABLE public.hrv_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  record_type TEXT NOT NULL DEFAULT 'session' CHECK (record_type IN ('session', 'test', 'competition', 'morning')),
  
  -- HRV metrics
  hrv_ms NUMERIC NULL,
  resting_hr_bpm NUMERIC NULL,
  avg_hr_bpm NUMERIC NULL,
  max_hr_bpm NUMERIC NULL,
  
  -- Heart rate zones (time in minutes)
  zone1_minutes NUMERIC NULL,
  zone2_minutes NUMERIC NULL,
  zone3_minutes NUMERIC NULL,
  zone4_minutes NUMERIC NULL,
  zone5_minutes NUMERIC NULL,
  
  -- Zone boundaries (customizable per athlete)
  zone1_max_bpm INTEGER NULL,
  zone2_max_bpm INTEGER NULL,
  zone3_max_bpm INTEGER NULL,
  zone4_max_bpm INTEGER NULL,
  zone5_max_bpm INTEGER NULL,
  
  -- Optional links
  training_session_id UUID NULL REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  match_id UUID NULL REFERENCES public.matches(id) ON DELETE SET NULL,
  
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_hrv_records_player_date ON public.hrv_records(player_id, record_date DESC);
CREATE INDEX idx_hrv_records_category ON public.hrv_records(category_id);

-- Enable RLS
ALTER TABLE public.hrv_records ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view HRV records for accessible categories"
  ON public.hrv_records FOR SELECT TO authenticated
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can insert HRV records for accessible categories"
  ON public.hrv_records FOR INSERT TO authenticated
  WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update HRV records for accessible categories"
  ON public.hrv_records FOR UPDATE TO authenticated
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete HRV records for accessible categories"
  ON public.hrv_records FOR DELETE TO authenticated
  USING (public.can_access_category(auth.uid(), category_id));
