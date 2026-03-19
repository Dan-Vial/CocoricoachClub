
ALTER TABLE public.training_sessions 
ADD COLUMN created_by_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL DEFAULT NULL;

COMMENT ON COLUMN public.training_sessions.created_by_player_id IS 'If set, indicates this session was self-created by an athlete';
