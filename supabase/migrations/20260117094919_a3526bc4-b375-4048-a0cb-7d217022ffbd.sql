-- Mettre à jour les politiques pour wellness_tracking
DROP POLICY IF EXISTS "Club owners can insert wellness" ON public.wellness_tracking;
DROP POLICY IF EXISTS "Club owners can update wellness" ON public.wellness_tracking;
DROP POLICY IF EXISTS "Club owners can delete wellness" ON public.wellness_tracking;

CREATE POLICY "Club members with access can insert wellness_tracking" ON public.wellness_tracking
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = wellness_tracking.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can update wellness_tracking" ON public.wellness_tracking
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = wellness_tracking.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can delete wellness_tracking" ON public.wellness_tracking
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = wellness_tracking.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

-- Mettre à jour les politiques pour awcr_tracking
DROP POLICY IF EXISTS "Club owners can insert awcr" ON public.awcr_tracking;
DROP POLICY IF EXISTS "Club owners can update awcr" ON public.awcr_tracking;
DROP POLICY IF EXISTS "Club owners can delete awcr" ON public.awcr_tracking;

CREATE POLICY "Club members with access can insert awcr_tracking" ON public.awcr_tracking
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = awcr_tracking.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can update awcr_tracking" ON public.awcr_tracking
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = awcr_tracking.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can delete awcr_tracking" ON public.awcr_tracking
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = awcr_tracking.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

-- Mettre à jour les politiques pour jump_tests
DROP POLICY IF EXISTS "Club owners can insert jump tests" ON public.jump_tests;
DROP POLICY IF EXISTS "Club owners can update jump tests" ON public.jump_tests;
DROP POLICY IF EXISTS "Club owners can delete jump tests" ON public.jump_tests;

CREATE POLICY "Club members with access can insert jump_tests" ON public.jump_tests
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = jump_tests.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can update jump_tests" ON public.jump_tests
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = jump_tests.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can delete jump_tests" ON public.jump_tests
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = jump_tests.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

-- Mettre à jour les politiques pour generic_tests
DROP POLICY IF EXISTS "Club owners can insert generic tests" ON public.generic_tests;
DROP POLICY IF EXISTS "Club owners can update generic tests" ON public.generic_tests;
DROP POLICY IF EXISTS "Club owners can delete generic tests" ON public.generic_tests;

CREATE POLICY "Club members with access can insert generic_tests" ON public.generic_tests
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = generic_tests.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can update generic_tests" ON public.generic_tests
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = generic_tests.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can delete generic_tests" ON public.generic_tests
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = generic_tests.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

-- Mettre à jour les politiques pour mobility_tests
DROP POLICY IF EXISTS "Club owners can insert mobility tests" ON public.mobility_tests;
DROP POLICY IF EXISTS "Club owners can update mobility tests" ON public.mobility_tests;
DROP POLICY IF EXISTS "Club owners can delete mobility tests" ON public.mobility_tests;

CREATE POLICY "Club members with access can insert mobility_tests" ON public.mobility_tests
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = mobility_tests.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can update mobility_tests" ON public.mobility_tests
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = mobility_tests.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can delete mobility_tests" ON public.mobility_tests
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = mobility_tests.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);