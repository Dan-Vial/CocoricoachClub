CREATE OR REPLACE FUNCTION public.accept_club_invitation(_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invitation club_invitations%ROWTYPE;
  v_user_id UUID;
  v_cat_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_invitation
  FROM club_invitations
  WHERE token = _token
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Auto-approve user (staff invited via link should be approved automatically)
  INSERT INTO approved_users (user_id, approved_by, notes)
  VALUES (v_user_id, v_invitation.invited_by, 'Auto-approved via club invitation')
  ON CONFLICT (user_id) DO NOTHING;

  -- Add as club member with assigned categories
  INSERT INTO club_members (club_id, user_id, role, invited_by, assigned_categories)
  VALUES (v_invitation.club_id, v_user_id, v_invitation.role, v_invitation.invited_by, v_invitation.assigned_categories::uuid[])
  ON CONFLICT (club_id, user_id) DO UPDATE SET role = v_invitation.role, assigned_categories = v_invitation.assigned_categories::uuid[];

  -- Also add as category_member for each assigned category
  IF v_invitation.assigned_categories IS NOT NULL THEN
    FOREACH v_cat_id IN ARRAY v_invitation.assigned_categories::uuid[]
    LOOP
      INSERT INTO category_members (category_id, user_id, role, invited_by)
      VALUES (v_cat_id, v_user_id, v_invitation.role, v_invitation.invited_by)
      ON CONFLICT (category_id, user_id) DO UPDATE SET role = v_invitation.role;
    END LOOP;
  ELSE
    INSERT INTO category_members (category_id, user_id, role, invited_by)
    SELECT c.id, v_user_id, v_invitation.role, v_invitation.invited_by
    FROM categories c WHERE c.club_id = v_invitation.club_id
    ON CONFLICT (category_id, user_id) DO UPDATE SET role = v_invitation.role;
  END IF;

  -- Mark invitation as accepted
  UPDATE club_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'club_id', v_invitation.club_id);
END;
$function$;

-- Also fix accept_category_invitation to auto-approve
CREATE OR REPLACE FUNCTION public.accept_category_invitation(_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invitation category_invitations%ROWTYPE;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_invitation
  FROM category_invitations
  WHERE token = _token
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Auto-approve user
  INSERT INTO approved_users (user_id, approved_by, notes)
  VALUES (v_user_id, v_invitation.invited_by, 'Auto-approved via category invitation')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO category_members (category_id, user_id, role, invited_by)
  VALUES (v_invitation.category_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT (category_id, user_id) DO UPDATE SET role = v_invitation.role;

  UPDATE category_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'category_id', v_invitation.category_id);
END;
$function$;