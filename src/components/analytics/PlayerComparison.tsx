import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface PlayerComparisonProps {
  categoryId: string;
}

export function PlayerComparison({ categoryId }: PlayerComparisonProps) {
  const [comparisonType, setComparisonType] = useState<"40m" | "1600m" | "strength">("40m");

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: speedTests, isLoading: loadingSpeed } = useQuery({
    queryKey: ["speed-tests-comparison", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_tests")
        .select("*")
        .eq("category_id", categoryId)
        .order("test_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: strengthTests, isLoading: loadingStrength } = useQuery({
    queryKey: ["strength-tests-comparison", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strength_tests")
        .select("*")
        .eq("category_id", categoryId)
        .order("test_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const prepareComparisonData = () => {
    if (!players || !speedTests || !strengthTests) return [];

    if (comparisonType === "40m") {
      return players.map(player => {
        const playerTests = speedTests
          .filter(t => t.player_id === player.id && t.test_type === "40m_sprint")
          .slice(0, 3);
        
        const avgTime = playerTests.length > 0
          ? playerTests.reduce((sum, t) => sum + Number(t.time_40m_seconds || 0), 0) / playerTests.length
          : 0;

        return {
          name: player.name,
          valeur: avgTime > 0 ? Number(avgTime.toFixed(2)) : null,
        };
      }).filter(p => p.valeur !== null);
    }

    if (comparisonType === "1600m") {
      return players.map(player => {
        const playerTests = speedTests
          .filter(t => t.player_id === player.id && t.test_type === "1600m_run")
          .slice(0, 3);
        
        const avgTime = playerTests.length > 0
          ? playerTests.reduce((sum, t) => {
              const totalSeconds = (Number(t.time_1600m_minutes || 0) * 60) + Number(t.time_1600m_seconds || 0);
              return sum + totalSeconds;
            }, 0) / playerTests.length
          : 0;

        return {
          name: player.name,
          valeur: avgTime > 0 ? Math.round(avgTime) : null,
        };
      }).filter(p => p.valeur !== null);
    }

    if (comparisonType === "strength") {
      return players.map(player => {
        const playerTests = strengthTests
          .filter(t => t.player_id === player.id)
          .slice(0, 3);
        
        const avgWeight = playerTests.length > 0
          ? playerTests.reduce((sum, t) => sum + Number(t.weight_kg || 0), 0) / playerTests.length
          : 0;

        return {
          name: player.name,
          valeur: avgWeight > 0 ? Number(avgWeight.toFixed(1)) : null,
        };
      }).filter(p => p.valeur !== null);
    }

    return [];
  };

  if (loadingSpeed || loadingStrength) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const data = prepareComparisonData();

  const getTitle = () => {
    switch (comparisonType) {
      case "40m": return "Comparaison Sprint 40m (moy. 3 derniers tests)";
      case "1600m": return "Comparaison 1600m (moy. 3 derniers tests)";
      case "strength": return "Comparaison Force (moy. 3 derniers tests)";
    }
  };

  const getUnit = () => {
    switch (comparisonType) {
      case "40m": return "secondes";
      case "1600m": return "secondes";
      case "strength": return "kg";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Comparaison entre Joueurs</span>
          <Select value={comparisonType} onValueChange={(value: any) => setComparisonType(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="40m">Sprint 40m</SelectItem>
              <SelectItem value="1600m">Course 1600m</SelectItem>
              <SelectItem value="strength">Force</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium mb-4">{getTitle()}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                />
                <YAxis label={{ value: getUnit(), angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="valeur" 
                  name={getUnit()} 
                  fill="hsl(var(--primary))" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Aucune donnée disponible pour ce type de comparaison
          </p>
        )}
      </CardContent>
    </Card>
  );
}
