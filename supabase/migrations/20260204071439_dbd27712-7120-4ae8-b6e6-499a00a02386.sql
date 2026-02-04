-- Add bodyweight_data column to program_exercises for storing additional weight data for bodyweight exercises
ALTER TABLE program_exercises 
ADD COLUMN IF NOT EXISTS bodyweight_data JSONB DEFAULT NULL;

-- Add comment to document the new column
COMMENT ON COLUMN program_exercises.bodyweight_data IS 'Stores bodyweight exercise specific data like additional_weight_kg';