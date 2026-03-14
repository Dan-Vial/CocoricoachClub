import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, BedDouble, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";
import { useState } from "react";

interface SleepAnalyticsProps {
  categoryId: string;
}

export function SleepAnalytics({ categoryId }: SleepAnalyticsProps) {
  const [period, setPeriod] = useState<"7" | "14" | "30">("14");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: wellnessData, isLoading } = useQuery({
    queryKey: ["sleep-analytics", categoryId, period, selectedPlayer],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), Number(period)), "yyyy-MM-dd");
      let query = supabase
        .from("wellness_tracking")
        .select("*, players(name, first_name)")
        .eq("category_id", categoryId)
        .gte("tracking_date", startDate)
        .order("tracking_date", { ascending: true });

      if (selectedPlayer !== "all") {
        query = query.eq("player_id", selectedPlayer);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground p-4">Chargement...</div>;
  }

  if (!wellnessData || wellnessData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Moon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Aucune donnée de sommeil disponible</p>
          <p className="text-sm mt-1">Les données proviennent du questionnaire Wellness quotidien.</p>
        </CardContent>
      </Card>
    );
  }

  // Daily averages for chart
  const dailyMap: Record<string, { qualities: number[]; durations: number[]; count: number }> = {};
  wellnessData.forEach((e: any) => {
    if (!dailyMap[e.tracking_date]) {
      dailyMap[e.tracking_date] = { qualities: [], durations: [], count: 0 };
    }
    dailyMap[e.tracking_date].qualities.push(e.sleep_quality || 0);
    dailyMap[e.tracking_date].durations.push(e.sleep_duration || 0);
    dailyMap[e.tracking_date].count++;
  });

  const dailyChartData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: format(new Date(date), "dd/MM", { locale: fr }),
      qualité: Math.round(data.qualities.reduce((s, v) => s + v, 0) / data.count * 10) / 10,
      durée: Math.round(data.durations.reduce((s, v) => s + v, 0) / data.count * 10) / 10,
    }));

  // Per-player sleep stats
  const playerMap: Record<string, { name: string; qualities: number[]; durations: number[]; entries: any[] }> = {};
  wellnessData.forEach((e: any) => {
    if (!playerMap[e.player_id]) {
      const fullName = [e.players?.first_name, e.players?.name].filter(Boolean).join(" ") || "Inconnu";
      playerMap[e.player_id] = { name: fullName, qualities: [], durations: [], entries: [] };
    }
    playerMap[e.player_id].qualities.push(e.sleep_quality || 0);
    playerMap[e.player_id].durations.push(e.sleep_duration || 0);
    playerMap[e.player_id].entries.push(e);
  });

  const playerStats = Object.entries(playerMap).map(([id, data]) => {
    const avgQuality = data.qualities.reduce((s, v) => s + v, 0) / data.qualities.length;
    const avgDuration = data.durations.reduce((s, v) => s + v, 0) / data.durations.length;

    // Trend: compare first half vs second half
    // Scale: 1=best, 5=worst → lower second half = improving
    const mid = Math.floor(data.qualities.length / 2);
    const firstHalf = data.qualities.slice(0, mid);
    const secondHalf = data.qualities.slice(mid);
    let trend: "improving" | "stable" | "declining" = "stable";
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
      // Lower is better: if second half is lower → improving
      if (avgFirst - avgSecond > 0.4) trend = "improving";
      else if (avgSecond - avgFirst > 0.4) trend = "declining";
    }

    // Worst night (highest value = worst, since 1=best, 5=worst)
    const worstQuality = Math.max(...data.qualities);
    const bestQuality = Math.min(...data.qualities);

    return {
      id,
      name: data.name,
      avgQuality: Math.round(avgQuality * 10) / 10,
      avgDuration: Math.round(avgDuration * 10) / 10,
      trend,
      worstQuality,
      bestQuality,
      daysOfData: data.qualities.length,
      poorNights: data.qualities.filter(q => q >= 4).length, // 4 or 5 = poor sleep
    };
  }).sort((a, b) => b.avgQuality - a.avgQuality); // Worst (highest) first

  // Team averages
  const teamAvgQuality = playerStats.length > 0
    ? Math.round(playerStats.reduce((s, p) => s + p.avgQuality, 0) / playerStats.length * 10) / 10
    : 0;
  const teamAvgDuration = playerStats.length > 0
    ? Math.round(playerStats.reduce((s, p) => s + p.avgDuration, 0) / playerStats.length * 10) / 10
    : 0;
  const playersWithPoorSleep = playerStats.filter(p => p.avgQuality >= 3.5); // 1=best, >=3.5 = poor

  // Color functions: 1=best (green), 5=worst (red)
  const getQualityColor = (score: number) => {
    if (score <= 2) return "text-green-600";
    if (score <= 3) return "text-amber-600";
    return "text-red-600";
  };

  const getQualityBg = (score: number) => {
    if (score <= 2) return "bg-green-500/10 border-green-500/30";
    if (score <= 3) return "bg-amber-500/10 border-amber-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === "declining") return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  // Bar chart for player comparison
  const barData = playerStats.map(p => ({
    name: p.name.split(" ").pop() || p.name,
    qualité: p.avgQuality,
    durée: p.avgDuration,
  }));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={period} onValueChange={(v) => setPeriod(v as "7" | "14" | "30")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="14">14 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tous les joueurs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les joueurs</SelectItem>
            {players?.map((player) => (
              <SelectItem key={player.id} value={player.id}>
                {[player.first_name, player.name].filter(Boolean).join(" ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-indigo-500/10 border-indigo-500/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Moon className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-medium">Qualité moyenne</span>
            </div>
            <p className={`text-2xl font-bold ${getQualityColor(teamAvgQuality)}`}>
              {teamAvgQuality}/5
            </p>
          </CardContent>
        </Card>

        <Card className="bg-violet-500/10 border-violet-500/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <BedDouble className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-medium">Durée moyenne</span>
            </div>
            <p className="text-2xl font-bold text-violet-600">
              {teamAvgDuration}/5
            </p>
          </CardContent>
        </Card>

        <Card className={playersWithPoorSleep.length > 0 ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30"}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">Sommeil insuffisant</span>
            </div>
            <p className={`text-2xl font-bold ${playersWithPoorSleep.length > 0 ? "text-red-600" : "text-green-600"}`}>
              {playersWithPoorSleep.length}
            </p>
            <p className="text-xs text-muted-foreground">joueur{playersWithPoorSleep.length > 1 ? "s" : ""} ≥ 3.5/5</p>
          </CardContent>
        </Card>

        <Card className="bg-sky-500/10 border-sky-500/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Moon className="h-4 w-4 text-sky-500" />
              <span className="text-xs font-medium">Données</span>
            </div>
            <p className="text-2xl font-bold text-sky-600">
              {wellnessData.length}
            </p>
            <p className="text-xs text-muted-foreground">entrées sur {period}j</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily trend */}
        {dailyChartData.length > 2 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Évolution quotidienne du sommeil</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="qualité" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Qualité" />
                  <Line type="monotone" dataKey="durée" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" name="Durée" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Player comparison */}
        {barData.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Comparaison par joueur</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip />
                  <Legend />
                   <Bar dataKey="qualité" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={10} name="Qualité">
                    {barData.map((entry, index) => (
                      <Cell key={index} fill={entry.qualité <= 2 ? "#22c55e" : entry.qualité <= 3 ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Bar>
                  <Bar dataKey="durée" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={10} opacity={0.7} name="Durée" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Player detail cards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Détail sommeil par joueur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {playerStats.map((player) => (
              <div
                key={player.id}
                className={`p-3 rounded-lg border space-y-2 ${getQualityBg(player.avgQuality)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{player.name}</span>
                  {getTrendIcon(player.trend)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Qualité moy.</span>
                    <p className={`font-bold ${getQualityColor(player.avgQuality)}`}>
                      {player.avgQuality}/5
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Durée moy.</span>
                    <p className="font-bold">{player.avgDuration}/5</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                  <span>Min: {player.worstQuality}/5 • Max: {player.bestQuality}/5</span>
                  <span>{player.daysOfData}j</span>
                </div>

                {player.poorNights > 0 && (
                  <p className="text-xs text-red-600 font-medium">
                    ⚠️ {player.poorNights} nuit{player.poorNights > 1 ? "s" : ""} de mauvaise qualité
                  </p>
                )}
                {player.trend === "declining" && (
                  <p className="text-xs text-orange-600">
                    📉 Qualité en déclin sur la période
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
