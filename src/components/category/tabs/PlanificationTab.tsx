import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Timer } from "lucide-react";
import { CalendarTab } from "@/components/category/CalendarTab";
import { PeriodizationTab } from "@/components/periodization/PeriodizationTab";

interface PlanificationTabProps {
  categoryId: string;
}

export function PlanificationTab({ categoryId }: PlanificationTabProps) {
  return (
    <Tabs defaultValue="calendar" className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <TabsList className="inline-flex w-max min-w-full gap-1 h-auto bg-muted p-1">
          <TabsTrigger value="calendar" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Calendrier</span>
            <span className="sm:hidden">Cal</span>
          </TabsTrigger>
          <TabsTrigger value="periodization" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Timer className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Périodisation</span>
            <span className="sm:hidden">Période</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="calendar">
        <CalendarTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="periodization">
        <PeriodizationTab categoryId={categoryId} />
      </TabsContent>
    </Tabs>
  );
}
