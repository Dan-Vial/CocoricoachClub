-- Drop and recreate the view without SECURITY DEFINER (use invoker's permissions instead)
DROP VIEW IF EXISTS public.safe_club_invitations;

-- Create a regular view (uses invoker's RLS by default)
-- The token masking is done via CASE expression, not SECURITY DEFINER
CREATE VIEW public.safe_club_invitations 
WITH (security_invoker = true)
AS
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
COMMENT ON VIEW public.safe_club_invitations IS 'Secure view that hides invitation tokens from non-admin users - uses security invoker mode';