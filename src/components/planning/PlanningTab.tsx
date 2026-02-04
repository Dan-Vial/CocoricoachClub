import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SessionTemplatesSection } from "./SessionTemplatesSection";
import { WeeklyPlanningCalendar } from "./WeeklyPlanningCalendar";
import { LayoutTemplate, Calendar } from "lucide-react";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";

interface PlanningTabProps {
  categoryId: string;
}

export function PlanningTab({ categoryId }: PlanningTabProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="weekly" className="space-y-4">
        <div className="flex justify-center">
          <ColoredSubTabsList colorKey="planification" className="inline-flex w-max">
            <ColoredSubTabsTrigger 
              value="weekly" 
              colorKey="planification"
              icon={<Calendar className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">Planning hebdo</span>
              <span className="sm:hidden">Hebdo</span>
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger 
              value="templates" 
              colorKey="planification"
              icon={<LayoutTemplate className="h-4 w-4" />}
            >
              Templates
            </ColoredSubTabsTrigger>
          </ColoredSubTabsList>
        </div>

        <TabsContent value="weekly">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <WeeklyPlanningCalendar categoryId={categoryId} />
            </div>
            <div className="lg:col-span-1">
              <SessionTemplatesSection categoryId={categoryId} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="max-w-2xl">
            <SessionTemplatesSection categoryId={categoryId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
