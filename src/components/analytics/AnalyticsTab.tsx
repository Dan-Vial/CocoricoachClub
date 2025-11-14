import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { PerformanceEvolution } from "./PerformanceEvolution";
import { PlayerComparison } from "./PlayerComparison";
import { InjuryRiskPrediction } from "./InjuryRiskPrediction";
import { exportAnalyticsToPDF } from "@/utils/exportAnalyticsPDF";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsTabProps {
  categoryId: string;
}

export function AnalyticsTab({ categoryId }: AnalyticsTabProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("evolution");
  const [isExporting, setIsExporting] = useState(false);

  const { data: category } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("name")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleExportPDF = async () => {
    if (!category) return;

    setIsExporting(true);
    toast({
      title: "Export en cours...",
      description: "Génération du PDF en cours",
    });

    const result = await exportAnalyticsToPDF(category.name, activeTab);

    setIsExporting(false);

    if (result.success) {
      toast({
        title: "Export réussi",
        description: "Le rapport PDF a été téléchargé",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Échec de l'export PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Analyse & Visualisation</CardTitle>
          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Export..." : "Exporter en PDF"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="evolution">Évolution</TabsTrigger>
            <TabsTrigger value="comparison">Comparaison</TabsTrigger>
            <TabsTrigger value="risk">Risque Blessure</TabsTrigger>
          </TabsList>

          <TabsContent value="evolution">
            <PerformanceEvolution categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="comparison">
            <PlayerComparison categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="risk">
            <InjuryRiskPrediction categoryId={categoryId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
