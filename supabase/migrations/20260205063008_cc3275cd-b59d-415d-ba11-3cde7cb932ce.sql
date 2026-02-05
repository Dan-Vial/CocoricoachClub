-- Add sport column to clubs table
ALTER TABLE public.clubs 
ADD COLUMN sport text NOT NULL DEFAULT 'rugby';

-- Add comment for documentation
COMMENT ON COLUMN public.clubs.sport IS 'Main sport of the club (rugby, football, basketball, handball, volleyball, athletics, judo, rowing, bowling)';