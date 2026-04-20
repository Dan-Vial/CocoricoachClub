
-- Create a secure view that masks sensitive player fields for non-privileged users
CREATE OR REPLACE VIEW public.players_safe
WITH (security_invoker = on)
AS
SELECT
  id,
  name,
  first_name,
  category_id,
  position,
  birth_date,
  birth_year,
  avatar_url,
  club_origin,
  discipline,
  specialty,
  user_id,
  season_id,
  pwa_install_dismissed,
  created_at,
  -- Sensitive fields: only visible to admin, doctor, physio, or club owner
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN email ELSE NULL END AS email,
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN phone ELSE NULL END AS phone,
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN parent_contact_1_name ELSE NULL END AS parent_contact_1_name,
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN parent_contact_1_phone ELSE NULL END AS parent_contact_1_phone,
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN parent_contact_1_email ELSE NULL END AS parent_contact_1_email,
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN parent_contact_1_relation ELSE NULL END AS parent_contact_1_relation,
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN parent_contact_2_name ELSE NULL END AS parent_contact_2_name,
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN parent_contact_2_phone ELSE NULL END AS parent_contact_2_phone,
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN parent_contact_2_email ELSE NULL END AS parent_contact_2_email,
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN parent_contact_2_relation ELSE NULL END AS parent_contact_2_relation,
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN dietary_requirements ELSE NULL END AS dietary_requirements,
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN allergies ELSE NULL END AS allergies,
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN medical_notes ELSE NULL END AS medical_notes,
  CASE WHEN public.can_view_player_sensitive_data(auth.uid(), category_id) THEN emergency_notes ELSE NULL END AS emergency_notes
FROM public.players;

-- Grant access to the view
GRANT SELECT ON public.players_safe TO authenticated;
