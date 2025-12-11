import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerformanceEvolution } from "./PerformanceEvolution";
import { PlayerComparison } from "./PlayerComparison";
import { InjuryRiskPrediction } from "./InjuryRiskPrediction";
import { PerformanceHeatmap } from "./PerformanceHeatmap";

interface AnalyticsTabProps {
  categoryId: string;
}

export function AnalyticsTab({ categoryId }: AnalyticsTabProps) {
  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle>Analyse & Visualisation</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="evolution" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="evolution">Évolution</TabsTrigger>
            <TabsTrigger value="comparison">Comparaison</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="risk">Risque Blessure</TabsTrigger>
          </TabsList>

          <TabsContent value="evolution">
            <PerformanceEvolution categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="comparison">
            <PlayerComparison categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="heatmap">
            <PerformanceHeatmap categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="risk">
            <InjuryRiskPrediction categoryId={categoryId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
