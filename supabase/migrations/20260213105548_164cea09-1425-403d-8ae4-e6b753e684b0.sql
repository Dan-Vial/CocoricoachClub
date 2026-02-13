
-- Fix 1: athlete_access_tokens - Remove overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can validate athlete tokens" ON public.athlete_access_tokens;

-- Replace with a restrictive policy: only authenticated users or via RPC
CREATE POLICY "Authenticated users can validate tokens"
ON public.athlete_access_tokens
FOR SELECT
TO authenticated
USING (can_access_category(auth.uid(), category_id));

-- Fix 2: exercise_library - Restrict system exercises to authenticated users
DROP POLICY IF EXISTS "System exercises are viewable" ON public.exercise_library;

CREATE POLICY "Authenticated users can view system exercises"
ON public.exercise_library
FOR SELECT
TO authenticated
USING (is_system IS TRUE);

-- Fix 3: injury_protocols - Restrict system default protocols to authenticated users
DROP POLICY IF EXISTS "View system default protocols" ON public.injury_protocols;

CREATE POLICY "Authenticated users can view system protocols"
ON public.injury_protocols
FOR SELECT
TO authenticated
USING (is_system_default = true);

-- Fix 4: Security Definer Views - Recreate views as SECURITY INVOKER (default)
-- admin_all_clubs
DROP VIEW IF EXISTS public.admin_all_clubs CASCADE;
CREATE VIEW public.admin_all_clubs WITH (security_invoker = true) AS
SELECT id, name, created_at, user_id,
  (SELECT count(*) FROM categories cat WHERE cat.club_id = c.id) AS category_count,
  (SELECT count(*) FROM club_members cm WHERE cm.club_id = c.id) AS member_count
FROM clubs c
WHERE is_super_admin(auth.uid());

-- admin_all_users
DROP VIEW IF EXISTS public.admin_all_users CASCADE;
CREATE VIEW public.admin_all_users WITH (security_invoker = true) AS
SELECT id, full_name, email, created_at,
  (SELECT count(*) FROM clubs cl WHERE cl.user_id = p.id) AS clubs_owned,
  (EXISTS (SELECT 1 FROM super_admin_users sau WHERE sau.user_id = p.id)) AS is_super_admin,
  (EXISTS (SELECT 1 FROM approved_users au WHERE au.user_id = p.id)) AS is_approved
FROM profiles p
WHERE is_super_admin(auth.uid());

-- admin_dashboard_stats
DROP VIEW IF EXISTS public.admin_dashboard_stats CASCADE;
CREATE VIEW public.admin_dashboard_stats WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM clients) AS total_clients,
  (SELECT count(*) FROM clients WHERE status = 'active') AS active_clients,
  (SELECT count(*) FROM clients WHERE status = 'trial') AS trial_clients,
  (SELECT count(*) FROM clients WHERE status = 'suspended') AS suspended_clients,
  (SELECT count(*) FROM clubs) AS total_clubs,
  (SELECT count(*) FROM clubs WHERE is_active = true) AS active_clubs,
  (SELECT count(*) FROM categories) AS total_categories,
  (SELECT count(*) FROM players) AS total_athletes,
  (SELECT count(DISTINCT user_id) FROM club_members) AS total_users,
  (SELECT COALESCE(sum(amount), 0) FROM payment_history WHERE status = 'completed' AND payment_date >= date_trunc('month', CURRENT_DATE)) AS revenue_this_month;
