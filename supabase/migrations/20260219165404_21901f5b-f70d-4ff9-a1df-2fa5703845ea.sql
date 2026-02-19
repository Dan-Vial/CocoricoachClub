
-- Create a unified view of all invitations across the 4 tables
CREATE OR REPLACE VIEW public.all_invitations AS

-- Ambassador invitations (Super Admin → Client/Admin)
SELECT 
  ai.id,
  ai.email,
  'admin'::text AS role,
  NULL::uuid AS club_id,
  NULL::uuid[] AS category_ids,
  ai.token,
  ai.status,
  ai.created_at,
  ai.accepted_at,
  ai.expires_at,
  ai.invited_by,
  'ambassador'::text AS invitation_type,
  ai.name AS recipient_name
FROM public.ambassador_invitations ai

UNION ALL

-- Club invitations (Admin Club → Staff)
SELECT 
  ci.id,
  ci.email,
  ci.role::text AS role,
  ci.club_id,
  ci.assigned_categories::uuid[] AS category_ids,
  ci.token,
  ci.status,
  ci.created_at,
  NULL::timestamptz AS accepted_at,
  ci.expires_at,
  ci.invited_by,
  'club_staff'::text AS invitation_type,
  NULL::text AS recipient_name
FROM public.club_invitations ci

UNION ALL

-- Category invitations (Category-level invitation)
SELECT 
  cti.id,
  cti.email,
  cti.role::text AS role,
  NULL::uuid AS club_id,
  ARRAY[cti.category_id]::uuid[] AS category_ids,
  cti.token,
  cti.status,
  cti.created_at,
  NULL::timestamptz AS accepted_at,
  cti.expires_at,
  cti.invited_by,
  'category_member'::text AS invitation_type,
  NULL::text AS recipient_name
FROM public.category_invitations cti

UNION ALL

-- Athlete invitations
SELECT 
  ati.id,
  ati.email,
  'athlete'::text AS role,
  ati.club_id,
  ARRAY[ati.category_id]::uuid[] AS category_ids,
  ati.token,
  ati.status,
  ati.created_at,
  ati.accepted_at,
  ati.expires_at,
  ati.invited_by,
  'athlete'::text AS invitation_type,
  NULL::text AS recipient_name
FROM public.athlete_invitations ati;

-- RLS: The view inherits RLS from underlying tables, but let's add a comment
COMMENT ON VIEW public.all_invitations IS 'Unified view of all invitation types for admin dashboards';

-- Add expires_at default of 48h to club_invitations if not set
ALTER TABLE public.club_invitations 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '48 hours');

-- Add expires_at default of 48h to category_invitations if not set
ALTER TABLE public.category_invitations 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '48 hours');

-- Add expires_at default of 48h to athlete_invitations if not set  
ALTER TABLE public.athlete_invitations 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '48 hours');

-- Create a function to resend/renew an invitation
CREATE OR REPLACE FUNCTION public.renew_invitation(
  _table_name text,
  _invitation_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_token text;
  v_new_expires timestamptz;
  v_email text;
BEGIN
  v_new_token := gen_random_uuid()::text;
  v_new_expires := now() + interval '48 hours';

  IF _table_name = 'ambassador_invitations' THEN
    UPDATE public.ambassador_invitations 
    SET token = v_new_token, expires_at = v_new_expires, status = 'pending'
    WHERE id = _invitation_id
    RETURNING email INTO v_email;
  ELSIF _table_name = 'club_invitations' THEN
    UPDATE public.club_invitations 
    SET token = v_new_token, expires_at = v_new_expires, status = 'pending'
    WHERE id = _invitation_id
    RETURNING email INTO v_email;
  ELSIF _table_name = 'category_invitations' THEN
    UPDATE public.category_invitations 
    SET token = v_new_token, expires_at = v_new_expires, status = 'pending'
    WHERE id = _invitation_id
    RETURNING email INTO v_email;
  ELSIF _table_name = 'athlete_invitations' THEN
    UPDATE public.athlete_invitations 
    SET token = v_new_token, expires_at = v_new_expires, status = 'pending'
    WHERE id = _invitation_id
    RETURNING email INTO v_email;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Unknown table');
  END IF;

  IF v_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  RETURN json_build_object('success', true, 'token', v_new_token, 'email', v_email, 'expires_at', v_new_expires);
END;
$$;
