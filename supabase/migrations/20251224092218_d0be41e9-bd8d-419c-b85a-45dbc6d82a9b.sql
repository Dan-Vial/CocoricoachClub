-- Create table for tracking player transfers between categories
CREATE TABLE public.player_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  from_category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  to_category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  notes TEXT,
  transferred_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_transfers ENABLE ROW LEVEL SECURITY;

-- Create policies for player_transfers
CREATE POLICY "Users can view transfers for their categories"
  ON public.player_transfers
  FOR SELECT
  USING (
    from_category_id IN (
      SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
    )
    OR to_category_id IN (
      SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
    )
    OR from_category_id IN (
      SELECT c.id FROM public.categories c
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
    OR to_category_id IN (
      SELECT c.id FROM public.categories c
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transfers for their categories"
  ON public.player_transfers
  FOR INSERT
  WITH CHECK (
    from_category_id IN (
      SELECT category_id FROM public.category_members WHERE user_id = auth.uid()
    )
    OR from_category_id IN (
      SELECT c.id FROM public.categories c
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

-- Add index for faster lookups
CREATE INDEX idx_player_transfers_player_id ON public.player_transfers(player_id);
CREATE INDEX idx_player_transfers_from_category ON public.player_transfers(from_category_id);
CREATE INDEX idx_player_transfers_to_category ON public.player_transfers(to_category_id);