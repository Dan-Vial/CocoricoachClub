
-- Player objectives table (individual + measurable/text)
CREATE TABLE public.player_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  objective_type TEXT NOT NULL DEFAULT 'text' CHECK (objective_type IN ('text', 'measurable')),
  goal_type TEXT NOT NULL DEFAULT 'physical' CHECK (goal_type IN ('team', 'physical', 'tactical', 'technical', 'mental')),
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  -- Measurable fields
  metric_name TEXT,
  metric_unit TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  -- Progress
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  progress_percentage INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_player_objectives_player ON public.player_objectives(player_id, category_id);
CREATE INDEX idx_player_objectives_category ON public.player_objectives(category_id, season_year);

-- Auto-update updated_at
CREATE TRIGGER update_player_objectives_updated_at
  BEFORE UPDATE ON public.player_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-compute progress for measurable objectives
CREATE OR REPLACE FUNCTION public.compute_objective_progress()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.objective_type = 'measurable' AND NEW.target_value IS NOT NULL AND NEW.target_value > 0 THEN
    NEW.progress_percentage := LEAST(100, ROUND((COALESCE(NEW.current_value, 0) / NEW.target_value * 100)::numeric));
    IF NEW.progress_percentage >= 100 THEN
      NEW.status := 'completed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER compute_objective_progress_trigger
  BEFORE INSERT OR UPDATE ON public.player_objectives
  FOR EACH ROW EXECUTE FUNCTION public.compute_objective_progress();

-- RLS
ALTER TABLE public.player_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view objectives for accessible categories"
  ON public.player_objectives FOR SELECT TO authenticated
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Staff can manage objectives"
  ON public.player_objectives FOR ALL TO authenticated
  USING (public.can_access_category(auth.uid(), category_id))
  WITH CHECK (public.can_access_category(auth.uid(), category_id));
