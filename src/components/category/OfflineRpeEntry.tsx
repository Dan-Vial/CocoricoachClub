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
import { 
  Users, 
  Clock, 
  Activity, 
  WifiOff, 
  Wifi, 
  Loader2,
  CloudOff,
  Check 
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { queueOperation, getPendingCount } from "@/lib/offlineQueue";

interface OfflineRpeEntryProps {
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

export function OfflineRpeEntry({
  open,
  onOpenChange,
  categoryId,
}: OfflineRpeEntryProps) {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [defaultDuration, setDefaultDuration] = useState("90");
  const [entries, setEntries] = useState<Record<string, PlayerRpeEntry>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Load players - can use cached data when offline
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
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    enabled: open,
  });

  // Update pending count
  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };
    updateCount();
  }, [open]);

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

  // Save entries - works both online and offline
  const handleSave = async () => {
    const validEntries = Object.values(entries).filter(
      (e) => e.selected && e.rpe && parseInt(e.rpe) >= 0 && parseInt(e.rpe) <= 10
    );

    if (validEntries.length === 0) {
      toast.error("Aucune entrée valide à enregistrer");
      return;
    }

    setIsSaving(true);

    try {
      if (isOnline) {
        // Online mode - direct save with AWCR calculation
        const insertData = await Promise.all(
          validEntries.map(async (entry) => {
            const rpe = parseInt(entry.rpe);
            const duration = parseInt(entry.duration) || parseInt(defaultDuration);
            const trainingLoad = rpe * duration;

            // Calculate AWCR
            const sevenDaysAgo = new Date(sessionDate);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const twentyEightDaysAgo = new Date(sessionDate);
            twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

            const { data: recentSessions } = await supabase
              .from("awcr_tracking")
              .select("training_load")
              .eq("player_id", entry.playerId)
              .gte("session_date", sevenDaysAgo.toISOString().split("T")[0])
              .lt("session_date", sessionDate);

            const { data: chronicSessions } = await supabase
              .from("awcr_tracking")
              .select("training_load")
              .eq("player_id", entry.playerId)
              .gte("session_date", twentyEightDaysAgo.toISOString().split("T")[0])
              .lt("session_date", sessionDate);

            const acuteTotal = (recentSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0) + trainingLoad;
            const chronicTotal = chronicSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0;
            const acuteAvg = acuteTotal / 7;
            const chronicAvg = chronicTotal / 28;
            const awcr = chronicAvg > 0 ? acuteAvg / chronicAvg : 0;

            return {
              player_id: entry.playerId,
              category_id: categoryId,
              session_date: sessionDate,
              rpe: rpe,
              duration_minutes: duration,
              acute_load: acuteAvg,
              chronic_load: chronicAvg,
              awcr: awcr,
            };
          })
        );

        const { error } = await supabase.from("awcr_tracking").insert(insertData);
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["awcr_tracking"] });
        toast.success(`${insertData.length} entrées RPE enregistrées`);
      } else {
        // Offline mode - queue for later sync
        for (const entry of validEntries) {
          const rpe = parseInt(entry.rpe);
          const duration = parseInt(entry.duration) || parseInt(defaultDuration);
          const trainingLoad = rpe * duration;

          await queueOperation("awcr_tracking", "insert", {
            id: `offline-${Date.now()}-${entry.playerId}`,
            player_id: entry.playerId,
            category_id: categoryId,
            session_date: sessionDate,
            rpe: rpe,
            duration_minutes: duration,
            // AWCR will be calculated during sync
            acute_load: null,
            chronic_load: null,
            awcr: null,
          });
        }

        const newCount = await getPendingCount();
        setPendingCount(newCount);
        toast.success(
          `${validEntries.length} entrées sauvegardées localement`,
          {
            description: "Elles seront synchronisées dès que vous serez en ligne",
            icon: <CloudOff className="h-4 w-4" />,
          }
        );
      }

      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

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
            Saisie RPE Équipe
            {isOnline ? (
              <Badge variant="secondary" className="gap-1">
                <Wifi className="h-3 w-3" />
                En ligne
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="h-3 w-3" />
                Hors ligne
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Offline indicator */}
          {!isOnline && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
              <CloudOff className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-500">Mode hors-ligne actif</p>
                <p className="text-sm text-muted-foreground">
                  Les données seront sauvegardées localement et synchronisées automatiquement 
                  dès que vous serez reconnecté.
                </p>
                {pendingCount > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {pendingCount} opération(s) en attente de synchronisation
                  </p>
                )}
              </div>
            </div>
          )}

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
                  Appliquer
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
              {validCount}/{selectedCount} avec RPE valide
            </Badge>
          </div>

          {/* Players list */}
          {playersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : players && players.length > 0 ? (
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-2">
                {players.map((player) => {
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
                      <span className="w-36 font-medium truncate">{player.name}</span>
                      
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
                            {load}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aucun joueur dans cette catégorie
            </p>
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
            onClick={handleSave}
            disabled={validCount === 0 || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : !isOnline ? (
              <>
                <CloudOff className="h-4 w-4 mr-2" />
                Sauvegarder localement ({validCount})
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
