import { useState, useMemo } from "react";
import { calculateWeightedRpe } from "@/lib/weightedRpeCalculations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar,
  Users,
  Eye
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface RpePlanVsActualProps {
  categoryId: string;
  onPlayerClick?: (playerId: string) => void;
}

interface PlayerRpeComparison {
  playerId: string;
  playerName: string;
  position?: string;
  plannedRpe: number;
  actualRpe: number;
  difference: number;
  sessionDate: string;
  sessionName?: string;
}

export function RpePlanVsActual({ categoryId, onPlayerClick }: RpePlanVsActualProps) {
  const [periodDays, setPeriodDays] = useState(7);
  const [showDetails, setShowDetails] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line" | "area">("bar");

  // Fetch training sessions with planned intensity
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["rpe-comparison", categoryId, periodDays],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), periodDays), "yyyy-MM-dd");
      
      // Fetch training sessions with intensity (= planned RPE)
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("id, session_date, training_type, notes, intensity, planned_intensity")
        .eq("category_id", categoryId)
        .gte("session_date", startDate)
        .order("session_date", { ascending: false }) as { data: any[] | null, error: any };

      if (sessionsError) throw sessionsError;

      // Fetch session blocks for weighted RPE calculation
      const sessionIds = sessions?.map(s => s.id) || [];
      let blocksData: any[] = [];
      if (sessionIds.length > 0) {
        const { data: blocks } = await supabase
          .from("training_session_blocks")
          .select("*")
          .in("training_session_id", sessionIds);
        blocksData = blocks || [];
      }

      // Fetch AWCR data (actual RPE)
      const { data: awcrData, error: awcrError } = await supabase
        .from("awcr_tracking")
        .select(`
          id,
          player_id,
          session_date,
          rpe,
          training_session_id,
          players(id, name, first_name, position)
        `)
        .eq("category_id", categoryId)
        .gte("session_date", startDate);

      if (awcrError) throw awcrError;

      return { sessions, awcrData, blocksData };
    },
  });

  // Process data to compare planned vs actual RPE
  const comparisonData = useMemo(() => {
    if (!sessionsData) return { comparisons: [], alert: null, summary: null };

    const { sessions, awcrData, blocksData } = sessionsData;
    const comparisons: PlayerRpeComparison[] = [];

    // Group blocks by session
    const blocksBySession = new Map<string, any[]>();
    blocksData?.forEach((block: any) => {
      const sessionId = block.training_session_id;
      if (!blocksBySession.has(sessionId)) blocksBySession.set(sessionId, []);
      blocksBySession.get(sessionId)!.push(block);
    });

    // Group AWCR by session
    const awcrBySession = new Map<string, typeof awcrData>();
    awcrData?.forEach(entry => {
      const sessionId = entry.training_session_id;
      if (sessionId) {
        if (!awcrBySession.has(sessionId)) {
          awcrBySession.set(sessionId, []);
        }
        awcrBySession.get(sessionId)!.push(entry);
      }
    });

    // Compare each session with planned intensity
    sessions?.forEach(session => {
      // Priority: planned_intensity > weighted RPE from blocks > intensity
      let plannedRpe = session.planned_intensity || 0;
      
      if (plannedRpe === 0) {
        // Try weighted RPE from blocks
        const sessionBlocks = blocksBySession.get(session.id) || [];
        if (sessionBlocks.length > 0) {
          const weighted = calculateWeightedRpe(sessionBlocks);
          if (weighted.hasValidData) {
            plannedRpe = Math.round(weighted.weightedRpe * 10) / 10;
          }
        }
      }
      
      if (plannedRpe === 0) {
        // Fall back to session intensity
        plannedRpe = session.intensity || 0;
      }
      
      if (plannedRpe === 0) return; // Skip sessions without any intensity data

      const sessionAwcr = awcrBySession.get(session.id) || [];
      
      sessionAwcr.forEach(entry => {
        const actualRpe = entry.rpe;
        const difference = actualRpe - plannedRpe;
        const playerData = entry.players as any;

        comparisons.push({
          playerId: entry.player_id,
          playerName: [playerData?.first_name, playerData?.name].filter(Boolean).join(" ") || "Inconnu",
          position: playerData?.position,
          plannedRpe,
          actualRpe,
          difference: Math.round(difference * 10) / 10,
          sessionDate: session.session_date,
          sessionName: session.training_type,
        });
      });
    });

    // Check alert condition: more than 5 players with +2 difference
    const playersWithHighDiff = comparisons.filter(c => c.difference >= 2);
    const uniquePlayersWithHighDiff = new Set(playersWithHighDiff.map(c => c.playerId));
    const alert = uniquePlayersWithHighDiff.size >= 5 ? {
      count: uniquePlayersWithHighDiff.size,
      players: Array.from(uniquePlayersWithHighDiff).map(id => 
        playersWithHighDiff.find(c => c.playerId === id)!
      ),
    } : null;

    // Summary stats
    const avgDifference = comparisons.length > 0
      ? comparisons.reduce((sum, c) => sum + c.difference, 0) / comparisons.length
      : 0;

    return {
      comparisons,
      alert,
      summary: {
        totalEntries: comparisons.length,
        avgDifference: Math.round(avgDifference * 10) / 10,
        aboveTarget: comparisons.filter(c => c.difference > 0).length,
        belowTarget: comparisons.filter(c => c.difference < 0).length,
        onTarget: comparisons.filter(c => Math.abs(c.difference) <= 1).length,
      },
    };
  }, [sessionsData]);

  // Aggregate by player for chart
  const chartData = useMemo(() => {
    const playerAggregates = new Map<string, {
      name: string;
      avgPlanned: number;
      avgActual: number;
      count: number;
    }>();

    comparisonData.comparisons.forEach(c => {
      const existing = playerAggregates.get(c.playerId) || {
        name: c.playerName,
        avgPlanned: 0,
        avgActual: 0,
        count: 0,
      };

      existing.avgPlanned += c.plannedRpe;
      existing.avgActual += c.actualRpe;
      existing.count += 1;
      playerAggregates.set(c.playerId, existing);
    });

    return Array.from(playerAggregates.entries())
      .map(([id, data]) => ({
        playerId: id,
        name: data.name,
        planned: Math.round((data.avgPlanned / data.count) * 10) / 10,
        actual: Math.round((data.avgActual / data.count) * 10) / 10,
        difference: Math.round(((data.avgActual - data.avgPlanned) / data.count) * 10) / 10,
      }))
      .sort((a, b) => b.difference - a.difference)
      .slice(0, 15); // Top 15 players
  }, [comparisonData]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-[250px] bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert banner */}
      {comparisonData.alert && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-700 dark:text-red-400">
                  Alerte : {comparisonData.alert.count} athlètes en surcharge
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {comparisonData.alert.count} athlètes ont un RPE réel supérieur de +2 ou plus par rapport au RPE prévu.
                  Vérifiez leur récupération et ajustez les prochaines séances si nécessaire.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {comparisonData.alert.players.slice(0, 8).map(p => (
                    <Badge 
                      key={p.playerId} 
                      variant="outline" 
                      className="text-red-600 border-red-300 cursor-pointer hover:bg-red-50"
                      onClick={() => onPlayerClick?.(p.playerId)}
                    >
                      {p.playerName} (+{p.difference})
                    </Badge>
                  ))}
                  {comparisonData.alert.players.length > 8 && (
                    <Badge variant="secondary">
                      +{comparisonData.alert.players.length - 8} autres
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main comparison card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              RPE Prévisionnel vs Réel
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select 
                value={periodDays.toString()} 
                onValueChange={(v) => setPeriodDays(Number(v))}
              >
              <SelectTrigger className="w-[120px]">
                  <Calendar className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Hier</SelectItem>
                  <SelectItem value="3">3 jours</SelectItem>
                  <SelectItem value="7">7 jours</SelectItem>
                  <SelectItem value="14">14 jours</SelectItem>
                  <SelectItem value="28">28 jours</SelectItem>
                </SelectContent>
              </Select>
              <Select value={chartType} onValueChange={(v) => setChartType(v as "bar" | "line" | "area")}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Barres</SelectItem>
                  <SelectItem value="line">Courbes</SelectItem>
                  <SelectItem value="area">Aires</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {showDetails ? "Masquer" : "Détails"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary KPIs */}
          {comparisonData.summary && comparisonData.summary.totalEntries > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{comparisonData.summary.totalEntries}</p>
                <p className="text-xs text-muted-foreground">Entrées analysées</p>
              </div>
              <div className={`rounded-lg p-3 text-center ${
                comparisonData.summary.avgDifference > 1 
                  ? "bg-red-500/10" 
                  : comparisonData.summary.avgDifference < -1 
                  ? "bg-blue-500/10" 
                  : "bg-green-500/10"
              }`}>
                <p className="text-2xl font-bold flex items-center justify-center gap-1">
                  {comparisonData.summary.avgDifference > 0 ? "+" : ""}
                  {comparisonData.summary.avgDifference}
                  {comparisonData.summary.avgDifference > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : comparisonData.summary.avgDifference < 0 ? (
                    <TrendingDown className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-green-500" />
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Écart moyen</p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{comparisonData.summary.onTarget}</p>
                <p className="text-xs text-muted-foreground">Dans la cible (±1)</p>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {comparisonData.summary.aboveTarget}
                </p>
                <p className="text-xs text-muted-foreground">Au-dessus</p>
              </div>
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              {chartType === "bar" ? (
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 10]} />
                  <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm">Prévu: <span className="font-semibold">{data.planned}</span></p>
                        <p className="text-sm">Réel: <span className="font-semibold">{data.actual}</span></p>
                        <p className={`text-sm font-bold ${data.difference > 1 ? "text-red-500" : data.difference < -1 ? "text-blue-500" : "text-green-500"}`}>
                          Écart: {data.difference > 0 ? "+" : ""}{data.difference}
                        </p>
                      </div>
                    );
                  }} />
                  <Bar dataKey="planned" fill="hsl(var(--muted-foreground))" name="Prévu" opacity={0.5} />
                  <Bar dataKey="actual" name="Réel">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.difference >= 2 ? "hsl(0, 84%, 60%)" :
                        entry.difference >= 1 ? "hsl(45, 93%, 47%)" :
                        entry.difference <= -2 ? "hsl(210, 100%, 50%)" :
                        "hsl(142, 76%, 36%)"
                      } />
                    ))}
                  </Bar>
                  <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
                </BarChart>
              ) : chartType === "line" ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis domain={[0, 10]} className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="planned" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" name="Prévu" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} name="Réel" dot={{ r: 4 }} />
                </LineChart>
              ) : (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis domain={[0, 10]} className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="planned" fill="hsl(var(--muted))" stroke="hsl(var(--muted-foreground))" fillOpacity={0.3} name="Prévu" />
                  <Area type="monotone" dataKey="actual" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" fillOpacity={0.5} name="Réel" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p>Aucune donnée de comparaison disponible</p>
              <p className="text-sm">Ajoutez une intensité prévue lors de la création des séances</p>
            </div>
          )}

          {/* Detailed list */}
          {showDetails && comparisonData.comparisons.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Détail par séance</h4>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {comparisonData.comparisons.slice(0, 30).map((c, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onPlayerClick?.(c.playerId)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <span className="font-medium">{c.playerName}</span>
                          {c.position && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({c.position})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {format(parseISO(c.sessionDate), "dd/MM", { locale: fr })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{c.plannedRpe}</span>
                          <span>→</span>
                          <span className="font-semibold">{c.actualRpe}</span>
                        </div>
                        <Badge 
                          variant="secondary"
                          className={
                            c.difference >= 2 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                            c.difference >= 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                            c.difference <= -2 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          }
                        >
                          {c.difference > 0 ? "+" : ""}{c.difference}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
