import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
 import { Users, Video, BookOpen } from "lucide-react";
import { CategoryCollaborationTab } from "@/components/category/CategoryCollaborationTab";
 import { TutorialVideosSection } from "@/components/category/settings/TutorialVideosSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SettingsTabProps {
  categoryId: string;
}

export function SettingsTab({ categoryId }: SettingsTabProps) {
  return (
    <Tabs defaultValue="collaboration" className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <TabsList className="inline-flex w-max min-w-full gap-1 h-auto bg-muted p-1">
          <TabsTrigger value="collaboration" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Users className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Collaboration</span>
            <span className="sm:hidden">Collab</span>
          </TabsTrigger>
          <TabsTrigger value="tutorials" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Video className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Tutoriels Vidéo</span>
            <span className="sm:hidden">Vidéos</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="collaboration">
        <CategoryCollaborationTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="tutorials">
         <TutorialVideosSection />
      </TabsContent>
    </Tabs>
  );
}
