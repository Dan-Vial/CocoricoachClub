-- Add competition column to matches table
ALTER TABLE public.matches 
ADD COLUMN competition text;