import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, FileText, GraduationCap } from "lucide-react";
import { MessagingTab } from "@/components/messaging/MessagingTab";
import { ReportsTab } from "@/components/category/ReportsTab";
import { AcademyTab } from "@/components/category/AcademyTab";

interface CommunicationTabProps {
  categoryId: string;
  isAcademy: boolean;
}

export function CommunicationTab({ categoryId, isAcademy }: CommunicationTabProps) {
  return (
    <Tabs defaultValue="messaging" className="space-y-4">
      <TabsList>
        <TabsTrigger value="messaging" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Messagerie
        </TabsTrigger>
        <TabsTrigger value="reports" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Rapports
        </TabsTrigger>
        {isAcademy && (
          <TabsTrigger value="academy" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Académie
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="messaging">
        <MessagingTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="reports">
        <ReportsTab categoryId={categoryId} />
      </TabsContent>

      {isAcademy && (
        <TabsContent value="academy">
          <AcademyTab categoryId={categoryId} />
        </TabsContent>
      )}
    </Tabs>
  );
}
