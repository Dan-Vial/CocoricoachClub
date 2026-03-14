import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart3, Clock, Lock, CheckCircle2, ChevronDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PollMessageProps {
  pollId: string;
  isOwnMessage: boolean;
}

export function PollMessage({ pollId, isOwnMessage }: PollMessageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());

  const { data: poll } = useQuery({
    queryKey: ["poll", pollId],
    queryFn: async () => {
      const { data, error } = await supabase.from("polls").select("*").eq("id", pollId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: options } = useQuery({
    queryKey: ["poll-options", pollId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", pollId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: votes } = useQuery({
    queryKey: ["poll-votes", pollId],
    queryFn: async () => {
      const { data, error } = await supabase.from("poll_votes").select("*").eq("poll_id", pollId);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  // Fetch profiles for all voters
  const voterIds = [...new Set(votes?.map(v => v.user_id) || [])];
  const { data: voterProfiles } = useQuery({
    queryKey: ["poll-voter-profiles", pollId, voterIds.join(",")],
    queryFn: async () => {
      if (voterIds.length === 0) return {};
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", voterIds);
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.id] = p.full_name || "Inconnu"; });
      return map;
    },
    enabled: voterIds.length > 0,
  });

  const castVote = useMutation({
    mutationFn: async (optionId: string) => {
      if (!user || !poll) return;
      
      if (!poll.allow_multiple) {
        const existingVotes = votes?.filter(v => v.user_id === user.id) || [];
        for (const v of existingVotes) {
          await supabase.from("poll_votes").delete().eq("id", v.id);
        }
      }

      const alreadyVoted = votes?.find(v => v.user_id === user.id && v.option_id === optionId);
      if (alreadyVoted) {
        await supabase.from("poll_votes").delete().eq("id", alreadyVoted.id);
      } else {
        await supabase.from("poll_votes").insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: user.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poll-votes", pollId] });
    },
  });

  const closePoll = useMutation({
    mutationFn: async () => {
      await supabase.from("polls").update({ is_closed: true }).eq("id", pollId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poll", pollId] });
    },
  });

  if (!poll || !options) return null;

  const totalVotes = votes?.length || 0;
  const uniqueVoters = new Set(votes?.map(v => v.user_id)).size;
  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const isClosed = poll.is_closed || isExpired;
  const myVoteOptionIds = new Set(votes?.filter(v => v.user_id === user?.id).map(v => v.option_id));
  const hasVoted = myVoteOptionIds.size > 0;

  const toggleExpand = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedOptions(prev => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  };

  const getVoterNames = (optionId: string): string[] => {
    if (!votes || !voterProfiles) return [];
    return votes
      .filter(v => v.option_id === optionId)
      .map(v => voterProfiles[v.user_id] || "Inconnu");
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3 min-w-[240px] max-w-full">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">
          {uniqueVoters} vote{uniqueVoters !== 1 ? "s" : ""}
        </Badge>
        {poll.allow_multiple && (
          <Badge variant="secondary" className="text-xs">Multiple</Badge>
        )}
        {isClosed && (
          <Badge variant="destructive" className="text-xs">
            <Lock className="h-3 w-3 mr-0.5" /> Fermé
          </Badge>
        )}
        {poll.expires_at && !isClosed && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {format(new Date(poll.expires_at), "dd/MM HH:mm", { locale: fr })}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {options.map((opt) => {
          const optVotesList = votes?.filter(v => v.option_id === opt.id) || [];
          const optVotes = optVotesList.length;
          const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
          const isSelected = myVoteOptionIds.has(opt.id);
          const isExpanded = expandedOptions.has(opt.id);
          const voterNames = getVoterNames(opt.id);

          return (
            <div key={opt.id} className="space-y-0.5">
              <button
                onClick={() => !isClosed && castVote.mutate(opt.id)}
                disabled={isClosed || castVote.isPending}
                className={cn(
                  "w-full relative rounded-md border p-2 text-left transition-all text-sm",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                  isClosed && "cursor-default opacity-80"
                )}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-1.5">
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    <span className={cn(isSelected && "font-medium")}>{opt.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium">
                      {optVotes} ({pct}%)
                    </span>
                    {optVotes > 0 && (
                      <button
                        onClick={(e) => toggleExpand(opt.id, e)}
                        className="p-0.5 rounded hover:bg-muted/80 transition-colors"
                        title="Voir les votants"
                      >
                        <ChevronDown className={cn(
                          "h-3 w-3 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180"
                        )} />
                      </button>
                    )}
                  </div>
                </div>
                {(hasVoted || isClosed) && (
                  <div className="mt-1">
                    <Progress value={pct} className="h-1.5" />
                  </div>
                )}
              </button>
              {isExpanded && voterNames.length > 0 && (
                <div className="ml-2 pl-2 border-l-2 border-muted py-1 space-y-0.5">
                  {voterNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3 w-3 shrink-0" />
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isOwnMessage && !isClosed && (
        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => closePoll.mutate()}>
          <Lock className="h-3 w-3 mr-1" /> Fermer le sondage
        </Button>
      )}
    </div>
  );
}
