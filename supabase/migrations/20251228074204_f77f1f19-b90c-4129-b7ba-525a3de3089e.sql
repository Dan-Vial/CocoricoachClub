-- Create table to link exercises from library to protocol phases
CREATE TABLE public.protocol_phase_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.protocol_phases(id) ON DELETE CASCADE,
  exercise_library_id UUID REFERENCES public.exercise_library(id) ON DELETE SET NULL,
  custom_exercise_name TEXT,
  sets INTEGER,
  reps TEXT,
  frequency TEXT,
  notes TEXT,
  exercise_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to track exercise completions for players
CREATE TABLE public.player_exercise_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  player_rehab_protocol_id UUID NOT NULL REFERENCES public.player_rehab_protocols(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES public.protocol_phases(id) ON DELETE CASCADE,
  protocol_phase_exercise_id UUID REFERENCES public.protocol_phase_exercises(id) ON DELETE CASCADE,
  protocol_exercise_id UUID REFERENCES public.protocol_exercises(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add rehab-related fields to player_rehab_protocols
ALTER TABLE public.player_rehab_protocols 
ADD COLUMN IF NOT EXISTS recommended_load_reduction INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS track_wellness BOOLEAN DEFAULT true;

-- Enable RLS
ALTER TABLE public.protocol_phase_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_exercise_completions ENABLE ROW LEVEL SECURITY;

-- RLS for protocol_phase_exercises (view via protocol phases)
CREATE POLICY "View protocol phase exercises" ON public.protocol_phase_exercises
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM protocol_phases pp
    JOIN injury_protocols ip ON ip.id = pp.protocol_id
    WHERE pp.id = protocol_phase_exercises.phase_id
    AND (ip.is_system_default = true OR ip.category_id IN (
      SELECT category_id FROM category_members WHERE user_id = auth.uid()
    ) OR ip.category_id IN (
      SELECT c.id FROM categories c JOIN clubs cl ON c.club_id = cl.id WHERE cl.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Manage protocol phase exercises" ON public.protocol_phase_exercises
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM protocol_phases pp
    JOIN injury_protocols ip ON ip.id = pp.protocol_id
    WHERE pp.id = protocol_phase_exercises.phase_id
    AND (ip.category_id IN (
      SELECT category_id FROM category_members WHERE user_id = auth.uid()
    ) OR ip.category_id IN (
      SELECT c.id FROM categories c JOIN clubs cl ON c.club_id = cl.id WHERE cl.user_id = auth.uid()
    ))
  )
);

-- RLS for player_exercise_completions
CREATE POLICY "View player exercise completions" ON public.player_exercise_completions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM players p
    JOIN categories c ON c.id = p.category_id
    JOIN clubs cl ON cl.id = c.club_id
    WHERE p.id = player_exercise_completions.player_id
    AND (cl.user_id = auth.uid() OR can_access_category(auth.uid(), c.id))
  )
);

CREATE POLICY "Manage player exercise completions" ON public.player_exercise_completions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM players p
    JOIN categories c ON c.id = p.category_id
    JOIN clubs cl ON cl.id = c.club_id
    WHERE p.id = player_exercise_completions.player_id
    AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_player_exercise_completions_updated_at
BEFORE UPDATE ON public.player_exercise_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();