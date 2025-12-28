-- Drop existing insert policy and recreate with club owner access
DROP POLICY IF EXISTS "Medical staff can insert rehab events" ON public.rehab_calendar_events;

CREATE POLICY "Medical staff can insert rehab events" 
ON public.rehab_calendar_events 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = rehab_calendar_events.category_id 
    AND (
      cl.user_id = auth.uid() -- Club owner
      OR has_medical_access(auth.uid(), cl.id) -- Medical staff
    )
  )
);

-- Also update UPDATE policy for consistency
DROP POLICY IF EXISTS "Medical staff can update rehab events" ON public.rehab_calendar_events;

CREATE POLICY "Medical staff can update rehab events" 
ON public.rehab_calendar_events 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = rehab_calendar_events.category_id 
    AND (
      cl.user_id = auth.uid()
      OR has_medical_access(auth.uid(), cl.id)
    )
  )
);

-- Also update DELETE policy for consistency
DROP POLICY IF EXISTS "Medical staff can delete rehab events" ON public.rehab_calendar_events;

CREATE POLICY "Medical staff can delete rehab events" 
ON public.rehab_calendar_events 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = rehab_calendar_events.category_id 
    AND (
      cl.user_id = auth.uid()
      OR has_medical_access(auth.uid(), cl.id)
    )
  )
);