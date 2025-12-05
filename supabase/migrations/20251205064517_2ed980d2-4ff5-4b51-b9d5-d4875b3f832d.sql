-- Drop the existing check constraint
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_rugby_type_check;

-- Add new check constraint that includes "academie"
ALTER TABLE public.categories ADD CONSTRAINT categories_rugby_type_check 
  CHECK (rugby_type IN ('XV', '7', 'academie'));