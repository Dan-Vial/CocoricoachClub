import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, CalendarIcon, Users, Target, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import { TENNIS_EXERCISE_TYPES } from "./TennisDrillTraining";
import { getExcelBranding, addBrandedHeader, styleDataHeaderRow, addZebraRows, addFooter, downloadWorkbook } from "@/lib/excelExport";
import { preparePdfWithSettings } from "@/lib/pdfExport";

interface TennisTrainingStatsProps {
  categoryId: string;
}

interface TrainingMatchData {
  matchId: string;
  matchDate: string;
  opponent: string;
  playerId: string;
  playerName: string;
  stats: Record<string, number>;
}

export function TennisTrainingStats({ categoryId }: TennisTrainingStatsProps) {
  const [activeTab, setActiveTab] = useState("drills");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("all");

  // Fetch drill training data
  const { data: drillData, isLoading: loadingDrills } = useQuery({
    queryKey: ["tennis_training_stats", categoryId, "drills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tennis_drill_training" as any)
        .select("*, player:players(name, first_name)")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // Fetch training matches and their stats
  const { data: matchData, isLoading: loadingMatches } = useQuery({
    queryKey: ["tennis_training_stats", categoryId, "matches"],
    queryFn: async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, match_date, opponent")
        .eq("category_id", categoryId)
        .eq("event_type", "training")
        .order("match_date", { ascending: false });

      if (!matches || matches.length === 0) return [];

      const matchIds = matches.map((m) => m.id);
      const { data: stats } = await supabase
        .from("player_match_stats")
        .select("*, players(id, name, first_name)")
        .in("match_id", matchIds);

      const result: TrainingMatchData[] = [];
      for (const stat of stats || []) {
        const match = matches.find((m) => m.id === stat.match_id);
        const player = stat.players as any;
        const statData = ((stat.sport_data as Record<string, any>) || {}) as Record<string, number>;
        result.push({
          matchId: stat.match_id,
          matchDate: match?.match_date || "",
          opponent: match?.opponent || "",
          playerId: stat.player_id,
          playerName: player ? [player.first_name, player.name].filter(Boolean).join(" ") : "Athlète",
          stats: statData,
        });
      }
      return result;
    },
  });

  // All players from both sources
  const players = useMemo(() => {
    const map = new Map<string, string>();
    (drillData || []).forEach((d: any) => {
      const p = d.player;
      if (p && !map.has(d.player_id)) {
        map.set(d.player_id, [p.first_name, p.name].filter(Boolean).join(" "));
      }
    });
    (matchData || []).forEach((d) => {
      if (!map.has(d.playerId)) map.set(d.playerId, d.playerName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [drillData, matchData]);

  const dateFilter = (dateStr: string) => {
    if (!dateFrom && !dateTo) return true;
    const d = new Date(dateStr);
    if (dateFrom && isBefore(d, startOfDay(dateFrom))) return false;
    if (dateTo && isAfter(d, endOfDay(dateTo))) return false;
    return true;
  };

  // Drill stats per player
  const playerDrillStats = useMemo(() => {
    if (!drillData) return [];
    const filteredPlayers = selectedPlayerId === "all" ? players : players.filter(p => p.id === selectedPlayerId);

    return filteredPlayers.map(player => {
      const drills = drillData.filter((ex: any) => ex.player_id === player.id && dateFilter(ex.session_date));
      if (drills.length === 0) return null;

      const byType: Record<string, { attempts: number; successes: number }> = {};
      let totalAttempts = 0, totalSuccesses = 0;

      for (const ex of drills) {
        if (!byType[ex.exercise_type]) byType[ex.exercise_type] = { attempts: 0, successes: 0 };
        byType[ex.exercise_type].attempts += ex.attempts;
        byType[ex.exercise_type].successes += ex.successes;
        totalAttempts += ex.attempts;
        totalSuccesses += ex.successes;
      }

      const rate = totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0;
      return { player, byType, total: { totalAttempts, totalSuccesses, rate }, sessions: drills.length };
    }).filter(Boolean) as Array<{
      player: { id: string; name: string };
      byType: Record<string, { attempts: number; successes: number }>;
      total: { totalAttempts: number; totalSuccesses: number; rate: number };
      sessions: number;
    }>;
  }, [drillData, players, selectedPlayerId, dateFrom, dateTo]);

  // Match stats per player
  const playerMatchStats = useMemo(() => {
    if (!matchData) return [];
    const filtered = matchData.filter(d => {
      if (selectedPlayerId !== "all" && d.playerId !== selectedPlayerId) return false;
      return dateFilter(d.matchDate);
    });

    const grouped = new Map<string, TrainingMatchData[]>();
    filtered.forEach(d => {
      const arr = grouped.get(d.playerId) || [];
      arr.push(d);
      grouped.set(d.playerId, arr);
    });

    return Array.from(grouped.entries()).map(([playerId, entries]) => {
      const count = entries.length;
      const displayKeys = ["aces", "doubleFaults", "winners", "unforcedErrors", "firstServePercentage", "breakPointConversion"];
      const avgStats: Record<string, number> = {};
      displayKeys.forEach(key => {
        const sum = entries.reduce((s, e) => s + (e.stats[key] || 0), 0);
        avgStats[key] = Math.round((sum / count) * 10) / 10;
      });
      return { playerId, playerName: entries[0].playerName, matchCount: count, avgStats };
    });
  }, [matchData, selectedPlayerId, dateFrom, dateTo]);

  const getTypeLabel = (type: string) => TENNIS_EXERCISE_TYPES.find(t => t.value === type)?.label || type;

  const isLoading = loadingDrills || loadingMatches;

  if (isLoading) {
    return <p className="text-muted-foreground text-center py-8">Chargement...</p>;
  }

  const hasDrillData = playerDrillStats.length > 0;
  const hasMatchData = playerMatchStats.length > 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Athlète</label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les athlètes</SelectItem>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Du</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dateFrom ? format(dateFrom, "dd/MM/yy") : "Début"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={fr} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Au</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dateTo ? format(dateTo, "dd/MM/yy") : "Fin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={fr} />
                </PopoverContent>
              </Popover>
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
          <TabsTrigger value="drills" className="gap-2">
            <Target className="h-4 w-4" />
            Stats spécifiques
          </TabsTrigger>
          <TabsTrigger value="matches" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Stats matchs
          </TabsTrigger>
        </TabsList>

        {/* Drill stats tab */}
        <TabsContent value="drills" className="space-y-4 mt-4">
          {!hasDrillData ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune donnée d'exercices spécifiques.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Saisissez des exercices (tentatives / réussites) depuis le détail d'une séance.
                </p>
              </CardContent>
            </Card>
          ) : (
            playerDrillStats.map((ps) => (
              <Card key={ps.player.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {ps.player.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{ps.sessions} exercice{ps.sessions > 1 ? "s" : ""}</Badge>
                      <Badge variant={ps.total.rate >= 70 ? "default" : ps.total.rate >= 50 ? "secondary" : "destructive"}>
                        Global : {ps.total.rate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(ps.byType)
                      .sort((a, b) => b[1].attempts - a[1].attempts)
                      .map(([type, data]) => {
                        const rate = data.attempts > 0 ? (data.successes / data.attempts) * 100 : 0;
                        return (
                          <div key={type} className="p-3 rounded-lg bg-muted/50 space-y-1">
                            <p className="text-xs font-medium truncate">{getTypeLabel(type)}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {data.successes}/{data.attempts}
                              </span>
                              <Badge
                                variant={rate >= 70 ? "default" : rate >= 50 ? "secondary" : "destructive"}
                                className="text-xs"
                              >
                                {rate.toFixed(1)}%
                              </Badge>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full h-1.5 rounded-full bg-muted">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  rate >= 70 ? "bg-primary" : rate >= 50 ? "bg-amber-500" : "bg-destructive"
                                }`}
                                style={{ width: `${Math.min(rate, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Match stats tab */}
        <TabsContent value="matches" className="space-y-4 mt-4">
          {!hasMatchData ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun match d'entraînement avec statistiques.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Créez un match d'entraînement, saisissez les stats, puis retrouvez-les ici.
                </p>
              </CardContent>
            </Card>
          ) : (
            playerMatchStats.map((player) => (
              <Card key={player.playerId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {player.playerName}
                    </CardTitle>
                    <Badge variant="secondary">
                      {player.matchCount} match{player.matchCount > 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { key: "aces", label: "Aces", icon: "🎯" },
                      { key: "doubleFaults", label: "Dbl Fautes", icon: "❌" },
                      { key: "winners", label: "Winners", icon: "💥" },
                      { key: "unforcedErrors", label: "Fautes directes", icon: "⚠️" },
                      { key: "firstServePercentage", label: "% 1ère balle", icon: "📊", suffix: "%" },
                      { key: "breakPointConversion", label: "% Break", icon: "🔑", suffix: "%" },
                    ].map((stat) => (
                      <div key={stat.key} className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center">
                        <span className="text-lg">{stat.icon}</span>
                        <span className="text-xl font-bold mt-1">
                          {player.avgStats[stat.key] ?? 0}{stat.suffix || ""}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
