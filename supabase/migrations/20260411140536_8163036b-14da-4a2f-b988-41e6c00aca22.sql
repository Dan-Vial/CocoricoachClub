
-- Periodization category rows (lines on the annual view)
CREATE TABLE public.periodization_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual cycle blocks within a category row
CREATE TABLE public.periodization_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  periodization_category_id UUID NOT NULL REFERENCES public.periodization_categories(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  objective TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add periodization_cycle_id to training_sessions for auto-linking
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS periodization_cycle_id UUID REFERENCES public.periodization_cycles(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_periodization_categories_category ON public.periodization_categories(category_id);
CREATE INDEX idx_periodization_cycles_category ON public.periodization_cycles(category_id);
CREATE INDEX idx_periodization_cycles_dates ON public.periodization_cycles(start_date, end_date);
CREATE INDEX idx_training_sessions_cycle ON public.training_sessions(periodization_cycle_id);

-- RLS
ALTER TABLE public.periodization_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodization_cycles ENABLE ROW LEVEL SECURITY;

-- Read: anyone who can access the category
CREATE POLICY "Members can view periodization categories"
ON public.periodization_categories FOR SELECT
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Members can view periodization cycles"
ON public.periodization_cycles FOR SELECT
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

-- Write: club owners/admins/coaches
CREATE POLICY "Staff can manage periodization categories"
ON public.periodization_categories FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Staff can manage periodization cycles"
ON public.periodization_cycles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_periodization_categories_updated_at
BEFORE UPDATE ON public.periodization_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_periodization_cycles_updated_at
BEFORE UPDATE ON public.periodization_cycles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
