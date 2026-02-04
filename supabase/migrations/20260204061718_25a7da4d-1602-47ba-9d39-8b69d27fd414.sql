-- Add additional information fields to players table
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS parent_contact_1_name TEXT,
ADD COLUMN IF NOT EXISTS parent_contact_1_phone TEXT,
ADD COLUMN IF NOT EXISTS parent_contact_1_email TEXT,
ADD COLUMN IF NOT EXISTS parent_contact_1_relation TEXT,
ADD COLUMN IF NOT EXISTS parent_contact_2_name TEXT,
ADD COLUMN IF NOT EXISTS parent_contact_2_phone TEXT,
ADD COLUMN IF NOT EXISTS parent_contact_2_email TEXT,
ADD COLUMN IF NOT EXISTS parent_contact_2_relation TEXT,
ADD COLUMN IF NOT EXISTS dietary_requirements TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS medical_notes TEXT,
ADD COLUMN IF NOT EXISTS emergency_notes TEXT;