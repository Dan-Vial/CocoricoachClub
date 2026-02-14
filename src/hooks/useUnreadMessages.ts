import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

interface UnreadCounts {
  total: number;
  byConversation: Record<string, number>;
}

export function useUnreadMessages(categoryId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unreadCounts = { total: 0, byConversation: {} } } = useQuery<UnreadCounts>({
    queryKey: ["unread-messages", categoryId, user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, byConversation: {} };

      // Get conversations for this category where user is a participant
      const { data: participations, error: partError } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at, conversations!inner(id, category_id)")
        .eq("user_id", user.id)
        .eq("conversations.category_id", categoryId);

      if (partError) throw partError;
      if (!participations || participations.length === 0) return { total: 0, byConversation: {} };

      const byConversation: Record<string, number> = {};
      let total = 0;

      for (const participation of participations) {
        const convId = participation.conversation_id;
        const lastRead = participation.last_read_at;

        // Count messages in this conversation that are newer than last_read_at
        // and not sent by the current user
        let query = supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", convId)
          .neq("sender_id", user.id);

        if (lastRead) {
          query = query.gt("created_at", lastRead);
        }

        const { count, error } = await query;
        if (error) continue;

        const unread = count || 0;
        if (unread > 0) {
          byConversation[convId] = unread;
          total += unread;
        }
      }

      return { total, byConversation };
    },
    enabled: !!user && !!categoryId,
    refetchInterval: 15000, // Poll every 15 seconds
  });

  // Subscribe to realtime message inserts to invalidate
  useEffect(() => {
    if (!user || !categoryId) return;

    const channel = supabase
      .channel(`unread-messages-${categoryId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-messages", categoryId, user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, categoryId, queryClient]);

  return unreadCounts;
}

export async function markConversationAsRead(conversationId: string, userId: string) {
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}
