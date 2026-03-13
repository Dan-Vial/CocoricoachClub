
CREATE TABLE public.benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  test_category text NOT NULL,
  test_type text NOT NULL,
  unit text,
  lower_is_better boolean NOT NULL DEFAULT false,
  level_1_label text NOT NULL DEFAULT 'Insuffisant',
  level_1_max numeric,
  level_2_label text NOT NULL DEFAULT 'Moyen',
  level_2_max numeric,
  level_3_label text NOT NULL DEFAULT 'Bon',
  level_3_max numeric,
  level_4_label text NOT NULL DEFAULT 'Excellent',
  level_4_max numeric,
  applies_to text DEFAULT 'all',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with category access can read benchmarks"
  ON public.benchmarks FOR SELECT TO authenticated
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users with category access can manage benchmarks"
  ON public.benchmarks FOR ALL TO authenticated
  USING (public.can_access_category(auth.uid(), category_id))
  WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE INDEX idx_benchmarks_category ON public.benchmarks(category_id);
