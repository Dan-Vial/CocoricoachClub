-- Create table for rehab calendar events
CREATE TABLE public.rehab_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_rehab_protocol_id UUID NOT NULL REFERENCES public.player_rehab_protocols(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.protocol_phases(id) ON DELETE SET NULL,
  phase_number INTEGER NOT NULL,
  phase_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'phase_start', -- 'phase_start', 'phase_end', 'checkpoint'
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rehab_calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policies using existing access function
CREATE POLICY "Users can view rehab events for their categories"
ON public.rehab_calendar_events
FOR SELECT
USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Medical staff can insert rehab events"
ON public.rehab_calendar_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = rehab_calendar_events.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical staff can update rehab events"
ON public.rehab_calendar_events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = rehab_calendar_events.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical staff can delete rehab events"
ON public.rehab_calendar_events
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = rehab_calendar_events.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

-- Create index for faster queries
CREATE INDEX idx_rehab_calendar_player ON public.rehab_calendar_events(player_id);
CREATE INDEX idx_rehab_calendar_date ON public.rehab_calendar_events(event_date);