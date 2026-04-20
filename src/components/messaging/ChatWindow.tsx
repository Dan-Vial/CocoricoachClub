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
import { Send, Users, MessageCircle, Bell, Check, CheckCheck, BarChart3, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MessageReactions } from "./MessageReactions";
import { PollMessage } from "./PollMessage";
import { CreatePollDialog } from "./CreatePollDialog";
import { PollSummaryPanel } from "./PollSummaryPanel";
import { getOrderedDistinctResolvedNames, resolveUserDisplayNames } from "./userDisplayNames";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_announcement: boolean;
  is_urgent: boolean;
  read_by: string[];
  created_at: string;
  message_type: string;
  poll_id: string | null;
  action_data: any;
}

interface ChatWindowProps {
  conversationId: string;
  categoryId: string;
}

export function ChatWindow({ conversationId, categoryId }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
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
    refetchInterval: 5000,
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

  // Fetch participant profile names for header display
  const { data: participantNames } = useQuery({
    queryKey: ["conversation-participant-names", conversationId, user?.id],
    queryFn: async () => {
      if (!participants || participants.length === 0) return [];
      const userIds = participants.map(p => p.user_id);
      const nameMap = await resolveUserDisplayNames({ userIds, currentUser: user });
      return getOrderedDistinctResolvedNames(userIds, nameMap);
    },
    enabled: !!participants && participants.length > 0,
  });

  const { data: senderProfiles } = useQuery({
    queryKey: ["sender-profiles", conversationId, user?.id],
    queryFn: async () => {
      if (!messages) return {};
      const uniqueIds = [...new Set(messages.map(m => m.sender_id))];
      if (uniqueIds.length === 0) return {};
      return resolveUserDisplayNames({ userIds: uniqueIds, currentUser: user });
    },
    enabled: !!messages && messages.length > 0,
  });

  // Subscribe to realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "message_reactions",
      }, () => {
        // Invalidate all reaction queries for this conversation's messages
        messages?.forEach(m => {
          queryClient.invalidateQueries({ queryKey: ["message-reactions", m.id] });
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient, messages]);

  // Mark conversation as read
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
        message_type: "text",
      });
      if (error) throw error;

      // Push notification (fire & forget)
      try {
        const otherParticipants = participants?.filter(p => p.user_id !== user.id) || [];
        if (otherParticipants.length > 0) {
          await supabase.functions.invoke("send-targeted-notification", {
            body: {
              title: isAnnouncement ? "📢 Nouvelle annonce" : "💬 Nouveau message",
              message: messageContent.length > 100 ? messageContent.substring(0, 100) + "..." : messageContent,
              target_user_ids: otherParticipants.map(p => p.user_id),
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
    onError: () => { toast.error("Erreur lors de l'envoi"); },
  });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage.mutate();
    }
  };

  const isOwnMessage = (senderId: string) => senderId === user?.id;
  const getSenderName = (senderId: string) => senderProfiles?.[senderId] || senderId.substring(0, 2).toUpperCase();
  const getSenderInitials = (senderId: string) => {
    const name = senderProfiles?.[senderId];
    if (name) {
      const parts = name.split(" ");
      return parts.map(p => p[0]).join("").substring(0, 2).toUpperCase();
    }
    return senderId.substring(0, 2).toUpperCase();
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat d'équipe
            </CardTitle>
            {participantNames && participantNames.length > 0 && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {participantNames.join(", ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <Users className="h-3 w-3 mr-1" />
              {participants?.length || 0}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSummary(!showSummary)}
              className="text-xs"
            >
              {showSummary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Résumé
            </Button>
          </div>
        </div>
        {showSummary && (
          <div className="mt-2">
            <PollSummaryPanel conversationId={conversationId} categoryId={categoryId} />
          </div>
        )}
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages?.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2 group",
                isOwnMessage(message.sender_id) ? "flex-row-reverse" : "flex-row"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs">
                  {getSenderInitials(message.sender_id)}
                </AvatarFallback>
              </Avatar>
              <div className={cn("max-w-[75%]", isOwnMessage(message.sender_id) ? "items-end" : "items-start")}>
                {!isOwnMessage(message.sender_id) && (
                  <p className="text-xs text-muted-foreground mb-0.5 px-1">
                    {getSenderName(message.sender_id)}
                  </p>
                )}
                <div
                  className={cn(
                    "rounded-lg p-3",
                    isOwnMessage(message.sender_id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                    message.is_announcement && "border-2 border-yellow-500",
                    message.message_type === "poll" && "bg-transparent p-0 text-foreground"
                  )}
                >
                  {message.is_announcement && message.message_type !== "poll" && (
                    <div className="flex items-center gap-1 text-xs mb-1 opacity-80">
                      <Bell className="h-3 w-3" />
                      Annonce
                    </div>
                  )}
                  
                  {message.message_type === "poll" ? (
                    <>
                      <p className="text-sm font-medium whitespace-pre-wrap mb-2">{message.content}</p>
                      {message.poll_id && (
                        <PollMessage pollId={message.poll_id} isOwnMessage={isOwnMessage(message.sender_id)} />
                      )}
                    </>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  
                  {message.message_type !== "poll" && (
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
                  )}
                </div>
                <MessageReactions messageId={message.id} isOwnMessage={isOwnMessage(message.sender_id)} />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Button
            variant={isAnnouncement ? "default" : "outline"}
            size="icon"
            onClick={() => setIsAnnouncement(!isAnnouncement)}
            title="Envoyer comme annonce"
            className="shrink-0"
          >
            <Bell className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPollDialogOpen(true)}
            title="Créer un sondage"
            className="shrink-0"
          >
            <BarChart3 className="h-4 w-4" />
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
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CreatePollDialog
        open={pollDialogOpen}
        onOpenChange={setPollDialogOpen}
        conversationId={conversationId}
        categoryId={categoryId}
      />
    </Card>
  );
}
