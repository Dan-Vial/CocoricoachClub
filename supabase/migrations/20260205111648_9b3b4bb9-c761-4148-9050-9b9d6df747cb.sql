-- Add option columns to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS video_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS gps_data_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.clients.video_enabled IS 'Enable video analysis feature for this client';
COMMENT ON COLUMN public.clients.gps_data_enabled IS 'Enable GPS data feature for this client';