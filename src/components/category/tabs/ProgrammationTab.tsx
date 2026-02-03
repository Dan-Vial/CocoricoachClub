import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, FolderOpen, ClipboardCheck, Bell, Target, Timer } from "lucide-react";
import { TestsTab } from "@/components/category/TestsTab";
import { SessionsTab } from "@/components/category/sessions/SessionsTab";
import { ProgramsTab } from "@/components/category/programs/ProgramsTab";
import { TestRemindersTab } from "@/components/category/TestRemindersTab";
import { LoadObjectivesSection } from "@/components/periodization/LoadObjectivesSection";
import { PeriodizationTab } from "@/components/periodization/PeriodizationTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProgrammationTabProps {
  categoryId: string;
}

export function ProgrammationTab({ categoryId }: ProgrammationTabProps) {
  // Fetch category to get sport type
  const { data: category } = useQuery({
    queryKey: ["category-sport-type-programmation", categoryId],
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
          <TabsTrigger value="objectives" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Target className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Objectifs</span>
            <span className="sm:hidden">Obj</span>
          </TabsTrigger>
          <TabsTrigger value="periodization" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Timer className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Périodisation</span>
            <span className="sm:hidden">Période</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="test-reminders" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Bell className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Rappels tests</span>
            <span className="sm:hidden">Rappels</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="sessions">
        <SessionsTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="programs">
        <ProgramsTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="objectives">
        <LoadObjectivesSection categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="periodization">
        <PeriodizationTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="tests">
        <TestsTab categoryId={categoryId} sportType={sportType} />
      </TabsContent>

      <TabsContent value="test-reminders">
        <TestRemindersTab categoryId={categoryId} />
      </TabsContent>
    </Tabs>
  );
}
