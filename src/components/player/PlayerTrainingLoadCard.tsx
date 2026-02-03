import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Zap, Calendar, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { useTrainingLoad } from "@/hooks/use-training-load";
import { TrainingLoadChart } from "@/components/training-load/TrainingLoadChart";
import { MetricType, METRICS_CONFIG, generateLoadRecommendation, getRiskColor } from "@/lib/trainingLoadCalculations";
import { MetricTooltip } from "@/components/ui/metric-tooltip";

interface PlayerTrainingLoadCardProps {
  playerId: string;
  categoryId: string;
  playerName: string;
}

export function PlayerTrainingLoadCard({ 
  playerId, 
  categoryId, 
  playerName 
}: PlayerTrainingLoadCardProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("ewma_srpe");
  const [periodDays, setPeriodDays] = useState<number>(28);

  const { 
    chartData, 
    summary, 
    availableMetrics, 
    hasGpsData,
    isLoading 
  } = useTrainingLoad({
    categoryId,
    playerId,
    metric: selectedMetric,
    periodDays,
  });

  const recommendation = summary ? generateLoadRecommendation(summary) : null;
  const riskColor = summary ? getRiskColor(summary.riskLevel) : "text-muted-foreground";
  
  const TrendIcon = summary?.trend === "increasing" ? TrendingUp : 
                   summary?.trend === "decreasing" ? TrendingDown : Minus;
  const trendColor = summary?.trend === "increasing" ? "text-orange-500" :
                    summary?.trend === "decreasing" ? "text-blue-500" : "text-muted-foreground";

  const periodOptions = [
    { value: 14, label: "14 jours" },
    { value: 28, label: "28 jours" },
    { value: 56, label: "8 semaines" },
  ];

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Charge d'entraînement
          </CardTitle>

          <div className="flex items-center gap-2">
            <Select value={periodDays.toString()} onValueChange={(v) => setPeriodDays(Number(v))}>
              <SelectTrigger className="w-[110px]">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI Summary */}
        {summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Charge du jour</p>
              <p className="text-xl font-bold">{summary.currentLoad}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <MetricTooltip
                title="EWMA Aiguë"
                description="Moyenne exponentielle sur 7 jours"
              >
                <p className="text-xs text-muted-foreground">EWMA Aiguë</p>
              </MetricTooltip>
              <div className="flex items-center gap-1">
                <p className="text-xl font-bold">{summary.ewmaAcute}</p>
                <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <MetricTooltip
                title="EWMA Chronique"
                description="Moyenne exponentielle sur 28 jours"
              >
                <p className="text-xs text-muted-foreground">EWMA Chronique</p>
              </MetricTooltip>
              <p className="text-xl font-bold">{summary.ewmaChronic}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <MetricTooltip
                title="Ratio EWMA"
                description="Charge aiguë / chronique"
                optimalRange="0.85 - 1.30"
              >
                <p className="text-xs text-muted-foreground">Ratio</p>
              </MetricTooltip>
              <div className="flex items-center gap-2">
                <p className={`text-xl font-bold ${riskColor}`}>{summary.ewmaRatio.toFixed(2)}</p>
                {summary.riskLevel !== "optimal" && (
                  <AlertTriangle className={`h-4 w-4 ${riskColor}`} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucune donnée de charge disponible</p>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <TrainingLoadChart
            chartData={chartData}
            availableMetrics={availableMetrics}
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
            hasGpsData={hasGpsData}
            isLoading={isLoading}
            height={250}
          />
        )}

        {/* Recommendation */}
        {recommendation && summary && (
          <div className={`p-3 rounded-lg border ${
            summary.riskLevel === "optimal" ? "bg-green-500/5 border-green-500/20" :
            summary.riskLevel === "warning" ? "bg-yellow-500/5 border-yellow-500/20" :
            "bg-red-500/5 border-red-500/20"
          }`}>
            <p className="font-medium text-sm">
              {summary.riskLevel === "optimal" ? "✅" :
               summary.riskLevel === "warning" ? "⚠️" : "🚨"} {recommendation.recommendation}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{recommendation.action}</p>
          </div>
        )}

        {/* Weekly change */}
        {summary && summary.weeklyChange !== 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Variation semaine: <span className={trendColor}>
              {summary.weeklyChange >= 0 ? "+" : ""}{summary.weeklyChange}%
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
