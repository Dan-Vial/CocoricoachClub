
-- Create event_participants table to track which players participate in events
CREATE TABLE public.event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(training_session_id, player_id)
);

-- Enable RLS
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies using category access
CREATE POLICY "Users can view event participants for accessible categories"
ON public.event_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions ts
    WHERE ts.id = training_session_id
    AND public.can_access_category(auth.uid(), ts.category_id)
  )
);

CREATE POLICY "Users can insert event participants for accessible categories"
ON public.event_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.training_sessions ts
    WHERE ts.id = training_session_id
    AND public.can_access_category(auth.uid(), ts.category_id)
  )
);

CREATE POLICY "Users can delete event participants for accessible categories"
ON public.event_participants FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions ts
    WHERE ts.id = training_session_id
    AND public.can_access_category(auth.uid(), ts.category_id)
  )
);

-- Index for performance
CREATE INDEX idx_event_participants_session ON public.event_participants(training_session_id);
CREATE INDEX idx_event_participants_player ON public.event_participants(player_id);
