import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface PlayerComparisonProps {
  categoryId: string;
  sportType?: string;
}

// Get comparison options based on sport
const getComparisonOptions = (sportType: string) => {
  const sport = sportType?.toLowerCase() || "";
  
  if (sport.includes("judo")) {
    return [
      { value: "sjft", label: "SJFT Index" },
      { value: "pullups", label: "Tractions Max" },
      { value: "strength", label: "Force" },
    ];
  }
  
  if (sport.includes("handball") || sport.includes("basketball")) {
    return [
      { value: "sprint30", label: "Sprint 30m" },
      { value: "cmj", label: "CMJ" },
      { value: "strength", label: "Force" },
    ];
  }
  
  if (sport.includes("football")) {
    return [
      { value: "sprint30", label: "Sprint 30m" },
      { value: "ift", label: "30-15 IFT" },
      { value: "strength", label: "Force" },
    ];
  }
  
  if (sport.includes("aviron")) {
    return [
      { value: "ergo2000", label: "Ergo 2000m" },
      { value: "power", label: "Puissance" },
      { value: "strength", label: "Force" },
    ];
  }
  
  if (sport.includes("volleyball")) {
    return [
      { value: "cmj", label: "CMJ" },
      { value: "dropJump", label: "Drop Jump" },
      { value: "strength", label: "Force" },
    ];
  }
  
  if (sport.includes("bowling")) {
    return [
      { value: "avgScore", label: "Score Moyen" },
      { value: "strikeRate", label: "% Strikes" },
      { value: "strength", label: "Force" },
    ];
  }
  
  // Default (Rugby)
  return [
    { value: "40m", label: "Sprint 40m" },
    { value: "1600m", label: "Course 1600m" },
    { value: "strength", label: "Force" },
  ];
};

export function PlayerComparison({ categoryId, sportType = "XV" }: PlayerComparisonProps) {
  const options = getComparisonOptions(sportType);
  const [comparisonType, setComparisonType] = useState(options[0]?.value || "40m");

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

  const { data: jumpTests, isLoading: loadingJump } = useQuery({
    queryKey: ["jump-tests-comparison", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jump_tests")
        .select("*")
        .eq("category_id", categoryId)
        .order("test_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: genericTests, isLoading: loadingGeneric } = useQuery({
    queryKey: ["generic-tests-comparison", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generic_tests")
        .select("*")
        .eq("category_id", categoryId)
        .order("test_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const prepareComparisonData = () => {
    if (!players) return [];

    return players.map(player => {
      let value: number | null = null;

      if (comparisonType === "40m" && speedTests) {
        const playerTests = speedTests
          .filter(t => t.player_id === player.id && t.test_type === "40m_sprint")
          .slice(0, 3);
        value = playerTests.length > 0
          ? playerTests.reduce((sum, t) => sum + Number(t.time_40m_seconds || 0), 0) / playerTests.length
          : null;
      } else if (comparisonType === "1600m" && speedTests) {
        const playerTests = speedTests
          .filter(t => t.player_id === player.id && t.test_type === "1600m_run")
          .slice(0, 3);
        value = playerTests.length > 0
          ? playerTests.reduce((sum, t) => {
              const totalSeconds = (Number(t.time_1600m_minutes || 0) * 60) + Number(t.time_1600m_seconds || 0);
              return sum + totalSeconds;
            }, 0) / playerTests.length
          : null;
      } else if (comparisonType === "strength" && strengthTests) {
        const playerTests = strengthTests.filter(t => t.player_id === player.id).slice(0, 3);
        value = playerTests.length > 0
          ? playerTests.reduce((sum, t) => sum + Number(t.weight_kg || 0), 0) / playerTests.length
          : null;
      } else if ((comparisonType === "cmj" || comparisonType === "dropJump") && jumpTests) {
        const filterType = comparisonType === "cmj" ? "cmj" : "drop";
        const playerTests = jumpTests
          .filter(t => t.player_id === player.id && t.test_type?.toLowerCase().includes(filterType))
          .slice(0, 3);
        value = playerTests.length > 0
          ? Math.max(...playerTests.map(t => Number(t.result_cm || 0)))
          : null;
      } else if (genericTests) {
        // Handle generic test types
        let filter: (t: any) => boolean = () => false;
        
        if (comparisonType === "sjft") filter = t => t.test_type?.toLowerCase().includes("sjft");
        else if (comparisonType === "pullups") filter = t => t.test_type?.toLowerCase().includes("traction");
        else if (comparisonType === "sprint30") filter = t => t.test_type?.includes("30m");
        else if (comparisonType === "ift") filter = t => t.test_type?.toLowerCase().includes("30-15");
        else if (comparisonType === "ergo2000") filter = t => t.test_type?.toLowerCase().includes("ergo") || t.test_type?.includes("2000");
        else if (comparisonType === "power") filter = t => t.test_type?.toLowerCase().includes("puissance") || t.test_type?.toLowerCase().includes("power");
        
        const playerTests = genericTests.filter(t => t.player_id === player.id && filter(t)).slice(0, 3);
        value = playerTests.length > 0
          ? playerTests.reduce((sum, t) => sum + Number(t.result_value || 0), 0) / playerTests.length
          : null;
      }

      return {
        name: player.name,
        valeur: value !== null ? Number(value.toFixed(2)) : null,
      };
    }).filter(p => p.valeur !== null);
  };

  if (loadingSpeed || loadingStrength || loadingJump || loadingGeneric) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const data = prepareComparisonData();
  const currentOption = options.find(o => o.value === comparisonType);

  const getUnit = () => {
    if (comparisonType === "40m" || comparisonType === "1600m" || comparisonType === "sprint30") return "secondes";
    if (comparisonType === "strength" || comparisonType === "power") return "kg / watts";
    if (comparisonType === "cmj" || comparisonType === "dropJump") return "cm";
    if (comparisonType === "ift") return "km/h";
    if (comparisonType === "sjft" || comparisonType === "pullups" || comparisonType === "avgScore") return "score";
    if (comparisonType === "strikeRate") return "%";
    return "valeur";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Comparaison entre Athlètes</span>
          <Select value={comparisonType} onValueChange={setComparisonType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium mb-4">
              Comparaison {currentOption?.label} (moy. 3 derniers tests)
            </h3>
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
