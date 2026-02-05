-- Add max_staff_per_category to clients and subscription_plans
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS max_staff_per_category INTEGER DEFAULT 5;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_staff_per_category INTEGER DEFAULT 5;

-- Update default max_athletes to 60
ALTER TABLE public.clients ALTER COLUMN max_athletes SET DEFAULT 60;
ALTER TABLE public.subscription_plans ALTER COLUMN max_athletes SET DEFAULT 60;

-- Add video and GPS options to subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS video_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS gps_data_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.clients.max_staff_per_category IS 'Maximum staff members per category';
COMMENT ON COLUMN public.subscription_plans.max_staff_per_category IS 'Maximum staff members per category for this plan';
COMMENT ON COLUMN public.subscription_plans.video_enabled IS 'Video analysis feature included in this plan';
COMMENT ON COLUMN public.subscription_plans.gps_data_enabled IS 'GPS data feature included in this plan';