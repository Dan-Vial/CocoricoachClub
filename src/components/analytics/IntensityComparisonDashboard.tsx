import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  Line,
  ReferenceLine
} from "recharts";
import { Target, Users, AlertTriangle, TrendingUp, TrendingDown, Minus, Calculator, Info } from "lucide-react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { calculateWeightedRpe, checkTeamRpeAlert } from "@/lib/weightedRpeCalculations";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface IntensityComparisonDashboardProps {
  categoryId: string;
}

export function IntensityComparisonDashboard({ categoryId }: IntensityComparisonDashboardProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players-intensity", categoryId],
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

  // Fetch sessions with planned intensity
  const { data: sessions } = useQuery({
    queryKey: ["sessions-intensity", categoryId, dateRange],
    queryFn: async () => {
      const fromDate = subDays(new Date(), parseInt(dateRange)).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, session_date, training_type, intensity, notes")
        .eq("category_id", categoryId)
        .gte("session_date", fromDate)
        .order("session_date");
      if (error) throw error;
      return data;
    },
  });

  // Fetch session blocks for weighted RPE calculation
  const { data: sessionBlocks } = useQuery({
    queryKey: ["session-blocks-intensity", categoryId, dateRange],
    queryFn: async () => {
      if (!sessions || sessions.length === 0) return [];
      const sessionIds = sessions.map(s => s.id);
      const { data, error } = await supabase
        .from("training_session_blocks")
        .select("*")
        .in("training_session_id", sessionIds)
        .order("block_order");
      if (error) throw error;
      return data;
    },
    enabled: !!sessions && sessions.length > 0,
  });

  // Fetch AWCR data (actual RPE)
  const { data: awcrData } = useQuery({
    queryKey: ["awcr-intensity", categoryId, dateRange],
    queryFn: async () => {
      const fromDate = subDays(new Date(), parseInt(dateRange)).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("player_id, session_date, rpe, training_session_id, training_load")
        .eq("category_id", categoryId)
        .gte("session_date", fromDate)
        .order("session_date");
      if (error) throw error;
      return data;
    },
  });

  // Get unique positions
  const positions = useMemo(() => {
    if (!players) return [];
    const posSet = new Set(players.map(p => p.position).filter(Boolean));
    return Array.from(posSet).sort();
  }, [players]);

  // Filter players by position
  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    if (selectedPosition === "all") return players;
    return players.filter(p => p.position === selectedPosition);
  }, [players, selectedPosition]);

  // Group session blocks by session ID
  const blocksBySession = useMemo(() => {
    if (!sessionBlocks) return new Map<string, typeof sessionBlocks>();
    const map = new Map<string, typeof sessionBlocks>();
    sessionBlocks.forEach(block => {
      const existing = map.get(block.training_session_id) || [];
      existing.push(block);
      map.set(block.training_session_id, existing);
    });
    return map;
  }, [sessionBlocks]);

  // Calculate comparison data with weighted RPE
  const comparisonData = useMemo(() => {
    if (!sessions || !awcrData || !players) return [];

    const playersToAnalyze = selectedPlayer === "all" 
      ? filteredPlayers 
      : filteredPlayers.filter(p => p.id === selectedPlayer);

    // Group by session
    const sessionMap = new Map<string, {
      date: string;
      planned: number;
      weightedPlanned: number;
      hasBlocks: boolean;
      actual: number[];
      sessionType: string;
    }>();

    sessions.forEach(session => {
      // Calculate weighted RPE from blocks if available
      const blocks = blocksBySession.get(session.id) || [];
      const weightedResult = calculateWeightedRpe(blocks as any);
      
      // Use weighted RPE if available, otherwise fall back to session intensity
      const effectivePlanned = weightedResult.hasValidData 
        ? weightedResult.weightedRpe 
        : session.intensity || 0;

      if (effectivePlanned > 0 || session.intensity) {
        sessionMap.set(session.id, {
          date: session.session_date,
          planned: session.intensity || 0,
          weightedPlanned: effectivePlanned,
          hasBlocks: weightedResult.hasValidData,
          actual: [],
          sessionType: session.training_type,
        });
      }
    });

    // Add actual RPE values
    awcrData.forEach(awcr => {
      if (awcr.training_session_id && sessionMap.has(awcr.training_session_id)) {
        const playerMatch = playersToAnalyze.find(p => p.id === awcr.player_id);
        if (playerMatch) {
          sessionMap.get(awcr.training_session_id)!.actual.push(awcr.rpe);
        }
      }
    });

    // Convert to chart data
    return Array.from(sessionMap.entries())
      .filter(([_, data]) => data.actual.length > 0)
      .map(([id, data]) => {
        const avgActual = data.actual.reduce((a, b) => a + b, 0) / data.actual.length;
        const diff = avgActual - data.weightedPlanned;
        return {
          id,
          date: format(new Date(data.date), "dd/MM", { locale: fr }),
          fullDate: data.date,
          planned: data.weightedPlanned, // Use weighted value for display
          originalPlanned: data.planned,
          hasBlocks: data.hasBlocks,
          actual: parseFloat(avgActual.toFixed(1)),
          diff: parseFloat(diff.toFixed(1)),
          sessionType: data.sessionType,
          playerCount: data.actual.length,
        };
      })
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [sessions, awcrData, players, selectedPlayer, filteredPlayers, blocksBySession]);

  // Calculate per-player stats with weighted RPE
  const playerStats = useMemo(() => {
    if (!sessions || !awcrData || !players) return [];

    const playersToAnalyze = selectedPosition === "all" 
      ? players 
      : players.filter(p => p.position === selectedPosition);

    return playersToAnalyze.map(player => {
      const playerAwcr = awcrData.filter(a => a.player_id === player.id);
      
      let totalDiff = 0;
      let count = 0;
      
      playerAwcr.forEach(awcr => {
        if (awcr.training_session_id) {
          const session = sessions.find(s => s.id === awcr.training_session_id);
          if (session) {
            // Calculate weighted RPE for this session
            const blocks = blocksBySession.get(session.id) || [];
            const weightedResult = calculateWeightedRpe(blocks as any);
            const effectivePlanned = weightedResult.hasValidData 
              ? weightedResult.weightedRpe 
              : session.intensity || 0;

            if (effectivePlanned > 0) {
              totalDiff += awcr.rpe - effectivePlanned;
              count++;
            }
          }
        }
      });

      const avgDiff = count > 0 ? totalDiff / count : 0;
      
      return {
        id: player.id,
        name: player.name,
        position: player.position,
        avgDiff: parseFloat(avgDiff.toFixed(1)),
        sessionsCount: count,
        status: avgDiff > 1.5 ? "over" : avgDiff < -1.5 ? "under" : "optimal",
      };
    }).filter(p => p.sessionsCount > 0)
      .sort((a, b) => Math.abs(b.avgDiff) - Math.abs(a.avgDiff));
  }, [sessions, awcrData, players, selectedPosition, blocksBySession]);

  // Check for team-wide RPE alert (>5 athletes with +2 gap)
  const teamAlert = useMemo(() => {
    const gaps = playerStats.map(p => ({
      playerId: p.id,
      playerName: p.name,
      gap: p.avgDiff,
    }));
    return checkTeamRpeAlert(gaps, 5, 2);
  }, [playerStats]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (comparisonData.length === 0) return null;

    const avgPlanned = comparisonData.reduce((a, b) => a + b.planned, 0) / comparisonData.length;
    const avgActual = comparisonData.reduce((a, b) => a + b.actual, 0) / comparisonData.length;
    const overCount = playerStats.filter(p => p.status === "over").length;
    const underCount = playerStats.filter(p => p.status === "under").length;

    return {
      avgPlanned: avgPlanned.toFixed(1),
      avgActual: avgActual.toFixed(1),
      avgDiff: (avgActual - avgPlanned).toFixed(1),
      overCount,
      underCount,
      optimalCount: playerStats.length - overCount - underCount,
    };
  }, [comparisonData, playerStats]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "over":
        return <Badge className="bg-red-500 text-white">Surcharge</Badge>;
      case "under":
        return <Badge className="bg-yellow-500 text-white">Sous-charge</Badge>;
      default:
        return <Badge className="bg-green-500 text-white">Optimal</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "over":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "under":
        return <TrendingDown className="h-4 w-4 text-yellow-500" />;
      default:
        return <Minus className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Alert Banner */}
      {teamAlert.hasAlert && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-600 dark:text-red-400">
                Alerte : Écart significatif détecté
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {teamAlert.message}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {teamAlert.affectedAthletes.slice(0, 5).map(a => (
                  <Badge key={a.playerId} variant="destructive" className="text-xs">
                    {a.playerName} (+{a.gap.toFixed(1)})
                  </Badge>
                ))}
                {teamAlert.affectedAthletes.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{teamAlert.affectedAthletes.length - 5} autres
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Intensité Prévue vs Subie
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    L'intensité prévue est calculée comme une <strong>moyenne pondérée</strong> basée sur la durée et l'intensité de chaque bloc thématique de la séance.
                  </p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Période</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 derniers jours</SelectItem>
                  <SelectItem value="14">14 derniers jours</SelectItem>
                  <SelectItem value="30">30 derniers jours</SelectItem>
                  <SelectItem value="60">60 derniers jours</SelectItem>
                  <SelectItem value="90">90 derniers jours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Poste</Label>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les postes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les postes</SelectItem>
                  {positions.map(pos => (
                    <SelectItem key={pos} value={pos || "unknown"}>{pos || "Non défini"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Athlète</Label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les athlètes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les athlètes</SelectItem>
                  {filteredPlayers.map(player => (
                    <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Intensité moyenne prévue</p>
            <p className="text-2xl font-bold">{summaryStats.avgPlanned}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Intensité moyenne réelle</p>
            <p className="text-2xl font-bold">{summaryStats.avgActual}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Écart moyen</p>
            <p className={cn(
              "text-2xl font-bold",
              parseFloat(summaryStats.avgDiff) > 0 ? "text-red-500" : 
              parseFloat(summaryStats.avgDiff) < 0 ? "text-yellow-500" : "text-green-500"
            )}>
              {parseFloat(summaryStats.avgDiff) > 0 ? "+" : ""}{summaryStats.avgDiff}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Athlètes hors cible</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">
                {summaryStats.overCount + summaryStats.underCount}
              </p>
              {(summaryStats.overCount + summaryStats.underCount) > 0 && (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comparaison par séance</CardTitle>
        </CardHeader>
        <CardContent>
          {comparisonData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucune donnée disponible pour cette période</p>
              <p className="text-sm">Assurez-vous que les séances ont une intensité prévue et des RPE enregistrés</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  domain={[0, 10]} 
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{data.fullDate}</p>
                          <p className="text-sm">
                            Prévu: <span className="font-bold text-blue-500">{data.planned.toFixed(1)}</span>
                            {data.hasBlocks && (
                              <span className="text-xs text-muted-foreground ml-1">(pondéré)</span>
                            )}
                          </p>
                          <p className="text-sm">Réel: <span className="font-bold text-green-500">{data.actual}</span></p>
                          <p className="text-sm">Écart: <span className={cn(
                            "font-bold",
                            data.diff > 0 ? "text-red-500" : data.diff < 0 ? "text-yellow-500" : "text-green-500"
                          )}>{data.diff > 0 ? "+" : ""}{data.diff.toFixed(1)}</span></p>
                          <p className="text-xs text-muted-foreground mt-1">{data.playerCount} athlète(s)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <ReferenceLine y={5} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                <Bar dataKey="planned" fill="hsl(var(--primary))" name="Intensité prévue" opacity={0.7} />
                <Bar dataKey="actual" fill="hsl(142, 71%, 45%)" name="Intensité réelle" opacity={0.9} />
                <Line 
                  type="monotone" 
                  dataKey="diff" 
                  stroke="hsl(var(--destructive))" 
                  name="Écart"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--destructive))" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Player Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Détail par athlète
          </CardTitle>
        </CardHeader>
        <CardContent>
          {playerStats.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">Aucune donnée</p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {playerStats.map(player => (
                  <div 
                    key={player.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      player.status === "over" && "border-red-500/30 bg-red-500/5",
                      player.status === "under" && "border-yellow-500/30 bg-yellow-500/5",
                      player.status === "optimal" && "border-green-500/30 bg-green-500/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(player.status)}
                      <div>
                        <p className="font-medium">{player.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {player.position || "—"} • {player.sessionsCount} séance(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={cn(
                          "font-bold",
                          player.avgDiff > 0 ? "text-red-500" : 
                          player.avgDiff < 0 ? "text-yellow-500" : "text-green-500"
                        )}>
                          {player.avgDiff > 0 ? "+" : ""}{player.avgDiff}
                        </p>
                        <p className="text-xs text-muted-foreground">écart moyen</p>
                      </div>
                      {getStatusBadge(player.status)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
