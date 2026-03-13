import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Moon,
  BedDouble,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Zap,
  ThermometerSun,
  Brain,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
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

interface RecoveryDashboardProps {
  categoryId: string;
}

interface PlayerRecovery {
  playerId: string;
  playerName: string;
  recoveryScore: number; // 0-100
  sleepQualityAvg: number;
  sleepDurationAvg: number;
  fatigueAvg: number;
  sorenessAvg: number;
  stressAvg: number;
  trend: "improving" | "stable" | "declining";
  prediction: "good" | "moderate" | "poor";
  predictionScore: number;
  daysOfData: number;
  hasSpecificPain: boolean;
}

function calculateRecoveryScore(
  sleepQuality: number,
  sleepDuration: number,
  fatigue: number,
  stress: number,
  sorenessUpper: number,
  sorenessLower: number
): number {
  // Normalize: sleep quality/duration high=good, others low=good
  // Convert all to 0-100 scale where 100 = perfect recovery
  const sleepScore = ((sleepQuality - 1) / 4) * 100;
  const durationScore = ((sleepDuration - 1) / 4) * 100;
  const fatigueScore = ((5 - fatigue) / 4) * 100;
  const stressScore = ((5 - stress) / 4) * 100;
  const sorenessUpperScore = ((5 - sorenessUpper) / 4) * 100;
  const sorenessLowerScore = ((5 - sorenessLower) / 4) * 100;

  // Weighted: sleep 30%, fatigue 25%, soreness 25%, stress 20%
  return Math.round(
    sleepScore * 0.15 +
    durationScore * 0.15 +
    fatigueScore * 0.25 +
    stressScore * 0.20 +
    sorenessUpperScore * 0.12 +
    sorenessLowerScore * 0.13
  );
}

function getRecoveryColor(score: number) {
  if (score >= 70) return "text-green-600";
  if (score >= 45) return "text-orange-500";
  return "text-red-500";
}

function getRecoveryBg(score: number) {
  if (score >= 70) return "bg-green-500/10 border-green-500/30";
  if (score >= 45) return "bg-orange-500/10 border-orange-500/30";
  return "bg-red-500/10 border-red-500/30";
}

function getRecoveryLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Bon";
  if (score >= 55) return "Moyen";
  if (score >= 40) return "Faible";
  return "Critique";
}

