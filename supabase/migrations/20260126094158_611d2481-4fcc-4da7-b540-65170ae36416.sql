-- Add notes column to wellness_tracking table for coaches to document reasons behind scores
ALTER TABLE public.wellness_tracking ADD COLUMN IF NOT EXISTS notes TEXT;