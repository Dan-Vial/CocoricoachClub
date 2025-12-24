-- Create table for common rugby injury types with default protocols
CREATE TABLE public.injury_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  injury_category TEXT NOT NULL, -- e.g., 'musculaire', 'articulaire', 'ligamentaire', 'osseux'
  typical_duration_days_min INTEGER,
  typical_duration_days_max INTEGER,
  description TEXT,
  is_system_default BOOLEAN DEFAULT false,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for protocol phases
CREATE TABLE public.protocol_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_id UUID NOT NULL REFERENCES public.injury_protocols(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_days_min INTEGER,
  duration_days_max INTEGER,
  objectives TEXT[],
  exit_criteria TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for exercises within phases
CREATE TABLE public.protocol_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.protocol_phases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sets INTEGER,
  reps TEXT, -- e.g., "10-12" or "30 sec"
  frequency TEXT, -- e.g., "2x/jour"
  video_url TEXT,
  image_url TEXT,
  notes TEXT,
  exercise_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for player's rehabilitation progress
CREATE TABLE public.player_rehab_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  injury_id UUID NOT NULL REFERENCES public.injuries(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.injury_protocols(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  current_phase INTEGER DEFAULT 1,
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'paused'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for exercise completion tracking
CREATE TABLE public.rehab_exercise_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_rehab_protocol_id UUID NOT NULL REFERENCES public.player_rehab_protocols(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.protocol_exercises(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sets_completed INTEGER,
  reps_completed TEXT,
  pain_level INTEGER, -- 0-10
  difficulty_level INTEGER, -- 1-5
  notes TEXT,
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.injury_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_rehab_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehab_exercise_logs ENABLE ROW LEVEL SECURITY;

-- Policies for injury_protocols (system defaults visible to all, custom ones to category members)
CREATE POLICY "View system default protocols" ON public.injury_protocols
  FOR SELECT USING (is_system_default = true);

CREATE POLICY "View category protocols" ON public.injury_protocols
  FOR SELECT USING (
    category_id IN (
      SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
    ) OR category_id IN (
      SELECT c.id FROM public.categories c
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

CREATE POLICY "Create category protocols" ON public.injury_protocols
  FOR INSERT WITH CHECK (
    category_id IN (
      SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
    ) OR category_id IN (
      SELECT c.id FROM public.categories c
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

CREATE POLICY "Update category protocols" ON public.injury_protocols
  FOR UPDATE USING (
    category_id IN (
      SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
    ) OR category_id IN (
      SELECT c.id FROM public.categories c
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

-- Policies for protocol_phases
CREATE POLICY "View protocol phases" ON public.protocol_phases
  FOR SELECT USING (
    protocol_id IN (SELECT id FROM public.injury_protocols WHERE is_system_default = true)
    OR protocol_id IN (
      SELECT id FROM public.injury_protocols WHERE category_id IN (
        SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
      )
    )
    OR protocol_id IN (
      SELECT ip.id FROM public.injury_protocols ip
      JOIN public.categories c ON ip.category_id = c.id
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage protocol phases" ON public.protocol_phases
  FOR ALL USING (
    protocol_id IN (
      SELECT id FROM public.injury_protocols WHERE category_id IN (
        SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
      )
    )
    OR protocol_id IN (
      SELECT ip.id FROM public.injury_protocols ip
      JOIN public.categories c ON ip.category_id = c.id
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

-- Policies for protocol_exercises
CREATE POLICY "View protocol exercises" ON public.protocol_exercises
  FOR SELECT USING (
    phase_id IN (
      SELECT pp.id FROM public.protocol_phases pp
      JOIN public.injury_protocols ip ON pp.protocol_id = ip.id
      WHERE ip.is_system_default = true
    )
    OR phase_id IN (
      SELECT pp.id FROM public.protocol_phases pp
      JOIN public.injury_protocols ip ON pp.protocol_id = ip.id
      WHERE ip.category_id IN (
        SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
      )
    )
    OR phase_id IN (
      SELECT pp.id FROM public.protocol_phases pp
      JOIN public.injury_protocols ip ON pp.protocol_id = ip.id
      JOIN public.categories c ON ip.category_id = c.id
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage protocol exercises" ON public.protocol_exercises
  FOR ALL USING (
    phase_id IN (
      SELECT pp.id FROM public.protocol_phases pp
      JOIN public.injury_protocols ip ON pp.protocol_id = ip.id
      WHERE ip.category_id IN (
        SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
      )
    )
    OR phase_id IN (
      SELECT pp.id FROM public.protocol_phases pp
      JOIN public.injury_protocols ip ON pp.protocol_id = ip.id
      JOIN public.categories c ON ip.category_id = c.id
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

-- Policies for player_rehab_protocols
CREATE POLICY "View player rehab protocols" ON public.player_rehab_protocols
  FOR SELECT USING (
    category_id IN (
      SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
    ) OR category_id IN (
      SELECT c.id FROM public.categories c
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage player rehab protocols" ON public.player_rehab_protocols
  FOR ALL USING (
    category_id IN (
      SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
    ) OR category_id IN (
      SELECT c.id FROM public.categories c
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

-- Policies for rehab_exercise_logs
CREATE POLICY "View exercise logs" ON public.rehab_exercise_logs
  FOR SELECT USING (
    player_rehab_protocol_id IN (
      SELECT id FROM public.player_rehab_protocols WHERE category_id IN (
        SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
      )
    )
    OR player_rehab_protocol_id IN (
      SELECT prp.id FROM public.player_rehab_protocols prp
      JOIN public.categories c ON prp.category_id = c.id
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage exercise logs" ON public.rehab_exercise_logs
  FOR ALL USING (
    player_rehab_protocol_id IN (
      SELECT id FROM public.player_rehab_protocols WHERE category_id IN (
        SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
      )
    )
    OR player_rehab_protocol_id IN (
      SELECT prp.id FROM public.player_rehab_protocols prp
      JOIN public.categories c ON prp.category_id = c.id
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_protocol_phases_protocol ON public.protocol_phases(protocol_id);
CREATE INDEX idx_protocol_exercises_phase ON public.protocol_exercises(phase_id);
CREATE INDEX idx_player_rehab_protocols_player ON public.player_rehab_protocols(player_id);
CREATE INDEX idx_player_rehab_protocols_injury ON public.player_rehab_protocols(injury_id);
CREATE INDEX idx_rehab_exercise_logs_protocol ON public.rehab_exercise_logs(player_rehab_protocol_id);