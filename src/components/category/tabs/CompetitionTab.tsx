import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Trophy, Swords, Flag, Award } from "lucide-react";
import { MatchesTab } from "@/components/category/MatchesTab";
import { TournamentsTab } from "@/components/category/TournamentsTab";
import { NationalTeamTab } from "@/components/category/national-team/NationalTeamTab";
import { isIndividualSport } from "@/lib/constants/sportTypes";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";

interface CompetitionTabProps {
  categoryId: string;
  isRugby7: boolean;
  isNationalTeam: boolean;
  sportType?: string;
}

export function CompetitionTab({ categoryId, isRugby7, isNationalTeam, sportType }: CompetitionTabProps) {
  const isIndividual = isIndividualSport(sportType || "");
  
  const matchLabel = isIndividual ? "Compétitions" : "Matchs";
  const MatchIcon = isIndividual ? Award : Swords;

  return (
    <Tabs defaultValue="matches" className="space-y-4">
      <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
        <ColoredSubTabsList colorKey="competition" className="inline-flex w-max">
          <ColoredSubTabsTrigger 
            value="matches" 
            colorKey="competition"
            icon={<MatchIcon className="h-4 w-4" />}
            tooltip="Liste des matchs et compétitions : création, résultats, statistiques et gestion des rencontres"
          >
            {matchLabel}
          </ColoredSubTabsTrigger>
          {isRugby7 && (
            <ColoredSubTabsTrigger 
              value="tournaments" 
              colorKey="competition"
              icon={<Trophy className="h-4 w-4" />}
              tooltip="Gestion des tournois : phases de poules, classements et résultats consolidés"
            >
              Tournois
            </ColoredSubTabsTrigger>
          )}
          {isNationalTeam && (
            <ColoredSubTabsTrigger 
              value="national-team" 
              colorKey="competition"
              icon={<Flag className="h-4 w-4" />}
              tooltip="Suivi des sélections en équipe nationale : convocations, performances et historique"
            >
              <span className="hidden sm:inline">Équipe Nationale</span>
              <span className="sm:hidden">National</span>
            </ColoredSubTabsTrigger>
          )}
        </ColoredSubTabsList>
      </div>

      <TabsContent value="matches">
        <MatchesTab categoryId={categoryId} sportType={sportType} />
      </TabsContent>

      {isRugby7 && (
        <TabsContent value="tournaments">
          <TournamentsTab categoryId={categoryId} />
        </TabsContent>
      )}

      {isNationalTeam && (
        <TabsContent value="national-team">
          <NationalTeamTab categoryId={categoryId} />
        </TabsContent>
      )}
    </Tabs>
  );
}
