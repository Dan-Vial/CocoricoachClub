import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, BarChart3, Dumbbell, MapPin, History, Video, Zap } from "lucide-react";
import { AwcrTab } from "@/components/category/AwcrTab";
import { AnalyticsTab } from "@/components/analytics/AnalyticsTab";
import { PhysicalPreparationTab } from "@/components/category/PhysicalPreparationTab";
import { GpsDataTab } from "@/components/category/gps/GpsDataTab";
import { SessionHistoryTimeline } from "@/components/category/history/SessionHistoryTimeline";
import { VideoAnalysisTab } from "@/components/category/video/VideoAnalysisTab";
import { TrainingLoadTab } from "@/components/training-load/TrainingLoadTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { isRugbyType } from "@/lib/constants/sportTypes";

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

  // Fetch category to get sport type
  const { data: category } = useQuery({
    queryKey: ["category-sport-type", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const sportType = category?.rugby_type || "";
  const sportLower = sportType.toLowerCase();
  
  // GPS Data pour Football, Rugby et Aviron
  const showGpsTab = isRugbyType(sportType) || 
    sportLower.includes("football") || 
    sportLower.includes("aviron");
  
  // Video Analysis pour Football, Rugby, Aviron, Basketball, Handball, Volleyball
  const showVideoTab = isRugbyType(sportType) || 
    sportLower.includes("football") || 
    sportLower.includes("aviron") || 
    sportLower.includes("basketball") || 
    sportLower.includes("handball") || 
    sportLower.includes("volleyball") ||
    sportLower.includes("volley");

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
          {showGpsTab && (
            <TabsTrigger value="gps" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Data GPS</span>
              <span className="sm:hidden">GPS</span>
            </TabsTrigger>
          )}
          {showVideoTab && (
            <TabsTrigger value="video" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
              <Video className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Analyse Vidéo</span>
              <span className="sm:hidden">Vidéo</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="awcr" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Activity className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">AWCR (Classique)</span>
            <span className="sm:hidden">AWCR</span>
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

      {showGpsTab && (
        <TabsContent value="gps">
          <GpsDataTab categoryId={categoryId} />
        </TabsContent>
      )}

      {showVideoTab && (
        <TabsContent value="video">
          <VideoAnalysisTab categoryId={categoryId} sportType={sportType} />
        </TabsContent>
      )}

      <TabsContent value="awcr">
        <AwcrTab categoryId={categoryId} />
      </TabsContent>
    </Tabs>
  );
}
