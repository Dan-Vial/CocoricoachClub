import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Timer, Bell, ClipboardCheck } from "lucide-react";
import { CalendarTab } from "@/components/category/CalendarTab";
import { PeriodizationTab } from "@/components/periodization/PeriodizationTab";
import { TestRemindersTab } from "@/components/category/TestRemindersTab";
import { AttendanceTab } from "@/components/category/attendance/AttendanceTab";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { DisabledTabTrigger } from "@/components/ui/disabled-tab-trigger";

interface PlanificationTabProps {
  categoryId: string;
}

export function PlanificationTab({ categoryId }: PlanificationTabProps) {
  const { isViewer } = useViewerModeContext();

  return (
    <Tabs defaultValue="calendar" className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <TabsList className="inline-flex w-max min-w-full gap-1 h-auto bg-muted p-1">
          <TabsTrigger value="calendar" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Calendrier</span>
            <span className="sm:hidden">Cal</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Présences</span>
            <span className="sm:hidden">Prés</span>
          </TabsTrigger>
          <TabsTrigger value="periodization" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Timer className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Périodisation</span>
            <span className="sm:hidden">Période</span>
          </TabsTrigger>
          {/* Rappels Tests - Grisé en mode viewer */}
          <DisabledTabTrigger 
            value="reminders" 
            isDisabled={isViewer}
            className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap"
          >
            <Bell className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Rappels Tests</span>
            <span className="sm:hidden">Rappels</span>
          </DisabledTabTrigger>
        </TabsList>
      </div>

      <TabsContent value="calendar">
        <CalendarTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="attendance">
        <AttendanceTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="periodization">
        <PeriodizationTab categoryId={categoryId} />
      </TabsContent>

      {!isViewer && (
        <TabsContent value="reminders">
          <TestRemindersTab categoryId={categoryId} />
        </TabsContent>
      )}
    </Tabs>
  );
}
