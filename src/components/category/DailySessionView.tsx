import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar, 
  Dumbbell, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Users,
  Sun,
  Moon,
  Activity,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Smile,
  Plus,
  Printer,
  Eye,
  ClipboardCheck,
  Pencil
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { subDays } from "date-fns";
import { 
  calculateWeightedWellnessScore, 
  detectWellnessTrend,
  getWellnessRiskLevel,
  type WellnessEntry 
} from "@/lib/wellnessCalculations";
import { cn } from "@/lib/utils";
import { useFieldMode } from "@/contexts/FieldModeContext";
import { AddWellnessDialog } from "./AddWellnessDialog";
import { GroupedExerciseList } from "./GroupedExerciseList";
import { printElement, exportSessionToPdf } from "@/lib/pdfExport";
import { SessionFeedbackDialog } from "./calendar/SessionFeedbackDialog";
import { EditSessionDialog } from "./EditSessionDialog";

interface DailySessionViewProps {
  categoryId: string;
  categoryName?: string;
}

interface AtRiskPlayer {
  id: string;
  name: string;
  risk: "critical" | "high" | "medium";
  factors: string[];
  awcr: number | null;
  wellness: number | null;
  trend: string | null;
}

export function DailySessionView({ categoryId, categoryName = "Catégorie" }: DailySessionViewProps) {
  const { fieldMode, setFieldMode } = useFieldMode();
  const queryClient = useQueryClient();
  const [showOnlyAtRisk, setShowOnlyAtRisk] = useState(false);
  const [wellnessDialogOpen, setWellnessDialogOpen] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [rpeDialogOpen, setRpeDialogOpen] = useState(false);
  const [rpeDialogSession, setRpeDialogSession] = useState<{ id: string; type: string } | null>(null);
  const [editSessionDialogOpen, setEditSessionDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const handleEditSession = (session: any) => {
    setEditingSession(session);
    setEditSessionDialogOpen(true);
  };

  const handleOpenRpeDialog = (session: { id: string; training_type: string }) => {
    setRpeDialogSession({ id: session.id, type: session.training_type });
    setRpeDialogOpen(true);
  };

  const handlePrint = () => {
    if (printRef.current) {
      printElement(printRef.current, `Vue du Jour - ${format(new Date(), "PPP", { locale: fr })}`);
    }
  };

  const handlePrintSession = (session: any, exercises: any[]) => {
    exportSessionToPdf(session, exercises, categoryName);
  };

  // Fetch today's sessions
  const { data: todaySessions } = useQuery({
    queryKey: ["today_sessions", categoryId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("category_id", categoryId)
        .eq("session_date", today)
        .order("session_start_time");
      if (error) throw error;
      return data;
    },
  });

  // Fetch exercises for today's sessions
  const sessionIds = todaySessions?.map(s => s.id) || [];
  const { data: sessionExercises } = useQuery({
    queryKey: ["today_session_exercises", sessionIds],
    queryFn: async () => {
      if (sessionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("gym_session_exercises")
        .select("*")
        .in("training_session_id", sessionIds)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: sessionIds.length > 0,
  });

  // Fetch tests for today's sessions
  const { data: sessionTests } = useQuery({
    queryKey: ["today_session_tests", sessionIds],
    queryFn: async () => {
      if (sessionIds.length === 0) return [];
      // Tests are stored with session ID in notes field
      const { data, error } = await supabase
        .from("generic_tests")
        .select("*, players!inner(name)")
        .eq("category_id", categoryId)
        .eq("test_date", today);
      if (error) throw error;
      // Filter tests that have a session ID matching one of today's sessions
      return data?.filter(test => {
        if (!test.notes) return false;
        return sessionIds.some(id => test.notes?.includes(`Session ID: ${id}`));
      }) || [];
    },
    enabled: sessionIds.length > 0,
  });

  // Group tests by session
  const testsBySession = sessionTests?.reduce((acc, test) => {
    const matchingSessionId = sessionIds.find(id => test.notes?.includes(`Session ID: ${id}`));
    if (matchingSessionId) {
      if (!acc[matchingSessionId]) {
        acc[matchingSessionId] = [];
      }
      acc[matchingSessionId].push(test);
    }
    return acc;
  }, {} as Record<string, typeof sessionTests>) || {};

  // Group exercises by session
  const exercisesBySession = sessionExercises?.reduce((acc, ex) => {
    if (!acc[ex.training_session_id]) {
      acc[ex.training_session_id] = [];
    }
    acc[ex.training_session_id].push(ex);
    return acc;
  }, {} as Record<string, typeof sessionExercises>) || {};

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position, avatar_url")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch latest AWCR
  const { data: awcrData } = useQuery({
    queryKey: ["awcr_today", categoryId],
    queryFn: async () => {
      const weekAgo = subDays(new Date(), 7).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("player_id, awcr, session_date")
        .eq("category_id", categoryId)
        .gte("session_date", weekAgo)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch wellness data
  const { data: wellnessData } = useQuery({
    queryKey: ["wellness_today", categoryId],
    queryFn: async () => {
      const weekAgo = subDays(new Date(), 7).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("*")
        .eq("category_id", categoryId)
        .gte("tracking_date", weekAgo)
        .order("tracking_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Calculate at-risk players
  const getAtRiskPlayers = (): AtRiskPlayer[] => {
    if (!players) return [];

    const atRisk: AtRiskPlayer[] = [];

    players.forEach((player) => {
      const playerAwcr = awcrData?.find((a) => a.player_id === player.id);
      const playerWellnessEntries = wellnessData?.filter((w) => w.player_id === player.id) || [];
      const latestWellness = playerWellnessEntries[0];

      const factors: string[] = [];
      let risk: "critical" | "high" | "medium" | "low" = "low";

      // AWCR risk
      const awcrValue = playerAwcr?.awcr ?? null;
      if (awcrValue !== null) {
        if (awcrValue < 0.8 || awcrValue > 1.5) {
          factors.push(`AWCR ${awcrValue.toFixed(2)}`);
          risk = "high";
        } else if (awcrValue < 0.9 || awcrValue > 1.3) {
          factors.push(`AWCR ${awcrValue.toFixed(2)}`);
          if (risk === "low") risk = "medium";
        }
      }

      // Wellness risk
      let wellnessScore: number | null = null;
      let trend: string | null = null;

      if (latestWellness) {
        wellnessScore = calculateWeightedWellnessScore(latestWellness as WellnessEntry);
        const wellnessRisk = getWellnessRiskLevel(wellnessScore, latestWellness.has_specific_pain);

        if (latestWellness.has_specific_pain) {
          factors.push(`Douleur: ${latestWellness.pain_location || "signalée"}`);
          risk = risk === "high" ? "critical" : "high";
        }

        if (wellnessRisk === "critical" || wellnessRisk === "high") {
          factors.push(`Wellness ${wellnessScore.toFixed(1)}/5`);
          risk = risk === "high" ? "critical" : "high";
        } else if (wellnessRisk === "medium") {
          factors.push(`Wellness ${wellnessScore.toFixed(1)}/5`);
          if (risk === "low") risk = "medium";
        }

        // Trend
        if (playerWellnessEntries.length >= 2) {
          const trendResult = detectWellnessTrend(playerWellnessEntries as WellnessEntry[]);
          trend = trendResult.trend;
          if (trendResult.trend === "rapid_decline") {
            factors.push("⚠️ Chute rapide");
            risk = risk === "low" ? "high" : "critical";
          } else if (trendResult.trend === "declining") {
            factors.push("↓ En baisse");
            if (risk === "low") risk = "medium";
          }
        }
      }

      if (risk !== "low") {
        atRisk.push({
          id: player.id,
          name: player.name,
          risk,
          factors,
          awcr: awcrValue,
          wellness: wellnessScore,
          trend,
        });
      }
    });

    return atRisk.sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2 };
      return priority[a.risk] - priority[b.risk];
    });
  };

  const atRiskPlayers = getAtRiskPlayers();
  const criticalCount = atRiskPlayers.filter((p) => p.risk === "critical").length;
  const highCount = atRiskPlayers.filter((p) => p.risk === "high").length;

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case "collectif":
      case "physique":
        return <MapPin className="h-5 w-5" />;
      case "musculation":
        return <Dumbbell className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case "collectif":
        return "Entraînement collectif";
      case "musculation":
        return "Musculation";
      case "physique":
        return "Prépa physique";
      case "reathlétisation":
        return "Réathlétisation";
      case "repos":
        return "Repos";
      case "technique_individuelle":
        return "Technique individuelle";
      case "test":
        return "Test";
      default:
        return type;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "critical":
        return <Badge className="bg-red-600 text-white">Critique</Badge>;
      case "high":
        return <Badge variant="destructive">Élevé</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500 text-white">Modéré</Badge>;
      default:
        return null;
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "high":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "medium":
        return <TrendingDown className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const displayPlayers = showOnlyAtRisk 
    ? atRiskPlayers 
    : players?.map((p) => {
        const atRisk = atRiskPlayers.find((ar) => ar.id === p.id);
        return atRisk || { id: p.id, name: p.name, risk: "low" as const, factors: [], awcr: null, wellness: null, trend: null };
      }) || [];

  return (
    <div className={cn(
      "space-y-4 transition-all duration-300",
      fieldMode && "bg-slate-900 text-white p-4 rounded-xl -m-4"
    )}>
      {/* Header with toggles */}
      <div className={cn(
        "flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg",
        fieldMode ? "bg-slate-800" : "bg-muted"
      )}>
        <div className="flex items-center gap-3">
          <Calendar className={cn("h-6 w-6", fieldMode ? "text-blue-400" : "text-primary")} />
          <div>
            <h2 className={cn("text-xl font-bold", fieldMode && "text-white")}>
              Vue du Jour
            </h2>
            <p className={cn("text-sm", fieldMode ? "text-slate-400" : "text-muted-foreground")}>
              {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="at-risk-filter"
              checked={showOnlyAtRisk}
              onCheckedChange={setShowOnlyAtRisk}
            />
            <Label htmlFor="at-risk-filter" className={cn(fieldMode && "text-slate-300")}>
              Athlètes à risque uniquement
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Sun className={cn("h-4 w-4", !fieldMode && "text-primary")} />
            <Switch
              id="field-mode"
              checked={fieldMode}
              onCheckedChange={setFieldMode}
            />
            <Moon className={cn("h-4 w-4", fieldMode && "text-blue-400")} />
            <Label htmlFor="field-mode" className={cn("font-medium", fieldMode && "text-slate-300")}>
              Mode Terrain
            </Label>
          </div>
        </div>
      </div>

      {/* Quick Wellness Entry Section */}
      <div className={cn(
        "flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border-2",
        fieldMode 
          ? "bg-slate-800 border-blue-500/50" 
          : "bg-primary/5 border-primary/20"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            fieldMode ? "bg-blue-900/50" : "bg-primary/10"
          )}>
            <Smile className={cn("h-6 w-6", fieldMode ? "text-blue-400" : "text-primary")} />
          </div>
          <div>
            <h3 className={cn("font-semibold", fieldMode && "text-white")}>
              Wellness du jour
            </h3>
            <p className={cn("text-sm", fieldMode ? "text-slate-400" : "text-muted-foreground")}>
              Saisir rapidement l'état d'un athlète
            </p>
          </div>
        </div>
        <Button 
          onClick={() => setWellnessDialogOpen(true)}
          className={cn(
            "gap-2",
            fieldMode && "bg-blue-600 hover:bg-blue-500"
          )}
        >
          <Plus className="h-4 w-4" />
          Ajouter Wellness
        </Button>
      </div>

      {/* Alert Summary */}
      {(criticalCount > 0 || highCount > 0) && (
        <div className={cn(
          "flex items-center gap-4 p-4 rounded-lg border-2",
          fieldMode 
            ? "bg-red-900/40 border-red-500" 
            : "bg-destructive/10 border-destructive/30"
        )}>
          <AlertTriangle className={cn("h-8 w-8", fieldMode ? "text-red-400" : "text-destructive")} />
          <div>
            <p className={cn("font-bold text-lg", fieldMode ? "text-red-300" : "text-destructive")}>
              {criticalCount + highCount} athlète(s) à surveiller
            </p>
            <p className={cn("text-sm", fieldMode ? "text-slate-400" : "text-muted-foreground")}>
              {criticalCount > 0 && `${criticalCount} critique${criticalCount > 1 ? "s" : ""}`}
              {criticalCount > 0 && highCount > 0 && " • "}
              {highCount > 0 && `${highCount} élevé${highCount > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" ref={printRef}>
        {/* Today's Sessions - Grouped by Training Type */}
        <Card className={cn(fieldMode && "bg-slate-800 border-slate-700")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className={cn("flex items-center gap-2", fieldMode && "text-white")}>
                <Clock className={cn("h-5 w-5", fieldMode ? "text-blue-400" : "text-primary")} />
                Séances du jour
              </CardTitle>
              {todaySessions && todaySessions.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrint}
                  className={cn(fieldMode && "border-slate-600 hover:bg-slate-700")}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimer
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {!todaySessions || todaySessions.length === 0 ? (
                <div className={cn(
                  "text-center py-8",
                  fieldMode ? "text-slate-400" : "text-muted-foreground"
                )}>
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune séance programmée aujourd'hui</p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {todaySessions.map((session) => {
                    const exercises = exercisesBySession[session.id] || [];
                    const tests = testsBySession[session.id] || [];
                    const isExpanded = expandedSession === session.id;

                    return (
                      <div
                        key={session.id}
                        className={cn(
                          "rounded-lg border-2 print-session overflow-hidden",
                          fieldMode 
                            ? "bg-slate-700 border-slate-600" 
                            : "bg-muted/50 border-border"
                        )}
                      >
                        {/* Clickable Header */}
                        <button
                          type="button"
                          className={cn(
                            "w-full p-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors",
                            fieldMode && "hover:bg-slate-600"
                          )}
                          onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              session.training_type === "collectif" || session.training_type === "physique"
                                ? (fieldMode ? "bg-green-900/50" : "bg-green-100") 
                                : (fieldMode ? "bg-blue-900/50" : "bg-blue-100")
                            )}>
                              {getSessionTypeIcon(session.training_type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className={cn("font-semibold", fieldMode && "text-white")}>
                                  {getSessionTypeLabel(session.training_type)}
                                </p>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSession(session);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleEditSession(session);
                                    }
                                  }}
                                  className={cn(
                                    "inline-flex items-center justify-center h-6 w-6 rounded-md cursor-pointer opacity-60 hover:opacity-100 transition-opacity",
                                    fieldMode ? "text-slate-300 hover:text-white hover:bg-slate-700" : "hover:bg-muted"
                                  )}
                                  title="Modifier la séance"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </span>
                              </div>
                              {session.session_start_time && (
                                <p className={cn(
                                  "text-xs",
                                  fieldMode ? "text-slate-400" : "text-muted-foreground"
                                )}>
                                  {session.session_start_time.slice(0, 5)}
                                  {session.session_end_time && ` - ${session.session_end_time.slice(0, 5)}`}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {session.intensity && (
                              <Badge className={cn(
                                "text-sm px-2",
                                session.intensity >= 8 
                                  ? "bg-red-500" 
                                  : session.intensity >= 6 
                                    ? "bg-yellow-500" 
                                    : "bg-green-500",
                                "text-white"
                              )}>
                                RPE {session.intensity}
                              </Badge>
                            )}
                            {exercises.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {exercises.length} ex.
                              </Badge>
                            )}
                            {tests.length > 0 && (
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                fieldMode ? "border-emerald-600 text-emerald-400" : "border-emerald-500 text-emerald-600"
                              )}>
                                {tests.length} test{tests.length > 1 ? "s" : ""}
                              </Badge>
                            )}
                            <svg 
                              className={cn(
                                "h-5 w-5 transition-transform",
                                isExpanded && "rotate-180",
                                fieldMode ? "text-slate-400" : "text-muted-foreground"
                              )}
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Expandable Content */}
                        {isExpanded && (
                          <div className={cn(
                            "p-4 pt-0 border-t",
                            fieldMode ? "border-slate-600" : "border-border"
                          )}>
                            {/* Action buttons for this session */}
                            <div className="flex justify-end gap-2 mb-3 mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRpeDialog(session);
                                }}
                                className={cn(
                                  "gap-1.5",
                                  fieldMode && "border-slate-600 hover:bg-slate-700"
                                )}
                              >
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                Ajouter RPE
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintSession(session, exercises);
                                }}
                                className={cn(
                                  "gap-1.5",
                                  fieldMode && "border-slate-600 hover:bg-slate-700"
                                )}
                              >
                                <Printer className="h-3.5 w-3.5" />
                                Imprimer
                              </Button>
                            </div>

                            {session.notes && (
                              <p className={cn(
                                "text-sm mb-3 italic",
                                fieldMode ? "text-slate-400" : "text-muted-foreground"
                              )}>
                                {session.notes}
                              </p>
                            )}
                            
                            {exercises.length > 0 ? (
                              <div className="mt-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Dumbbell className={cn("h-4 w-4", fieldMode ? "text-slate-400" : "text-muted-foreground")} />
                                  <span className={cn(
                                    "text-xs font-medium",
                                    fieldMode ? "text-slate-300" : "text-muted-foreground"
                                  )}>
                                    Exercices ({exercises.length})
                                  </span>
                                </div>
                                <ScrollArea className="h-[400px]">
                                  <GroupedExerciseList
                                    exercises={exercises}
                                    fieldMode={fieldMode}
                                    showScroll={false}
                                    compact={false}
                                  />
                                </ScrollArea>
                              </div>
                            ) : (
                              <p className={cn(
                                "text-sm",
                                fieldMode ? "text-slate-500" : "text-muted-foreground"
                              )}>
                                Aucun exercice détaillé
                              </p>
                            )}

                            {/* Tests section */}
                            {tests.length > 0 && (
                              <div className="mt-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <ClipboardCheck className={cn("h-4 w-4", fieldMode ? "text-emerald-400" : "text-emerald-600")} />
                                  <span className={cn(
                                    "text-xs font-medium",
                                    fieldMode ? "text-slate-300" : "text-muted-foreground"
                                  )}>
                                    Tests ({tests.length} résultat{tests.length > 1 ? "s" : ""})
                                  </span>
                                </div>
                                <div className={cn(
                                  "rounded-lg border p-3 space-y-2",
                                  fieldMode ? "bg-emerald-900/20 border-emerald-700/50" : "bg-emerald-50/50 border-emerald-200"
                                )}>
                                  {/* Group tests by type */}
                                  {Object.entries(
                                    tests.reduce((acc, test) => {
                                      const key = `${test.test_category}-${test.test_type}`;
                                      if (!acc[key]) {
                                        acc[key] = { category: test.test_category, type: test.test_type, unit: test.result_unit, results: [] };
                                      }
                                      acc[key].results.push({ playerName: test.players?.name, value: test.result_value });
                                      return acc;
                                    }, {} as Record<string, { category: string; type: string; unit: string | null; results: { playerName: string; value: number }[] }>)
                                  ).map(([key, testGroup]) => (
                                    <div key={key} className="space-y-1">
                                      <p className={cn(
                                        "text-xs font-medium",
                                        fieldMode ? "text-emerald-300" : "text-emerald-700"
                                      )}>
                                        {testGroup.type.replace(/_/g, " ")} {testGroup.unit && `(${testGroup.unit})`}
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {testGroup.results.map((result, idx) => (
                                          <Badge
                                            key={idx}
                                            variant="outline"
                                            className={cn(
                                              "text-xs",
                                              fieldMode ? "border-emerald-600 text-emerald-300" : "border-emerald-300 text-emerald-700"
                                            )}
                                          >
                                            {result.playerName}: {result.value}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* At Risk Players */}
        <Card className={cn(fieldMode && "bg-slate-800 border-slate-700")}>
          <CardHeader className="pb-3">
            <CardTitle className={cn("flex items-center gap-2", fieldMode && "text-white")}>
              <Users className={cn("h-5 w-5", fieldMode ? "text-blue-400" : "text-primary")} />
              Athlètes ({showOnlyAtRisk ? `${atRiskPlayers.length} à risque` : players?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {displayPlayers.map((player) => (
                <div
                  key={player.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg transition-colors",
                    fieldMode 
                      ? player.risk !== "low" 
                        ? "bg-slate-700 border border-slate-600" 
                        : "bg-slate-800/50" 
                      : player.risk !== "low"
                        ? "bg-destructive/5 border border-destructive/20"
                        : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {getRiskIcon(player.risk)}
                    <div>
                      <p className={cn("font-medium", fieldMode && "text-white")}>
                        {player.name}
                      </p>
                      {player.factors.length > 0 && (
                        <p className={cn(
                          "text-xs",
                          fieldMode ? "text-slate-400" : "text-muted-foreground"
                        )}>
                          {player.factors.slice(0, 2).join(" • ")}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {player.awcr && (
                      <span className={cn(
                        "text-xs px-2 py-1 rounded",
                        fieldMode ? "bg-slate-700" : "bg-muted"
                      )}>
                        {player.awcr.toFixed(2)}
                      </span>
                    )}
                    {getRiskBadge(player.risk)}
                  </div>
                </div>
              ))}

              {displayPlayers.length === 0 && (
                <div className={cn(
                  "text-center py-8",
                  fieldMode ? "text-slate-400" : "text-muted-foreground"
                )}>
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Aucun athlète à risque</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wellness Dialog */}
      <AddWellnessDialog 
        open={wellnessDialogOpen} 
        onOpenChange={setWellnessDialogOpen} 
        categoryId={categoryId} 
      />

      {/* RPE Dialog */}
      {rpeDialogSession && (
        <SessionFeedbackDialog
          open={rpeDialogOpen}
          onOpenChange={(open) => {
            setRpeDialogOpen(open);
            if (!open) setRpeDialogSession(null);
          }}
          sessionId={rpeDialogSession.id}
          sessionType={rpeDialogSession.type}
          categoryId={categoryId}
        />
      )}

      {/* Edit Session Dialog */}
      <EditSessionDialog
        open={editSessionDialogOpen}
        onOpenChange={setEditSessionDialogOpen}
        categoryId={categoryId}
        session={editingSession}
      />
    </div>
  );
}
