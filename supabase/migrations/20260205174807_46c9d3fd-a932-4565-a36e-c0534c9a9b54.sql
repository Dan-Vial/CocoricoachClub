-- Add feature flags to categories table for granular control
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS gps_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS video_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS academy_enabled boolean DEFAULT true;