function getTrendIcon(trend: string) {
  if (trend === "improving") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function getPredictionBadge(prediction: string, score: number) {
  if (prediction === "good") return <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Prédiction: {score}%</Badge>;
  if (prediction === "moderate") return <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30">Prédiction: {score}%</Badge>;
  return <Badge className="bg-red-500/15 text-red-600 border-red-500/30">Prédiction: {score}%</Badge>;
}

export function RecoveryDashboard({ categoryId }: RecoveryDashboardProps) {
  // Fetch 30 days of wellness data for recovery analysis
  const { data: wellnessData, isLoading } = useQuery({
    queryKey: ["recovery_wellness_30d", categoryId],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("*, players(name, first_name)")
        .eq("category_id", categoryId)
        .gte("tracking_date", thirtyDaysAgo)
        .order("tracking_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground p-4">Chargement des données de récupération...</div>;
  }

  if (!wellnessData || wellnessData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Moon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Aucune donnée Wellness disponible</p>
          <p className="text-sm mt-1">Les données de récupération sont calculées à partir du suivi Wellness quotidien.</p>
        </CardContent>
      </Card>
    );
  }

  // Group by player
  const byPlayer: Record<string, typeof wellnessData> = {};
  wellnessData.forEach((entry: any) => {
    if (!byPlayer[entry.player_id]) byPlayer[entry.player_id] = [];
    byPlayer[entry.player_id].push(entry);
  });

  // Calculate recovery metrics per player
  const playerRecoveries: PlayerRecovery[] = Object.entries(byPlayer).map(([playerId, entries]) => {
    const playerName = (() => {
      const p = (entries as any[])[0]?.players;
      return [p?.first_name, p?.name].filter(Boolean).join(" ") || "Inconnu";
    })();

    const last7 = (entries as any[]).filter((e: any) => e.tracking_date >= format(subDays(new Date(), 7), "yyyy-MM-dd"));
    const last14 = (entries as any[]).filter((e: any) => e.tracking_date >= format(subDays(new Date(), 14), "yyyy-MM-dd"));

    const avg = (arr: any[], key: string) => arr.length > 0 ? arr.reduce((s: number, e: any) => s + (e[key] || 0), 0) / arr.length : 3;

    const recent = last7.length > 0 ? last7 : (entries as any[]).slice(0, 3);
    const sleepQualityAvg = avg(recent, "sleep_quality");
    const sleepDurationAvg = avg(recent, "sleep_duration");
    const fatigueAvg = avg(recent, "general_fatigue");
    const stressAvg = avg(recent, "stress_level");
    const sorenessUpperAvg = avg(recent, "soreness_upper_body");
    const sorenessLowerAvg = avg(recent, "soreness_lower_body");

    const recoveryScore = calculateRecoveryScore(sleepQualityAvg, sleepDurationAvg, fatigueAvg, stressAvg, sorenessUpperAvg, sorenessLowerAvg);

    // Trend: compare last 3 days vs previous 3 days
    let trend: "improving" | "stable" | "declining" = "stable";
    if (last7.length >= 4) {
      const recentGroup = (last7 as any[]).slice(0, 3);
      const olderGroup = (last7 as any[]).slice(3, 6);
      if (olderGroup.length > 0) {
        const recentScore = calculateRecoveryScore(
          avg(recentGroup, "sleep_quality"), avg(recentGroup, "sleep_duration"),
          avg(recentGroup, "general_fatigue"), avg(recentGroup, "stress_level"),
          avg(recentGroup, "soreness_upper_body"), avg(recentGroup, "soreness_lower_body")
        );
        const olderScore = calculateRecoveryScore(
          avg(olderGroup, "sleep_quality"), avg(olderGroup, "sleep_duration"),
          avg(olderGroup, "general_fatigue"), avg(olderGroup, "stress_level"),
          avg(olderGroup, "soreness_upper_body"), avg(olderGroup, "soreness_lower_body")
        );
        if (recentScore - olderScore > 8) trend = "improving";
        else if (olderScore - recentScore > 8) trend = "declining";
      }
    }

    // Prediction: simple linear projection based on trend
    let predictionScore = recoveryScore;
    if (trend === "improving") predictionScore = Math.min(100, recoveryScore + 10);
    else if (trend === "declining") predictionScore = Math.max(0, recoveryScore - 12);
    // Factor in chronic fatigue (14-day)
    if (last14.length >= 7) {
      const chronicFatigue = avg(last14 as any[], "general_fatigue");
      if (chronicFatigue > 3.5) predictionScore = Math.max(0, predictionScore - 8);
    }
    predictionScore = Math.round(predictionScore);

    const prediction: "good" | "moderate" | "poor" = 
      predictionScore >= 65 ? "good" : predictionScore >= 40 ? "moderate" : "poor";

    const hasSpecificPain = (recent as any[]).some((e: any) => e.has_specific_pain);

    return {
      playerId,
      playerName,
      recoveryScore,
      sleepQualityAvg: Math.round(sleepQualityAvg * 10) / 10,
      sleepDurationAvg: Math.round(sleepDurationAvg * 10) / 10,
      fatigueAvg: Math.round(fatigueAvg * 10) / 10,
      sorenessAvg: Math.round(((sorenessUpperAvg + sorenessLowerAvg) / 2) * 10) / 10,
      stressAvg: Math.round(stressAvg * 10) / 10,
      trend,
      prediction,
      predictionScore,
      daysOfData: (entries as any[]).length,
      hasSpecificPain,
    };
  }).sort((a, b) => a.recoveryScore - b.recoveryScore);

  // Team averages
  const teamAvgRecovery = Math.round(playerRecoveries.reduce((s, p) => s + p.recoveryScore, 0) / playerRecoveries.length);
  const teamAvgSleep = Math.round(playerRecoveries.reduce((s, p) => s + p.sleepQualityAvg, 0) / playerRecoveries.length * 10) / 10;
  const teamAvgFatigue = Math.round(playerRecoveries.reduce((s, p) => s + p.fatigueAvg, 0) / playerRecoveries.length * 10) / 10;
  const poorRecovery = playerRecoveries.filter(p => p.recoveryScore < 45);
  const decliningPlayers = playerRecoveries.filter(p => p.trend === "declining");

  // Daily team recovery chart (last 14 days)
  const dailyData: { date: string; recovery: number; sleep: number; fatigue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    const dayEntries = wellnessData.filter((e: any) => e.tracking_date === date);
    if (dayEntries.length > 0) {
      const avgSleep = dayEntries.reduce((s: number, e: any) => s + (e.sleep_quality || 0), 0) / dayEntries.length;
      const avgFatigue = dayEntries.reduce((s: number, e: any) => s + (e.general_fatigue || 0), 0) / dayEntries.length;
      const avgRecovery = dayEntries.reduce((s: number, e: any) => {
        return s + calculateRecoveryScore(
          e.sleep_quality, e.sleep_duration, e.general_fatigue,
          e.stress_level, e.soreness_upper_body, e.soreness_lower_body
        );
      }, 0) / dayEntries.length;
      dailyData.push({
        date: format(subDays(new Date(), i), "dd/MM", { locale: fr }),
        recovery: Math.round(avgRecovery),
        sleep: Math.round(avgSleep * 10) / 10,
        fatigue: Math.round(avgFatigue * 10) / 10,
      });
    }
  }

  // Bar chart data for player recovery scores
  const barData = playerRecoveries.map(p => ({
    name: p.playerName,
    score: p.recoveryScore,
    prediction: p.predictionScore,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Moon className="h-5 w-5" />
          Récupération & Sommeil
        </h3>
        <p className="text-sm text-muted-foreground">
          Basé sur les données Wellness des 30 derniers jours
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={getRecoveryBg(teamAvgRecovery)}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-medium">Récupération équipe</span>
            </div>
            <p className={`text-2xl font-bold ${getRecoveryColor(teamAvgRecovery)}`}>
              {teamAvgRecovery}%
            </p>
            <p className="text-xs text-muted-foreground">{getRecoveryLabel(teamAvgRecovery)}</p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-500/10 border-indigo-500/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <BedDouble className="h-4 w-4" />
              <span className="text-xs font-medium">Sommeil moyen</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{teamAvgSleep}/5</p>
            <p className="text-xs text-muted-foreground">Qualité moyenne</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ThermometerSun className="h-4 w-4" />
              <span className="text-xs font-medium">Fatigue moyenne</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{teamAvgFatigue}/5</p>
            <p className="text-xs text-muted-foreground">{teamAvgFatigue <= 2 ? "Optimale" : teamAvgFatigue <= 3 ? "Modérée" : "Élevée"}</p>
          </CardContent>
        </Card>

        <Card className={poorRecovery.length > 0 ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30"}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">Alertes récup.</span>
            </div>
            <p className={`text-2xl font-bold ${poorRecovery.length > 0 ? "text-red-600" : "text-green-600"}`}>
              {poorRecovery.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {decliningPlayers.length} en déclin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team trend chart */}
        {dailyData.length > 2 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Évolution récupération équipe (14j)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="percent" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: '%', position: 'insideTopLeft', offset: -5, style: { fontSize: 10 } }} />
                  <YAxis yAxisId="scale5" orientation="right" domain={[1, 5]} tick={{ fontSize: 11 }} label={{ value: '/5', position: 'insideTopRight', offset: -5, style: { fontSize: 10 } }} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = { recovery: "Récupération %", sleep: "Sommeil", fatigue: "Fatigue" };
                      return [name === "recovery" ? `${value}%` : `${value}/5`, labels[name] || name];
                    }}
                  />
                  <Legend formatter={(value) => {
                    const labels: Record<string, string> = { recovery: "Récupération", sleep: "Sommeil", fatigue: "Fatigue" };
                    return labels[value] || value;
                  }} />
                  <Line yAxisId="percent" type="monotone" dataKey="recovery" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line yAxisId="scale5" type="monotone" dataKey="sleep" stroke="#6366f1" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  <Line yAxisId="scale5" type="monotone" dataKey="fatigue" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Player bar chart */}
        {barData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Score récup. actuel vs prédiction demain
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip formatter={(value: number, name: string) => [
                    `${value}%`,
                    name === "score" ? "Actuel" : "Prédiction"
                  ]} />
                  <Legend formatter={(value) => value === "score" ? "Actuel" : "Prédiction demain"} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={12}>
                    {barData.map((entry, index) => (
                      <Cell key={index} fill={entry.score >= 70 ? "#22c55e" : entry.score >= 45 ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Bar>
                  <Bar dataKey="prediction" fill="#a78bfa" radius={[0, 4, 4, 0]} barSize={12} opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Player cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Détail par joueur</CardTitle>
          <CardDescription>Cliquer pour voir les recommandations</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {playerRecoveries.map((player) => (
                <div
                  key={player.playerId}
                  className={`p-3 rounded-lg border space-y-2 ${getRecoveryBg(player.recoveryScore)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{player.playerName}</span>
                      {player.hasSpecificPain && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      )}
                    </div>
                    {getTrendIcon(player.trend)}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${getRecoveryColor(player.recoveryScore)}`}>
                      {player.recoveryScore}%
                    </span>
                    <span className="text-xs text-muted-foreground">{getRecoveryLabel(player.recoveryScore)}</span>
                  </div>

                  <Progress
                    value={player.recoveryScore}
                    className="h-1.5"
                  />

                  <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                    <div title="Sommeil">🛏 {player.sleepQualityAvg}/5</div>
                    <div title="Fatigue">💤 {player.fatigueAvg}/5</div>
                    <div title="Courbatures">🦵 {player.sorenessAvg}/5</div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    {getPredictionBadge(player.prediction, player.predictionScore)}
                    <span className="text-xs text-muted-foreground">{player.daysOfData}j données</span>
                  </div>

                  {/* Micro recommendations */}
                  {player.recoveryScore < 45 && (
                    <p className="text-xs text-red-600 font-medium">
                      ⚠️ Réduire la charge, repos recommandé
                    </p>
                  )}
                  {player.trend === "declining" && player.recoveryScore >= 45 && (
                    <p className="text-xs text-orange-600">
                      📉 Tendance baissière, surveiller
                    </p>
                  )}
                  {player.sleepQualityAvg < 2.5 && (
                    <p className="text-xs text-indigo-600">
                      🛏 Qualité de sommeil insuffisante
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
