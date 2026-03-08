
-- Clean up conflicting profiles policies - keep only the secure ones
DROP POLICY IF EXISTS "Super admins can view profile names only" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;

-- The remaining policies are:
-- "Authenticated users can view profiles" FOR SELECT (needed for displaying names in messaging, etc)
-- "Users can update own profile" FOR UPDATE
-- "Users can insert own profile" FOR INSERT
