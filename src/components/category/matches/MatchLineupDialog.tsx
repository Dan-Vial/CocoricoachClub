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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, UserCheck, LayoutGrid, List } from "lucide-react";
import { SportFieldLineup } from "@/components/matches/SportFieldLineup";
import { getSportFieldConfig } from "@/lib/constants/sportPositions";
import { isIndividualSport, isAthletismeCategory } from "@/lib/constants/sportTypes";
import {
  AthleticsLineupSection,
  type AthleticsLineupEntry,
  type AthleticsLineupPlayer,
} from "./AthleticsLineupSection";

interface MatchLineupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  categoryId: string;
  matchFormat?: string | null;
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
  matchFormat,
}: MatchLineupDialogProps) {
  const [lineupData, setLineupData] = useState<LineupPlayer[]>([]);
  const [athleticsEntries, setAthleticsEntries] = useState<AthleticsLineupEntry[]>([]);
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

  const sportType = category?.rugby_type || "XV";
  const fieldConfig = getSportFieldConfig(sportType);
  const isIndividual = isIndividualSport(sportType);
  const isAthletics = isAthletismeCategory(sportType);
  const isPadel = sportType.toLowerCase().includes("padel");
  const isTennis = sportType.toLowerCase().includes("tennis");
  const isDoublesMatch = isPadel || (isTennis && (matchFormat === "double" || matchFormat === "double_mixte"));
  const maxPairSize = isDoublesMatch ? 2 : undefined;

  const { data: players } = useQuery({
    queryKey: ["players", categoryId, isAthletics ? "athletics" : "default"],
    queryFn: async () => {
      const cols = isAthletics
        ? "id, name, first_name, position, discipline, specialty, disciplines, specialties"
        : "id, name, first_name, position";
      const { data, error } = await supabase
        .from("players")
        .select(cols)
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
        .select("*, players(id, name, first_name)")
        .eq("match_id", matchId);
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  // Build athletics players (with their pairs) from the players query
  const athleticsPlayers: AthleticsLineupPlayer[] = isAthletics && players
    ? (players as any[]).map((p) => {
        const fullName = [p.first_name, p.name].filter(Boolean).join(" ") || "Athlète inconnu";
        const pairs: { discipline: string; specialty: string | null }[] = [];
        const arr = Array.isArray(p.disciplines) ? p.disciplines : [];
        const arrSpec = Array.isArray(p.specialties) ? p.specialties : [];
        if (arr.length > 0) {
          arr.forEach((d: string, i: number) => {
            if (d) pairs.push({ discipline: d, specialty: arrSpec[i] || null });
          });
        } else if (p.discipline) {
          pairs.push({ discipline: p.discipline, specialty: p.specialty || null });
        }
        return { playerId: p.id, playerName: fullName, pairs };
      })
    : [];

  useEffect(() => {
    if (!players || players.length === 0) return;

    if (isAthletics) {
      // Build entries: one per (player × pair); pre-check those already saved in the lineup
      const initialEntries: AthleticsLineupEntry[] = [];
      (players as any[]).forEach((p) => {
        const arr = Array.isArray(p.disciplines) ? p.disciplines : [];
        const arrSpec = Array.isArray(p.specialties) ? p.specialties : [];
        const pairs: { discipline: string; specialty: string | null }[] = [];
        if (arr.length > 0) {
          arr.forEach((d: string, i: number) => {
            if (d) pairs.push({ discipline: d, specialty: arrSpec[i] || null });
          });
        } else if (p.discipline) {
          pairs.push({ discipline: p.discipline, specialty: p.specialty || null });
        }
        pairs.forEach((pair) => {
          const existing = existingLineup?.find(
            (l: any) =>
              l.player_id === p.id &&
              (l.discipline ?? null) === pair.discipline &&
              (l.specialty ?? null) === (pair.specialty || null),
          );
          initialEntries.push({
            playerId: p.id,
            discipline: pair.discipline,
            specialty: pair.specialty,
            isSelected: !!existing,
          });
        });
      });
      setAthleticsEntries(initialEntries);
      return;
    }

    const lineup = (players as any[]).map((player) => {
      const existing = existingLineup?.find((l) => l.player_id === player.id);
      const fullName = [player.first_name, player.name].filter(Boolean).join(" ") || "Athlète inconnu";
      return {
        playerId: player.id,
        playerName: fullName,
        isStarter: existing?.is_starter ?? false,
        position: existing?.position ?? "",
        minutesPlayed: existing?.minutes_played ?? 0,
        isSelected: !!existing,
      };
    });
    setLineupData(lineup);
  }, [players, existingLineup, isAthletics]);

  const saveLineup = useMutation({
    mutationFn: async () => {
      // Delete existing lineup
      const { error: deleteError } = await supabase
        .from("match_lineups")
        .delete()
        .eq("match_id", matchId);
      if (deleteError) throw deleteError;

      if (isAthletics) {
        const selected = athleticsEntries.filter((e) => e.isSelected);
        if (selected.length > 0) {
          const { error } = await supabase.from("match_lineups").insert(
            selected.map((e) => ({
              match_id: matchId,
              player_id: e.playerId,
              discipline: e.discipline,
              specialty: e.specialty,
              is_starter: true,
              position: null,
              minutes_played: 0,
            })),
          );
          if (error) throw error;
        }
        return { selectedCount: selected.length };
      }

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

      return { selectedCount: selectedPlayers.length };
    },
    onSuccess: ({ selectedCount }) => {
      // Keep counts/UI in sync immediately
      queryClient.setQueryData(["match_lineup_count", matchId], selectedCount);
      queryClient.invalidateQueries({ queryKey: ["match_lineup", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match_lineup_players", matchId] });
      queryClient.invalidateQueries({ queryKey: ["competition_match_lineup", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match_lineup_count", matchId] });
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

  const toggleAthleticsEntry = (
    playerId: string,
    discipline: string | null,
    specialty: string | null,
    selected: boolean,
  ) => {
    setAthleticsEntries((prev) =>
      prev.map((e) =>
        e.playerId === playerId &&
        (e.discipline ?? null) === (discipline ?? null) &&
        (e.specialty ?? null) === (specialty ?? null)
          ? { ...e, isSelected: selected }
          : e,
      ),
    );
  };


  const handleFieldLineupChange = (fieldLineup: Record<string, string>, substitutes: string[]) => {
    // Update lineup from field visualization
    setLineupData(prev => prev.map(p => {
      const positionNumber = Object.entries(fieldLineup).find(([_, playerId]) => playerId === p.playerId)?.[0];
      if (positionNumber) {
        // Player is a starter on the field
        return { ...p, isSelected: true, isStarter: true, position: positionNumber };
      }
      if (substitutes.includes(p.playerId)) {
        // Player is a substitute
        const subIndex = substitutes.indexOf(p.playerId);
        return { ...p, isSelected: true, isStarter: false, position: `SUB${subIndex + 1}` };
      }
      // Player not selected
      return { ...p, isSelected: false, isStarter: false, position: "" };
    }));
  };

  const selectedCount = lineupData?.filter((p) => p.isSelected).length ?? 0;
  const starterCount = lineupData?.filter((p) => p.isSelected && p.isStarter).length ?? 0;
  const substituteCount = lineupData?.filter((p) => p.isSelected && !p.isStarter).length ?? 0;
  
  // Check if this sport has a field layout
  const hasFieldLayout = !fieldConfig.noField;

  // Convert lineup data to field format
  const fieldLineup = lineupData
    .filter(p => p.isSelected && p.isStarter && p.position && !p.position.startsWith("SUB"))
    .reduce((acc, p) => {
      acc[p.position] = p.playerId;
      return acc;
    }, {} as Record<string, string>);

  // Get initial substitutes
  const initialSubstitutes = lineupData
    .filter(p => p.isSelected && !p.isStarter)
    .map(p => p.playerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {isDoublesMatch 
                ? `Paire${isPadel ? " de Padel" : " de Double"}`
                : isIndividual ? "Participants" : `Composition - ${fieldConfig.label}`}
            </div>
            {hasFieldLayout && !isIndividual && !isDoublesMatch && (
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
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 text-sm text-muted-foreground mb-2 flex-shrink-0 flex-wrap">
          <span className="flex items-center gap-1">
            <UserCheck className="h-4 w-4" />
            {isDoublesMatch 
              ? `${selectedCount}/2 joueurs sélectionnés`
              : `${selectedCount} ${isIndividual ? "participants" : "athlètes"}`}
          </span>
          {!isIndividual && !isDoublesMatch && (
            <>
              <span>{starterCount}/{fieldConfig.starters} titulaires</span>
              <span>{substituteCount}/{fieldConfig.substitutes} remplaçants</span>
            </>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="pr-2">
            {/* Doubles match: pair selection (max 2) */}
            {isDoublesMatch ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Sélectionnez les 2 joueurs qui forment la paire pour ce match.
                  {isPadel && " Le Padel se joue toujours en paire."}
                </p>
                {lineupData && lineupData.length > 0 ? lineupData.map((player) => {
                  const canSelect = player.isSelected || selectedCount < 2;
                  return (
                    <div
                      key={player.playerId}
                      className={`p-3 rounded-lg border transition-colors ${
                        player.isSelected
                          ? "bg-primary/5 border-primary/20"
                          : canSelect ? "bg-card" : "bg-muted/50 opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={player.playerId}
                          checked={player.isSelected}
                          disabled={!canSelect}
                          onCheckedChange={(checked) =>
                            updatePlayer(player.playerId, {
                              isSelected: !!checked,
                              isStarter: true,
                            })
                          }
                        />
                        <label
                          htmlFor={player.playerId}
                          className={`font-medium cursor-pointer flex-1 ${!canSelect ? "cursor-not-allowed" : ""}`}
                        >
                          {player.playerName}
                        </label>
                        {player.isSelected && (
                          <Badge variant="default" className="text-xs">
                            Paire
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center text-muted-foreground py-4">Aucun athlète dans cette catégorie</p>
                )}
              </div>
            ) : isIndividual ? (
              <div className="space-y-2">
                {lineupData && lineupData.length > 0 ? lineupData.map((player) => (
                  <div
                    key={player.playerId}
                    className={`p-3 rounded-lg border transition-colors ${
                      player.isSelected
                        ? "bg-primary/5 border-primary/20"
                        : "bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={player.playerId}
                        checked={player.isSelected}
                        onCheckedChange={(checked) =>
                          updatePlayer(player.playerId, {
                            isSelected: !!checked,
                          })
                        }
                      />
                      <label
                        htmlFor={player.playerId}
                        className="font-medium cursor-pointer flex-1"
                      >
                        {player.playerName}
                      </label>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground py-4">Aucun athlète dans cette catégorie</p>
                )}
              </div>
            ) : (
              /* Team sports: full lineup management */
              hasFieldLayout && viewMode === "field" ? (
                <SportFieldLineup
                  players={players || []}
                  sportType={sportType}
                  initialLineup={fieldLineup}
                  initialSubstitutes={initialSubstitutes}
                  onLineupChange={handleFieldLineupChange}
                />
              ) : (
                <div className="space-y-3">
                  {lineupData && lineupData.length > 0 ? lineupData.map((player) => (
                    <div
                      key={player.playerId}
                      className={`p-3 rounded-lg border transition-colors ${
                        player.isSelected
                          ? player.isStarter 
                            ? "bg-primary/5 border-primary/20"
                            : "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800"
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
                    <p className="text-center text-muted-foreground py-4">Aucun athlète dans cette catégorie</p>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
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
