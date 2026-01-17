-- Mettre à jour la vue admin_all_users pour inclure created_at
DROP VIEW IF EXISTS admin_all_users;

CREATE VIEW admin_all_users AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.created_at,
  (SELECT COUNT(*) FROM clubs cl WHERE cl.user_id = p.id) AS clubs_owned,
  (EXISTS (SELECT 1 FROM super_admin_users sau WHERE sau.user_id = p.id)) AS is_super_admin,
  (EXISTS (SELECT 1 FROM approved_users au WHERE au.user_id = p.id)) AS is_approved
FROM profiles p
WHERE is_super_admin(auth.uid());