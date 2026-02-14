import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, GraduationCap } from "lucide-react";
import { MessagingTab } from "@/components/messaging/MessagingTab";
import { AcademyTab } from "@/components/category/AcademyTab";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface CommunicationTabProps {
  categoryId: string;
  isAcademy: boolean;
}

export function CommunicationTab({ categoryId, isAcademy }: CommunicationTabProps) {
  const { total: unreadCount } = useUnreadMessages(categoryId);

  return (
    <Tabs defaultValue="messaging" className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4 pb-2 flex justify-center">
        <ColoredSubTabsList colorKey="communication" className="inline-flex w-max">
          <ColoredSubTabsTrigger 
            value="messaging" 
            colorKey="communication"
            icon={<MessageSquare className="h-4 w-4" />}
          >
            <span className="relative">
              <span className="hidden sm:inline">Messagerie</span>
              <span className="sm:hidden">Msg</span>
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-4 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
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

      {isAcademy && (
        <TabsContent value="academy">
          <AcademyTab categoryId={categoryId} />
        </TabsContent>
      )}
    </Tabs>
  );
}
