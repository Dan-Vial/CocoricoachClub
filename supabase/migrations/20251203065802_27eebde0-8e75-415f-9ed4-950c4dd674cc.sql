-- Add play sequence statistics to matches table
ALTER TABLE public.matches
ADD COLUMN longest_play_sequence integer DEFAULT NULL,
ADD COLUMN average_play_sequence numeric DEFAULT NULL;