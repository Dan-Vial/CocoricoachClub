import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Target, TrendingUp } from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { SPARE_EXERCISE_TYPES } from "@/lib/constants/bowlingBallBrands";
import { BowlingFrameAnalysis } from "./BowlingFrameAnalysis";
import type { FrameData } from "@/components/athlete-portal/BowlingScoreSheet";

interface BowlingTrainingStatsProps {
  categoryId: string;
}

export function BowlingTrainingStats({ categoryId }: BowlingTrainingStatsProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>("all");

  // Fetch training games (from matches with event_type = 'training')
  const { data: trainingData, isLoading } = useQuery({
    queryKey: ["bowling_training_stats", categoryId],
    queryFn: async () => {
      // Get training matches
      const { data: matches } = await supabase
        .from("matches")
        .select("id, match_date")
        .eq("category_id", categoryId)
        .eq("event_type", "training")
        .order("match_date", { ascending: false });

      if (!matches || matches.length === 0) return { games: [], spareExercises: [] };

      const matchIds = matches.map(m => m.id);
      const matchMap = Object.fromEntries(matches.map(m => [m.id, m]));

      // Get rounds with stats
      const { data: rounds } = await supabase
        .from("competition_rounds")
        .select("*, competition_round_stats(*), players(id, name, first_name)")
        .in("match_id", matchIds)
        .order("round_number");

      const games: any[] = [];
      for (const round of rounds || []) {
        const match = matchMap[round.match_id];
        const player = round.players as any;
        const statData = ((round.competition_round_stats as any[])?.[0]?.stat_data as any) || {};
        const bowlingFrames = statData.bowlingFrames as FrameData[] | undefined;

        if (statData.gameScore !== undefined || bowlingFrames) {
          games.push({
            roundId: round.id,
            matchId: round.match_id,
            playerId: round.player_id,
            playerName: player ? [player.first_name, player.name].filter(Boolean).join(" ") : "Athlète",
            matchDate: match?.match_date || "",
            score: statData.gameScore || 0,
            strikes: statData.strikes || 0,
            spares: statData.spares || 0,
            strikePercentage: statData.strikePercentage || 0,
            sparePercentage: statData.sparePercentage || 0,
            openFrames: statData.openFrames || 0,
            frames: bowlingFrames,
          });
        }
      }

      // Fetch spare exercises
      const { data: spareData } = await supabase
        .from("bowling_spare_training" as any)
        .select("*")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false });

      return { games, spareExercises: (spareData as any[]) || [] };
    },
  });

  const players = useMemo(() => {
    if (!trainingData) return [];
    const map = new Map<string, string>();
    trainingData.games.forEach((g: any) => map.set(g.playerId, g.playerName));
    // Also add players from spare exercises
    trainingData.spareExercises.forEach((ex: any) => {
      if (!map.has(ex.player_id)) map.set(ex.player_id, "Athlète");
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [trainingData]);

  const activePlayerId = selectedPlayerId || players[0]?.id;

  const periodFilter = (dateStr: string) => {
    if (period === "all") return true;
    const days = parseInt(period);
    return isAfter(new Date(dateStr), subDays(new Date(), days));
  };

  const filteredGames = useMemo(() => {
    if (!trainingData || !activePlayerId) return [];
    return trainingData.games
      .filter((g: any) => g.playerId === activePlayerId && periodFilter(g.matchDate));
  }, [trainingData, activePlayerId, period]);

  const filteredSpares = useMemo(() => {
    if (!trainingData || !activePlayerId) return [];
    return trainingData.spareExercises
      .filter((ex: any) => ex.player_id === activePlayerId && periodFilter(ex.session_date));
  }, [trainingData, activePlayerId, period]);

  // Compute spare stats by type
  const spareStats = useMemo(() => {
    const byType: Record<string, { attempts: number; successes: number }> = {};
    for (const ex of filteredSpares) {
      if (!byType[ex.exercise_type]) byType[ex.exercise_type] = { attempts: 0, successes: 0 };
      byType[ex.exercise_type].attempts += ex.attempts;
      byType[ex.exercise_type].successes += ex.successes;
    }
    return byType;
  }, [filteredSpares]);

  // Compute game stats
  const gameStats = useMemo(() => {
    if (filteredGames.length === 0) return null;
    const total = filteredGames.length;
    const avgScore = filteredGames.reduce((s: number, g: any) => s + g.score, 0) / total;
    const avgStrike = filteredGames.reduce((s: number, g: any) => s + g.strikePercentage, 0) / total;
    const avgSpare = filteredGames.reduce((s: number, g: any) => s + g.sparePercentage, 0) / total;
    const high = Math.max(...filteredGames.map((g: any) => g.score));
    return { total, avgScore, avgStrike, avgSpare, high };
  }, [filteredGames]);

  if (isLoading) return <p className="text-muted-foreground">Chargement...</p>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {players.length > 1 && players.map(p => (
          <Button
            key={p.id}
            variant={activePlayerId === p.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPlayerId(p.id)}
          >
            {p.name}
          </Button>
        ))}
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout</SelectItem>
            <SelectItem value="1">Aujourd'hui</SelectItem>
            <SelectItem value="7">7 jours</SelectItem>
            <SelectItem value="15">15 jours</SelectItem>
            <SelectItem value="30">30 jours</SelectItem>
            <SelectItem value="90">3 mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Game stats */}
      {gameStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-3 pb-2 text-center">
              <p className="text-2xl font-bold text-primary">{gameStats.total}</p>
              <p className="text-[10px] text-muted-foreground">Parties</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-3 pb-2 text-center">
              <p className="text-2xl font-bold text-primary">{gameStats.avgScore.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">Moyenne</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="pt-3 pb-2 text-center">
              <p className="text-2xl font-bold text-green-600">{gameStats.high}</p>
              <p className="text-[10px] text-muted-foreground">High</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <CardContent className="pt-3 pb-2 text-center">
              <p className="text-2xl font-bold text-amber-600">{gameStats.avgStrike.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">Strike</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="pt-3 pb-2 text-center">
              <p className="text-2xl font-bold text-blue-600">{gameStats.avgSpare.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">Spare</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Spare training stats */}
      {Object.keys(spareStats).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-500" />
              Précision Spares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(spareStats).map(([type, stats]) => {
                const label = SPARE_EXERCISE_TYPES.find(t => t.value === type)?.label || type;
                const rate = stats.attempts > 0 ? (stats.successes / stats.attempts) * 100 : 0;
                return (
                  <div key={type} className="p-3 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="secondary">{label}</Badge>
                      <span className="text-lg font-bold text-primary">{rate.toFixed(1)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats.successes}/{stats.attempts} réussites
                    </p>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frame analysis for training games */}
      {filteredGames.length > 0 && (
        <BowlingFrameAnalysis games={filteredGames} />
      )}

      {/* Empty state */}
      {!gameStats && Object.keys(spareStats).length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune donnée d'entraînement bowling pour cette période.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
