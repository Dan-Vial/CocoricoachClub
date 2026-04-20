import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CalendarDays, FolderOpen, ClipboardCheck, Bell, Dumbbell } from "lucide-react";
import { TestsTab } from "@/components/category/TestsTab";
import { SessionsTab } from "@/components/category/sessions/SessionsTab";
import { ProgramsTab } from "@/components/category/programs/ProgramsTab";
import { TestRemindersTab } from "@/components/category/TestRemindersTab";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface ProgrammationTabProps {
  categoryId: string;
}

export function ProgrammationTab({ categoryId }: ProgrammationTabProps) {
  const queryClient = useQueryClient();
  const { isViewer } = useViewerModeContext();

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
  const isBowling = sportType.toLowerCase().includes("bowling");
  const isTennis = sportType.toLowerCase().includes("tennis");
  const showTrainingButton = isBowling || isTennis;

  // Create training match (bowling or tennis)
  const createTrainingMatch = useMutation({
    mutationFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const label = isTennis ? "Match d'entraînement" : "Entraînement";
      const { error } = await supabase.from("matches").insert({
        category_id: categoryId,
        opponent: `${label} ${format(new Date(), "dd/MM/yyyy")}`,
        match_date: today,
        event_type: "training",
        is_home: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches", categoryId] });
      const msg = isTennis
        ? "Match d'entraînement créé ! Ajoutez la composition puis saisissez les stats."
        : "Entraînement bowling créé ! Ajoutez des joueurs puis saisissez les parties.";
      toast.success(msg);
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

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

      {/* Training match button for bowling/tennis */}
      {showTrainingButton && !isViewer && (
        <div className="flex justify-end">
          <Button 
            variant="outline"
            onClick={() => createTrainingMatch.mutate()}
            disabled={createTrainingMatch.isPending}
            className="gap-2"
          >
            <Dumbbell className="h-4 w-4" />
            {isTennis ? "Match entraînement" : "Entraînement bowling"}
          </Button>
        </div>
      )}

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