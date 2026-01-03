import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Activity, BarChart3, Dumbbell } from "lucide-react";
import { TestsTab } from "@/components/category/TestsTab";
import { AwcrTab } from "@/components/category/AwcrTab";
import { AnalyticsTab } from "@/components/analytics/AnalyticsTab";
import { PhysicalPreparationTab } from "@/components/category/PhysicalPreparationTab";

interface PerformanceTabProps {
  categoryId: string;
}

export function PerformanceTab({ categoryId }: PerformanceTabProps) {
  return (
    <Tabs defaultValue="tests" className="space-y-4">
      <TabsList className="flex w-full overflow-x-auto no-scrollbar gap-1 h-auto flex-wrap md:flex-nowrap bg-muted">
        <TabsTrigger value="tests" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
          <ClipboardCheck className="h-4 w-4 shrink-0" />
          Tests
        </TabsTrigger>
        <TabsTrigger value="awcr" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
          <Activity className="h-4 w-4 shrink-0" />
          AWCR
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
          <BarChart3 className="h-4 w-4 shrink-0" />
          Analyse
        </TabsTrigger>
        <TabsTrigger value="physical-prep" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
          <Dumbbell className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Prépa Physique</span>
          <span className="sm:hidden">Prépa</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tests">
        <TestsTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="awcr">
        <AwcrTab categoryId={categoryId} />
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
