import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MenstrualCycleSection } from "@/components/category/MenstrualCycleSection";

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

  const calculateWellnessScore = (entry: typeof wellnessData[0]) => {
    return (
      entry.sleep_quality +
      entry.sleep_duration +
      entry.general_fatigue +
      entry.stress_level +
      entry.soreness_upper_body +
      entry.soreness_lower_body
    ) / 6;
  };

  // Prepare chart data
  const chartData = wellnessData?.slice(0, 14).reverse().map((entry) => ({
    date: format(new Date(entry.tracking_date), "dd/MM", { locale: fr }),
    wellness: calculateWellnessScore(entry),
    fatigue: entry.general_fatigue,
    stress: entry.stress_level,
  })) || [];

  // Get latest data for risk assessment
  const latestWellness = wellnessData?.[0];
  const latestAwcr = awcrData?.[0];

  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  const riskFactors: string[] = [];

  if (latestWellness) {
    const score = calculateWellnessScore(latestWellness);
    if (score >= 4) {
      riskLevel = "high";
      riskFactors.push("Wellness élevé");
    } else if (score >= 3) {
      riskLevel = "medium";
      riskFactors.push("Wellness à surveiller");
    }
    if (latestWellness.has_specific_pain) {
      riskLevel = riskLevel === "high" ? "critical" : "high";
      riskFactors.push(`Douleur: ${latestWellness.pain_location || "signalée"}`);
    }
  }

  if (latestAwcr?.awcr) {
    if (latestAwcr.awcr < 0.8 || latestAwcr.awcr > 1.5) {
      riskLevel = riskLevel === "high" || riskLevel === "critical" ? "critical" : "high";
      riskFactors.push("AWCR hors zone");
    } else if (latestAwcr.awcr < 0.9 || latestAwcr.awcr > 1.3) {
      if (riskLevel === "low") riskLevel = "medium";
      riskFactors.push("AWCR à surveiller");
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Risk Summary Card */}
      <Card className={riskLevel === "critical" || riskLevel === "high" ? "border-destructive" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Évaluation du Risque
          </CardTitle>
          <CardDescription>Basé sur Wellness + AWCR</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-medium">Niveau de risque actuel:</span>
            {getRiskBadge()}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">AWCR actuel</div>
              <div className="text-xl font-bold">
                {latestAwcr?.awcr?.toFixed(2) ?? "N/A"}
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Wellness score</div>
              <div className="text-xl font-bold">
                {latestWellness ? calculateWellnessScore(latestWellness).toFixed(1) : "N/A"}/5
              </div>
            </div>
          </div>
          {riskFactors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {riskFactors.map((factor, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {factor}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evolution Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Évolution Wellness
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
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead>Douleur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wellnessData.map((entry) => (
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
                        <Badge variant={getScoreBadge(calculateWellnessScore(entry))}>
                          {calculateWellnessScore(entry).toFixed(1)}
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
                  ))}
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
