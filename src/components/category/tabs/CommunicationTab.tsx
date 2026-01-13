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
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <TabsList className="inline-flex w-max min-w-full gap-1 h-auto bg-muted p-1">
          <TabsTrigger value="messaging" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Messagerie</span>
            <span className="sm:hidden">Msg</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <FileText className="h-4 w-4 shrink-0" />
            Rapports
          </TabsTrigger>
          {isAcademy && (
            <TabsTrigger value="academy" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
              <GraduationCap className="h-4 w-4 shrink-0" />
              Académie
            </TabsTrigger>
          )}
        </TabsList>
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
