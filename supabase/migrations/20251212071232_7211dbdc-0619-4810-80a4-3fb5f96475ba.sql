-- Create a security definer function to get safe profile data (without email for non-owners)
CREATE OR REPLACE FUNCTION public.get_safe_profile(profile_id uuid)
RETURNS TABLE(id uuid, full_name text, email text)
LANGUAGE plpgsql
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

-- Create a view for club invitations that hides tokens from regular users
CREATE OR REPLACE VIEW public.safe_club_invitations AS
SELECT 
  id,
  club_id,
  email,
  role,
  status,
  invited_by,
  created_at,
  expires_at,
  -- Only show token to club owners/admins who can manage invitations
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM clubs WHERE clubs.id = club_invitations.club_id AND clubs.user_id = auth.uid()
    ) OR has_club_role(auth.uid(), club_invitations.club_id, 'admin'::app_role)
    THEN token
    ELSE NULL
  END as token
FROM public.club_invitations;

-- Grant access to the view
GRANT SELECT ON public.safe_club_invitations TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.safe_club_invitations IS 'Secure view that hides invitation tokens from non-admin users';
COMMENT ON FUNCTION public.get_safe_profile IS 'Returns profile data with email hidden for non-owners';