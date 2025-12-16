import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Activity, Info } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MenstrualCycleSection } from "@/components/category/MenstrualCycleSection";
import { 
  calculateWeightedWellnessScore, 
  detectWellnessTrend, 
  generateWellnessAlert,
  getWellnessRiskLevel,
  type WellnessEntry 
} from "@/lib/wellnessCalculations";

interface PlayerWellnessTabProps {
  playerId: string;
  categoryId: string;
}

const getScoreBadge = (score: number) => {
  if (score <= 2) return "default";
  if (score <= 3) return "secondary";
  return "destructive";
};

export function PlayerWellnessTab({ playerId, categoryId }: PlayerWellnessTabProps) {
  const { data: category } = useQuery({
    queryKey: ["category_gender", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("gender")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const isFeminine = category?.gender === "feminine";

  const { data: wellnessData, isLoading } = useQuery({
    queryKey: ["player_wellness", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("*")
        .eq("player_id", playerId)
        .order("tracking_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: awcrData } = useQuery({
    queryKey: ["player_awcr_wellness", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("awcr, session_date")
        .eq("player_id", playerId)
        .order("session_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  // Prepare chart data using weighted scores
  const chartData = wellnessData?.slice(0, 14).reverse().map((entry) => ({
    date: format(new Date(entry.tracking_date), "dd/MM", { locale: fr }),
    wellness: calculateWeightedWellnessScore(entry as WellnessEntry),
    fatigue: entry.general_fatigue,
    stress: entry.stress_level,
    soreness: (entry.soreness_upper_body + entry.soreness_lower_body) / 2,
  })) || [];

  // Get latest data for risk assessment
  const latestWellness = wellnessData?.[0];
  const latestAwcr = awcrData?.[0];

  // Calculate weighted score and trend
  const currentScore = latestWellness 
    ? calculateWeightedWellnessScore(latestWellness as WellnessEntry) 
    : null;

  const trendResult = wellnessData && wellnessData.length >= 2 
    ? detectWellnessTrend(wellnessData.slice(0, 7) as WellnessEntry[])
    : null;

  const riskLevel = latestWellness 
    ? getWellnessRiskLevel(currentScore!, latestWellness.has_specific_pain)
    : "low";

  // Generate smart alert
  const smartAlert = latestWellness && currentScore
    ? generateWellnessAlert(
        currentScore, 
        latestWellness.has_specific_pain, 
        trendResult?.trend || "stable",
        latestAwcr?.awcr ?? null
      )
    : null;

  const getRiskBadge = () => {
    switch (riskLevel) {
      case "critical":
        return <Badge variant="destructive" className="bg-red-600">Critique</Badge>;
      case "high":
        return <Badge variant="destructive">Élevé</Badge>;
      case "medium":
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Modéré</Badge>;
      default:
        return <Badge className="bg-green-500">Faible</Badge>;
    }
  };

  const getTrendIcon = () => {
    if (!trendResult) return <Minus className="h-4 w-4 text-muted-foreground" />;
    switch (trendResult.trend) {
      case "rapid_decline":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-orange-500" />;
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendLabel = () => {
    if (!trendResult) return "Données insuffisantes";
    switch (trendResult.trend) {
      case "rapid_decline": return "Détérioration rapide";
      case "declining": return "En baisse";
      case "improving": return "En amélioration";
      default: return "Stable";
    }
  };

  const getTrendBadge = () => {
    if (!trendResult) return null;
    switch (trendResult.trend) {
      case "rapid_decline":
        return <Badge variant="destructive">⚠️ Chute rapide</Badge>;
      case "declining":
        return <Badge variant="secondary" className="bg-orange-500 text-white">En baisse</Badge>;
      case "improving":
        return <Badge className="bg-green-500">En hausse</Badge>;
      default:
        return <Badge variant="outline">Stable</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Smart Alert */}
      {smartAlert && (
        <Alert 
          variant={smartAlert.type === "critical" ? "destructive" : "default"}
          className={smartAlert.type === "warning" ? "border-yellow-500 bg-yellow-500/10" : smartAlert.type === "info" ? "border-blue-500 bg-blue-500/10" : ""}
        >
          {smartAlert.type === "critical" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : smartAlert.type === "warning" ? (
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          ) : (
            <Info className="h-4 w-4 text-blue-600" />
          )}
          <AlertTitle>{smartAlert.message}</AlertTitle>
          {smartAlert.recommendations.length > 0 && (
            <AlertDescription>
              <ul className="list-disc list-inside mt-2">
                {smartAlert.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </AlertDescription>
          )}
        </Alert>
      )}

      {/* Risk Summary Card */}
      <Card className={riskLevel === "critical" || riskLevel === "high" ? "border-destructive" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Évaluation du Risque
          </CardTitle>
          <CardDescription>Basé sur Wellness pondéré + AWCR + Tendances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-medium">Niveau de risque actuel:</span>
            {getRiskBadge()}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">AWCR actuel</div>
              <div className="text-xl font-bold">
                {latestAwcr?.awcr?.toFixed(2) ?? "N/A"}
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Wellness (pondéré)</div>
              <div className="text-xl font-bold">
                {currentScore?.toFixed(2) ?? "N/A"}/5
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                Tendance {getTrendIcon()}
              </div>
              <div className="text-lg font-medium">
                {getTrendLabel()}
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Évolution</div>
              <div className="mt-1">
                {getTrendBadge()}
              </div>
            </div>
          </div>

          {latestWellness?.has_specific_pain && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive font-medium">
                <AlertTriangle className="h-4 w-4" />
                Douleur signalée
              </div>
              {latestWellness.pain_location && (
                <p className="text-sm mt-1">{latestWellness.pain_location}</p>
              )}
            </div>
          )}

          {/* Wellness Weights Info */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <strong>Score pondéré:</strong> Fatigue générale (22%) + Douleurs bas du corps (22%) + Douleurs haut du corps (18%) + Stress (14%) + Sommeil qualité/durée (24%)
          </div>
        </CardContent>
      </Card>

      {/* Evolution Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Évolution Wellness (Score Pondéré)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[1, 5]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="wellness" name="Score Global" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="fatigue" name="Fatigue" stroke="hsl(var(--destructive))" strokeWidth={1} />
                  <Line type="monotone" dataKey="soreness" name="Douleurs" stroke="#f97316" strokeWidth={1} />
                  <Line type="monotone" dataKey="stress" name="Stress" stroke="hsl(var(--secondary))" strokeWidth={1} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique Wellness</CardTitle>
        </CardHeader>
        <CardContent>
          {!wellnessData || wellnessData.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucune donnée wellness enregistrée.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Sommeil Q.</TableHead>
                    <TableHead className="text-center">Sommeil D.</TableHead>
                    <TableHead className="text-center">Fatigue</TableHead>
                    <TableHead className="text-center">Stress</TableHead>
                    <TableHead className="text-center">Soreness H.</TableHead>
                    <TableHead className="text-center">Soreness B.</TableHead>
                    <TableHead className="text-center">Score Pondéré</TableHead>
                    <TableHead>Douleur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wellnessData.map((entry) => {
                    const weightedScore = calculateWeightedWellnessScore(entry as WellnessEntry);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {format(new Date(entry.tracking_date), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getScoreBadge(entry.sleep_quality)}>{entry.sleep_quality}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getScoreBadge(entry.sleep_duration)}>{entry.sleep_duration}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getScoreBadge(entry.general_fatigue)}>{entry.general_fatigue}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getScoreBadge(entry.stress_level)}>{entry.stress_level}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getScoreBadge(entry.soreness_upper_body)}>{entry.soreness_upper_body}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getScoreBadge(entry.soreness_lower_body)}>{entry.soreness_lower_body}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getScoreBadge(weightedScore)}>
                            {weightedScore.toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.has_specific_pain ? (
                            <div className="flex items-center gap-1 text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs">{entry.pain_location || "Oui"}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Non</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Menstrual Cycle Section for Feminine Categories */}
      {isFeminine && (
        <MenstrualCycleSection categoryId={categoryId} playerId={playerId} />
      )}
    </div>
  );
}