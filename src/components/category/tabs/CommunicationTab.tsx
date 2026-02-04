import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, FileText, GraduationCap } from "lucide-react";
import { MessagingTab } from "@/components/messaging/MessagingTab";
import { ReportsTab } from "@/components/category/ReportsTab";
import { AcademyTab } from "@/components/category/AcademyTab";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";

interface CommunicationTabProps {
  categoryId: string;
  isAcademy: boolean;
}

export function CommunicationTab({ categoryId, isAcademy }: CommunicationTabProps) {
  return (
    <Tabs defaultValue="messaging" className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4 pb-2 flex justify-center">
        <ColoredSubTabsList colorKey="communication" className="inline-flex w-max">
          <ColoredSubTabsTrigger 
            value="messaging" 
            colorKey="communication"
            icon={<MessageSquare className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Messagerie</span>
            <span className="sm:hidden">Msg</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="reports" 
            colorKey="communication"
            icon={<FileText className="h-4 w-4" />}
          >
            Rapports
          </ColoredSubTabsTrigger>
          {isAcademy && (
            <ColoredSubTabsTrigger 
              value="academy" 
              colorKey="communication"
              icon={<GraduationCap className="h-4 w-4" />}
            >
              Académie
            </ColoredSubTabsTrigger>
          )}
        </ColoredSubTabsList>
      </div>

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
