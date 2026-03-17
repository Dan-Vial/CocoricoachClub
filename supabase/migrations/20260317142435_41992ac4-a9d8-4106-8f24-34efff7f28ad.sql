CREATE TABLE public.tennis_drill_training (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  training_session_id uuid REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  exercise_type text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  successes integer NOT NULL DEFAULT 0,
  success_rate numeric GENERATED ALWAYS AS (
    CASE WHEN attempts > 0 THEN ROUND((successes::numeric / attempts::numeric) * 100, 1) ELSE 0 END
  ) STORED,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tennis_drill_training ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tennis drills in their categories"
  ON public.tennis_drill_training FOR SELECT TO authenticated
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can insert tennis drills in their categories"
  ON public.tennis_drill_training FOR INSERT TO authenticated
  WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete tennis drills in their categories"
  ON public.tennis_drill_training FOR DELETE TO authenticated
  USING (public.can_access_category(auth.uid(), category_id));