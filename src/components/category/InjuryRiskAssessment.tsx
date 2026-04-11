import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { subDays } from "date-fns";
import { 
  calculateWeightedWellnessScore, 
  detectWellnessTrend, 
  generateWellnessAlert,
  getWellnessRiskLevel,
  type WellnessEntry 
} from "@/lib/wellnessCalculations";

interface InjuryRiskAssessmentProps {
  categoryId: string;
}

interface PlayerRisk {
  playerId: string;
  playerName: string;
  awcr: number | null;
  awcrRisk: "low" | "medium" | "high";
  wellnessScore: number | null;
  wellnessRisk: "low" | "medium" | "high";
  hasSpecificPain: boolean;
  painLocation: string | null;
  combinedRisk: "low" | "medium" | "high" | "critical";
  riskFactors: string[];
  trend: "improving" | "stable" | "declining" | "rapid_decline" | null;
  smartAlert: { type: "info" | "warning" | "critical"; message: string; recommendations: string[] } | null;
}

export function InjuryRiskAssessment({ categoryId }: InjuryRiskAssessmentProps) {
  const today = new Date();
  const weekAgo = subDays(today, 7);

  // Fetch players
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

  // Fetch latest AWCR data for each player
  const { data: awcrData } = useQuery({
    queryKey: ["awcr_latest", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("player_id, awcr, session_date")
        .eq("category_id", categoryId)
        .gte("session_date", weekAgo.toISOString().split("T")[0])
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch wellness data for each player (last 7 days for trend analysis)
  const { data: wellnessData } = useQuery({
    queryKey: ["wellness_latest", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("*")
        .eq("category_id", categoryId)
        .gte("tracking_date", subDays(today, 7).toISOString().split("T")[0])
        .order("tracking_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const calculatePlayerRisks = (): PlayerRisk[] => {
    if (!players) return [];

    return players.map((player) => {
      // Get latest AWCR for player
      const playerAwcr = awcrData?.find((a) => a.player_id === player.id);
      const awcrValue = playerAwcr?.awcr ?? null;

      // Determine AWCR risk
      let awcrRisk: "low" | "medium" | "high" = "low";
      if (awcrValue !== null) {
        if (awcrValue < 0.8 || awcrValue > 1.5) awcrRisk = "high";
        else if (awcrValue < 0.9 || awcrValue > 1.3) awcrRisk = "medium";
      }

      // Get all wellness entries for this player (for trend analysis)
      const playerWellnessEntries = wellnessData?.filter((w) => w.player_id === player.id) || [];
      const latestWellness = playerWellnessEntries[0];
      
      let wellnessScore: number | null = null;
      let wellnessRisk: "low" | "medium" | "high" = "low";
      let hasSpecificPain = false;
      let painLocation: string | null = null;
      let trend: "improving" | "stable" | "declining" | "rapid_decline" | null = null;
      let smartAlert: { type: "info" | "warning" | "critical"; message: string; recommendations: string[] } | null = null;

      if (latestWellness) {
        // Calculate WEIGHTED wellness score
        wellnessScore = calculateWeightedWellnessScore(latestWellness as WellnessEntry);
        
        hasSpecificPain = latestWellness.has_specific_pain;
        painLocation = latestWellness.pain_location;
        
        // Get risk level using weighted score
        wellnessRisk = getWellnessRiskLevel(wellnessScore, hasSpecificPain) === "critical" 
          ? "high" 
          : getWellnessRiskLevel(wellnessScore, hasSpecificPain) as "low" | "medium" | "high";

        // Detect trend if we have multiple entries
        if (playerWellnessEntries.length >= 2) {
          const trendResult = detectWellnessTrend(playerWellnessEntries as WellnessEntry[]);
          trend = trendResult.trend;
        }

        // Generate smart alert
        smartAlert = generateWellnessAlert(wellnessScore, hasSpecificPain, trend || "stable", awcrValue);
      }

      // Calculate combined risk with trend consideration
      const riskFactors: string[] = [];
      let combinedRisk: "low" | "medium" | "high" | "critical" = "low";

      if (awcrRisk === "high") riskFactors.push("EWMA hors zone optimale");
      if (awcrRisk === "medium") riskFactors.push("EWMA à surveiller");
      if (wellnessRisk === "high") riskFactors.push("Wellness préoccupant");
      if (wellnessRisk === "medium") riskFactors.push("Wellness à surveiller");
      if (hasSpecificPain) riskFactors.push(`Douleur: ${painLocation || "signalée"}`);
      if (trend === "rapid_decline") riskFactors.push("⚠️ Détérioration rapide");
      if (trend === "declining") riskFactors.push("Tendance en baisse");

      // Combined risk logic with trend consideration
      if (hasSpecificPain && (awcrRisk === "high" || wellnessRisk === "high" || trend === "rapid_decline")) {
        combinedRisk = "critical";
      } else if (awcrRisk === "high" && wellnessRisk === "high") {
        combinedRisk = "critical";
      } else if (trend === "rapid_decline" && (awcrRisk !== "low" || wellnessRisk !== "low")) {
        combinedRisk = "critical";
      } else if (awcrRisk === "high" || wellnessRisk === "high" || hasSpecificPain) {
        combinedRisk = "high";
      } else if (trend === "rapid_decline") {
        combinedRisk = "high";
      } else if (awcrRisk === "medium" || wellnessRisk === "medium" || trend === "declining") {
        combinedRisk = "medium";
      }

      return {
        playerId: player.id,
        playerName: [player.first_name, player.name].filter(Boolean).join(" "),
        awcr: awcrValue,
        awcrRisk,
        wellnessScore,
        wellnessRisk,
        hasSpecificPain,
        painLocation,
        combinedRisk,
        riskFactors,
        trend,
        smartAlert,
      };
    });
  };

  const playerRisks = calculatePlayerRisks();
  const criticalPlayers = playerRisks.filter((p) => p.combinedRisk === "critical");
  const highRiskPlayers = playerRisks.filter((p) => p.combinedRisk === "high");
  const mediumRiskPlayers = playerRisks.filter((p) => p.combinedRisk === "medium");

  // Get all smart alerts
  const allAlerts = playerRisks
    .filter((p) => p.smartAlert)
    .sort((a, b) => {
      const priority = { critical: 0, warning: 1, info: 2 };
      return priority[a.smartAlert!.type] - priority[b.smartAlert!.type];
    });

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "critical":
        return <Badge variant="destructive" className="bg-red-600">Critique</Badge>;
      case "high":
        return <Badge variant="destructive">Élevé</Badge>;
      case "medium":
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Modéré</Badge>;
      default:
        return <Badge variant="default" className="bg-green-500">Faible</Badge>;
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "high":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "medium":
        return <TrendingUp className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
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

  const getTrendLabel = (trend: string | null) => {
    switch (trend) {
      case "rapid_decline": return "Chute rapide";
      case "declining": return "En baisse";
      case "improving": return "En hausse";
      default: return "Stable";
    }
  };

  return (
    <Card>
      <CardHeader>
         <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Risque de Blessure (EWMA + AWCR + Wellness)
        </CardTitle>
        <CardDescription>
          Corrélation entre le ratio EWMA, l'AWCR (Charge Aiguë / Charge Chronique) et le Score Wellness pondéré pour évaluer le risque de blessure.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Smart Alerts Section */}
        {allAlerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertes Intelligentes
            </h4>
            {allAlerts.slice(0, 3).map((player, idx) => (
              <Alert 
                key={idx} 
                variant={player.smartAlert!.type === "critical" ? "destructive" : "default"}
                className={player.smartAlert!.type === "warning" ? "border-yellow-500 bg-yellow-500/10" : ""}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center gap-2">
                  {player.playerName}
                  {player.trend && (
                    <span className="flex items-center gap-1 text-xs font-normal">
                      {getTrendIcon(player.trend)}
                      {getTrendLabel(player.trend)}
                    </span>
                  )}
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{player.smartAlert!.message}</p>
                  {player.smartAlert!.recommendations.length > 0 && (
                    <ul className="list-disc list-inside text-xs">
                      {player.smartAlert!.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{criticalPlayers.length}</div>
            <div className="text-sm text-muted-foreground">Risque Critique</div>
          </div>
          <div className="p-4 bg-orange-100 dark:bg-orange-900/20 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">{highRiskPlayers.length}</div>
            <div className="text-sm text-muted-foreground">Risque Élevé</div>
          </div>
          <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{mediumRiskPlayers.length}</div>
            <div className="text-sm text-muted-foreground">Risque Modéré</div>
          </div>
          <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {playerRisks.length - criticalPlayers.length - highRiskPlayers.length - mediumRiskPlayers.length}
            </div>
            <div className="text-sm text-muted-foreground">Risque Faible</div>
          </div>
        </div>

        {/* Critical & High Risk Players */}
        {(criticalPlayers.length > 0 || highRiskPlayers.length > 0) && (
          <div className="space-y-4">
            <h4 className="font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Athlètes à Attention Immédiate
            </h4>
            <div className="space-y-3">
              {[...criticalPlayers, ...highRiskPlayers].map((player) => (
                <div
                  key={player.playerId}
                  className="p-4 border rounded-lg bg-destructive/5 border-destructive/20"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getRiskIcon(player.combinedRisk)}
                      <span className="font-medium">{player.playerName}</span>
                      {player.trend && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {getTrendIcon(player.trend)}
                          <span>{getTrendLabel(player.trend)}</span>
                        </div>
                      )}
                    </div>
                    {getRiskBadge(player.combinedRisk)}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">EWMA: </span>
                      <span className={player.awcrRisk === "high" ? "text-destructive font-medium" : ""}>
                        {player.awcr?.toFixed(2) ?? "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">AWCR: </span>
                      <span className={player.awcrRisk === "high" ? "text-destructive font-medium" : ""}>
                        {player.awcr?.toFixed(2) ?? "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Wellness: </span>
                      <span className={player.wellnessRisk === "high" ? "text-destructive font-medium" : ""}>
                        {player.wellnessScore?.toFixed(2) ?? "N/A"}/5
                      </span>
                    </div>
                  </div>

                  {player.riskFactors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {player.riskFactors.map((factor, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Players List */}
        <div className="space-y-4">
          <h4 className="font-semibold">Tous les Athlètes</h4>
          <div className="space-y-2">
            {playerRisks.map((player) => (
              <div
                key={player.playerId}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {getRiskIcon(player.combinedRisk)}
                  <span>{player.playerName}</span>
                  {player.trend && getTrendIcon(player.trend)}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    EWMA: {player.awcr?.toFixed(2) ?? "-"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    AWCR: {player.awcr?.toFixed(2) ?? "-"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    W: {player.wellnessScore?.toFixed(2) ?? "-"}
                  </div>
                  {getRiskBadge(player.combinedRisk)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 bg-muted rounded-lg text-sm">
          <h5 className="font-medium mb-2">Comment est calculé le risque ?</h5>
          <ul className="space-y-1 text-muted-foreground">
            <li>• <strong>Score Wellness pondéré:</strong> Fatigue (22%) et douleurs bas du corps (22%) pèsent plus</li>
            <li>• <strong>Ratio EWMA optimal:</strong> 0.85 - 1.30 (zone de sécurité)</li>
            <li>• <strong>AWCR (Acute:Chronic Workload Ratio):</strong> 0.8 - 1.3 (zone optimale)</li>
            <li>• <strong>Corrélation triple:</strong> EWMA + AWCR + Wellness pour une évaluation plus précise</li>
            <li>• <strong>Détection de tendance:</strong> Analyse sur 7 jours pour détecter les détériorations</li>
            <li>• <strong>Risque critique:</strong> Douleur + (EWMA/AWCR ou Wellness élevé) ou détérioration rapide</li>
            <li>• <strong>Alertes intelligentes:</strong> Recommandations personnalisées selon le contexte</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}