import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Swords, Activity } from "lucide-react";

interface MatchRpeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  matchId: string;
  matchDate: string;
  opponent: string;
}

export function MatchRpeDialog({
  open,
  onOpenChange,
  categoryId,
  matchId,
  matchDate,
  opponent,
}: MatchRpeDialogProps) {
  const queryClient = useQueryClient();
  const [rpeValues, setRpeValues] = useState<Record<string, { rpe: string; duration: string }>>({});

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch match lineup to know who played
  const { data: lineup } = useQuery({
    queryKey: ["match-lineup", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_lineups")
        .select("player_id, minutes_played")
        .eq("match_id", matchId);
      if (error) throw error;
      return data;
    },
    enabled: open && !!matchId,
  });

  // Fetch existing RPE data for this match date
  const { data: existingRpe } = useQuery({
    queryKey: ["awcr_tracking_match", matchDate, categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("*")
        .eq("session_date", matchDate)
        .eq("category_id", categoryId)
        .is("training_session_id", null);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Calculate AWCR for a player
  const calculateAWCR = async (playerId: string, sessionDateStr: string, newLoad: number) => {
    const sevenDaysAgo = new Date(sessionDateStr);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const twentyEightDaysAgo = new Date(sessionDateStr);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    const { data: recentSessions } = await supabase
      .from("awcr_tracking")
      .select("training_load")
      .eq("player_id", playerId)
      .gte("session_date", sevenDaysAgo.toISOString().split("T")[0])
      .lt("session_date", sessionDateStr);

    const { data: chronicSessions } = await supabase
      .from("awcr_tracking")
      .select("training_load")
      .eq("player_id", playerId)
      .gte("session_date", twentyEightDaysAgo.toISOString().split("T")[0])
      .lt("session_date", sessionDateStr);

    const acuteTotal = (recentSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0) + newLoad;
    const chronicTotal = chronicSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0;

    const acuteAvg = acuteTotal / 7;
    const chronicAvg = chronicTotal / 28;

    const awcr = chronicAvg > 0 ? acuteAvg / chronicAvg : 0;

    return { acuteLoad: acuteAvg, chronicLoad: chronicAvg, awcr };
  };

  const saveRpe = useMutation({
    mutationFn: async () => {
      const playersToSave = players?.filter((p) => rpeValues[p.id]?.rpe && rpeValues[p.id]?.duration) || [];

      if (playersToSave.length === 0) {
        throw new Error("Aucun RPE à enregistrer");
      }

      for (const player of playersToSave) {
        const rpe = parseInt(rpeValues[player.id].rpe);
        const duration = parseInt(rpeValues[player.id].duration);
        const trainingLoad = rpe * duration;

        const { acuteLoad, chronicLoad, awcr } = await calculateAWCR(
          player.id,
          matchDate,
          trainingLoad
        );

        const { error } = await supabase.from("awcr_tracking").insert({
          player_id: player.id,
          category_id: categoryId,
          training_session_id: null, // No training session for match
          session_date: matchDate,
          rpe,
          duration_minutes: duration,
          acute_load: acuteLoad,
          chronic_load: chronicLoad,
          awcr: awcr,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["awcr_tracking"] });
      queryClient.invalidateQueries({ queryKey: ["awcr_tracking_match"] });
      queryClient.invalidateQueries({ queryKey: ["awcr-data"] });
      toast.success("RPE du match enregistrés avec calcul AWCR");
      setRpeValues({});
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  const handleChange = (playerId: string, field: "rpe" | "duration", value: string) => {
    setRpeValues((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value,
      },
    }));
  };

  const lineupPlayerIds = new Set(lineup?.map((l) => l.player_id) || []);
  const lineupMinutes = new Map(lineup?.map((l) => [l.player_id, l.minutes_played]) || []);

  // Pre-fill duration from lineup minutes
  const getDefaultDuration = (playerId: string) => {
    const minutes = lineupMinutes.get(playerId);
    return minutes?.toString() || "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-rose-500" />
            RPE Match vs {opponent}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline">
            {format(new Date(matchDate), "EEEE d MMMM yyyy", { locale: fr })}
          </Badge>
          {lineup && lineup.length > 0 && (
            <Badge variant="secondary">{lineup.length} joueur(s) dans la compo</Badge>
          )}
        </div>

        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="space-y-2 pr-4">
            <p className="text-sm text-muted-foreground mb-4">
              Saisissez le RPE (0-10) et la durée de jeu (minutes) pour calculer automatiquement l'AWCR.
            </p>
            {players?.map((player) => {
              const existing = existingRpe?.find((r) => r.player_id === player.id);
              const wasInLineup = lineupPlayerIds.has(player.id);
              const defaultMinutes = getDefaultDuration(player.id);

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    wasInLineup ? "bg-rose-500/10 border border-rose-500/20" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2 w-40">
                    <Label className="font-medium truncate">{player.name}</Label>
                    {wasInLineup && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {defaultMinutes ? `${defaultMinutes}'` : "Compo"}
                      </Badge>
                    )}
                  </div>
                  {existing ? (
                    <span className="text-sm text-muted-foreground">
                      ✓ RPE {existing.rpe} - {existing.duration_minutes}min
                      <span className="text-xs ml-1">(AWCR: {existing.awcr?.toFixed(2)})</span>
                    </span>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">RPE</Label>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          placeholder="0-10"
                          className="w-16 h-8"
                          value={rpeValues[player.id]?.rpe || ""}
                          onChange={(e) => handleChange(player.id, "rpe", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">Min</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder={defaultMinutes || "Min"}
                          className="w-16 h-8"
                          value={rpeValues[player.id]?.duration || defaultMinutes || ""}
                          onChange={(e) => handleChange(player.id, "duration", e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button
            onClick={() => saveRpe.mutate()}
            disabled={saveRpe.isPending || Object.keys(rpeValues).length === 0}
          >
            <Activity className="h-4 w-4 mr-1" />
            Enregistrer les RPE
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
