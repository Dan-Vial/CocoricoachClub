-- =============================================
-- SUPER ADMIN MODULE - Complete Database Schema
-- =============================================

-- 1. CLIENTS TABLE (entities that pay for the service)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  max_clubs INTEGER NOT NULL DEFAULT 1,
  max_categories_per_club INTEGER NOT NULL DEFAULT 3,
  max_staff_users INTEGER NOT NULL DEFAULT 5,
  max_athletes INTEGER NOT NULL DEFAULT 50,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Link clubs to clients
ALTER TABLE public.clubs 
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- 3. SUBSCRIPTION PLANS
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  max_clubs INTEGER NOT NULL DEFAULT 1,
  max_categories_per_club INTEGER NOT NULL DEFAULT 3,
  max_staff_users INTEGER NOT NULL DEFAULT 5,
  max_athletes INTEGER NOT NULL DEFAULT 50,
  features JSONB DEFAULT '[]'::jsonb,
  trial_days INTEGER DEFAULT 14,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. CLIENT SUBSCRIPTIONS (manual tracking)
CREATE TABLE public.client_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'expired', 'cancelled')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  amount DECIMAL(10,2),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. PAYMENT HISTORY (manual tracking)
CREATE TABLE public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.client_subscriptions(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. TUTORIAL VIDEOS (visible across all categories)
CREATE TABLE public.tutorial_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('super_admin', 'admin', 'staff', 'all')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. GLOBAL NOTIFICATIONS (from super admin)
CREATE TABLE public.global_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'info' CHECK (notification_type IN ('info', 'warning', 'success', 'alert')),
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'role', 'club', 'client')),
  target_ids UUID[] DEFAULT '{}',
  target_roles TEXT[] DEFAULT '{}',
  is_email BOOLEAN DEFAULT false,
  is_push BOOLEAN DEFAULT true,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. USER NOTIFICATION STATUS (track if user has read/dismissed)
CREATE TABLE public.user_notification_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.global_notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

-- 9. APP SETTINGS (global configuration)
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('modules_enabled', '{"gps": true, "video": true, "reports": true, "wellness": true, "nutrition": true}'::jsonb, 'Modules actifs'),
('default_limits', '{"max_clubs": 1, "max_categories": 3, "max_staff": 5, "max_athletes": 50}'::jsonb, 'Limites par défaut'),
('trial_days', '14'::jsonb, 'Durée période d''essai');

-- 10. Enable RLS on all new tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies - Super Admin has full access
CREATE POLICY "Super admins can do everything on clients"
ON public.clients FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can do everything on subscription_plans"
ON public.subscription_plans FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can do everything on client_subscriptions"
ON public.client_subscriptions FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can do everything on payment_history"
ON public.payment_history FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage tutorial_videos"
ON public.tutorial_videos FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view active tutorial_videos based on visibility"
ON public.tutorial_videos FOR SELECT
USING (
  is_active = true AND (
    visibility = 'all' OR
    (visibility = 'admin' AND EXISTS (
      SELECT 1 FROM public.club_members WHERE user_id = auth.uid() AND role = 'admin'
    )) OR
    (visibility = 'staff' AND EXISTS (
      SELECT 1 FROM public.club_members WHERE user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Super admins can manage global_notifications"
ON public.global_notifications FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view notifications targeted to them"
ON public.global_notifications FOR SELECT
USING (
  target_type = 'all' OR
  (target_type = 'role' AND EXISTS (
    SELECT 1 FROM public.club_members cm 
    WHERE cm.user_id = auth.uid() AND cm.role::text = ANY(target_roles)
  )) OR
  (target_type = 'club' AND EXISTS (
    SELECT 1 FROM public.club_members cm 
    WHERE cm.user_id = auth.uid() AND cm.club_id = ANY(target_ids)
  ))
);

CREATE POLICY "Users can manage their own notification status"
ON public.user_notification_status FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage app_settings"
ON public.app_settings FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view app_settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

-- 12. Create view for admin dashboard stats
CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
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

-- 13. Triggers for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_subscriptions_updated_at
  BEFORE UPDATE ON public.client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tutorial_videos_updated_at
  BEFORE UPDATE ON public.tutorial_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();