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
      <TabsList className="flex w-full overflow-x-auto no-scrollbar gap-1 h-auto flex-wrap md:flex-nowrap bg-muted">
        <TabsTrigger value="messaging" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Messagerie</span>
          <span className="sm:hidden">Msg</span>
        </TabsTrigger>
        <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
          <FileText className="h-4 w-4 shrink-0" />
          Rapports
        </TabsTrigger>
        {isAcademy && (
          <TabsTrigger value="academy" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
            <GraduationCap className="h-4 w-4 shrink-0" />
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
