-- Drop the existing unsafe view
DROP VIEW IF EXISTS public.safe_profiles;

-- Create a secure view that only shows current user's own profile
-- The view uses security_invoker to run with the permissions of the calling user
CREATE VIEW public.safe_profiles 
WITH (security_invoker = true)
AS 
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.created_at
FROM public.profiles p
WHERE p.id = auth.uid();