-- Update the rugby_type check constraint to include national_team
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_rugby_type_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_rugby_type_check 
  CHECK (rugby_type IN ('XV', '7', 'academie', 'national_team'));

-- Create a table for national team specific event types
CREATE TABLE public.national_team_event_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.national_team_event_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for national_team_event_types
CREATE POLICY "Users can view national team event types for their categories"
ON public.national_team_event_types
FOR SELECT
USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can insert national team event types for their categories"
ON public.national_team_event_types
FOR INSERT
WITH CHECK (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update national team event types for their categories"
ON public.national_team_event_types
FOR UPDATE
USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete national team event types for their categories"
ON public.national_team_event_types
FOR DELETE
USING (can_access_category(auth.uid(), category_id));

-- Create a table for national team events (rassemblements, stages, matchs)
CREATE TABLE public.national_team_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  event_type_id UUID REFERENCES public.national_team_event_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL, -- test_match, six_nations, world_cup, autumn_nations, summer_tour, stage, rassemblement, other
  start_date DATE NOT NULL,
  end_date DATE,
  location TEXT,
  opponent TEXT, -- For matches
  is_home BOOLEAN DEFAULT true,
  score_home INTEGER,
  score_away INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.national_team_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for national_team_events
CREATE POLICY "Users can view national team events for their categories"
ON public.national_team_events
FOR SELECT
USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can insert national team events for their categories"
ON public.national_team_events
FOR INSERT
WITH CHECK (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update national team events for their categories"
ON public.national_team_events
FOR UPDATE
USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete national team events for their categories"
ON public.national_team_events
FOR DELETE
USING (can_access_category(auth.uid(), category_id));

-- Create trigger for updated_at
CREATE TRIGGER update_national_team_events_updated_at
BEFORE UPDATE ON public.national_team_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a table for player caps (international selections)
CREATE TABLE public.player_caps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.national_team_events(id) ON DELETE SET NULL,
  cap_date DATE NOT NULL,
  cap_number INTEGER, -- Which cap number for this player
  opponent TEXT,
  competition TEXT, -- 6 Nations, World Cup, Test Match, etc.
  was_starter BOOLEAN DEFAULT true,
  minutes_played INTEGER,
  tries INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_caps ENABLE ROW LEVEL SECURITY;

-- RLS policies for player_caps
CREATE POLICY "Users can view player caps for their categories"
ON public.player_caps
FOR SELECT
USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can insert player caps for their categories"
ON public.player_caps
FOR INSERT
WITH CHECK (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update player caps for their categories"
ON public.player_caps
FOR UPDATE
USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete player caps for their categories"
ON public.player_caps
FOR DELETE
USING (can_access_category(auth.uid(), category_id));

-- Add a column to players for their club of origin (useful for national teams)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS club_origin TEXT;