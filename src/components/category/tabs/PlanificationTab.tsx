import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Timer, Bell } from "lucide-react";
import { CalendarTab } from "@/components/category/CalendarTab";
import { PeriodizationTab } from "@/components/periodization/PeriodizationTab";
import { TestRemindersTab } from "@/components/category/TestRemindersTab";

interface PlanificationTabProps {
  categoryId: string;
}

export function PlanificationTab({ categoryId }: PlanificationTabProps) {
  return (
    <Tabs defaultValue="calendar" className="space-y-4">
      <TabsList className="flex w-full overflow-x-auto no-scrollbar gap-1 h-auto flex-wrap md:flex-nowrap bg-muted">
        <TabsTrigger value="calendar" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Calendrier</span>
          <span className="sm:hidden">Cal</span>
        </TabsTrigger>
        <TabsTrigger value="periodization" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
          <Timer className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Périodisation</span>
          <span className="sm:hidden">Période</span>
        </TabsTrigger>
        <TabsTrigger value="reminders" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
          <Bell className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Rappels Tests</span>
          <span className="sm:hidden">Rappels</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="calendar">
        <CalendarTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="periodization">
        <PeriodizationTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="reminders">
        <TestRemindersTab categoryId={categoryId} />
      </TabsContent>
    </Tabs>
  );
}
