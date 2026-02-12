
-- Add target_ids column to global_notifications for club targeting
ALTER TABLE public.global_notifications ADD COLUMN IF NOT EXISTS target_ids text[] DEFAULT NULL;
