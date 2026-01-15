-- Créer une table unifiée pour tous les types de tests
CREATE TABLE public.generic_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  test_category TEXT NOT NULL, -- cardio, musculation, poids_corps, corporel, course, pliometrie, puissance, halterophilie, crossfit
  test_type TEXT NOT NULL, -- specific test value from testCategories.ts
  result_value NUMERIC NOT NULL, -- the numeric result
  result_unit TEXT, -- kg, cm, s, reps, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generic_tests ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_generic_tests_category ON public.generic_tests(category_id);
CREATE INDEX idx_generic_tests_player ON public.generic_tests(player_id);
CREATE INDEX idx_generic_tests_date ON public.generic_tests(test_date);
CREATE INDEX idx_generic_tests_type ON public.generic_tests(test_category, test_type);

-- RLS policies for authenticated users with category access
CREATE POLICY "Users can view tests for their categories"
ON public.generic_tests
FOR SELECT
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can insert tests for their categories"
ON public.generic_tests
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update tests for their categories"
ON public.generic_tests
FOR UPDATE
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete tests for their categories"
ON public.generic_tests
FOR DELETE
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));