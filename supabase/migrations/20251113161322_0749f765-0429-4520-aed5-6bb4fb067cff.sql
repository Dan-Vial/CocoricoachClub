-- 1. Create table for tracking invitation acceptance attempts (rate limiting)
CREATE TABLE IF NOT EXISTS public.invitation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_invitation_attempts_token_time ON public.invitation_attempts(token, attempted_at DESC);

-- Enable RLS
ALTER TABLE public.invitation_attempts ENABLE ROW LEVEL SECURITY;

-- Only system can manage this table (no user access needed)
CREATE POLICY "System only access" ON public.invitation_attempts FOR ALL USING (false);

-- 2. Update accept_club_invitation function to include rate limiting
CREATE OR REPLACE FUNCTION public.accept_club_invitation(_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation club_invitations%ROWTYPE;
  v_user_id UUID;
  v_attempt_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check rate limiting: max 5 attempts per token in last 15 minutes
  SELECT COUNT(*) INTO v_attempt_count
  FROM invitation_attempts
  WHERE token = _token
    AND attempted_at > now() - interval '15 minutes';
  
  IF v_attempt_count >= 5 THEN
    -- Log the blocked attempt
    INSERT INTO invitation_attempts (token, success)
    VALUES (_token, false);
    
    RETURN json_build_object('success', false, 'error', 'Too many attempts. Please try again later.');
  END IF;

  -- Get invitation
  SELECT * INTO v_invitation
  FROM club_invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now()
    AND email = auth.email();

  IF NOT FOUND THEN
    -- Log failed attempt
    INSERT INTO invitation_attempts (token, success)
    VALUES (_token, false);
    
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Add user to club_members
  INSERT INTO club_members (club_id, user_id, role, invited_by)
  VALUES (v_invitation.club_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT (club_id, user_id) DO NOTHING;

  -- Update invitation status
  UPDATE club_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  -- Log successful attempt
  INSERT INTO invitation_attempts (token, success)
  VALUES (_token, true);

  RETURN json_build_object('success', true, 'club_id', v_invitation.club_id);
END;
$$;

-- 3. Update RLS policies on club_invitations to hide emails from regular members
DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON public.club_invitations;

-- Users can view invitations they sent
CREATE POLICY "Users can view invitations they sent" 
ON public.club_invitations 
FOR SELECT 
USING (auth.uid() = invited_by);

-- Users can view invitations sent to their email
CREATE POLICY "Users can view invitations to their email" 
ON public.club_invitations 
FOR SELECT 
USING (auth.email() = email);

-- Club owners and admins can view all invitations for their clubs
CREATE POLICY "Club owners and admins can view club invitations" 
ON public.club_invitations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM clubs
    WHERE clubs.id = club_invitations.club_id
    AND clubs.user_id = auth.uid()
  )
  OR has_club_role(auth.uid(), club_id, 'admin'::app_role)
);

-- 4. Add function to clean up old invitation attempts (for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_invitation_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM invitation_attempts
  WHERE attempted_at < now() - interval '7 days';
END;
$$;