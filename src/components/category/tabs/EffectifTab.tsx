import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus } from "lucide-react";
import { PlayersTab } from "@/components/category/PlayersTab";
import { CategoryCollaborationTab } from "@/components/category/CategoryCollaborationTab";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface EffectifTabProps {
  categoryId: string;
}

export function EffectifTab({ categoryId }: EffectifTabProps) {
  const { isViewer } = useViewerModeContext();

  return (
    <Tabs defaultValue="players" className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <TabsList className="inline-flex w-max min-w-full gap-1 h-auto bg-muted p-1">
          <TabsTrigger value="players" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Users className="h-4 w-4 shrink-0" />
            Athlètes
          </TabsTrigger>
          {!isViewer && (
            <TabsTrigger value="collaboration" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
              <UserPlus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Collaboration</span>
              <span className="sm:hidden">Collab</span>
            </TabsTrigger>
          )}
        </TabsList>
      </div>

      <TabsContent value="players">
        <PlayersTab categoryId={categoryId} />
      </TabsContent>

      {!isViewer && (
        <TabsContent value="collaboration">
          <CategoryCollaborationTab categoryId={categoryId} />
        </TabsContent>
      )}
    </Tabs>
  );
}
