import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CalendarDays, Mountain, BarChart3 } from "lucide-react";
import { CalendarTab } from "@/components/category/CalendarTab";
import { FisCompetitionsTab } from "@/components/category/fis/FisCompetitionsTab";
import { FisRankingTab } from "@/components/category/fis/FisRankingTab";
import { getMainSportFromType } from "@/lib/constants/sportTypes";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";

interface PlanificationTabProps {
  categoryId: string;
  sportType?: string;
}

export function PlanificationTab({ categoryId, sportType }: PlanificationTabProps) {
  const isSkiSport = sportType ? getMainSportFromType(sportType) === "ski" : false;

  if (!isSkiSport) {
    return <CalendarTab categoryId={categoryId} />;
  }

  return (
    <Tabs defaultValue="calendar" className="space-y-4">
      <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
        <ColoredSubTabsList colorKey="planification" className="inline-flex w-max">
          <ColoredSubTabsTrigger
            value="calendar"
            colorKey="planification"
            icon={<CalendarDays className="h-4 w-4" />}
            tooltip="Calendrier et périodisation"
          >
            Calendrier
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger
            value="fis-competitions"
            colorKey="planification"
            icon={<Mountain className="h-4 w-4" />}
            tooltip="Compétitions FIS : création, résultats, calcul automatique des points"
          >
            <span className="hidden sm:inline">Compétitions FIS</span>
            <span className="sm:hidden">FIS</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger
            value="fis-ranking"
            colorKey="planification"
            icon={<BarChart3 className="h-4 w-4" />}
            tooltip="Classement FIS par athlète : points, objectifs, simulation et projections"
          >
            <span className="hidden sm:inline">Classement FIS</span>
            <span className="sm:hidden">Classmt</span>
          </ColoredSubTabsTrigger>
        </ColoredSubTabsList>
      </div>

      <TabsContent value="calendar">
        <CalendarTab categoryId={categoryId} />
      </TabsContent>
      <TabsContent value="fis-competitions">
        <FisCompetitionsTab categoryId={categoryId} />
      </TabsContent>
      <TabsContent value="fis-ranking">
        <FisRankingTab categoryId={categoryId} />
      </TabsContent>
    </Tabs>
  );
}
