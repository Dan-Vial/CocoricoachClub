import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Swords, Flag, Award } from "lucide-react";
import { MatchesTab } from "@/components/category/MatchesTab";
import { TournamentsTab } from "@/components/category/TournamentsTab";
import { NationalTeamTab } from "@/components/category/national-team/NationalTeamTab";

interface CompetitionTabProps {
  categoryId: string;
  isRugby7: boolean;
  isNationalTeam: boolean;
  sportType?: string;
}

export function CompetitionTab({ categoryId, isRugby7, isNationalTeam, sportType }: CompetitionTabProps) {
  const isJudo = sportType === "Judo";
  
  // Labels adaptés selon le sport
  const matchLabel = isJudo ? "Compétitions" : "Matchs";
  const matchIcon = isJudo ? <Award className="h-4 w-4 shrink-0" /> : <Swords className="h-4 w-4 shrink-0" />;

  return (
    <Tabs defaultValue="matches" className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <TabsList className="inline-flex w-max min-w-full gap-1 h-auto bg-muted p-1">
          <TabsTrigger value="matches" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            {matchIcon}
            {matchLabel}
          </TabsTrigger>
          {isRugby7 && (
            <TabsTrigger value="tournaments" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
              <Trophy className="h-4 w-4 shrink-0" />
              Tournois
            </TabsTrigger>
          )}
          {isNationalTeam && (
            <TabsTrigger value="national-team" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
              <Flag className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Équipe Nationale</span>
              <span className="sm:hidden">National</span>
            </TabsTrigger>
          )}
        </TabsList>
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
