import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Activity, BarChart3, Dumbbell, MapPin, History, CalendarDays, FolderOpen } from "lucide-react";
import { TestsTab } from "@/components/category/TestsTab";
import { AwcrTab } from "@/components/category/AwcrTab";
import { AnalyticsTab } from "@/components/analytics/AnalyticsTab";
import { PhysicalPreparationTab } from "@/components/category/PhysicalPreparationTab";
import { GpsDataTab } from "@/components/category/gps/GpsDataTab";
import { SessionHistoryTimeline } from "@/components/category/history/SessionHistoryTimeline";
import { SessionsTab } from "@/components/category/sessions/SessionsTab";
import { ProgramsTab } from "@/components/category/programs/ProgramsTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PerformanceTabProps {
  categoryId: string;
}

export function PerformanceTab({ categoryId }: PerformanceTabProps) {
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

  return (
    <Tabs defaultValue="sessions" className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <TabsList className="inline-flex w-max min-w-full gap-1 h-auto bg-muted p-1">
          <TabsTrigger value="sessions" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Séances</span>
            <span className="sm:hidden">Séan</span>
          </TabsTrigger>
          <TabsTrigger value="programs" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Programmes</span>
            <span className="sm:hidden">Prog</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="awcr" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Activity className="h-4 w-4 shrink-0" />
            AWCR
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
          <TabsTrigger value="gps" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Data GPS</span>
            <span className="sm:hidden">GPS</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="sessions">
        <SessionsTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="programs">
        <ProgramsTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="tests">
        <TestsTab categoryId={categoryId} sportType={category?.rugby_type} />
      </TabsContent>

      <TabsContent value="awcr">
        <AwcrTab categoryId={categoryId} />
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

      <TabsContent value="gps">
        <GpsDataTab categoryId={categoryId} />
      </TabsContent>
    </Tabs>
  );
}
