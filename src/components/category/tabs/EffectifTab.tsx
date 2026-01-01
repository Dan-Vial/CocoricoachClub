import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus } from "lucide-react";
import { PlayersTab } from "@/components/category/PlayersTab";
import { CategoryCollaborationTab } from "@/components/category/CategoryCollaborationTab";

interface EffectifTabProps {
  categoryId: string;
}

export function EffectifTab({ categoryId }: EffectifTabProps) {
  return (
    <Tabs defaultValue="players" className="space-y-4">
      <TabsList>
        <TabsTrigger value="players" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Joueurs
        </TabsTrigger>
        <TabsTrigger value="collaboration" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Collaboration
        </TabsTrigger>
      </TabsList>

      <TabsContent value="players">
        <PlayersTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="collaboration">
        <CategoryCollaborationTab categoryId={categoryId} />
      </TabsContent>
    </Tabs>
  );
}
