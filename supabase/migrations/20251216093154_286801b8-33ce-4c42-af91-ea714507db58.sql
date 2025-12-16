
-- Fix 1: Drop and recreate safe_club_invitations view to hide email from unauthorized users
DROP VIEW IF EXISTS public.safe_club_invitations;

CREATE VIEW public.safe_club_invitations AS
SELECT 
    id,
    club_id,
    CASE
        WHEN (
            (EXISTS (SELECT 1 FROM clubs WHERE clubs.id = club_invitations.club_id AND clubs.user_id = auth.uid()))
            OR has_club_role(auth.uid(), club_id, 'admin'::app_role)
            OR auth.email() = email
        ) THEN email
        ELSE NULL::text
    END AS email,
    role,
    status,
    invited_by,
    created_at,
    expires_at,
    CASE
        WHEN (
            (EXISTS (SELECT 1 FROM clubs WHERE clubs.id = club_invitations.club_id AND clubs.user_id = auth.uid()))
            OR has_club_role(auth.uid(), club_id, 'admin'::app_role)
        ) THEN token
        ELSE NULL::text
    END AS token
FROM club_invitations;

-- Fix 2: Create a secure profiles view that hides email from non-authorized users
DROP VIEW IF EXISTS public.safe_profiles;

CREATE VIEW public.safe_profiles AS
SELECT 
    id,
    full_name,
    created_at,
    CASE
        WHEN auth.uid() = id THEN email
        WHEN is_super_admin(auth.uid()) THEN email
        ELSE NULL::text
    END AS email
FROM profiles;

-- Grant access to the views
GRANT SELECT ON public.safe_club_invitations TO authenticated;
GRANT SELECT ON public.safe_profiles TO authenticated;
