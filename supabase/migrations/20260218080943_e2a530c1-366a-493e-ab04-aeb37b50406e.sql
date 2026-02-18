
-- Drop the recursive policies
DROP POLICY IF EXISTS "Category members can view their categories" ON public.categories;
DROP POLICY IF EXISTS "Category members can view their club" ON public.clubs;

-- Re-create using security definer functions (no recursion)
CREATE POLICY "Category members can view their categories"
ON public.categories
FOR SELECT
USING (
  public.can_access_category(auth.uid(), id)
);

CREATE POLICY "Category members can view their club"
ON public.clubs
FOR SELECT
USING (
  public.can_access_club(auth.uid(), id)
);
