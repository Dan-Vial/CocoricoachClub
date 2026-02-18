
-- Drop the OLD recursive policies that cross-reference each other
-- On clubs: this policy queries categories → triggers categories RLS → queries clubs → infinite loop
DROP POLICY IF EXISTS "Category members can view related clubs" ON public.clubs;

-- On categories: this policy queries clubs → triggers clubs RLS → queries categories → infinite loop  
DROP POLICY IF EXISTS "Users can view categories of accessible clubs" ON public.categories;
