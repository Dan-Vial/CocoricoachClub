import { useState } from "react";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Users, TrendingUp, BarChart3, Heart, Activity, Satellite } from "lucide-react";
import { HrvEntryDialog } from "@/components/category/hrv/HrvEntryDialog";
import { TrainingLoadChart } from "./TrainingLoadChart";
import { TrainingLoadKPIs } from "./TrainingLoadKPIs";
import { TrainingLoadAlerts } from "./TrainingLoadAlerts";
import { TeamLoadComparison } from "./TeamLoadComparison";
import { IntensityComparisonDashboard } from "@/components/analytics/IntensityComparisonDashboard";
import { TrainingLoadCalendar } from "./TrainingLoadCalendar";
import { TrainingDistribution } from "./TrainingDistribution";
import { HrvAnalysisPanel } from "./HrvAnalysisPanel";
import { useTrainingLoad, useTeamTrainingLoad } from "@/hooks/use-training-load";
import { MetricType, METRICS_CONFIG } from "@/lib/trainingLoadCalculations";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const [isHrvDialogOpen, setIsHrvDialogOpen] = useState(false);
  const [loadSection, setLoadSection] = useState<"internal" | "external">("internal");

  // Sync metric when model changes
  const handleModelChange = (model: "ewma" | "awcr") => {
    setLoadModel(model);
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
      ["training-load-hrv", categoryId],
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
    hasHrvData,
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

  // Fetch HRV records for external tab
  const { data: hrvRecords = [], isLoading: hrvRecordsLoading } = useQuery({
    queryKey: ["hrv-records-analysis", categoryId, selectedPlayerId, periodDays],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Math.max(periodDays, 60)); // min 60 days for baseline

      let query = supabase
        .from("hrv_records")
        .select("*")
        .eq("category_id", categoryId)
        .gte("record_date", startDate.toISOString().split("T")[0])
        .order("record_date", { ascending: true });

      if (selectedPlayerId) {
        query = query.eq("player_id", selectedPlayerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const handlePlayerClick = (playerId: string) => {
    setSelectedPlayerId(playerId);
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
          <TooltipProvider delayDuration={300}>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${
                    loadSection === "internal" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setLoadSection("internal")}
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Charge interne</span>
                  <span className="sm:hidden">Interne</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs bg-background/95 backdrop-blur-sm border shadow-lg">
                <p className="font-semibold text-xs mb-1">Charge interne (sRPE)</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Mesure subjective de la charge d'entraînement basée sur le RPE (perception de l'effort) multiplié par la durée de la séance. Permet de quantifier le stress physiologique ressenti par l'athlète.
                </p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${
                    loadSection === "external" 
                      ? "bg-destructive text-destructive-foreground" 
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setLoadSection("external")}
                >
                  <Heart className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">HRV / Récupération</span>
                  <span className="sm:hidden">HRV</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs bg-background/95 backdrop-blur-sm border shadow-lg">
                <p className="font-semibold text-xs mb-1">HRV / Récupération</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Variabilité de la fréquence cardiaque (HRV) et indicateurs de récupération. Le RMSSD mesure l'activité du système nerveux parasympathique — un indicateur clé de la capacité de récupération et de la fatigue accumulée.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          </TooltipProvider>

          {/* Model toggle EWMA / AWCR - only for internal */}
          {loadSection === "internal" && (
            <TooltipProvider delayDuration={300}>
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs bg-background/95 backdrop-blur-sm border shadow-lg">
                  <p className="font-semibold text-xs mb-1">EWMA (Exponentially Weighted Moving Average)</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Moyenne mobile pondérée exponentiellement. Accorde plus de poids aux séances récentes. Le ratio aiguë/chronique (7j vs 28j) indique le risque de blessure : zone optimale entre 0.85 et 1.30.
                  </p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs bg-background/95 backdrop-blur-sm border shadow-lg">
                  <p className="font-semibold text-xs mb-1">AWCR (Acute:Chronic Workload Ratio)</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Ratio de charge aiguë/chronique classique (modèle Gabbett). Compare la charge des 7 derniers jours à la moyenne des 28 derniers jours par somme simple. Zone sûre : 0.8–1.3, zone de danger : &gt;1.5.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            </TooltipProvider>
          )}

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
                  {[p.first_name, p.name].filter(Boolean).join(" ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isViewer && (
            <Button 
              onClick={() => setIsHrvDialogOpen(true)} 
              variant="outline"
              className="gap-2"
            >
              <Heart className="h-4 w-4 text-destructive" />
              <span className="hidden sm:inline">Saisir HRV</span>
            </Button>
          )}
        </div>
      </div>

      {/* ===== INTERNAL LOAD SECTION ===== */}
      {loadSection === "internal" && (
        <>
          {/* GPS Info */}
          {hasGpsData && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <p className="text-sm">
                  <Badge variant="secondary" className="mr-2 gap-1">
                    <Satellite className="h-3 w-3" />
                    GPS
                  </Badge>
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

          {/* Main content tabs */}
          <Tabs defaultValue="chart" className="space-y-4">
            <ColoredSubTabsList colorKey="performance" className="flex flex-wrap h-auto gap-1">
              <ColoredSubTabsTrigger value="chart" colorKey="performance" icon={<BarChart3 className="h-4 w-4" />}>
                Graphique
              </ColoredSubTabsTrigger>
              <ColoredSubTabsTrigger value="calendar" colorKey="performance" icon={<Calendar className="h-4 w-4" />}>
                Calendrier
              </ColoredSubTabsTrigger>
              <ColoredSubTabsTrigger value="rpe" colorKey="performance" icon={<TrendingUp className="h-4 w-4" />}>
                RPE Prévu/Réel
              </ColoredSubTabsTrigger>
              <ColoredSubTabsTrigger value="team" colorKey="performance" icon={<Users className="h-4 w-4" />}>
                Comparaison
              </ColoredSubTabsTrigger>
              <ColoredSubTabsTrigger value="distribution" colorKey="performance" icon={<BarChart3 className="h-4 w-4" />}>
                Répartition
              </ColoredSubTabsTrigger>
            </ColoredSubTabsList>

            <TabsContent value="chart">
              <TrainingLoadChart
                chartData={chartData}
                availableMetrics={availableMetrics}
                selectedMetric={selectedMetric}
                onMetricChange={setSelectedMetric}
                hasGpsData={hasGpsData}
                hasHrvData={hasHrvData}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="calendar">
              <TrainingLoadCalendar categoryId={categoryId} />
            </TabsContent>

            <TabsContent value="rpe">
              <IntensityComparisonDashboard categoryId={categoryId} />
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
        </>
      )}

      {/* ===== EXTERNAL LOAD (HRV) SECTION ===== */}
      {loadSection === "external" && (
        <HrvAnalysisPanel
          hrvRecords={hrvRecords}
          loadData={chartData}
          playerId={selectedPlayerId}
          isLoading={hrvRecordsLoading || isLoading}
        />
      )}

      {/* HRV Entry Dialog */}
      <HrvEntryDialog
        open={isHrvDialogOpen}
        onOpenChange={setIsHrvDialogOpen}
        categoryId={categoryId}
      />
    </div>
  );
}
