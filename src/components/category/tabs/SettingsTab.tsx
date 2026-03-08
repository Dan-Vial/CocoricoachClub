import { useState } from "react";
import { TutorialVideosSection } from "@/components/category/settings/TutorialVideosSection";
import { NotificationManagementSection } from "@/components/category/settings/NotificationManagementSection";
import { PersonalNotificationPreferences } from "@/components/notifications/PersonalNotificationPreferences";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Video, Bell, Settings, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsTabProps {
  categoryId: string;
}

export function SettingsTab({ categoryId }: SettingsTabProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [myNotifsOpen, setMyNotifsOpen] = useState(false);
  const [tutorialsOpen, setTutorialsOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Notifications Collapsible */}
      <Collapsible open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className={cn(
            "flex items-center justify-between w-full p-4 rounded-xl border bg-card shadow-sm transition-colors hover:bg-accent/50",
            notificationsOpen && "rounded-b-none border-b-0"
          )}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Notifications</p>
                <p className="text-sm text-muted-foreground">Push et email pour le staff et les athlètes</p>
              </div>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              notificationsOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border border-t-0 rounded-b-xl p-4 bg-card shadow-sm">
            <NotificationManagementSection categoryId={categoryId} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Tutorial Videos Collapsible */}
      <Collapsible open={tutorialsOpen} onOpenChange={setTutorialsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className={cn(
            "flex items-center justify-between w-full p-4 rounded-xl border bg-card shadow-sm transition-colors hover:bg-accent/50",
            tutorialsOpen && "rounded-b-none border-b-0"
          )}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Vidéos & Tutoriels</p>
                <p className="text-sm text-muted-foreground">Guides et formations vidéo</p>
              </div>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              tutorialsOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border border-t-0 rounded-b-xl p-4 bg-card shadow-sm">
            <TutorialVideosSection />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
