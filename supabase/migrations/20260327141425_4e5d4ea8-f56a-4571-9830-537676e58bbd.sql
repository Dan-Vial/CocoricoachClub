
-- 1. Revamp benchmarks table: add JSONB levels, body_weight_ratio, applies_to_filter
ALTER TABLE public.benchmarks 
  ADD COLUMN IF NOT EXISTS levels jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS use_body_weight_ratio boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS body_weight_multiplier numeric DEFAULT null,
  ADD COLUMN IF NOT EXISTS filter_type text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS filter_value text DEFAULT null;

-- Migrate existing 4-level data into JSONB levels array
UPDATE public.benchmarks SET levels = jsonb_build_array(
  jsonb_build_object('label', level_1_label, 'threshold', level_1_max, 'color', '#ef4444'),
  jsonb_build_object('label', level_2_label, 'threshold', level_2_max, 'color', '#f59e0b'),
  jsonb_build_object('label', level_3_label, 'threshold', level_3_max, 'color', '#22c55e'),
  jsonb_build_object('label', level_4_label, 'threshold', level_4_max, 'color', '#10b981')
) WHERE levels = '[]'::jsonb OR levels IS NULL;

-- 2. Create custom_tests table for club-specific tests
CREATE TABLE IF NOT EXISTS public.custom_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  name text NOT NULL,
  test_category text NOT NULL,
  unit text,
  is_time boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.custom_tests ENABLE ROW LEVEL SECURITY;

-- 3. Create junction table for category visibility of custom tests
CREATE TABLE IF NOT EXISTS public.custom_test_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_test_id uuid NOT NULL REFERENCES public.custom_tests(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(custom_test_id, category_id)
);

ALTER TABLE public.custom_test_categories ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for custom_tests
CREATE POLICY "Club members can view custom tests" ON public.custom_tests
  FOR SELECT TO authenticated
  USING (
    public.can_access_club(auth.uid(), club_id)
  );

CREATE POLICY "Club admins can manage custom tests" ON public.custom_tests
  FOR ALL TO authenticated
  USING (
    public.can_modify_club_data(auth.uid(), club_id)
  )
  WITH CHECK (
    public.can_modify_club_data(auth.uid(), club_id)
  );

-- 5. RLS policies for custom_test_categories
CREATE POLICY "Members can view custom test category links" ON public.custom_test_categories
  FOR SELECT TO authenticated
  USING (
    public.can_access_category(auth.uid(), category_id)
  );

CREATE POLICY "Admins can manage custom test category links" ON public.custom_test_categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_tests ct
      WHERE ct.id = custom_test_id
      AND public.can_modify_club_data(auth.uid(), ct.club_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_tests ct
      WHERE ct.id = custom_test_id
      AND public.can_modify_club_data(auth.uid(), ct.club_id)
    )
  );
