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
      <TabsList>
        <TabsTrigger value="calendar" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Calendrier
        </TabsTrigger>
        <TabsTrigger value="periodization" className="flex items-center gap-2">
          <Timer className="h-4 w-4" />
          Périodisation
        </TabsTrigger>
        <TabsTrigger value="reminders" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Rappels Tests
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
