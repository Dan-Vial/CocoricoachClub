import { useState } from "react";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, TrendingUp, BarChart3 } from "lucide-react";
import { TrainingLoadChart } from "./TrainingLoadChart";
import { TrainingLoadKPIs } from "./TrainingLoadKPIs";
import { TrainingLoadAlerts } from "./TrainingLoadAlerts";
import { TeamLoadComparison } from "./TeamLoadComparison";
import { RpePlanVsActual } from "./RpePlanVsActual";
import { TrainingLoadCalendar } from "./TrainingLoadCalendar";
import { TrainingDistribution } from "./TrainingDistribution";
import { useTrainingLoad, useTeamTrainingLoad } from "@/hooks/use-training-load";
import { MetricType, METRICS_CONFIG } from "@/lib/trainingLoadCalculations";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface TrainingLoadTabProps {
  categoryId: string;
}

export function TrainingLoadTab({ categoryId }: TrainingLoadTabProps) {
  const navigate = useNavigate();
  const { isViewer } = useViewerModeContext();
  const [loadModel, setLoadModel] = useState<"ewma" | "awcr">("ewma");
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("ewma_srpe");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>();
  const [periodDays, setPeriodDays] = useState<number>(56);


  // Sync metric when model changes
  const handleModelChange = (model: "ewma" | "awcr") => {
    setLoadModel(model);
    // Switch to equivalent metric in the new model
    const currentBase = selectedMetric.replace(/^(ewma|awcr)_/, "");
    setSelectedMetric(`${model}_${currentBase}` as MetricType);
  };

  // Realtime sync for training data
  useRealtimeSync({
    tables: ["training_sessions", "training_session_blocks", "awcr_tracking", "wellness_tracking"],
    categoryId,
    queryKeys: [
      ["training-load", categoryId],
      ["training-load-awcr", categoryId],
      ["training-load-gps", categoryId],
      ["team-training-load", categoryId],
      ["load-calendar-sessions", categoryId],
      ["awcr_tracking", categoryId],
      ["awcr-data", categoryId],
      ["awcr-risk", categoryId],
      ["ewma_summary", categoryId],
      ["training_sessions", categoryId],
      ["wellness_tracking", categoryId],
    ],
    channelName: `training-load-sync-${categoryId}`,
  });

  // Individual athlete data (if selected)
  const { 
    chartData, 
    summary, 
    availableMetrics, 
    hasGpsData,
    sportType,
    isLoading 
  } = useTrainingLoad({
    categoryId,
    playerId: selectedPlayerId,
    metric: selectedMetric,
    periodDays,
  });

  // Team data
  const { 
    players, 
    teamAverage, 
    playersAtRisk,
    isLoading: teamLoading 
  } = useTeamTrainingLoad({
    categoryId,
    metric: selectedMetric,
    periodDays: 28,
  });

  const handlePlayerClick = (playerId: string) => {
    navigate(`/players/${playerId}`);
  };

  const periodOptions = [
    { value: 3, label: "3 jours" },
    { value: 7, label: "7 jours" },
    { value: 14, label: "14 jours" },
    { value: 28, label: "28 jours" },
    { value: 56, label: "8 semaines" },
    { value: 90, label: "Saison" },
  ];

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Charge d'entraînement</h2>
          <p className="text-muted-foreground">
            Monitoring {loadModel === "ewma" ? "EWMA" : "AWCR (Gabbett)"} - Charge interne et externe
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Model toggle EWMA / AWCR */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                loadModel === "ewma" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => handleModelChange("ewma")}
            >
              EWMA
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                loadModel === "awcr" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => handleModelChange("awcr")}
            >
              AWCR
            </button>
          </div>

          {/* Period filter */}
          <Select value={periodDays.toString()} onValueChange={(v) => setPeriodDays(Number(v))}>
            <SelectTrigger className="w-[130px]">
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

          {/* Player filter */}
          <Select 
            value={selectedPlayerId || "team"} 
            onValueChange={(v) => setSelectedPlayerId(v === "team" ? undefined : v)}
          >
            <SelectTrigger className="w-[180px]">
              <Users className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Sélectionner athlète" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="team">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Vue équipe
                </span>
              </SelectItem>
              {players.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>
      </div>

      {/* GPS Info */}
      {hasGpsData && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <p className="text-sm">
              <Badge variant="secondary" className="mr-2 gap-1">GPS</Badge>
              Données GPS disponibles - Métriques de charge externe activées
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <TrainingLoadKPIs 
        summary={selectedPlayerId ? summary : (teamAverage ? {
          currentLoad: teamAverage.currentLoad ?? 0,
          ewmaAcute: teamAverage.ewmaAcute,
          ewmaChronic: teamAverage.ewmaChronic,
          ewmaRatio: teamAverage.ewmaRatio,
          weeklyChange: teamAverage.weeklyChange ?? 0,
          riskLevel: teamAverage.ewmaRatio >= 0.85 && teamAverage.ewmaRatio <= 1.3 ? "optimal" :
                    teamAverage.ewmaRatio >= 0.8 && teamAverage.ewmaRatio <= 1.5 ? "warning" : "danger",
          trend: teamAverage.trend ?? "stable",
        } : null)}
        isLoading={isLoading || teamLoading}
        loadModel={loadModel}
      />

      {/* Main content based on view mode */}
      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="chart">Graphique</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1">
            <Calendar className="h-3 w-3" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="rpe" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            RPE Prévu/Réel
          </TabsTrigger>
          <TabsTrigger value="team">Comparaison</TabsTrigger>
          <TabsTrigger value="distribution" className="gap-1">
            <BarChart3 className="h-3 w-3" />
            Répartition
          </TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <TrainingLoadChart
            chartData={chartData}
            availableMetrics={availableMetrics}
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
            hasGpsData={hasGpsData}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <TrainingLoadCalendar categoryId={categoryId} />
        </TabsContent>

        <TabsContent value="rpe">
          <RpePlanVsActual
            categoryId={categoryId}
            onPlayerClick={handlePlayerClick}
          />
        </TabsContent>

        <TabsContent value="team">
          <TeamLoadComparison
            players={players}
            teamAverage={teamAverage}
            onPlayerClick={handlePlayerClick}
            isLoading={teamLoading}
            sportType={sportType}
          />
        </TabsContent>

        <TabsContent value="distribution">
          <TrainingDistribution categoryId={categoryId} />
        </TabsContent>

        <TabsContent value="alerts">
          <TrainingLoadAlerts
            playersAtRisk={playersAtRisk}
            onPlayerClick={handlePlayerClick}
            isLoading={teamLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Recommendations section */}
      {summary && selectedPlayerId && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recommandations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg border ${
              summary.riskLevel === "optimal" ? "bg-green-500/5 border-green-500/20" :
              summary.riskLevel === "warning" ? "bg-yellow-500/5 border-yellow-500/20" :
              "bg-red-500/5 border-red-500/20"
            }`}>
              <p className="font-medium">
                {summary.riskLevel === "optimal" ? "✅ Charge optimale" :
                 summary.riskLevel === "warning" ? "⚠️ Vigilance requise" :
                 "🚨 Action nécessaire"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {summary.ewmaRatio > 1.3 
                  ? "Réduire l'intensité des prochaines séances pour éviter la surcharge"
                  : summary.ewmaRatio < 0.85
                  ? "Augmenter progressivement la charge pour éviter le désentraînement"
                  : "Maintenir le rythme actuel et surveiller la récupération"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AddAwcrDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categoryId={categoryId}
      />

      <QuickTeamRpeDialog
        open={isTeamDialogOpen}
        onOpenChange={setIsTeamDialogOpen}
        categoryId={categoryId}
      />
    </div>
  );
}
