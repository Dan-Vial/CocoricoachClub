
-- Drop existing restrictive policies for insert/update
DROP POLICY IF EXISTS "Users can insert oil patterns for modifiable categories" ON public.bowling_oil_patterns;
DROP POLICY IF EXISTS "Users can update oil patterns for modifiable categories" ON public.bowling_oil_patterns;

-- Allow any category member to insert oil patterns
CREATE POLICY "Category members can insert oil patterns"
ON public.bowling_oil_patterns
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_category(auth.uid(), category_id));

-- Allow any category member to update oil patterns
CREATE POLICY "Category members can update oil patterns"
ON public.bowling_oil_patterns
FOR UPDATE
TO authenticated
USING (public.can_access_category(auth.uid(), category_id))
WITH CHECK (public.can_access_category(auth.uid(), category_id));
