import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, Weight, BarChart3 } from "lucide-react";
import { AthleteSpaceTests } from "./AthleteSpaceTests";
import { AthleteSpaceProgression } from "./AthleteSpaceProgression";
import { TonnageDashboard } from "@/components/tonnage/TonnageDashboard";

interface Props {
  playerId: string;
  categoryId: string;
  sportType?: string;
}

export function AthleteSpacePerformance({ playerId, categoryId, sportType }: Props) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="tests" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full">
          <TabsTrigger value="tests" className="text-xs sm:text-sm gap-1 flex-1">
            <FlaskConical className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tests</span>
            <span className="sm:hidden">Tests</span>
          </TabsTrigger>
          <TabsTrigger value="tonnage" className="text-xs sm:text-sm gap-1 flex-1">
            <Weight className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tonnage</span>
            <span className="sm:hidden">Tonnage</span>
          </TabsTrigger>
          <TabsTrigger value="progression" className="text-xs sm:text-sm gap-1 flex-1">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Progression</span>
            <span className="sm:hidden">Progr.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="mt-4">
          <AthleteSpaceTests
            playerId={playerId}
            categoryId={categoryId}
            sportType={sportType}
          />
        </TabsContent>

        <TabsContent value="tonnage" className="mt-4">
          <TonnageDashboard
            categoryId={categoryId}
            playerId={playerId}
          />
        </TabsContent>

        <TabsContent value="progression" className="mt-4">
          <AthleteSpaceProgression
            playerId={playerId}
            categoryId={categoryId}
            sportType={sportType}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
