import { Tabs, TabsContent } from "@/components/ui/tabs";
import { InjuriesTab } from "@/components/injuries/InjuriesTab";
import { ConcussionProtocolTab } from "@/components/category/ConcussionProtocolTab";
import { MedicalRecordsTab } from "./MedicalRecordsTab";
import { RecoveryJournalTab } from "./RecoveryJournalTab";
import { CoachDashboard } from "./CoachDashboard";
import { ActiveProtocolsDashboard } from "@/components/rehab/ActiveProtocolsDashboard";
import {
  Activity,
  Brain,
  Snowflake,
  LayoutDashboard,
  Dumbbell,
} from "lucide-react";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isRugbyType } from "@/lib/constants/sportTypes";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";

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
  const hasConcussionProtocol = isRugby || ["judo", "ski", "snowboard"].includes(sportType);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
          <ColoredSubTabsList colorKey="sante" className="inline-flex w-max">
            {/* Dashboard Coach - Accessible en viewer */}
            <ColoredSubTabsTrigger 
              value="dashboard" 
              colorKey="sante"
              icon={<LayoutDashboard className="h-4 w-4" />}
            >
              Dashboard Coach
            </ColoredSubTabsTrigger>
            
            {/* Blessures - Masqué en mode viewer */}
            {!isViewer && (
              <ColoredSubTabsTrigger 
                value="injuries" 
                colorKey="sante"
                icon={<Activity className="h-4 w-4" />}
              >
                Blessures
              </ColoredSubTabsTrigger>
            )}
            
            {/* Protocole Commotion - Uniquement pour Rugby */}
            {!isViewer && hasConcussionProtocol && (
              <ColoredSubTabsTrigger 
                value="concussion" 
                colorKey="sante"
                icon={<Brain className="h-4 w-4" />}
              >
                Protocole Commotion
              </ColoredSubTabsTrigger>
            )}
            
            {/* Récupération - Masqué en mode viewer */}
            {!isViewer && (
              <ColoredSubTabsTrigger 
                value="recovery" 
                colorKey="sante"
                icon={<Snowflake className="h-4 w-4" />}
              >
                Récupération
              </ColoredSubTabsTrigger>
            )}
            
            {/* Réhabilitation - Masqué en mode viewer */}
            {!isViewer && (
              <ColoredSubTabsTrigger 
                value="rehab" 
                colorKey="sante"
                icon={<Dumbbell className="h-4 w-4" />}
              >
                Réhabilitation
              </ColoredSubTabsTrigger>
            )}
            
          </ColoredSubTabsList>
        </div>

        <TabsContent value="dashboard">
          <CoachDashboard categoryId={categoryId} />
        </TabsContent>

        {!isViewer && (
          <TabsContent value="injuries">
            <InjuriesTab categoryId={categoryId} />
          </TabsContent>
        )}

        {!isViewer && hasConcussionProtocol && (
          <TabsContent value="concussion">
            <ConcussionProtocolTab categoryId={categoryId} />
          </TabsContent>
        )}

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
      </Tabs>
    </div>
  );
}
