import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Dumbbell, History, Zap } from "lucide-react";
import { AnalyticsTab } from "@/components/analytics/AnalyticsTab";
import { PhysicalPreparationTab } from "@/components/category/PhysicalPreparationTab";
import { SessionHistoryTimeline } from "@/components/category/history/SessionHistoryTimeline";
import { TrainingLoadTab } from "@/components/training-load/TrainingLoadTab";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

interface PerformanceTabProps {
  categoryId: string;
}

// Message affiché quand l'onglet Performance est complètement désactivé
function PerformanceDisabledMessage() {
  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg text-muted-foreground">
          Accès restreint
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center text-muted-foreground text-sm">
        <p>Cet onglet n'est pas accessible en mode lecture seule.</p>
        <p className="mt-1">Contactez l'administrateur pour plus d'accès.</p>
      </CardContent>
    </Card>
  );
}

export function PerformanceTab({ categoryId }: PerformanceTabProps) {
  const { isViewer } = useViewerModeContext();

  // En mode viewer, l'onglet Performance entier est désactivé
  if (isViewer) {
    return <PerformanceDisabledMessage />;
  }

  return (
    <Tabs defaultValue="training-load" className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <TabsList className="inline-flex w-max min-w-full gap-1 h-auto bg-muted p-1">
          <TabsTrigger value="training-load" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Zap className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Charge d'entraînement</span>
            <span className="sm:hidden">Charge</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <History className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Historique</span>
            <span className="sm:hidden">Hist</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <BarChart3 className="h-4 w-4 shrink-0" />
            Analyse
          </TabsTrigger>
          <TabsTrigger value="physical-prep" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Dumbbell className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Prépa Physique</span>
            <span className="sm:hidden">Prépa</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="training-load">
        <TrainingLoadTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="history">
        <SessionHistoryTimeline categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="analytics">
        <AnalyticsTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="physical-prep">
        <PhysicalPreparationTab categoryId={categoryId} />
      </TabsContent>
    </Tabs>
  );
}
