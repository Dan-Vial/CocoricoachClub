import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InjuriesTab } from "@/components/injuries/InjuriesTab";
import { ConcussionProtocolTab } from "@/components/category/ConcussionProtocolTab";
import { MedicalRecordsTab } from "./MedicalRecordsTab";
import { RecoveryJournalTab } from "./RecoveryJournalTab";
import { CoachDashboard } from "./CoachDashboard";
import { ProtocolManager } from "@/components/injuries/ProtocolManager";
import { ActiveProtocolsDashboard } from "@/components/rehab/ActiveProtocolsDashboard";
import {
  Activity,
  Brain,
  FileText,
  Snowflake,
  LayoutDashboard,
  Settings2,
  Dumbbell,
} from "lucide-react";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { DisabledTabTrigger } from "@/components/ui/disabled-tab-trigger";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isRugbyType } from "@/lib/constants/sportTypes";

interface HealthTabProps {
  categoryId: string;
}

export function HealthTab({ categoryId }: HealthTabProps) {
  const { isViewer } = useViewerModeContext();

  // Fetch category sport type
  const { data: category } = useQuery({
    queryKey: ["category-sport-type-health", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const sportType = category?.rugby_type || "";
  const isRugby = isRugbyType(sportType);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-2">
          {/* Dashboard Coach - Accessible en viewer */}
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard Coach
          </TabsTrigger>
          
          {/* Blessures - Grisé en mode viewer */}
          <DisabledTabTrigger value="injuries" isDisabled={isViewer} className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Blessures
          </DisabledTabTrigger>
          
          {/* Protocole Commotion - Uniquement pour Rugby */}
          {isRugby && (
            <DisabledTabTrigger value="concussion" isDisabled={isViewer} className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Protocole Commotion
            </DisabledTabTrigger>
          )}
          
          {/* Suivi Médical - Accessible en viewer */}
          <TabsTrigger value="medical" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Suivi Médical
          </TabsTrigger>
          
          {/* Récupération - Grisé en mode viewer */}
          <DisabledTabTrigger value="recovery" isDisabled={isViewer} className="flex items-center gap-2">
            <Snowflake className="h-4 w-4" />
            Récupération
          </DisabledTabTrigger>
          
          {/* Réhabilitation - Grisé en mode viewer */}
          <DisabledTabTrigger value="rehab" isDisabled={isViewer} className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Réhabilitation
          </DisabledTabTrigger>
          
          {/* Protocoles - Grisé en mode viewer */}
          <DisabledTabTrigger value="protocols" isDisabled={isViewer} className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Protocoles
          </DisabledTabTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <CoachDashboard categoryId={categoryId} />
        </TabsContent>

        {!isViewer && (
          <TabsContent value="injuries">
            <InjuriesTab categoryId={categoryId} />
          </TabsContent>
        )}

        {!isViewer && isRugby && (
          <TabsContent value="concussion">
            <ConcussionProtocolTab categoryId={categoryId} />
          </TabsContent>
        )}

        <TabsContent value="medical">
          <MedicalRecordsTab categoryId={categoryId} />
        </TabsContent>

        {!isViewer && (
          <TabsContent value="recovery">
            <RecoveryJournalTab categoryId={categoryId} />
          </TabsContent>
        )}

        {!isViewer && (
          <TabsContent value="rehab">
            <ActiveProtocolsDashboard categoryId={categoryId} />
          </TabsContent>
        )}

        {!isViewer && (
          <TabsContent value="protocols">
            <ProtocolManager categoryId={categoryId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
