import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Target, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar 
} from "lucide-react";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AddLoadObjectiveDialog } from "./AddLoadObjectiveDialog";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface LoadObjectivesSectionProps {
  categoryId: string;
}

interface CycleWithLoad {
  id: string;
  name: string;
  week_number: number;
  start_date: string;
  end_date: string;
  target_load_min: number | null;
  target_load_max: number | null;
  target_awcr_min: number | null;
  target_awcr_max: number | null;
  cycle_type: string | null;
  actual_load?: number;
  avg_awcr?: number;
  status?: "on_track" | "below" | "above" | "pending";
}

const cycleTypeLabels: Record<string, { label: string; color: string }> = {
  recovery: { label: "Récupération", color: "bg-green-500" },
  normal: { label: "Normal", color: "bg-blue-500" },
  intensification: { label: "Intensification", color: "bg-orange-500" },
  competition: { label: "Compétition", color: "bg-red-500" },
};

export function LoadObjectivesSection({ categoryId }: LoadObjectivesSectionProps) {
  const { isViewer } = useViewerModeContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch cycles with load objectives
  const { data: cycles, isLoading: cyclesLoading } = useQuery({
    queryKey: ["training_cycles_with_load", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_cycles")
        .select("*")
        .eq("category_id", categoryId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as CycleWithLoad[];
    },
  });

  // Fetch AWCR data for calculating actual loads
  const { data: awcrData } = useQuery({
    queryKey: ["awcr_tracking_all", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("player_id, training_load, awcr, session_date")
        .eq("category_id", categoryId);
      if (error) throw error;
      return data;
    },
  });

  // Calculate actual loads for each cycle
  const cyclesWithActualLoad = cycles?.map((cycle) => {
    const cycleStart = parseISO(cycle.start_date);
    const cycleEnd = parseISO(cycle.end_date);

    const cycleAwcrData = awcrData?.filter((entry) => {
      const entryDate = parseISO(entry.session_date);
      return isWithinInterval(entryDate, { start: cycleStart, end: cycleEnd });
    });

    const totalLoad = cycleAwcrData?.reduce((sum, e) => sum + (e.training_load || 0), 0) || 0;
    const avgLoad = cycleAwcrData && cycleAwcrData.length > 0 
      ? totalLoad / cycleAwcrData.length 
      : 0;

    const validAwcr = cycleAwcrData?.filter((e) => e.awcr !== null) || [];
    const avgAwcr = validAwcr.length > 0
      ? validAwcr.reduce((sum, e) => sum + (e.awcr || 0), 0) / validAwcr.length
      : null;

    // Determine status
    let status: "on_track" | "below" | "above" | "pending" = "pending";
    const now = new Date();
    
    if (cycleStart > now) {
      status = "pending";
    } else if (cycle.target_load_min !== null && cycle.target_load_max !== null) {
      if (avgLoad < cycle.target_load_min) {
        status = "below";
      } else if (avgLoad > cycle.target_load_max) {
        status = "above";
      } else {
        status = "on_track";
      }
    }

    return {
      ...cycle,
      actual_load: Math.round(avgLoad),
      avg_awcr: avgAwcr,
      status,
    };
  });

  // Get current week's cycle
  const currentCycle = cyclesWithActualLoad?.find((cycle) => {
    const now = new Date();
    const cycleStart = parseISO(cycle.start_date);
    const cycleEnd = parseISO(cycle.end_date);
    return isWithinInterval(now, { start: cycleStart, end: cycleEnd });
  });

  if (cyclesLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Current week highlight */}
      {currentCycle && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Semaine en cours - S{currentCycle.week_number}
              </CardTitle>
              {currentCycle.cycle_type && cycleTypeLabels[currentCycle.cycle_type] && (
                <Badge className={cycleTypeLabels[currentCycle.cycle_type].color}>
                  {cycleTypeLabels[currentCycle.cycle_type].label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Charge actuelle</p>
                <p className="text-2xl font-bold">{currentCycle.actual_load}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Objectif</p>
                <p className="text-lg font-medium">
                  {currentCycle.target_load_min || "—"} - {currentCycle.target_load_max || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AWCR moyen</p>
                <p className={`text-2xl font-bold ${
                  currentCycle.avg_awcr && (currentCycle.avg_awcr < 0.8 || currentCycle.avg_awcr > 1.3)
                    ? "text-destructive"
                    : "text-primary"
                }`}>
                  {currentCycle.avg_awcr?.toFixed(2) || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <div className="flex items-center gap-2">
                  {currentCycle.status === "on_track" && (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-500 font-medium">Dans les clous</span>
                    </>
                  )}
                  {currentCycle.status === "below" && (
                    <>
                      <TrendingDown className="h-5 w-5 text-amber-500" />
                      <span className="text-amber-500 font-medium">Sous l'objectif</span>
                    </>
                  )}
                  {currentCycle.status === "above" && (
                    <>
                      <TrendingUp className="h-5 w-5 text-destructive" />
                      <span className="text-destructive font-medium">Au-dessus</span>
                    </>
                  )}
                  {currentCycle.status === "pending" && (
                    <span className="text-muted-foreground">En attente</span>
                  )}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {currentCycle.target_load_min !== null && currentCycle.target_load_max !== null && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{currentCycle.target_load_min}</span>
                  <span>Zone cible</span>
                  <span>{currentCycle.target_load_max}</span>
                </div>
                <div className="relative">
                  <Progress 
                    value={Math.min(
                      100,
                      (currentCycle.actual_load / currentCycle.target_load_max) * 100
                    )} 
                    className="h-3"
                  />
                  {/* Target zone indicator */}
                  <div 
                    className="absolute top-0 h-3 bg-green-500/30 rounded"
                    style={{
                      left: `${(currentCycle.target_load_min / currentCycle.target_load_max) * 100}%`,
                      right: "0%",
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All cycles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Objectifs de charge par semaine
            </CardTitle>
            {!isViewer && (
              <Button onClick={() => setIsDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau cycle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {cyclesWithActualLoad && cyclesWithActualLoad.length > 0 ? (
            <div className="space-y-3">
              {cyclesWithActualLoad.slice(0, 8).map((cycle) => (
                <div
                  key={cycle.id}
                  className={`p-4 rounded-lg border ${
                    currentCycle?.id === cycle.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">S{cycle.week_number}</Badge>
                      <span className="font-medium">{cycle.name}</span>
                      {cycle.cycle_type && cycleTypeLabels[cycle.cycle_type] && (
                        <Badge 
                          variant="secondary"
                          className={`${cycleTypeLabels[cycle.cycle_type].color} text-white`}
                        >
                          {cycleTypeLabels[cycle.cycle_type].label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {cycle.status === "on_track" && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {cycle.status === "below" && (
                        <TrendingDown className="h-4 w-4 text-amber-500" />
                      )}
                      {cycle.status === "above" && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Période</span>
                      <p>
                        {format(parseISO(cycle.start_date), "dd MMM", { locale: fr })} - 
                        {format(parseISO(cycle.end_date), "dd MMM", { locale: fr })}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Objectif charge</span>
                      <p>{cycle.target_load_min || "—"} - {cycle.target_load_max || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Charge réelle</span>
                      <p className="font-medium">{cycle.actual_load}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">AWCR cible</span>
                      <p>{cycle.target_awcr_min || 0.8} - {cycle.target_awcr_max || 1.3}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Aucun cycle avec objectifs de charge défini
              </p>
              {!isViewer && (
                <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer le premier cycle
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddLoadObjectiveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryId={categoryId}
      />
    </div>
  );
}
