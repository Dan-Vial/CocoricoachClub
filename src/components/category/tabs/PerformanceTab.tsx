import { Tabs, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Dumbbell, History, Zap, Lock, Brain } from "lucide-react";
import { AnalyticsTab } from "@/components/analytics/AnalyticsTab";
import { PhysicalPreparationTab } from "@/components/category/PhysicalPreparationTab";
import { SessionHistoryTimeline } from "@/components/category/history/SessionHistoryTimeline";
import { TrainingLoadTab } from "@/components/training-load/TrainingLoadTab";
import { MentalPerformanceSection } from "@/components/category/mental/MentalPerformanceSection";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";

interface PerformanceTabProps {
  categoryId: string;
}

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


  if (isViewer) {
    return <PerformanceDisabledMessage />;
  }

  return (
    <Tabs defaultValue="training-load" className="space-y-4">
      <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
        <ColoredSubTabsList colorKey="performance" className="inline-flex w-max">
          <ColoredSubTabsTrigger 
            value="training-load" 
            colorKey="performance"
            icon={<Zap className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Charge d'entraînement</span>
            <span className="sm:hidden">Charge</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="history" 
            colorKey="performance"
            icon={<History className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Historique</span>
            <span className="sm:hidden">Hist</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="analytics" 
            colorKey="performance"
            icon={<BarChart3 className="h-4 w-4" />}
          >
            Analyse
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="physical-prep" 
            colorKey="performance"
            icon={<Dumbbell className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Prépa Physique</span>
            <span className="sm:hidden">Prépa</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="mental" 
            colorKey="performance"
            icon={<Brain className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Performance Mentale</span>
            <span className="sm:hidden">Mental</span>
          </ColoredSubTabsTrigger>
        </ColoredSubTabsList>
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

      <TabsContent value="mental">
        <MentalPerformanceSection categoryId={categoryId} />
      </TabsContent>
    </Tabs>
  );
}
