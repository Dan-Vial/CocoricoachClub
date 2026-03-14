import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";

const SPORT_EMOJIS = [
  { emoji: "👍", label: "OK" },
  { emoji: "✅", label: "Confirmé" },
  { emoji: "🔥", label: "Motivation" },
  { emoji: "💪", label: "Effort" },
  { emoji: "👏", label: "Bravo" },
  { emoji: "⚠️", label: "Important" },
  { emoji: "😂", label: "Humour" },
];

interface MessageReactionsProps {
  messageId: string;
  isOwnMessage: boolean;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  hasReacted: boolean;
  userIds: string[];
}

export function MessageReactions({ messageId, isOwnMessage }: MessageReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reactions } = useQuery({
    queryKey: ["message-reactions", messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_reactions")
        .select("*")
        .eq("message_id", messageId);
      if (error) throw error;
      return data;
    },
  });

  const grouped: ReactionGroup[] = (() => {
    if (!reactions || reactions.length === 0) return [];
    const map = new Map<string, { count: number; hasReacted: boolean; userIds: string[] }>();
    for (const r of reactions) {
      const existing = map.get(r.emoji);
      if (existing) {
        existing.count++;
        existing.userIds.push(r.user_id);
        if (r.user_id === user?.id) existing.hasReacted = true;
      } else {
        map.set(r.emoji, {
          count: 1,
          hasReacted: r.user_id === user?.id,
          userIds: [r.user_id],
        });
      }
    }
    return Array.from(map.entries()).map(([emoji, data]) => ({ emoji, ...data }));
  })();

  const toggleReaction = useMutation({
    mutationFn: async (emoji: string) => {
      if (!user) return;
      const existing = reactions?.find(r => r.emoji === emoji && r.user_id === user.id);
      if (existing) {
        await supabase.from("message_reactions").delete().eq("id", existing.id);
      } else {
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-reactions", messageId] });
      setPickerOpen(false);
    },
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-1 mt-1", isOwnMessage ? "justify-end" : "justify-start")}>
      {grouped.map((g) => (
        <button
          key={g.emoji}
          onClick={() => toggleReaction.mutate(g.emoji)}
          className={cn(
            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
            g.hasReacted
              ? "bg-primary/20 border-primary/40 text-primary"
              : "bg-muted/50 border-border hover:bg-muted"
          )}
        >
          <span>{g.emoji}</span>
          <span className="font-medium">{g.count}</span>
        </button>
      ))}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button className="inline-flex items-center justify-center h-6 w-6 rounded-full hover:bg-muted/60 transition-colors opacity-0 group-hover:opacity-100">
            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side={isOwnMessage ? "left" : "right"}>
          <div className="flex gap-1">
            {SPORT_EMOJIS.map((e) => (
              <button
                key={e.emoji}
                onClick={() => toggleReaction.mutate(e.emoji)}
                className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-muted"
                title={e.label}
              >
                {e.emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
