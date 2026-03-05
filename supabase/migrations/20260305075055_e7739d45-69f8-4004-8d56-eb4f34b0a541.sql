
-- Allow conversation creators and admins to delete conversations
CREATE POLICY "Users can delete their conversations"
ON public.conversations FOR DELETE
USING (
  created_by = auth.uid()
  OR public.is_super_admin(auth.uid())
);

-- Allow deleting messages in conversations user participates in (for cascade delete)
CREATE POLICY "Users can delete messages in their conversations"
ON public.messages FOR DELETE
USING (
  sender_id = auth.uid()
  OR public.user_is_conversation_admin(auth.uid(), conversation_id)
);

-- Allow deleting participants when user is admin of conversation
CREATE POLICY "Admins can delete participants"
ON public.conversation_participants FOR DELETE
USING (
  user_id = auth.uid()
  OR public.user_is_conversation_admin(auth.uid(), conversation_id)
);
