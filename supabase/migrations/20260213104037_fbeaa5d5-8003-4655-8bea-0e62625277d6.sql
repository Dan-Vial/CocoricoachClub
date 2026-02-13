-- Add "Espace Athlète" to role_menu_permissions
INSERT INTO public.role_menu_permissions (menu_key, menu_label, player_visible, staff_admin_visible, staff_coach_visible, staff_prepa_visible, staff_doctor_visible)
VALUES ('espace_athlete', 'Espace Athlète', true, false, false, false, false)
ON CONFLICT DO NOTHING;