-- Add rugby_type column to categories table
ALTER TABLE public.categories 
ADD COLUMN rugby_type text NOT NULL DEFAULT 'XV' CHECK (rugby_type IN ('XV', '7'));

-- Create tournaments table for Rugby 7s
CREATE TABLE public.tournaments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  location text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create tournament_matches table
CREATE TABLE public.tournament_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_date date NOT NULL,
  match_time time,
  opponent text NOT NULL,
  match_order integer NOT NULL DEFAULT 1,
  result text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create tournament_player_rotation table for tracking player usage
CREATE TABLE public.tournament_player_rotation (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_match_id uuid NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  minutes_played integer NOT NULL DEFAULT 0,
  is_starter boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_player_rotation ENABLE ROW LEVEL SECURITY;

-- RLS policies for tournaments
CREATE POLICY "Club owners can view tournaments"
  ON public.tournaments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN clubs ON clubs.id = categories.club_id
      WHERE categories.id = tournaments.category_id
        AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
    )
  );

CREATE POLICY "Club owners can insert tournaments"
  ON public.tournaments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories
      JOIN clubs ON clubs.id = categories.club_id
      WHERE categories.id = tournaments.category_id
        AND clubs.user_id = auth.uid()
    )
  );

CREATE POLICY "Club owners can update tournaments"
  ON public.tournaments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN clubs ON clubs.id = categories.club_id
      WHERE categories.id = tournaments.category_id
        AND clubs.user_id = auth.uid()
    )
  );

CREATE POLICY "Club owners can delete tournaments"
  ON public.tournaments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN clubs ON clubs.id = categories.club_id
      WHERE categories.id = tournaments.category_id
        AND clubs.user_id = auth.uid()
    )
  );

-- RLS policies for tournament_matches
CREATE POLICY "Club owners can view tournament matches"
  ON public.tournament_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      JOIN categories ON categories.id = tournaments.category_id
      JOIN clubs ON clubs.id = categories.club_id
      WHERE tournaments.id = tournament_matches.tournament_id
        AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
    )
  );

CREATE POLICY "Club owners can insert tournament matches"
  ON public.tournament_matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments
      JOIN categories ON categories.id = tournaments.category_id
      JOIN clubs ON clubs.id = categories.club_id
      WHERE tournaments.id = tournament_matches.tournament_id
        AND clubs.user_id = auth.uid()
    )
  );

CREATE POLICY "Club owners can update tournament matches"
  ON public.tournament_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      JOIN categories ON categories.id = tournaments.category_id
      JOIN clubs ON clubs.id = categories.club_id
      WHERE tournaments.id = tournament_matches.tournament_id
        AND clubs.user_id = auth.uid()
    )
  );

CREATE POLICY "Club owners can delete tournament matches"
  ON public.tournament_matches FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      JOIN categories ON categories.id = tournaments.category_id
      JOIN clubs ON clubs.id = categories.club_id
      WHERE tournaments.id = tournament_matches.tournament_id
        AND clubs.user_id = auth.uid()
    )
  );

-- RLS policies for tournament_player_rotation
CREATE POLICY "Club owners can view player rotation"
  ON public.tournament_player_rotation FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournament_matches
      JOIN tournaments ON tournaments.id = tournament_matches.tournament_id
      JOIN categories ON categories.id = tournaments.category_id
      JOIN clubs ON clubs.id = categories.club_id
      WHERE tournament_matches.id = tournament_player_rotation.tournament_match_id
        AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
    )
  );

CREATE POLICY "Club owners can insert player rotation"
  ON public.tournament_player_rotation FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournament_matches
      JOIN tournaments ON tournaments.id = tournament_matches.tournament_id
      JOIN categories ON categories.id = tournaments.category_id
      JOIN clubs ON clubs.id = categories.club_id
      WHERE tournament_matches.id = tournament_player_rotation.tournament_match_id
        AND clubs.user_id = auth.uid()
    )
  );

CREATE POLICY "Club owners can update player rotation"
  ON public.tournament_player_rotation FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournament_matches
      JOIN tournaments ON tournaments.id = tournament_matches.tournament_id
      JOIN categories ON categories.id = tournaments.category_id
      JOIN clubs ON clubs.id = categories.club_id
      WHERE tournament_matches.id = tournament_player_rotation.tournament_match_id
        AND clubs.user_id = auth.uid()
    )
  );

CREATE POLICY "Club owners can delete player rotation"
  ON public.tournament_player_rotation FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournament_matches
      JOIN tournaments ON tournaments.id = tournament_matches.tournament_id
      JOIN categories ON categories.id = tournaments.category_id
      JOIN clubs ON clubs.id = categories.club_id
      WHERE tournament_matches.id = tournament_player_rotation.tournament_match_id
        AND clubs.user_id = auth.uid()
    )
  );

-- Add trigger for tournaments updated_at
CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();