import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InjuriesTab } from "@/components/injuries/InjuriesTab";
import { ConcussionProtocolTab } from "@/components/category/ConcussionProtocolTab";
import { MedicalRecordsTab } from "./MedicalRecordsTab";
import { RecoveryJournalTab } from "./RecoveryJournalTab";
import { CoachDashboard } from "./CoachDashboard";
import { ProtocolManager } from "@/components/injuries/ProtocolManager";
import {
  Activity,
  Brain,
  FileText,
  Snowflake,
  LayoutDashboard,
  Settings2,
} from "lucide-react";

interface HealthTabProps {
  categoryId: string;
}

export function HealthTab({ categoryId }: HealthTabProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard Coach
          </TabsTrigger>
          <TabsTrigger value="injuries" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Blessures
          </TabsTrigger>
          <TabsTrigger value="concussion" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Protocole Commotion
          </TabsTrigger>
          <TabsTrigger value="medical" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Suivi Médical
          </TabsTrigger>
          <TabsTrigger value="recovery" className="flex items-center gap-2">
            <Snowflake className="h-4 w-4" />
            Récupération
          </TabsTrigger>
          <TabsTrigger value="protocols" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Protocoles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <CoachDashboard categoryId={categoryId} />
        </TabsContent>

        <TabsContent value="injuries">
          <InjuriesTab categoryId={categoryId} />
        </TabsContent>

        <TabsContent value="concussion">
          <ConcussionProtocolTab categoryId={categoryId} />
        </TabsContent>

        <TabsContent value="medical">
          <MedicalRecordsTab categoryId={categoryId} />
        </TabsContent>

        <TabsContent value="recovery">
          <RecoveryJournalTab categoryId={categoryId} />
        </TabsContent>

        <TabsContent value="protocols">
          <ProtocolManager categoryId={categoryId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
