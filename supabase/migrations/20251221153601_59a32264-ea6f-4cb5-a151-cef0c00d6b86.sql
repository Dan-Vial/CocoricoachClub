-- Drop the policy that exposes emails to club members
DROP POLICY IF EXISTS "Club members can view each other profiles" ON public.profiles;

-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS public.get_safe_profile(uuid);

-- Create security definer function to get safe profile info
-- Returns full email only for the requesting user's own profile, NULL for others
CREATE OR REPLACE FUNCTION public.get_safe_profile(profile_id uuid)
RETURNS TABLE (id uuid, full_name text, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return full data if user is viewing their own profile
  IF auth.uid() = profile_id THEN
    RETURN QUERY
    SELECT p.id, p.full_name, p.email
    FROM public.profiles p
    WHERE p.id = profile_id;
  ELSE
    -- Return profile without email for other users
    RETURN QUERY
    SELECT p.id, p.full_name, NULL::text as email
    FROM public.profiles p
    WHERE p.id = profile_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_safe_profile(uuid) TO authenticated;