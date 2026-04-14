-- Table to store FIS iCal feed configurations per category
CREATE TABLE public.fis_calendar_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  feed_url TEXT NOT NULL,
  season_code TEXT,
  sector_code TEXT,
  discipline_codes TEXT[],
  last_synced_at TIMESTAMPTZ,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, feed_url)
);

ALTER TABLE public.fis_calendar_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Category members can view feeds"
  ON public.fis_calendar_feeds FOR SELECT
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Staff can manage feeds"
  ON public.fis_calendar_feeds FOR ALL
  USING (public.can_access_category(auth.uid(), category_id))
  WITH CHECK (public.can_access_category(auth.uid(), category_id));

-- Table to store individual FIS calendar events
CREATE TABLE public.fis_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  feed_id UUID REFERENCES public.fis_calendar_feeds(id) ON DELETE CASCADE,
  fis_uid TEXT NOT NULL,
  event_name TEXT NOT NULL,
  location TEXT,
  event_date DATE NOT NULL,
  end_date DATE,
  discipline TEXT,
  gender TEXT,
  competition_level TEXT,
  fis_race_id TEXT,
  fis_results_url TEXT,
  fis_sector_code TEXT,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  raw_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, fis_uid)
);

ALTER TABLE public.fis_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Category members can view events"
  ON public.fis_calendar_events FOR SELECT
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Staff can manage events"
  ON public.fis_calendar_events FOR ALL
  USING (public.can_access_category(auth.uid(), category_id))
  WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE INDEX idx_fis_calendar_events_category ON public.fis_calendar_events(category_id);
CREATE INDEX idx_fis_calendar_events_date ON public.fis_calendar_events(event_date);
CREATE INDEX idx_fis_calendar_events_match ON public.fis_calendar_events(match_id);

-- Add pre-competition fields to matches
ALTER TABLE public.matches
  ADD COLUMN fis_calendar_event_id UUID REFERENCES public.fis_calendar_events(id) ON DELETE SET NULL,
  ADD COLUMN fis_participants_count INTEGER,
  ADD COLUMN fis_top5_points JSONB,
  ADD COLUMN fis_event_factor NUMERIC,
  ADD COLUMN fis_pre_competition_validated BOOLEAN DEFAULT false;

-- Triggers for updated_at
CREATE TRIGGER update_fis_calendar_feeds_updated_at
  BEFORE UPDATE ON public.fis_calendar_feeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fis_calendar_events_updated_at
  BEFORE UPDATE ON public.fis_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();