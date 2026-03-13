
DROP VIEW IF EXISTS public.admin_all_users;

CREATE VIEW public.admin_all_users WITH (security_invoker = on) AS
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.created_at,
    ( SELECT count(*) FROM clubs cl WHERE cl.user_id = p.id) AS clubs_owned,
    (EXISTS ( SELECT 1 FROM super_admin_users sau WHERE sau.user_id = p.id)) AS is_super_admin,
    (EXISTS ( SELECT 1 FROM approved_users au WHERE au.user_id = p.id)) AS is_approved
FROM profiles p
WHERE is_super_admin(auth.uid());
