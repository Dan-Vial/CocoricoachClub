-- Fix security definer view issue by using security_invoker
DROP VIEW IF EXISTS public.admin_dashboard_stats;

CREATE VIEW public.admin_dashboard_stats
WITH (security_invoker = on) AS
SELECT
  (SELECT COUNT(*) FROM public.clients) as total_clients,
  (SELECT COUNT(*) FROM public.clients WHERE status = 'active') as active_clients,
  (SELECT COUNT(*) FROM public.clients WHERE status = 'trial') as trial_clients,
  (SELECT COUNT(*) FROM public.clients WHERE status = 'suspended') as suspended_clients,
  (SELECT COUNT(*) FROM public.clubs) as total_clubs,
  (SELECT COUNT(*) FROM public.clubs WHERE is_active = true) as active_clubs,
  (SELECT COUNT(*) FROM public.categories) as total_categories,
  (SELECT COUNT(*) FROM public.players) as total_athletes,
  (SELECT COUNT(DISTINCT user_id) FROM public.club_members) as total_users,
  (SELECT COALESCE(SUM(amount), 0) FROM public.payment_history WHERE status = 'completed' AND payment_date >= DATE_TRUNC('month', CURRENT_DATE)) as revenue_this_month;