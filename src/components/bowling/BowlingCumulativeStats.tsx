import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import { BarChart3, Trophy, Target, TrendingUp, Eye, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BowlingFrameAnalysis } from "./BowlingFrameAnalysis";
import { BowlingGameHistory } from "./BowlingGameHistory";
import { getStatTextColor } from "@/lib/bowling/statColors";
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

export function BowlingCumulativeStats({ categoryId }: BowlingCumulativeStatsProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Fetch all bowling games from competition_rounds + competition_round_stats
  const { data: allGames, isLoading } = useQuery({
    queryKey: ["bowling_cumulative_stats", categoryId],
    queryFn: async () => {
      // Get all matches for this category
      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select("id, match_date, opponent")
        .eq("category_id", categoryId)
        .order("match_date", { ascending: false });
      if (matchError) throw matchError;
      if (!matches || matches.length === 0) return [];

      const matchIds = matches.map(m => m.id);
      const matchMap = Object.fromEntries(matches.map(m => [m.id, m]));

      // Get all competition rounds with stats
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

        // Only include rounds that have bowling stats (gameScore exists)
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

  // Get unique players
  const players = useMemo(() => {
    if (!allGames) return [];
    const map = new Map<string, string>();
    allGames.forEach(g => map.set(g.playerId, g.playerName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allGames]);

  // Auto-select first player
  const activePlayerId = selectedPlayerId || players[0]?.id;
  const playerGames = useMemo(() => {
    if (!allGames || !activePlayerId) return [];
    return allGames.filter(g => g.playerId === activePlayerId);
  }, [allGames, activePlayerId]);

  // Compute cumulative stats for selected player
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

    return {
      totalGames, totalScore, highGame, lowGame, avgScore,
      totalStrikes, totalSpares, totalOpenFrames,
      totalSplits, totalSplitsConverted,
      totalPocket, totalSinglePin, totalSinglePinConverted,
      avgStrikeRate, avgSpareRate,
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
                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">{cumulativeStats.highGame}</p>
                      <p className="text-xs text-muted-foreground">High Game</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-center">
                      <p className={`text-3xl font-bold ${getStatTextColor("strike", cumulativeStats.avgStrikeRate)}`}>{cumulativeStats.avgStrikeRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">% Strike</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strikes & Spares */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Strikes & Spares
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Strikes totaux</span>
                      <span className="font-bold">{cumulativeStats.totalStrikes}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">% Strike moyen</span>
                      <span className={`font-bold ${getStatTextColor("strike", cumulativeStats.avgStrikeRate)}`}>{cumulativeStats.avgStrikeRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Spares totaux</span>
                      <span className="font-bold">{cumulativeStats.totalSpares}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">% Spare moyen</span>
                      <span className={`font-bold ${getStatTextColor("spare", cumulativeStats.avgSpareRate)}`}>{cumulativeStats.avgSpareRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Open Frames totaux</span>
                      <span className="font-bold">{cumulativeStats.totalOpenFrames}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Splits & Precision */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-orange-500" />
                      Splits & Précision
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Splits totaux</span>
                      <span className="font-bold">{cumulativeStats.totalSplits}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Splits convertis</span>
                      <span className="font-bold">{cumulativeStats.totalSplitsConverted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">% Conversion splits</span>
                      <span className="font-bold">{cumulativeStats.splitConversionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pocket count</span>
                      <span className="font-bold">{cumulativeStats.totalPocket}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">% Single pin conv.</span>
                      <span className={`font-bold ${getStatTextColor("singlePin", cumulativeStats.singlePinConversionRate)}`}>{cumulativeStats.singlePinConversionRate.toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Score range */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Low Game</p>
                      <p className="text-2xl font-bold text-destructive">{cumulativeStats.lowGame}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Moyenne</p>
                      <p className="text-2xl font-bold">{cumulativeStats.avgScore.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">High Game</p>
                      <p className="text-2xl font-bold text-green-600">{cumulativeStats.highGame}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Evolution chart - score per game */}
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
                      {playerGames.map((game, i) => {
                        // Use min 100 as baseline so differences are visible
                        const minBase = 100;
                        const maxScore = Math.max(...playerGames.map(g => g.score), 300);
                        const range = maxScore - minBase;
                        const clampedScore = Math.max(game.score, minBase);
                        const height = range > 0 ? ((clampedScore - minBase) / range) * 100 : 50;
                        
                        // Color by score range
                        const getBarColor = (score: number) => {
                          if (score >= 240) return "bg-yellow-400"; // Gold
                          if (score >= 210) return "bg-green-400"; // Green flash
                          if (score >= 180) return "bg-green-600"; // Green
                          if (score >= 151) return "bg-orange-500"; // Orange
                          return "bg-red-500"; // Red
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
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-600" />180-209</div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-400" />210-239</div>
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
