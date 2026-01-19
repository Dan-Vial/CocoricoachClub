-- Convert training_type column from ENUM to TEXT to support all sport-specific types
-- Step 1: Add temporary column
ALTER TABLE public.training_sessions 
ADD COLUMN training_type_text TEXT;

-- Step 2: Copy data
UPDATE public.training_sessions 
SET training_type_text = training_type::TEXT;

-- Step 3: Drop the old column
ALTER TABLE public.training_sessions 
DROP COLUMN training_type;

-- Step 4: Rename new column
ALTER TABLE public.training_sessions 
RENAME COLUMN training_type_text TO training_type;

-- Step 5: Add NOT NULL constraint
ALTER TABLE public.training_sessions 
ALTER COLUMN training_type SET NOT NULL;

-- Step 6: Drop the ENUM type (no longer needed)
DROP TYPE IF EXISTS training_type;