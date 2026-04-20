
ALTER TABLE public.bowling_oil_patterns
  ADD COLUMN IF NOT EXISTS gender text DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS image_url_male text,
  ADD COLUMN IF NOT EXISTS image_url_female text;

-- Allow multiple oil patterns per match (one per gender)
-- Drop old unique constraint if exists, add new one with gender
DO $$
BEGIN
  -- Check if there's a unique constraint on match_id alone and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'bowling_oil_patterns' 
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%match_id%'
  ) THEN
    EXECUTE 'ALTER TABLE public.bowling_oil_patterns DROP CONSTRAINT ' || (
      SELECT constraint_name FROM information_schema.table_constraints 
      WHERE table_name = 'bowling_oil_patterns' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%match_id%'
      LIMIT 1
    );
  END IF;
END $$;
