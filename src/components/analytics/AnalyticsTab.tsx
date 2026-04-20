import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerformanceEvolution } from "./PerformanceEvolution";
import { InjuryRiskPrediction } from "./InjuryRiskPrediction";

import { AIPredictiveDashboard } from "./AIPredictiveDashboard";

interface AnalyticsTabProps {
  categoryId: string;
}

export function AnalyticsTab({ categoryId }: AnalyticsTabProps) {
  // Fetch sport type
  const { data: category } = useQuery({
    queryKey: ["category-sport-analytics", categoryId],
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

  const sportType = category?.rugby_type || "XV";

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle>Analyse & Visualisation</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="evolution" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="evolution" className="text-xs sm:text-sm">Évolution & Comparaison</TabsTrigger>
            
            <TabsTrigger value="risk" className="text-xs sm:text-sm">Risques & Alertes</TabsTrigger>
            <TabsTrigger value="ai-predict" className="text-xs sm:text-sm">IA Prédictif</TabsTrigger>
          </TabsList>

          <TabsContent value="evolution">
            <PerformanceEvolution categoryId={categoryId} sportType={sportType} />
          </TabsContent>


          <TabsContent value="risk">
            <InjuryRiskPrediction categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="ai-predict">
            <AIPredictiveDashboard categoryId={categoryId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
