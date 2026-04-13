import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, Target, Zap } from "lucide-react";
import { LoadSummary, getRiskColor } from "@/lib/trainingLoadCalculations";
import { MetricTooltip } from "@/components/ui/metric-tooltip";

interface TrainingLoadKPIsProps {
  summary: LoadSummary | null;
  isLoading?: boolean;
  loadModel?: "ewma" | "awcr";
}

export function TrainingLoadKPIs({ summary, isLoading, loadModel = "ewma" }: TrainingLoadKPIsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-gradient-card">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-card col-span-full">
          <CardContent className="p-6 text-center text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucune donnée de charge disponible</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const riskColor = getRiskColor(summary.riskLevel);
  const TrendIcon = summary.trend === "increasing" ? TrendingUp : 
                   summary.trend === "decreasing" ? TrendingDown : Minus;
  const trendColor = summary.trend === "increasing" ? "text-orange-500" :
                    summary.trend === "decreasing" ? "text-blue-500" : "text-muted-foreground";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Current Load */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <MetricTooltip
              title="Charge du jour"
              description="Dernière charge d'entraînement enregistrée (sRPE = RPE × durée)"
            >
              Charge du jour
            </MetricTooltip>
          </CardTitle>
          <Zap className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(summary.currentLoad)}</div>
          <p className="text-xs text-muted-foreground">UA (unités arbitraires)</p>
        </CardContent>
      </Card>

      {/* Acute */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <MetricTooltip
              title={loadModel === "ewma" ? "EWMA Aiguë" : "Charge Aiguë (7j)"}
              description={loadModel === "ewma" 
                ? "Moyenne exponentielle pondérée sur 7 jours. Les données récentes ont plus de poids."
                : "Moyenne simple de la charge sur les 7 derniers jours (méthode Gabbett)."}
            >
              {loadModel === "ewma" ? "EWMA Aiguë" : "Aiguë (7j)"}
            </MetricTooltip>
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.ewmaAcute.toFixed(1)}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendIcon className={`h-3 w-3 ${trendColor}`} />
            <span className={trendColor}>
              {summary.weeklyChange >= 0 ? "+" : ""}{summary.weeklyChange}% vs sem. préc.
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-2 leading-relaxed border-t border-border/30 pt-1.5">
            Calculée à partir du RPE et de la durée des séances. Le coach saisit le RPE prévu dans <span className="font-semibold">Programmation</span>, l'athlète peut ajuster son RPE réel après la séance.
          </p>
        </CardContent>
      </Card>

      {/* Chronic */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <MetricTooltip
              title={loadModel === "ewma" ? "EWMA Chronique" : "Charge Chronique (28j)"}
              description={loadModel === "ewma"
                ? "Moyenne exponentielle pondérée sur 28 jours. Représente la capacité d'entraînement de base."
                : "Moyenne simple de la charge sur les 28 derniers jours (méthode Gabbett)."}
            >
              {loadModel === "ewma" ? "EWMA Chronique" : "Chronique (28j)"}
            </MetricTooltip>
          </CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.ewmaChronic.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">Capacité de base (28j)</p>
          <p className="text-[10px] text-muted-foreground/70 mt-2 leading-relaxed border-t border-border/30 pt-1.5">
            Reflète la charge habituelle sur 28 jours. Se met à jour automatiquement à chaque séance enregistrée dans <span className="font-semibold">Programmation → Séances</span>.
          </p>
        </CardContent>
      </Card>

      {/* Ratio */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <MetricTooltip
              title={loadModel === "ewma" ? "Ratio EWMA" : "Ratio AWCR"}
              description={loadModel === "ewma"
                ? "Rapport charge aiguë / chronique (EWMA). Zone optimale: 0.85 - 1.30"
                : "Rapport charge aiguë / chronique (Gabbett). Zone optimale: 0.85 - 1.30"}
              optimalRange="0.85 - 1.30"
              warningText="> 1.5 risque blessure | < 0.8 désentraînement"
            >
              {loadModel === "ewma" ? "Ratio EWMA" : "Ratio AWCR"}
            </MetricTooltip>
          </CardTitle>
          {summary.riskLevel !== "optimal" ? (
            <AlertTriangle className={`h-4 w-4 ${riskColor}`} />
          ) : (
            <Activity className={`h-4 w-4 ${riskColor}`} />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${riskColor}`}>
            {summary.ewmaRatio.toFixed(2)}
          </div>
          <Badge 
            variant="secondary"
            className={`text-xs mt-1 ${
              summary.riskLevel === "optimal" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
              summary.riskLevel === "warning" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
              "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {summary.riskLevel === "optimal" ? "Zone optimale" : 
             summary.riskLevel === "warning" ? "Vigilance" : "Zone danger"}
          </Badge>
          <p className="text-[10px] text-muted-foreground/70 mt-2 leading-relaxed border-t border-border/30 pt-1.5">
            Ratio automatique (aiguë ÷ chronique). Pour le faire évoluer, saisissez le RPE et la durée de chaque séance dans <span className="font-semibold">Programmation</span>. L'athlète peut aussi renseigner son RPE ressenti.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
