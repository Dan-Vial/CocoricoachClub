-- Drop restrictive owner-only policies on test_reminders
DROP POLICY IF EXISTS "Club owners can view test reminders" ON public.test_reminders;
DROP POLICY IF EXISTS "Club owners can insert test reminders" ON public.test_reminders;
DROP POLICY IF EXISTS "Club owners can update test reminders" ON public.test_reminders;
DROP POLICY IF EXISTS "Club owners can delete test reminders" ON public.test_reminders;

-- Replace with broader staff access
CREATE POLICY "Staff can view test reminders"
ON public.test_reminders FOR SELECT
USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Staff can insert test reminders"
ON public.test_reminders FOR INSERT
WITH CHECK (can_access_category(auth.uid(), category_id));

CREATE POLICY "Staff can update test reminders"
ON public.test_reminders FOR UPDATE
USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Staff can delete test reminders"
ON public.test_reminders FOR DELETE
USING (can_access_category(auth.uid(), category_id));

-- Allow athletes to view test reminders via token
CREATE POLICY "Athletes can view test reminders via token"
ON public.test_reminders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.athlete_access_tokens aat
    WHERE aat.category_id = test_reminders.category_id
      AND aat.is_active = true
      AND (aat.expires_at IS NULL OR aat.expires_at > now())
      AND aat.last_used_at > now() - interval '2 minutes'
  )
);