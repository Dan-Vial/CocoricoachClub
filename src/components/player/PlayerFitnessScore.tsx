import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { MetricTooltip, METRIC_TOOLTIPS } from "@/components/ui/metric-tooltip";
import { FitnessScoreBadge } from "@/components/ui/status-badge";
import { calculateFitnessScore, getScoreColorClass, getScoreBgClass } from "@/lib/fitnessScoreCalculator";
import { subDays, format } from "date-fns";

interface PlayerFitnessScoreProps {
  playerId: string;
  categoryId: string;
}

export function PlayerFitnessScore({ playerId, categoryId }: PlayerFitnessScoreProps) {
  const today = new Date();
  const sevenDaysAgo = format(subDays(today, 7), "yyyy-MM-dd");

  const { data: fitnessData, isLoading } = useQuery({
    queryKey: ["player-fitness-score", playerId],
    queryFn: async () => {
      // Fetch latest AWCR
      const { data: awcrData } = await supabase
        .from("awcr_tracking")
        .select("awcr")
        .eq("player_id", playerId)
        .not("awcr", "is", null)
        .order("session_date", { ascending: false })
        .limit(1);

      // Fetch recent wellness (last 7 days)
      const { data: wellnessData } = await supabase
        .from("wellness_tracking")
        .select("sleep_quality, general_fatigue, stress_level, soreness_upper_body, soreness_lower_body")
        .eq("player_id", playerId)
        .gte("tracking_date", sevenDaysAgo);

      // Calculate wellness average
      let wellnessAvg = null;
      if (wellnessData && wellnessData.length > 0) {
        const allScores = wellnessData.flatMap(w => [
          w.sleep_quality, w.general_fatigue, w.stress_level, w.soreness_upper_body, w.soreness_lower_body
        ].filter(Boolean));
        wellnessAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      }

      // Check for active injuries
      const { data: injuries } = await supabase
        .from("injuries")
        .select("status")
        .eq("player_id", playerId)
        .neq("status", "healed")
        .limit(1);

      let injuryStatus: "none" | "recovering" | "active" = "none";
      if (injuries && injuries.length > 0) {
        injuryStatus = injuries[0].status === "active" ? "active" : "recovering";
      }

      // Get test performance (simplified - just check if they have recent tests)
      const { count: recentTestCount } = await supabase
        .from("speed_tests")
        .select("*", { count: "exact", head: true })
        .eq("player_id", playerId)
        .gte("test_date", sevenDaysAgo);

      const recentTestPerformance = recentTestCount && recentTestCount > 0 ? 70 : 50;

      return calculateFitnessScore({
        awcr: awcrData?.[0]?.awcr ?? null,
        wellnessAvg,
        recentTestPerformance,
        injuryStatus,
        trainingLoadTrend: "unknown",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!fitnessData) return null;

  const { score, breakdown, status, recommendations } = fitnessData;

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <MetricTooltip {...METRIC_TOOLTIPS.fitnessScore}>
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Score de Forme Global
            </span>
          </MetricTooltip>
          <FitnessScoreBadge score={score} animated />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main score with progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Score global</span>
            <span className={`font-bold ${getScoreColorClass(score)}`}>{score}/100</span>
          </div>
          <Progress 
            value={score} 
            className={`h-3 ${getScoreBgClass(score)}`}
          />
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">AWCR</span>
            <span className="font-medium">{breakdown.awcrScore}/30</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wellness</span>
            <span className="font-medium">{breakdown.wellnessScore}/25</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Performance</span>
            <span className="font-medium">{breakdown.performanceScore}/25</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Santé</span>
            <span className="font-medium">{breakdown.injuryScore}/20</span>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Recommandations
            </p>
            <ul className="space-y-1">
              {recommendations.map((rec, i) => (
                <li key={i} className="text-xs flex items-start gap-1.5">
                  {rec.startsWith("URGENT") ? (
                    <AlertTriangle className="h-3 w-3 text-status-critical mt-0.5" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-status-attention mt-0.5" />
                  )}
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
