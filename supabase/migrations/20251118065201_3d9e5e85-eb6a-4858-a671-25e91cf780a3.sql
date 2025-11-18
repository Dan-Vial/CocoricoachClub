-- Table pour stocker les rappels de tests périodiques
CREATE TABLE IF NOT EXISTS public.test_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('VMA', 'Force', 'Sprint')),
  frequency_weeks INTEGER NOT NULL DEFAULT 6,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_notification_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Club owners can view test reminders"
  ON public.test_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN clubs ON clubs.id = categories.club_id
      WHERE categories.id = test_reminders.category_id
      AND clubs.user_id = auth.uid()
    )
  );

CREATE POLICY "Club owners can insert test reminders"
  ON public.test_reminders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories
      JOIN clubs ON clubs.id = categories.club_id
      WHERE categories.id = test_reminders.category_id
      AND clubs.user_id = auth.uid()
    )
  );

CREATE POLICY "Club owners can update test reminders"
  ON public.test_reminders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN clubs ON clubs.id = categories.club_id
      WHERE categories.id = test_reminders.category_id
      AND clubs.user_id = auth.uid()
    )
  );

CREATE POLICY "Club owners can delete test reminders"
  ON public.test_reminders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN clubs ON clubs.id = categories.club_id
      WHERE categories.id = test_reminders.category_id
      AND clubs.user_id = auth.uid()
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_test_reminders_updated_at
  BEFORE UPDATE ON public.test_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX idx_test_reminders_category_id ON public.test_reminders(category_id);
CREATE INDEX idx_test_reminders_is_active ON public.test_reminders(is_active);