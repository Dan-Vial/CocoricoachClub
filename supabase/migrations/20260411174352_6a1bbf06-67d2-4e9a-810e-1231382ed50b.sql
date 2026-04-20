
-- Table for prophylaxis programs
CREATE TABLE public.prophylaxis_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  body_zone TEXT NOT NULL,
  frequency TEXT DEFAULT 'quotidien',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for exercises within a prophylaxis program
CREATE TABLE public.prophylaxis_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.prophylaxis_programs(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  sets INTEGER,
  reps TEXT,
  duration_seconds INTEGER,
  rest_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prophylaxis_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prophylaxis_exercises ENABLE ROW LEVEL SECURITY;

-- RLS policies for prophylaxis_programs
CREATE POLICY "Users can view prophylaxis programs in their categories"
ON public.prophylaxis_programs FOR SELECT
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can create prophylaxis programs in their categories"
ON public.prophylaxis_programs FOR INSERT
TO authenticated
WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update prophylaxis programs in their categories"
ON public.prophylaxis_programs FOR UPDATE
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete prophylaxis programs in their categories"
ON public.prophylaxis_programs FOR DELETE
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

-- RLS policies for prophylaxis_exercises
CREATE POLICY "Users can view prophylaxis exercises"
ON public.prophylaxis_exercises FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.prophylaxis_programs pp
  WHERE pp.id = program_id
  AND public.can_access_category(auth.uid(), pp.category_id)
));

CREATE POLICY "Users can create prophylaxis exercises"
ON public.prophylaxis_exercises FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.prophylaxis_programs pp
  WHERE pp.id = program_id
  AND public.can_access_category(auth.uid(), pp.category_id)
));

CREATE POLICY "Users can update prophylaxis exercises"
ON public.prophylaxis_exercises FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.prophylaxis_programs pp
  WHERE pp.id = program_id
  AND public.can_access_category(auth.uid(), pp.category_id)
));

CREATE POLICY "Users can delete prophylaxis exercises"
ON public.prophylaxis_exercises FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.prophylaxis_programs pp
  WHERE pp.id = program_id
  AND public.can_access_category(auth.uid(), pp.category_id)
));

-- Trigger for updated_at
CREATE TRIGGER update_prophylaxis_programs_updated_at
BEFORE UPDATE ON public.prophylaxis_programs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_prophylaxis_programs_category ON public.prophylaxis_programs(category_id);
CREATE INDEX idx_prophylaxis_programs_player ON public.prophylaxis_programs(player_id);
CREATE INDEX idx_prophylaxis_exercises_program ON public.prophylaxis_exercises(program_id);
