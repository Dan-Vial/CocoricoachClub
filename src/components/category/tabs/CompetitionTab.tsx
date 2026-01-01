import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Swords, Flag } from "lucide-react";
import { MatchesTab } from "@/components/category/MatchesTab";
import { TournamentsTab } from "@/components/category/TournamentsTab";
import { NationalTeamTab } from "@/components/category/national-team/NationalTeamTab";

interface CompetitionTabProps {
  categoryId: string;
  isRugby7: boolean;
  isNationalTeam: boolean;
}

export function CompetitionTab({ categoryId, isRugby7, isNationalTeam }: CompetitionTabProps) {
  return (
    <Tabs defaultValue="matches" className="space-y-4">
      <TabsList>
        <TabsTrigger value="matches" className="flex items-center gap-2">
          <Swords className="h-4 w-4" />
          Matchs
        </TabsTrigger>
        {isRugby7 && (
          <TabsTrigger value="tournaments" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Tournois
          </TabsTrigger>
        )}
        {isNationalTeam && (
          <TabsTrigger value="national-team" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Équipe Nationale
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="matches">
        <MatchesTab categoryId={categoryId} />
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
