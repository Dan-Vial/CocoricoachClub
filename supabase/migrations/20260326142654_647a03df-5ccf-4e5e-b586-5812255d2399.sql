-- Junction table: player can belong to multiple categories
CREATE TABLE public.player_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(player_id, category_id)
);

-- Enable RLS
ALTER TABLE public.player_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff can view player_categories in their clubs"
ON public.player_categories FOR SELECT TO authenticated
USING (
  public.can_access_club(auth.uid(), club_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Staff can manage player_categories"
ON public.player_categories FOR INSERT TO authenticated
WITH CHECK (
  public.can_modify_club_data(auth.uid(), club_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Staff can update player_categories"
ON public.player_categories FOR UPDATE TO authenticated
USING (
  public.can_modify_club_data(auth.uid(), club_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Staff can delete player_categories"
ON public.player_categories FOR DELETE TO authenticated
USING (
  public.can_modify_club_data(auth.uid(), club_id)
  OR public.is_super_admin(auth.uid())
);

-- Athletes can view their own category memberships
CREATE POLICY "Athletes can view own player_categories"
ON public.player_categories FOR SELECT TO authenticated
USING (
  player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
);

-- Auto-populate from existing players data
INSERT INTO public.player_categories (player_id, category_id, club_id, is_primary)
SELECT 
  p.id,
  p.category_id,
  c.club_id,
  true
FROM public.players p
JOIN public.categories c ON c.id = p.category_id;

-- Trigger: auto-add to player_categories when a new player is created
CREATE OR REPLACE FUNCTION public.auto_add_player_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.player_categories (player_id, category_id, club_id, is_primary)
  SELECT NEW.id, NEW.category_id, c.club_id, true
  FROM public.categories c WHERE c.id = NEW.category_id
  ON CONFLICT (player_id, category_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_add_player_category
AFTER INSERT ON public.players
FOR EACH ROW EXECUTE FUNCTION public.auto_add_player_category();

-- Function to get all category IDs for a player (for use in athlete space)
CREATE OR REPLACE FUNCTION public.get_player_categories(_player_id uuid)
RETURNS TABLE(category_id uuid, category_name text, club_id uuid, club_name text, sport_type text, is_primary boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    pc.category_id,
    cat.name as category_name,
    pc.club_id,
    cl.name as club_name,
    cat.rugby_type as sport_type,
    pc.is_primary
  FROM public.player_categories pc
  JOIN public.categories cat ON cat.id = pc.category_id
  JOIN public.clubs cl ON cl.id = pc.club_id
  WHERE pc.player_id = _player_id
  ORDER BY pc.is_primary DESC, pc.joined_at;
$$;