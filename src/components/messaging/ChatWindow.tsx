import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { markConversationAsRead } from "@/hooks/useUnreadMessages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Send, Users, MessageCircle, Bell, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_announcement: boolean;
  is_urgent: boolean;
  read_by: string[];
  created_at: string;
}

interface ChatWindowProps {
  conversationId: string;
  categoryId: string;
}

export function ChatWindow({ conversationId, categoryId }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    refetchInterval: 5000, // Poll every 5 seconds as fallback
  });

  const { data: participants } = useQuery({
    queryKey: ["conversation-participants", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId);
      if (error) throw error;
      return data;
    },
  });

  // Subscribe to realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Mark conversation as read when opened and when new messages arrive
  useEffect(() => {
    if (user && conversationId) {
      markConversationAsRead(conversationId, user.id);
      queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
    }
  }, [conversationId, user, messages?.length, queryClient]);
  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!newMessage.trim() || !user) return;
      
      const messageContent = newMessage.trim();
      
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent,
        is_announcement: isAnnouncement,
        read_by: [user.id],
      });
      if (error) throw error;

      // Send push notification to other participants (fire & forget)
      try {
        const otherParticipants = participants?.filter(p => p.user_id !== user.id) || [];
        if (otherParticipants.length > 0) {
          const target_user_ids = otherParticipants.map(p => p.user_id);
          await supabase.functions.invoke("send-targeted-notification", {
            body: {
              title: isAnnouncement ? "📢 Nouvelle annonce" : "💬 Nouveau message",
              message: messageContent.length > 100 ? messageContent.substring(0, 100) + "..." : messageContent,
              target_user_ids,
              channels: ["push"],
              data: { conversationId, type: "chat_message" },
            },
          });
        }
      } catch (e) {
        console.warn("[ChatWindow] Push notification failed:", e);
      }
    },
    onSuccess: () => {
      setNewMessage("");
      setIsAnnouncement(false);
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi");
    },
  });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage.mutate();
    }
  };

  const isOwnMessage = (senderId: string) => senderId === user?.id;

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat d'équipe
          </CardTitle>
          <Badge variant="outline">
            <Users className="h-3 w-3 mr-1" />
            {participants?.length || 0} membres
          </Badge>
        </div>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages?.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2",
                isOwnMessage(message.sender_id) ? "flex-row-reverse" : "flex-row"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {message.sender_id.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "max-w-[70%] rounded-lg p-3",
                  isOwnMessage(message.sender_id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted",
                  message.is_announcement && "border-2 border-yellow-500"
                )}
              >
                {message.is_announcement && (
                  <div className="flex items-center gap-1 text-xs mb-1 opacity-80">
                    <Bell className="h-3 w-3" />
                    Annonce
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-xs opacity-70">
                    {format(new Date(message.created_at), "HH:mm", { locale: fr })}
                  </span>
                  {isOwnMessage(message.sender_id) && (
                    message.read_by.length > 1 ? (
                      <CheckCheck className="h-3 w-3" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button
            variant={isAnnouncement ? "default" : "outline"}
            size="icon"
            onClick={() => setIsAnnouncement(!isAnnouncement)}
            title="Envoyer comme annonce"
          >
            <Bell className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Écrire un message..."
            className="flex-1"
          />
          <Button 
            onClick={() => sendMessage.mutate()} 
            disabled={!newMessage.trim() || sendMessage.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
