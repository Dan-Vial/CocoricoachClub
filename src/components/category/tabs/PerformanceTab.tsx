import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Activity, BarChart3, Dumbbell, MapPin, History } from "lucide-react";
import { TestsTab } from "@/components/category/TestsTab";
import { AwcrTab } from "@/components/category/AwcrTab";
import { AnalyticsTab } from "@/components/analytics/AnalyticsTab";
import { PhysicalPreparationTab } from "@/components/category/PhysicalPreparationTab";
import { GpsDataTab } from "@/components/category/gps/GpsDataTab";
import { SessionHistoryTimeline } from "@/components/category/history/SessionHistoryTimeline";

interface PerformanceTabProps {
  categoryId: string;
}

export function PerformanceTab({ categoryId }: PerformanceTabProps) {
  return (
    <Tabs defaultValue="tests" className="space-y-4">
      <TabsList className="flex w-full overflow-x-auto no-scrollbar gap-1 h-auto flex-wrap md:flex-nowrap bg-muted p-1">
        <TabsTrigger value="tests" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
          <ClipboardCheck className="h-4 w-4 shrink-0" />
          Tests
        </TabsTrigger>
        <TabsTrigger value="awcr" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
          <Activity className="h-4 w-4 shrink-0" />
          AWCR
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
          <History className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Historique</span>
          <span className="sm:hidden">Hist</span>
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
          <BarChart3 className="h-4 w-4 shrink-0" />
          Analyse
        </TabsTrigger>
        <TabsTrigger value="physical-prep" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
          <Dumbbell className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Prépa Physique</span>
          <span className="sm:hidden">Prépa</span>
        </TabsTrigger>
        <TabsTrigger value="gps" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Data GPS</span>
          <span className="sm:hidden">GPS</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tests">
        <TestsTab categoryId={categoryId} />
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
