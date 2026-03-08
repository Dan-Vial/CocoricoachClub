
-- =============================================
-- SECURITY FIX 1: ambassador_invitations - Remove public read access
-- =============================================
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.ambassador_invitations;

-- Only super admins can view all invitations (already exists)
-- Token validation is done via the SECURITY DEFINER function accept_ambassador_invitation()

-- =============================================
-- SECURITY FIX 2: athlete_invitations - Remove public read access + fix OR true
-- =============================================
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.athlete_invitations;
DROP POLICY IF EXISTS "Staff can view all category invitations" ON public.athlete_invitations;

-- Re-create the staff view policy WITHOUT the "OR true" clause
CREATE POLICY "Staff can view category invitations" 
ON public.athlete_invitations FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM category_members cm
    WHERE cm.category_id = athlete_invitations.category_id 
    AND cm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM club_members clm
    WHERE clm.club_id = athlete_invitations.club_id 
    AND clm.user_id = auth.uid()
  )
);

-- =============================================
-- SECURITY FIX 3: Secure views with security_invoker
-- =============================================

-- Recreate all_invitations view with security_invoker (super admin only via underlying table policies)
DROP VIEW IF EXISTS public.all_invitations;
CREATE VIEW public.all_invitations
WITH (security_invoker = on) AS
SELECT ai.id, ai.email, 'admin'::text AS role, NULL::uuid AS club_id,
    NULL::uuid[] AS category_ids, ai.token, ai.status, ai.created_at,
    ai.accepted_at, ai.expires_at, ai.invited_by, 'ambassador'::text AS invitation_type,
    ai.name AS recipient_name
FROM ambassador_invitations ai
UNION ALL
SELECT ci.id, ci.email, (ci.role)::text AS role, ci.club_id,
    (ci.assigned_categories)::uuid[] AS category_ids, ci.token, ci.status, ci.created_at,
    NULL::timestamp with time zone AS accepted_at, ci.expires_at, ci.invited_by,
    'club_staff'::text AS invitation_type, NULL::text AS recipient_name
FROM club_invitations ci
UNION ALL
SELECT cti.id, cti.email, (cti.role)::text AS role, NULL::uuid AS club_id,
    ARRAY[cti.category_id] AS category_ids, cti.token, cti.status, cti.created_at,
    NULL::timestamp with time zone AS accepted_at, cti.expires_at, cti.invited_by,
    'category_member'::text AS invitation_type, NULL::text AS recipient_name
FROM category_invitations cti
UNION ALL
SELECT ati.id, ati.email, 'athlete'::text AS role, ati.club_id,
    ARRAY[ati.category_id] AS category_ids, ati.token, ati.status, ati.created_at,
    ati.accepted_at, ati.expires_at, ati.invited_by, 'athlete'::text AS invitation_type,
    NULL::text AS recipient_name
FROM athlete_invitations ati;

-- Recreate admin_all_users with security_invoker
DROP VIEW IF EXISTS public.admin_all_users;
CREATE VIEW public.admin_all_users
WITH (security_invoker = on) AS
SELECT id, full_name, email, created_at,
    (SELECT count(*) FROM clubs cl WHERE cl.user_id = p.id) AS clubs_owned,
    (EXISTS (SELECT 1 FROM super_admin_users sau WHERE sau.user_id = p.id)) AS is_super_admin,
    (EXISTS (SELECT 1 FROM approved_users au WHERE au.user_id = p.id)) AS is_approved
FROM profiles p
WHERE is_super_admin(auth.uid());

-- Recreate admin_all_clubs with security_invoker
DROP VIEW IF EXISTS public.admin_all_clubs CASCADE;
CREATE VIEW public.admin_all_clubs
WITH (security_invoker = on) AS
SELECT id, name, created_at, user_id,
    (SELECT count(*) FROM categories cat WHERE cat.club_id = c.id) AS category_count,
    (SELECT count(*) FROM club_members cm WHERE cm.club_id = c.id) AS member_count
FROM clubs c
WHERE is_super_admin(auth.uid());

-- Recreate safe_profiles with security_invoker
DROP VIEW IF EXISTS public.safe_profiles;
CREATE VIEW public.safe_profiles
WITH (security_invoker = on) AS
SELECT id, full_name,
    CASE WHEN id = auth.uid() THEN email ELSE NULL::text END AS email
FROM profiles;

-- Recreate safe_club_invitations with security_invoker
DROP VIEW IF EXISTS public.safe_club_invitations;
CREATE VIEW public.safe_club_invitations
WITH (security_invoker = on) AS
SELECT id, club_id, email, role, status, expires_at, created_at
FROM club_invitations;

-- Recreate safe_category_invitations with security_invoker
DROP VIEW IF EXISTS public.safe_category_invitations;
CREATE VIEW public.safe_category_invitations
WITH (security_invoker = on) AS
SELECT id, category_id, email, role, status, expires_at, created_at
FROM category_invitations;
