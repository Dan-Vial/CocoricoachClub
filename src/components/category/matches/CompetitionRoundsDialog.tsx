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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Trophy, Target, BarChart3, Swords, Circle } from "lucide-react";
import { getStatsForSport, getStatCategories, getAggregatedStatsForSport, type StatField } from "@/lib/constants/sportStats";

interface CompetitionRoundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  categoryId: string;
  sportType: string;
}

interface Round {
  id?: string;
  round_number: number;
  opponent_name: string;
  result: string;
  notes: string;
  stats: Record<string, number>;
}

interface PlayerRounds {
  playerId: string;
  playerName: string;
  rounds: Round[];
}

export function CompetitionRoundsDialog({
  open,
  onOpenChange,
  matchId,
  categoryId,
  sportType,
}: CompetitionRoundsDialogProps) {
  const [playerRoundsData, setPlayerRoundsData] = useState<PlayerRounds[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("rounds");
  const queryClient = useQueryClient();

  const sportStats = getStatsForSport(sportType);
  const statCategories = getStatCategories(sportType);
  const aggregatedStats = getAggregatedStatsForSport(sportType);
  const isJudo = sportType.toLowerCase().includes("judo");
  const isBowling = sportType.toLowerCase().includes("bowling");
  
  const roundLabel = isJudo ? "Combat" : isBowling ? "Partie" : "Round";
  const roundLabelPlural = isJudo ? "Combats" : isBowling ? "Parties" : "Rounds";

  // Get players in the lineup for this match
  const { data: lineup } = useQuery({
    queryKey: ["match_lineup", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_lineups")
        .select("player_id, players(id, name)")
        .eq("match_id", matchId);
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  // Get existing rounds
  const { data: existingRounds } = useQuery({
    queryKey: ["competition_rounds", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_rounds")
        .select("*, competition_round_stats(*)")
        .eq("match_id", matchId)
        .order("round_number");
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  useEffect(() => {
    if (lineup && lineup.length > 0) {
      const playersData = lineup.map((l) => {
        const player = l.players as { id: string; name: string } | null;
        const playerRounds = existingRounds?.filter(r => r.player_id === l.player_id) || [];
        
        return {
          playerId: l.player_id,
          playerName: player?.name || "Athlète",
          rounds: playerRounds.map(r => ({
            id: r.id,
            round_number: r.round_number,
            opponent_name: r.opponent_name || "",
            result: r.result || "",
            notes: r.notes || "",
            stats: (r.competition_round_stats?.[0]?.stat_data as Record<string, number>) || {},
          })),
        };
      });
      setPlayerRoundsData(playersData);
      
      if (!selectedPlayerId && playersData.length > 0) {
        setSelectedPlayerId(playersData[0].playerId);
      }
    }
  }, [lineup, existingRounds, selectedPlayerId]);

  const saveRounds = useMutation({
    mutationFn: async () => {
      // For each player, save their rounds
      for (const playerData of playerRoundsData) {
        // Delete existing rounds for this player in this match
        await supabase
          .from("competition_rounds")
          .delete()
          .eq("match_id", matchId)
          .eq("player_id", playerData.playerId);

        // Insert new rounds
        for (const round of playerData.rounds) {
          const { data: roundData, error: roundError } = await supabase
            .from("competition_rounds")
            .insert({
              match_id: matchId,
              player_id: playerData.playerId,
              round_number: round.round_number,
              opponent_name: round.opponent_name || null,
              result: round.result || null,
              notes: round.notes || null,
            })
            .select()
            .single();

          if (roundError) throw roundError;

          // Insert stats for this round
          if (Object.keys(round.stats).length > 0) {
            const { error: statsError } = await supabase
              .from("competition_round_stats")
              .insert({
                round_id: roundData.id,
                stat_data: round.stats,
              });
            if (statsError) throw statsError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competition_rounds", matchId] });
      toast.success(`${roundLabelPlural} enregistrés`);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving rounds:", error);
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  const addRound = (playerId: string) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.playerId === playerId) {
        const newRoundNumber = p.rounds.length > 0 
          ? Math.max(...p.rounds.map(r => r.round_number)) + 1 
          : 1;
        return {
          ...p,
          rounds: [...p.rounds, {
            round_number: newRoundNumber,
            opponent_name: "",
            result: "",
            notes: "",
            stats: {},
          }],
        };
      }
      return p;
    }));
  };

  const removeRound = (playerId: string, roundNumber: number) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.playerId === playerId) {
        return {
          ...p,
          rounds: p.rounds.filter(r => r.round_number !== roundNumber),
        };
      }
      return p;
    }));
  };

  const updateRound = (playerId: string, roundNumber: number, updates: Partial<Round>) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.playerId === playerId) {
        return {
          ...p,
          rounds: p.rounds.map(r => 
            r.round_number === roundNumber ? { ...r, ...updates } : r
          ),
        };
      }
      return p;
    }));
  };

  const updateRoundStat = (playerId: string, roundNumber: number, statKey: string, value: number) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.playerId === playerId) {
        return {
          ...p,
          rounds: p.rounds.map(r => 
            r.round_number === roundNumber 
              ? { ...r, stats: { ...r.stats, [statKey]: value } } 
              : r
          ),
        };
      }
      return p;
    }));
  };

  const hasLineup = lineup && lineup.length > 0;
  const selectedPlayer = playerRoundsData.find(p => p.playerId === selectedPlayerId);

  // Calculate aggregated stats for a player
  const calculateAggregatedStats = (rounds: Round[]) => {
    const aggregated: Record<string, number> = {};
    const counts: Record<string, number> = {};
    
    rounds.forEach(round => {
      Object.entries(round.stats).forEach(([key, value]) => {
        if (aggregated[key] === undefined) {
          aggregated[key] = 0;
          counts[key] = 0;
        }
        aggregated[key] += value;
        counts[key]++;
      });
    });

    // Calculate wins/losses for result tracking
    const wins = rounds.filter(r => r.result === "win").length;
    const losses = rounds.filter(r => r.result === "loss").length;
    const draws = rounds.filter(r => r.result === "draw").length;

    return { aggregated, counts, wins, losses, draws, total: rounds.length };
  };

  if (!hasLineup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isJudo ? <Swords className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
            {roundLabelPlural}
          </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-center py-8">
            Ajoutez d'abord des participants à la composition pour gérer leurs {roundLabelPlural.toLowerCase()}.
          </p>
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isJudo ? <Swords className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
            Gestion des {roundLabelPlural}
          </DialogTitle>
        </DialogHeader>

        {/* Player selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Sélectionner un athlète</Label>
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir un athlète..." />
            </SelectTrigger>
            <SelectContent>
              {playerRoundsData.map((player) => (
                <SelectItem key={player.playerId} value={player.playerId}>
                  <div className="flex items-center gap-2">
                    <span>{player.playerName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {player.rounds.length} {player.rounds.length === 1 ? roundLabel.toLowerCase() : roundLabelPlural.toLowerCase()}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPlayer && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="rounds" className="gap-2">
                <Target className="h-4 w-4" />
                {roundLabelPlural}
              </TabsTrigger>
              <TabsTrigger value="summary" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Résumé
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rounds">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {/* Add round button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addRound(selectedPlayer.playerId)}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un {roundLabel.toLowerCase()}
                  </Button>

                  {selectedPlayer.rounds.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Aucun {roundLabel.toLowerCase()} enregistré</p>
                      <p className="text-sm">Cliquez sur le bouton ci-dessus pour ajouter un {roundLabel.toLowerCase()}</p>
                    </div>
                  ) : (
                    selectedPlayer.rounds.map((round) => (
                      <Card key={round.round_number} className="relative">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              {isJudo ? <Swords className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                              {roundLabel} {round.round_number}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeRound(selectedPlayer.playerId, round.round_number)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Basic round info */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Adversaire</Label>
                              <Input
                                value={round.opponent_name}
                                onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { opponent_name: e.target.value })}
                                placeholder="Nom de l'adversaire"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Résultat</Label>
                              <Select
                                value={round.result}
                                onValueChange={(value) => updateRound(selectedPlayer.playerId, round.round_number, { result: value })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Résultat" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="win">
                                    <span className="flex items-center gap-2">
                                      <Trophy className="h-3 w-3 text-green-500" />
                                      Victoire
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="loss">
                                    <span className="text-destructive">Défaite</span>
                                  </SelectItem>
                                  <SelectItem value="draw">
                                    <span className="text-muted-foreground">Égalité</span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Stats for this round - organized by category */}
                          <div className="space-y-3">
                            {statCategories.map(cat => {
                              const categoryStats = sportStats.filter(s => s.category === cat.key);
                              if (categoryStats.length === 0) return null;
                              return (
                                <div key={cat.key}>
                                  <Label className="text-xs font-medium text-primary">{cat.label}</Label>
                                  <div className="grid grid-cols-3 gap-2 mt-1">
                                    {categoryStats.map(stat => (
                                      <div key={stat.key}>
                                        <Label className="text-[10px] text-muted-foreground">{stat.shortLabel}</Label>
                                        <Input
                                          type="number"
                                          value={round.stats[stat.key] || 0}
                                          onChange={(e) => updateRoundStat(selectedPlayer.playerId, round.round_number, stat.key, parseFloat(e.target.value) || 0)}
                                          min={stat.min ?? 0}
                                          max={stat.max}
                                          className="h-7 text-sm"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Notes */}
                          <div>
                            <Label className="text-xs">Notes</Label>
                            <Input
                              value={round.notes}
                              onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { notes: e.target.value })}
                              placeholder="Notes sur ce combat/partie"
                              className="h-8"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Résumé de la compétition - {selectedPlayer.playerName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPlayer.rounds.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Aucun {roundLabel.toLowerCase()} enregistré
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Results summary */}
                      {(() => {
                        const { wins, losses, draws, total, aggregated } = calculateAggregatedStats(selectedPlayer.rounds);
                        return (
                          <>
                            <div className="grid grid-cols-4 gap-3 text-center">
                              <div className="p-3 rounded-lg bg-muted">
                                <p className="text-2xl font-bold">{total}</p>
                                <p className="text-xs text-muted-foreground">{roundLabelPlural}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                                <p className="text-2xl font-bold text-green-600">{wins}</p>
                                <p className="text-xs text-muted-foreground">Victoires</p>
                              </div>
                              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/20">
                                <p className="text-2xl font-bold text-destructive">{losses}</p>
                                <p className="text-xs text-muted-foreground">Défaites</p>
                              </div>
                              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900/20">
                                <p className="text-2xl font-bold text-muted-foreground">{draws}</p>
                                <p className="text-xs text-muted-foreground">Égalités</p>
                              </div>
                            </div>

                            {/* Aggregated stats by category */}
                            {Object.keys(aggregated).length > 0 && (
                              <div className="space-y-3">
                                <h4 className="font-medium">Statistiques cumulées</h4>
                                {statCategories.map(cat => {
                                  const categoryStats = sportStats.filter(s => s.category === cat.key && aggregated[s.key] !== undefined);
                                  if (categoryStats.length === 0) return null;
                                  return (
                                    <div key={cat.key}>
                                      <p className="text-sm font-medium text-primary mb-2">{cat.label}</p>
                                      <div className="grid grid-cols-3 gap-2">
                                        {categoryStats.map(stat => (
                                          <div key={stat.key} className="p-2 rounded border text-center">
                                            <p className="text-lg font-bold">{aggregated[stat.key]}</p>
                                            <p className="text-xs text-muted-foreground">{stat.shortLabel}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => saveRounds.mutate()} disabled={saveRounds.isPending}>
            {saveRounds.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
