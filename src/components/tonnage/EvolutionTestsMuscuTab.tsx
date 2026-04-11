import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TonnageDashboard } from "./TonnageDashboard";
import { PerformanceEvolution } from "@/components/analytics/PerformanceEvolution";
import { Weight, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EvolutionTestsMuscuTabProps {
  categoryId: string;
}

export function EvolutionTestsMuscuTab({ categoryId }: EvolutionTestsMuscuTabProps) {
  const { data: category } = useQuery({
    queryKey: ["category-sport-evolution", categoryId],
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
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Évolution Tests / Muscu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tonnage" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="tonnage" className="text-xs sm:text-sm">
              <Weight className="h-3.5 w-3.5 mr-1" />
              Tonnage Muscu
            </TabsTrigger>
            <TabsTrigger value="evolution" className="text-xs sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              Comparaison & Évolution
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tonnage">
            <TonnageDashboard categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="evolution">
            <PerformanceEvolution categoryId={categoryId} sportType={sportType} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
