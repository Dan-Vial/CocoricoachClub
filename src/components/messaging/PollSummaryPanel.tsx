import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, HelpCircle, Bell } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PollSummaryPanelProps {
  conversationId: string;
  categoryId: string;
}

export function PollSummaryPanel({ conversationId, categoryId }: PollSummaryPanelProps) {
  const { user } = useAuth();

  // Get latest active poll (availability type)
  const { data: latestPoll } = useQuery({
    queryKey: ["latest-poll-summary", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .eq("conversation_id", conversationId)
        .in("poll_type", ["availability_match", "availability_training"])
        .eq("is_closed", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: pollOptions } = useQuery({
    queryKey: ["poll-summary-options", latestPoll?.id],
    queryFn: async () => {
      if (!latestPoll) return [];
      const { data, error } = await supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", latestPoll.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!latestPoll,
  });

  const { data: pollVotes } = useQuery({
    queryKey: ["poll-summary-votes", latestPoll?.id],
    queryFn: async () => {
      if (!latestPoll) return [];
      const { data, error } = await supabase
        .from("poll_votes")
        .select("*")
        .eq("poll_id", latestPoll.id);
      if (error) throw error;
      return data;
    },
    enabled: !!latestPoll,
    refetchInterval: 5000,
  });

  const { data: participants } = useQuery({
    queryKey: ["conversation-participants-summary", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId);
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["participant-profiles", conversationId],
    queryFn: async () => {
      if (!participants) return [];
      const ids = participants.map(p => p.user_id);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      if (error) throw error;
      return data;
    },
    enabled: !!participants && participants.length > 0,
  });

  if (!latestPoll || !pollOptions || !participants) return null;

  const voterIds = new Set(pollVotes?.map(v => v.user_id) || []);
  const allParticipantIds = participants.map(p => p.user_id);
  const nonVoters = allParticipantIds.filter(id => !voterIds.has(id) && id !== latestPoll.created_by);

  const getName = (userId: string) => profiles?.find(p => p.id === userId)?.full_name || "Inconnu";

  // Categorize by first option matching
  const availableOption = pollOptions.find(o => o.label.includes("Disponible") || o.label.includes("Présent"));
  const absentOption = pollOptions.find(o => o.label.includes("Absent"));
  const uncertainOption = pollOptions.find(o => o.label.includes("Incertain"));

  const getVotersForOption = (optionId?: string) => {
    if (!optionId || !pollVotes) return [];
    return pollVotes.filter(v => v.option_id === optionId).map(v => v.user_id);
  };

  const available = getVotersForOption(availableOption?.id);
  const absent = getVotersForOption(absentOption?.id);
  const uncertain = getVotersForOption(uncertainOption?.id);

  const handleRelaunch = async () => {
    if (!user || nonVoters.length === 0) return;
    try {
      await supabase.functions.invoke("send-targeted-notification", {
        body: {
          title: "📊 Sondage en attente",
          message: `Tu n'as pas encore répondu : "${latestPoll.question}"`,
          target_user_ids: nonVoters,
          channels: ["push"],
        },
      });
      toast.success(`Relance envoyée à ${nonVoters.length} joueur(s)`);
    } catch {
      toast.error("Erreur lors de la relance");
    }
  };

  return (
    <div className="rounded-lg border bg-card/50 p-3 space-y-2">
      <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
        Résumé — {latestPoll.question}
      </p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1 text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-bold text-lg">{available.length}</span>
          </div>
          <p className="text-muted-foreground">Disponibles</p>
          <div className="space-y-0.5">
            {available.map(id => (
              <p key={id} className="text-xs truncate">{getName(id)}</p>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1 text-destructive">
            <XCircle className="h-3.5 w-3.5" />
            <span className="font-bold text-lg">{absent.length}</span>
          </div>
          <p className="text-muted-foreground">Absents</p>
          <div className="space-y-0.5">
            {absent.map(id => (
              <p key={id} className="text-xs truncate">{getName(id)}</p>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1 text-yellow-600">
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="font-bold text-lg">{nonVoters.length}</span>
          </div>
          <p className="text-muted-foreground">Sans réponse</p>
          <ScrollArea className="max-h-[60px]">
            <div className="space-y-0.5">
              {nonVoters.map(id => (
                <p key={id} className="text-xs truncate text-muted-foreground">{getName(id)}</p>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
      {nonVoters.length > 0 && (
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleRelaunch}>
          <Bell className="h-3 w-3 mr-1" />
          Relancer {nonVoters.length} joueur(s) sans réponse
        </Button>
      )}
    </div>
  );
}
