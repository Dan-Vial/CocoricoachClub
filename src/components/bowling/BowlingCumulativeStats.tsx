import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import { BarChart3, Trophy, Target, TrendingUp, Calendar } from "lucide-react";
import { BowlingFrameAnalysis } from "./BowlingFrameAnalysis";
import { BowlingGameHistory } from "./BowlingGameHistory";
import { getStatColor } from "@/lib/bowling/statColors";
import type { FrameData } from "@/components/athlete-portal/BowlingScoreSheet";

interface BowlingCumulativeStatsProps {
  categoryId: string;
}

interface BowlingGameData {
  roundId: string;
  matchId: string;
  playerId: string;
  playerName: string;
  roundNumber: number;
  matchDate: string;
  matchOpponent: string;
  phase: string;
  score: number;
  strikes: number;
  spares: number;
  strikePercentage: number;
  sparePercentage: number;
  openFrames: number;
  splitCount: number;
  splitConverted: number;
  pocketCount: number;
  pocketPercentage: number;
  singlePinCount: number;
  singlePinConverted: number;
  singlePinConversionRate: number;
  frames?: FrameData[];
}

function ColoredStatRow({ label, value, statType, percentage }: { label: string; value: string; statType?: "pocket" | "strike" | "spare" | "singlePin" | "firstBallGte8"; percentage?: number }) {
  if (statType && percentage !== undefined) {
    const color = getStatColor(statType, percentage);
    return (
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`font-bold px-2.5 py-0.5 rounded ${color.bg} text-white text-sm`}>{value}</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
}

export function BowlingCumulativeStats({ categoryId }: BowlingCumulativeStatsProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const { data: allGames, isLoading } = useQuery({
    queryKey: ["bowling_cumulative_stats", categoryId],
    queryFn: async () => {
      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select("id, match_date, opponent")
        .eq("category_id", categoryId)
        .order("match_date", { ascending: false });
      if (matchError) throw matchError;
      if (!matches || matches.length === 0) return [];

      const matchIds = matches.map(m => m.id);
      const matchMap = Object.fromEntries(matches.map(m => [m.id, m]));

      const { data: rounds, error: roundError } = await supabase
        .from("competition_rounds")
        .select("*, competition_round_stats(*), players(id, name, first_name)")
        .in("match_id", matchIds)
        .order("round_number");
      if (roundError) throw roundError;
      if (!rounds) return [];

      const games: BowlingGameData[] = [];
      for (const round of rounds) {
        const match = matchMap[round.match_id];
        const player = round.players as { id: string; name: string; first_name?: string } | null;
        const statData = (round.competition_round_stats as any[])?.[0]?.stat_data as Record<string, any> || {};
        const bowlingFrames = statData.bowlingFrames as FrameData[] | undefined;

        if (statData.gameScore !== undefined || bowlingFrames) {
          games.push({
            roundId: round.id,
            matchId: round.match_id,
            playerId: round.player_id,
            playerName: player ? [player.first_name, player.name].filter(Boolean).join(" ") : "Athlète",
            roundNumber: round.round_number,
            matchDate: match?.match_date || "",
            matchOpponent: match?.opponent || "",
            phase: round.phase || "",
            score: statData.gameScore || 0,
            strikes: statData.strikes || 0,
            spares: statData.spares || 0,
            strikePercentage: statData.strikePercentage || 0,
            sparePercentage: statData.sparePercentage || 0,
            openFrames: statData.openFrames || 0,
            splitCount: statData.splitCount || 0,
            splitConverted: statData.splitConverted || 0,
            pocketCount: statData.pocketCount || 0,
            pocketPercentage: statData.pocketPercentage || 0,
            singlePinCount: statData.singlePinCount || 0,
            singlePinConverted: statData.singlePinConverted || 0,
            singlePinConversionRate: statData.singlePinConversionRate || 0,
            frames: bowlingFrames,
          });
        }
      }

      return games;
    },
  });

  const players = useMemo(() => {
    if (!allGames) return [];
    const map = new Map<string, string>();
    allGames.forEach(g => map.set(g.playerId, g.playerName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allGames]);

  const activePlayerId = selectedPlayerId || players[0]?.id;
  const playerGames = useMemo(() => {
    if (!allGames || !activePlayerId) return [];
    return allGames.filter(g => g.playerId === activePlayerId);
  }, [allGames, activePlayerId]);

  const cumulativeStats = useMemo(() => {
    if (playerGames.length === 0) return null;
    const totalGames = playerGames.length;
    const totalScore = playerGames.reduce((s, g) => s + g.score, 0);
    const totalStrikes = playerGames.reduce((s, g) => s + g.strikes, 0);
    const totalSpares = playerGames.reduce((s, g) => s + g.spares, 0);
    const totalOpenFrames = playerGames.reduce((s, g) => s + g.openFrames, 0);
    const totalSplits = playerGames.reduce((s, g) => s + g.splitCount, 0);
    const totalSplitsConverted = playerGames.reduce((s, g) => s + g.splitConverted, 0);
    const totalPocket = playerGames.reduce((s, g) => s + g.pocketCount, 0);
    const totalSinglePin = playerGames.reduce((s, g) => s + g.singlePinCount, 0);
    const totalSinglePinConverted = playerGames.reduce((s, g) => s + g.singlePinConverted, 0);
    const highGame = Math.max(...playerGames.map(g => g.score));
    const lowGame = Math.min(...playerGames.map(g => g.score));
    const avgScore = totalScore / totalGames;
    const avgStrikeRate = playerGames.reduce((s, g) => s + g.strikePercentage, 0) / totalGames;
    const avgSpareRate = playerGames.reduce((s, g) => s + g.sparePercentage, 0) / totalGames;
    const avgPocketRate = playerGames.reduce((s, g) => s + g.pocketPercentage, 0) / totalGames;
    // Total frames = 10 per game (simplified)
    const totalFrames = totalGames * 10;
    const openFramePercentage = totalFrames > 0 ? (totalOpenFrames / totalFrames) * 100 : 0;

    return {
      totalGames, totalScore, highGame, lowGame, avgScore,
      totalStrikes, totalSpares, totalOpenFrames,
      totalSplits, totalSplitsConverted,
      totalPocket, totalSinglePin, totalSinglePinConverted,
      avgStrikeRate, avgSpareRate, avgPocketRate,
      openFramePercentage,
      splitConversionRate: totalSplits > 0 ? (totalSplitsConverted / totalSplits) * 100 : 0,
      singlePinConversionRate: totalSinglePin > 0 ? (totalSinglePinConverted / totalSinglePin) * 100 : 0,
    };
  }, [playerGames]);

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement des statistiques bowling...</p>;
  }

  if (!allGames || allGames.length === 0) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune partie de bowling enregistrée.</p>
            <p className="text-sm mt-2">Les statistiques apparaîtront ici une fois des parties saisies dans les compétitions.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Player selector */}
      {players.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {players.map(p => (
            <Button
              key={p.id}
              variant={activePlayerId === p.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPlayerId(p.id)}
            >
              {p.name}
              <Badge variant="secondary" className="ml-2 text-xs">
                {allGames.filter(g => g.playerId === p.id).length}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
          <ColoredSubTabsList colorKey="competition" className="inline-flex w-max">
            <ColoredSubTabsTrigger value="overview" colorKey="competition" icon={<BarChart3 className="h-4 w-4" />}>
              Vue d'ensemble
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger value="frames" colorKey="competition" icon={<Target className="h-4 w-4" />}>
              Analyse par frame
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger value="history" colorKey="competition" icon={<Calendar className="h-4 w-4" />}>
              Historique
            </ColoredSubTabsTrigger>
          </ColoredSubTabsList>
        </div>

        <TabsContent value="overview">
          {cumulativeStats && (
            <div className="space-y-4">
              {/* Main KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{cumulativeStats.totalGames}</p>
                      <p className="text-xs text-muted-foreground">Parties</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{cumulativeStats.avgScore.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Moyenne</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{cumulativeStats.highGame}</p>
                      <p className="text-xs text-muted-foreground">Partie la plus haute</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-destructive">{cumulativeStats.lowGame}</p>
                      <p className="text-xs text-muted-foreground">Partie la plus basse</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* All stats in one card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Statistiques détaillées
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Percentages first */}
                  <ColoredStatRow label="% Strikes" value={`${cumulativeStats.avgStrikeRate.toFixed(1)}%`} statType="strike" percentage={cumulativeStats.avgStrikeRate} />
                  <ColoredStatRow label="% Spares" value={`${cumulativeStats.avgSpareRate.toFixed(1)}%`} statType="spare" percentage={cumulativeStats.avgSpareRate} />
                  <ColoredStatRow label="% Poches" value={`${cumulativeStats.avgPocketRate.toFixed(1)}%`} statType="pocket" percentage={cumulativeStats.avgPocketRate} />
                  <ColoredStatRow label="% Quilles seules" value={`${cumulativeStats.singlePinConversionRate.toFixed(1)}%`} statType="singlePin" percentage={cumulativeStats.singlePinConversionRate} />
                  <ColoredStatRow label="% Conversion splits" value={`${cumulativeStats.splitConversionRate.toFixed(1)}%`} />
                  <ColoredStatRow label="% Boules ≥8" value={`${cumulativeStats.firstBallGte8Percentage.toFixed(1)}%`} statType="firstBallGte8" percentage={cumulativeStats.firstBallGte8Percentage} />
                   <div>
                     <ColoredStatRow label="% Frames non fermées" value={`${cumulativeStats.openFramePercentage.toFixed(1)}%`} />
                     <p className="text-[10px] text-muted-foreground mt-0.5 italic">
                       Frames où ni strike ni spare n'a été réalisé (splits non convertis exclus).
                     </p>
                   </div>
                  
                  <div className="border-t pt-3 mt-3" />
                  
                  {/* Counts */}
                  <ColoredStatRow label="Nombre de strikes total" value={String(cumulativeStats.totalStrikes)} />
                  <ColoredStatRow label="Nombre de spares total" value={String(cumulativeStats.totalSpares)} />
                  <ColoredStatRow label="Nombre de splits" value={String(cumulativeStats.totalSplits)} />
                  <ColoredStatRow label="Nombre de frames non fermées" value={String(cumulativeStats.totalOpenFrames)} />
                </CardContent>
              </Card>

              {/* Evolution chart */}
              {playerGames.length >= 2 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Évolution des scores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-center gap-[3px] h-40">
                      {playerGames.map((game) => {
                        const minBase = 100;
                        const maxScore = Math.max(...playerGames.map(g => g.score), 300);
                        const range = maxScore - minBase;
                        const clampedScore = Math.max(game.score, minBase);
                        const height = range > 0 ? ((clampedScore - minBase) / range) * 100 : 50;
                        
                         const getBarColor = (score: number) => {
                           if (score >= 240) return "bg-yellow-400";
                           if (score >= 210) return "bg-green-600";
                           if (score >= 180) return "bg-green-400";
                           if (score >= 151) return "bg-orange-500";
                           return "bg-red-500";
                         };
                        
                        return (
                          <div
                            key={game.roundId}
                            className={`${getBarColor(game.score)} rounded-t hover:opacity-80 transition-colors relative group`}
                            style={{ height: `${Math.max(height, 5)}%`, width: "12px", maxWidth: "20px" }}
                            title={`${game.matchOpponent} - Partie ${game.roundNumber}: ${game.score}`}
                          >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {game.score}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 border-t pt-2 flex items-center justify-center gap-3 flex-wrap text-[9px] text-muted-foreground">
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-500" />&lt;150</div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-orange-500" />151-179</div>
                       <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-400" />180-209</div>
                       <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-600" />210-239</div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-yellow-400" />240+</div>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-1">
                      {playerGames.length} parties • Survol pour détails
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="frames">
          <BowlingFrameAnalysis games={playerGames} />
        </TabsContent>

        <TabsContent value="history">
          <BowlingGameHistory games={playerGames} categoryId={categoryId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
