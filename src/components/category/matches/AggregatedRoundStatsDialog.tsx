import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Trophy, Target, Percent, Circle, Swords, Ship } from "lucide-react";
import { getAggregatedStatsForSport } from "@/lib/constants/sportStats";

interface AggregatedRoundStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  sportType: string;
  competitionName: string;
}

interface PlayerAggregatedStats {
  playerId: string;
  playerName: string;
  roundCount: number;
  wins: number;
  losses: number;
  draws: number;
  bestTime?: number;
  avgRanking?: number;
  stats: Record<string, number>;
}

export function AggregatedRoundStatsDialog({
  open,
  onOpenChange,
  matchId,
  sportType,
  competitionName,
}: AggregatedRoundStatsDialogProps) {
  const isJudo = sportType.toLowerCase().includes("judo");
  const isBowling = sportType.toLowerCase().includes("bowling");
  const isAviron = sportType.toLowerCase().includes("aviron");

  const roundLabel = isJudo ? "Combats" : isAviron ? "Courses" : isBowling ? "Parties" : "Rounds";
  const aggregatedStats = getAggregatedStatsForSport(sportType);

  // Fetch all rounds with their stats for this match
  const { data: roundsData, isLoading } = useQuery({
    queryKey: ["aggregated_round_stats", matchId],
    queryFn: async () => {
      // Get rounds with player info
      const { data: rounds, error } = await supabase
        .from("competition_rounds")
        .select(`
          *,
          competition_round_stats(*),
          players(id, name)
        `)
        .eq("match_id", matchId)
        .order("round_number");

      if (error) throw error;
      return rounds;
    },
    enabled: open && !!matchId,
  });

  // Calculate aggregated stats per player
  const playerStats: PlayerAggregatedStats[] = [];

  if (roundsData) {
    const playerMap = new Map<string, PlayerAggregatedStats>();

    roundsData.forEach((round) => {
      const player = round.players as { id: string; name: string } | null;
      if (!player) return;

      if (!playerMap.has(round.player_id)) {
        playerMap.set(round.player_id, {
          playerId: round.player_id,
          playerName: player.name,
          roundCount: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          stats: {},
        });
      }

      const pStats = playerMap.get(round.player_id)!;
      pStats.roundCount++;

      // Count wins/losses/draws
      if (round.result === "win") pStats.wins++;
      else if (round.result === "loss") pStats.losses++;
      else if (round.result === "draw") pStats.draws++;

      // Track best time for Aviron
      if (round.final_time_seconds) {
        if (!pStats.bestTime || round.final_time_seconds < pStats.bestTime) {
          pStats.bestTime = round.final_time_seconds;
        }
      }

      // Aggregate stats from competition_round_stats
      const statData = round.competition_round_stats?.[0]?.stat_data as Record<string, any> || {};
      
      // Remove non-numeric fields like bowlingFrames
      Object.entries(statData).forEach(([key, value]) => {
        if (typeof value === "number") {
          pStats.stats[key] = (pStats.stats[key] || 0) + value;
        }
      });
    });

    playerStats.push(...playerMap.values());
  }

  // Format time from seconds
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  // Get the stat label and format value
  const formatStatValue = (key: string, value: number, roundCount: number): string => {
    // For percentages, calculate average
    if (key.toLowerCase().includes("percentage") || key.toLowerCase().includes("rate")) {
      return `${(value / Math.max(1, roundCount)).toFixed(1)}%`;
    }
    // For scores, show total if bowling
    if (key === "gameScore" && isBowling) {
      return `${value} (moy: ${Math.round(value / Math.max(1, roundCount))})`;
    }
    return value.toString();
  };

  // Get stat display name
  const getStatLabel = (key: string): string => {
    const labels: Record<string, string> = {
      // Bowling
      gameScore: "Score total",
      strikes: "Strikes",
      strikePercentage: "% Strikes",
      spares: "Spares",
      sparePercentage: "% Spares",
      openFrames: "Open Frames",
      splitCount: "Splits",
      splitConverted: "Splits convertis",
      splitConversionRate: "% Conversion splits",
      pocketCount: "Boules en poche",
      pocketPercentage: "% Boules en poche",
      singlePinCount: "Quilles seules",
      singlePinConverted: "Q. seules converties",
      singlePinConversionRate: "% Conv. Q. seules",
      // Judo
      ippon: "Ippon",
      wazaari: "Waza-ari",
      yuko: "Yuko",
      shido: "Shido",
      hansokuMake: "Hansoku-make",
      goldenScore: "Golden Score",
      // Aviron
      strokeRate: "Coups/minute",
      heartRate: "FC moyenne",
    };
    return labels[key] || key;
  };

  // Get important stats to highlight based on sport
  const getHighlightedStats = (stats: Record<string, number>, roundCount: number) => {
    if (isBowling) {
      return [
        { label: "High Game", value: stats.gameScore ? Math.round(stats.gameScore / roundCount) : 0, suffix: "" },
        { label: "Total Pins", value: stats.gameScore || 0, suffix: "" },
        { label: "% Strikes", value: stats.strikePercentage ? (stats.strikePercentage / roundCount).toFixed(1) : "0", suffix: "%" },
        { label: "% Spares", value: stats.sparePercentage ? (stats.sparePercentage / roundCount).toFixed(1) : "0", suffix: "%" },
      ];
    }
    if (isJudo) {
      return [
        { label: "Ippon", value: stats.ippon || 0, suffix: "" },
        { label: "Waza-ari", value: stats.wazaari || 0, suffix: "" },
        { label: "Shido", value: stats.shido || 0, suffix: "" },
      ];
    }
    return [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiques - {competitionName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Résumé des statistiques agrégées depuis les {roundLabel.toLowerCase()}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Chargement des statistiques...</p>
            </div>
          ) : playerStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Aucune statistique enregistrée pour cette compétition.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Ajoutez des {roundLabel.toLowerCase()} dans "Gestion des {roundLabel}" pour voir les statistiques ici.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {playerStats.map((player) => (
                <Card key={player.playerId}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{player.playerName}</span>
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          {player.roundCount} {player.roundCount === 1 ? roundLabel.slice(0, -1) : roundLabel}
                        </Badge>
                        {(player.wins > 0 || player.losses > 0 || player.draws > 0) && (
                          <Badge variant="outline" className="gap-1">
                            <span className="text-primary">{player.wins}V</span>
                            <span className="text-destructive">{player.losses}D</span>
                            {player.draws > 0 && <span className="text-muted-foreground">{player.draws}N</span>}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Highlighted stats */}
                    {getHighlightedStats(player.stats, player.roundCount).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        {getHighlightedStats(player.stats, player.roundCount).map((stat, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-primary/5 text-center">
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                            <p className="text-lg font-bold text-primary">
                              {stat.value}{stat.suffix}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Best time for Aviron */}
                    {isAviron && player.bestTime && (
                      <div className="p-3 rounded-lg bg-accent/50 mb-4">
                        <p className="text-xs text-muted-foreground">Meilleur temps</p>
                        <p className="text-lg font-bold text-primary">{formatTime(player.bestTime)}</p>
                      </div>
                    )}

                    {/* All stats */}
                    {Object.keys(player.stats).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(player.stats)
                          .filter(([key]) => !key.includes("bowlingFrames"))
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center p-2 rounded bg-muted/30">
                              <span className="text-sm text-muted-foreground">{getStatLabel(key)}</span>
                              <span className="font-medium">{formatStatValue(key, value, player.roundCount)}</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {Object.keys(player.stats).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Pas de statistiques détaillées disponibles
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
