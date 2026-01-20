import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerformanceEvolution } from "./PerformanceEvolution";
import { PlayerComparison } from "./PlayerComparison";
import { InjuryRiskPrediction } from "./InjuryRiskPrediction";
import { PerformanceHeatmap } from "./PerformanceHeatmap";
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="evolution">Évolution</TabsTrigger>
            <TabsTrigger value="comparison">Comparaison</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="risk">Risques</TabsTrigger>
            <TabsTrigger value="ai-predict">IA Prédictif</TabsTrigger>
          </TabsList>

          <TabsContent value="evolution">
            <PerformanceEvolution categoryId={categoryId} sportType={sportType} />
          </TabsContent>

          <TabsContent value="comparison">
            <PlayerComparison categoryId={categoryId} sportType={sportType} />
          </TabsContent>

          <TabsContent value="heatmap">
            <PerformanceHeatmap categoryId={categoryId} />
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
