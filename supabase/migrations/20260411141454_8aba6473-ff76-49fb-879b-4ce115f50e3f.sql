
-- Drop existing ALL policies and recreate with proper WITH CHECK
DROP POLICY IF EXISTS "Staff can manage periodization categories" ON public.periodization_categories;
DROP POLICY IF EXISTS "Staff can manage periodization cycles" ON public.periodization_cycles;

-- Separate INSERT/UPDATE/DELETE policies for periodization_categories
CREATE POLICY "Staff can insert periodization categories"
ON public.periodization_categories FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Staff can update periodization categories"
ON public.periodization_categories FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Staff can delete periodization categories"
ON public.periodization_categories FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

-- Separate INSERT/UPDATE/DELETE policies for periodization_cycles
CREATE POLICY "Staff can insert periodization cycles"
ON public.periodization_cycles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Staff can update periodization cycles"
ON public.periodization_cycles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Staff can delete periodization cycles"
ON public.periodization_cycles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);
