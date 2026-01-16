-- Add is_free_user column to approved_users table to track users who don't need to pay
ALTER TABLE public.approved_users 
ADD COLUMN IF NOT EXISTS is_free_user boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.approved_users.is_free_user IS 'If true, user does not need to pay subscription and is automatically an ambassador';