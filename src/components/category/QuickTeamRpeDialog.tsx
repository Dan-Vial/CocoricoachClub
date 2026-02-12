import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users, Clock, Activity, AlertTriangle, Check, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QuickTeamRpeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

interface PlayerRpeEntry {
  playerId: string;
  playerName: string;
  rpe: string;
  duration: string;
  selected: boolean;
}

export function QuickTeamRpeDialog({
  open,
  onOpenChange,
  categoryId,
}: QuickTeamRpeDialogProps) {
  const queryClient = useQueryClient();
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [defaultDuration, setDefaultDuration] = useState("90");
  const [entries, setEntries] = useState<Record<string, PlayerRpeEntry>>({});

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Initialize entries when players load
  useEffect(() => {
    if (players && open) {
      const initialEntries: Record<string, PlayerRpeEntry> = {};
      players.forEach((player) => {
        initialEntries[player.id] = {
          playerId: player.id,
          playerName: player.name,
          rpe: "",
          duration: defaultDuration,
          selected: true,
        };
      });
      setEntries(initialEntries);
    }
  }, [players, open, defaultDuration]);

  // Calculate AWCR helper function
  const calculateAWCR = async (playerId: string, sessionDate: string, newLoad: number) => {
    const sevenDaysAgo = new Date(sessionDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const twentyEightDaysAgo = new Date(sessionDate);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    const { data: recentSessions } = await supabase
      .from("awcr_tracking")
      .select("training_load")
      .eq("player_id", playerId)
      .gte("session_date", sevenDaysAgo.toISOString().split("T")[0])
      .lt("session_date", sessionDate);

    const { data: chronicSessions } = await supabase
      .from("awcr_tracking")
      .select("training_load")
      .eq("player_id", playerId)
      .gte("session_date", twentyEightDaysAgo.toISOString().split("T")[0])
      .lt("session_date", sessionDate);

    const acuteTotal = (recentSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0) + newLoad;
    const chronicTotal = (chronicSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0);

    const acuteAvg = acuteTotal / 7;
    const chronicAvg = chronicTotal / 28;

    const awcr = chronicAvg > 0 ? acuteAvg / chronicAvg : 0;

    return { acuteLoad: acuteAvg, chronicLoad: chronicAvg, awcr };
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validEntries = Object.values(entries).filter(
        (e) => e.selected && e.rpe && parseInt(e.rpe) >= 0 && parseInt(e.rpe) <= 10
      );

      if (validEntries.length === 0) {
        throw new Error("Aucune entrée valide à enregistrer");
      }

      const insertData = await Promise.all(
        validEntries.map(async (entry) => {
          const rpe = parseInt(entry.rpe);
          const duration = parseInt(entry.duration) || parseInt(defaultDuration);
          const trainingLoad = rpe * duration;

          const { acuteLoad, chronicLoad, awcr } = await calculateAWCR(
            entry.playerId,
            sessionDate,
            trainingLoad
          );

          return {
            player_id: entry.playerId,
            category_id: categoryId,
            session_date: sessionDate,
            rpe: rpe,
            duration_minutes: duration,
            acute_load: acuteLoad,
            chronic_load: chronicLoad,
            awcr: awcr,
          };
        })
      );

      const { error } = await supabase.from("awcr_tracking").insert(insertData);
      if (error) throw error;

      // Trigger AWCR alerts check
      try {
        await supabase.functions.invoke("check-awcr-alerts");
      } catch (e) {
        console.log("Could not trigger AWCR alerts check:", e);
      }

      return insertData.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["awcr_tracking"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(`${count} entrées RPE enregistrées avec succès`);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  const handleEntryChange = (playerId: string, field: keyof PlayerRpeEntry, value: string | boolean) => {
    setEntries((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value,
      },
    }));
  };

  const applyDefaultDuration = () => {
    setEntries((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], duration: defaultDuration };
      });
      return updated;
    });
  };

  const selectAll = (selected: boolean) => {
    setEntries((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], selected };
      });
      return updated;
    });
  };

  const selectedCount = Object.values(entries).filter((e) => e.selected).length;
  const validCount = Object.values(entries).filter(
    (e) => e.selected && e.rpe && parseInt(e.rpe) >= 0 && parseInt(e.rpe) <= 10
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Saisie RPE groupée - Équipe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Global settings */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="session-date">Date de la séance</Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-duration">Durée par défaut (min)</Label>
              <div className="flex gap-2">
                <Input
                  id="default-duration"
                  type="number"
                  min="1"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyDefaultDuration}
                >
                  Appliquer à tous
                </Button>
              </div>
            </div>
          </div>

          {/* Selection controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => selectAll(true)}>
                <Check className="h-4 w-4 mr-1" />
                Tous
              </Button>
              <Button variant="outline" size="sm" onClick={() => selectAll(false)}>
                Aucun
              </Button>
            </div>
            <Badge variant="secondary">
              {validCount}/{selectedCount} joueurs avec RPE valide
            </Badge>
          </div>

          {/* Players list */}
          {playersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {players?.map((player) => {
                  const entry = entries[player.id];
                  if (!entry) return null;

                  const rpeValue = entry.rpe ? parseInt(entry.rpe) : null;
                  const isValidRpe = rpeValue !== null && rpeValue >= 0 && rpeValue <= 10;
                  const load = isValidRpe && entry.duration
                    ? rpeValue * parseInt(entry.duration)
                    : null;

                  return (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        entry.selected ? "bg-background" : "bg-muted/30 opacity-60"
                      }`}
                    >
                      <Checkbox
                        checked={entry.selected}
                        onCheckedChange={(checked) =>
                          handleEntryChange(player.id, "selected", !!checked)
                        }
                      />
                      <span className="w-40 font-medium truncate">{player.name}</span>
                      
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center gap-1">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            placeholder="RPE"
                            className="w-16 h-8"
                            value={entry.rpe}
                            onChange={(e) =>
                              handleEntryChange(player.id, "rpe", e.target.value)
                            }
                            disabled={!entry.selected}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            min="1"
                            placeholder="min"
                            className="w-20 h-8"
                            value={entry.duration}
                            onChange={(e) =>
                              handleEntryChange(player.id, "duration", e.target.value)
                            }
                            disabled={!entry.selected}
                          />
                        </div>
                        {load !== null && (
                          <Badge variant="outline" className="ml-auto">
                            Charge: {load}
                          </Badge>
                        )}
                        {rpeValue !== null && (rpeValue < 0 || rpeValue > 10) && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* RPE scale reference */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Échelle RPE:</strong> 0 = Repos | 3 = Léger | 5 = Modéré | 7 = Difficile | 10 = Maximal
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={validCount === 0 || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              `Enregistrer ${validCount} entrée${validCount > 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
