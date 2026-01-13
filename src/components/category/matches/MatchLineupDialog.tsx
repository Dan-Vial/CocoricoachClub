import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, UserCheck, LayoutGrid, List } from "lucide-react";
import { RugbyFieldLineup } from "@/components/matches/RugbyFieldLineup";

interface MatchLineupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  categoryId: string;
}

interface LineupPlayer {
  playerId: string;
  playerName: string;
  isStarter: boolean;
  position: string;
  minutesPlayed: number;
  isSelected: boolean;
}

export function MatchLineupDialog({
  open,
  onOpenChange,
  matchId,
  categoryId,
}: MatchLineupDialogProps) {
  const [lineupData, setLineupData] = useState<LineupPlayer[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "field">("field");
  const queryClient = useQueryClient();

  const { data: category } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: existingLineup } = useQuery({
    queryKey: ["match_lineup", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_lineups")
        .select("*")
        .eq("match_id", matchId);
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  useEffect(() => {
    if (players && players.length > 0) {
      const lineup = players.map((player) => {
        const existing = existingLineup?.find((l) => l.player_id === player.id);
        return {
          playerId: player.id,
          playerName: player.name || "Joueur inconnu",
          isStarter: existing?.is_starter ?? false,
          position: existing?.position ?? "",
          minutesPlayed: existing?.minutes_played ?? 0,
          isSelected: !!existing,
        };
      });
      setLineupData(lineup);
    }
  }, [players, existingLineup]);

  const saveLineup = useMutation({
    mutationFn: async () => {
      // Delete existing lineup
      await supabase.from("match_lineups").delete().eq("match_id", matchId);

      // Insert new lineup
      const selectedPlayers = lineupData.filter((p) => p.isSelected);
      if (selectedPlayers.length > 0) {
        const { error } = await supabase.from("match_lineups").insert(
          selectedPlayers.map((p) => ({
            match_id: matchId,
            player_id: p.playerId,
            is_starter: p.isStarter,
            position: p.position || null,
            minutes_played: p.minutesPlayed,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match_lineup", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches", categoryId] });
      toast.success("Composition enregistrée");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  const updatePlayer = (playerId: string, updates: Partial<LineupPlayer>) => {
    setLineupData((prev) =>
      prev.map((p) => (p.playerId === playerId ? { ...p, ...updates } : p))
    );
  };

  const handleFieldLineupChange = (fieldLineup: Record<string, string>) => {
    // Update lineup from field visualization
    setLineupData(prev => prev.map(p => {
      const positionNumber = Object.entries(fieldLineup).find(([_, playerId]) => playerId === p.playerId)?.[0];
      if (positionNumber) {
        return { ...p, isSelected: true, isStarter: true, position: positionNumber };
      }
      // Keep players that were selected but not on field as subs
      return p;
    }));
  };

  const selectedCount = lineupData?.filter((p) => p.isSelected).length ?? 0;
  const starterCount = lineupData?.filter((p) => p.isSelected && p.isStarter).length ?? 0;
  const rugbyType = category?.rugby_type === "7" ? "7s" : "xv";

  // Convert lineup data to field format
  const fieldLineup = lineupData
    .filter(p => p.isSelected && p.isStarter && p.position)
    .reduce((acc, p) => {
      acc[p.position] = p.playerId;
      return acc;
    }, {} as Record<string, string>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Composition de l'équipe
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "field")}>
              <TabsList className="h-8">
                <TabsTrigger value="field" className="px-2 h-7">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list" className="px-2 h-7">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 text-sm text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <UserCheck className="h-4 w-4" />
            {selectedCount} joueurs sélectionnés
          </span>
          <span>{starterCount} titulaires</span>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="pr-4">
            {viewMode === "field" ? (
              <RugbyFieldLineup
                players={players || []}
                rugbyType={rugbyType}
                initialLineup={fieldLineup}
                onLineupChange={handleFieldLineupChange}
              />
            ) : (
              <div className="space-y-3">
                {lineupData && lineupData.length > 0 ? lineupData.map((player) => (
                  <div
                    key={player.playerId}
                    className={`p-3 rounded-lg border transition-colors ${
                      player.isSelected
                        ? "bg-primary/5 border-primary/20"
                        : "bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={player.isSelected}
                          onCheckedChange={(checked) =>
                            updatePlayer(player.playerId, {
                              isSelected: checked,
                              isStarter: checked ? player.isStarter : false,
                            })
                          }
                        />
                        <span className="font-medium">{player.playerName}</span>
                      </div>
                      {player.isSelected && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Titulaire</Label>
                          <Switch
                            checked={player.isStarter}
                            onCheckedChange={(checked) =>
                              updatePlayer(player.playerId, { isStarter: checked })
                            }
                          />
                        </div>
                      )}
                    </div>

                    {player.isSelected && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                          <Label className="text-xs">Position</Label>
                          <Input
                            value={player.position}
                            onChange={(e) =>
                              updatePlayer(player.playerId, { position: e.target.value })
                            }
                            placeholder="Ex: 1, 9, 15..."
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Minutes jouées</Label>
                          <Input
                            type="number"
                            value={player.minutesPlayed}
                            onChange={(e) =>
                              updatePlayer(player.playerId, {
                                minutesPlayed: parseInt(e.target.value) || 0,
                              })
                            }
                            min={0}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground py-4">Aucun joueur dans cette catégorie</p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => saveLineup.mutate()} disabled={saveLineup.isPending}>
            {saveLineup.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
