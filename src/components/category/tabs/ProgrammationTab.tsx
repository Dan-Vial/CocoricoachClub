import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CalendarDays, FolderOpen, ClipboardCheck, Bell } from "lucide-react";
import { TestsTab } from "@/components/category/TestsTab";
import { SessionsTab } from "@/components/category/sessions/SessionsTab";
import { ProgramsTab } from "@/components/category/programs/ProgramsTab";
import { TestRemindersTab } from "@/components/category/TestRemindersTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";

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
      <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
        <ColoredSubTabsList colorKey="programmation" className="inline-flex w-max">
          <ColoredSubTabsTrigger 
            value="sessions" 
            colorKey="programmation"
            icon={<CalendarDays className="h-4 w-4" />}
            tooltip="Créer et gérer les séances d'entraînement avec exercices, durées et intensités"
          >
            <span className="hidden sm:inline">Séances</span>
            <span className="sm:hidden">Séan</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="programs" 
            colorKey="programmation"
            icon={<FolderOpen className="h-4 w-4" />}
            tooltip="Programmes structurés en blocs et semaines pour organiser la progression à long terme"
          >
            <span className="hidden sm:inline">Programmes</span>
            <span className="sm:hidden">Prog</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="tests" 
            colorKey="programmation"
            icon={<ClipboardCheck className="h-4 w-4" />}
            tooltip="Bibliothèque de tests physiques : barèmes, saisie des résultats et évaluation des athlètes"
          >
            Tests
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="test-reminders" 
            colorKey="programmation"
            icon={<Bell className="h-4 w-4" />}
            tooltip="Planifier des rappels automatiques pour les tests à venir et suivre les échéances"
          >
            <span className="hidden sm:inline">Rappels tests</span>
            <span className="sm:hidden">Rappels</span>
          </ColoredSubTabsTrigger>
        </ColoredSubTabsList>
      </div>

      <TabsContent value="sessions">
        <SessionsTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="programs">
        <ProgramsTab categoryId={categoryId} />
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
