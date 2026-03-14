
-- 1) Message reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions in their conversations"
ON public.message_reactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add reactions"
ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their reactions"
ON public.message_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 2) Polls table
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  question text NOT NULL,
  poll_type text NOT NULL DEFAULT 'custom' CHECK (poll_type IN ('custom','availability_match','availability_training','carpooling','schedule')),
  allow_multiple boolean NOT NULL DEFAULT false,
  is_anonymous boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  is_closed boolean NOT NULL DEFAULT false,
  linked_event_id uuid,
  linked_event_type text CHECK (linked_event_type IN ('training_session','match',NULL)),
  category_id uuid REFERENCES public.categories(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view polls in their conversations"
ON public.polls FOR SELECT TO authenticated
USING (
  public.user_participates_in_conversation(auth.uid(), conversation_id)
);

CREATE POLICY "Users can create polls"
ON public.polls FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Poll creator can update"
ON public.polls FOR UPDATE TO authenticated
USING (created_by = auth.uid());

-- 3) Poll options table
CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view poll options"
ON public.poll_options FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_options.poll_id
    AND public.user_participates_in_conversation(auth.uid(), p.conversation_id)
  )
);

CREATE POLICY "Poll creator can manage options"
ON public.poll_options FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.polls p WHERE p.id = poll_options.poll_id AND p.created_by = auth.uid()
  )
);

-- 4) Poll votes table
CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  option_id uuid REFERENCES public.poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, option_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view votes"
ON public.poll_votes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_votes.poll_id
    AND public.user_participates_in_conversation(auth.uid(), p.conversation_id)
  )
);

CREATE POLICY "Users can vote"
ON public.poll_votes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their votes"
ON public.poll_votes FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 5) Add message_type column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','poll','action'));
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS poll_id uuid REFERENCES public.polls(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS action_data jsonb;

-- 6) Enable realtime for reactions and poll_votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
