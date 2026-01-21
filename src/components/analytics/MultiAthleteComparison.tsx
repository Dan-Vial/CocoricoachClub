import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Loader2, Plus, X, Users, Scale } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MultiAthleteComparisonProps {
  categoryId: string;
  sportType?: string;
}

interface ComparisonMetric {
  value: string;
  label: string;
  unit: string;
  source: "speed" | "strength" | "jump" | "generic" | "body";
}

// Base metrics available for all sports
const BASE_METRICS: ComparisonMetric[] = [
  { value: "weight", label: "Poids", unit: "kg", source: "body" },
  { value: "height", label: "Taille", unit: "cm", source: "body" },
  { value: "body_fat", label: "% Masse grasse", unit: "%", source: "body" },
];

// Get sport-specific default metrics
const getSportMetrics = (sportType: string): ComparisonMetric[] => {
  const sport = sportType?.toLowerCase() || "";
  
  if (sport.includes("judo")) {
    return [
      { value: "sjft", label: "SJFT Index", unit: "score", source: "generic" },
      { value: "pullups", label: "Tractions Max", unit: "reps", source: "generic" },
      { value: "grip_strength", label: "Force préhension", unit: "kg", source: "generic" },
    ];
  }
  
  if (sport.includes("aviron")) {
    return [
      { value: "ergo_2000m", label: "Ergo 2000m", unit: "s", source: "generic" },
      { value: "ergo_6000m", label: "Ergo 6000m", unit: "s", source: "generic" },
      { value: "power_max", label: "Puissance Max", unit: "W", source: "generic" },
    ];
  }
  
  if (sport.includes("handball") || sport.includes("basketball")) {
    return [
      { value: "sprint_30m", label: "Sprint 30m", unit: "s", source: "generic" },
      { value: "cmj", label: "CMJ", unit: "cm", source: "jump" },
      { value: "agility", label: "Agilité", unit: "s", source: "generic" },
    ];
  }
  
  if (sport.includes("volleyball")) {
    return [
      { value: "cmj", label: "CMJ", unit: "cm", source: "jump" },
      { value: "drop_jump", label: "Drop Jump", unit: "cm", source: "jump" },
      { value: "reach", label: "Détente verticale", unit: "cm", source: "generic" },
    ];
  }
  
  // Default (Rugby and others)
  return [
    { value: "sprint_40m", label: "Sprint 40m", unit: "s", source: "speed" },
    { value: "run_1600m", label: "Course 1600m", unit: "s", source: "speed" },
    { value: "bench_press", label: "Développé couché", unit: "kg", source: "strength" },
  ];
};

// Colors for different athletes in charts
const ATHLETE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 87%, 50%)",
  "hsl(195, 100%, 50%)",
  "hsl(330, 80%, 50%)",
  "hsl(60, 80%, 45%)",
];

export function MultiAthleteComparison({ categoryId, sportType = "XV" }: MultiAthleteComparisonProps) {
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("");

  // Fetch all players
  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ["players-comparison", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch body composition data
  const { data: bodyComposition } = useQuery({
    queryKey: ["body-composition-comparison", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_composition")
        .select("*")
        .eq("category_id", categoryId)
        .order("measurement_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch speed tests
  const { data: speedTests, isLoading: loadingSpeed } = useQuery({
    queryKey: ["speed-tests-multi-comparison", categoryId],
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

  // Fetch strength tests
  const { data: strengthTests, isLoading: loadingStrength } = useQuery({
    queryKey: ["strength-tests-multi-comparison", categoryId],
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

  // Fetch jump tests
  const { data: jumpTests, isLoading: loadingJump } = useQuery({
    queryKey: ["jump-tests-multi-comparison", categoryId],
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

  // Fetch generic tests
  const { data: genericTests, isLoading: loadingGeneric } = useQuery({
    queryKey: ["generic-tests-multi-comparison", categoryId],
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

  // Dynamically build available metrics based on actual test data
  const availableMetrics = useMemo(() => {
    const metrics: ComparisonMetric[] = [...BASE_METRICS];
    const sportDefaults = getSportMetrics(sportType);
    const addedValues = new Set(metrics.map(m => m.value));

    // Add sport-specific defaults
    sportDefaults.forEach(m => {
      if (!addedValues.has(m.value)) {
        metrics.push(m);
        addedValues.add(m.value);
      }
    });

    // Add tests from speed_tests
    if (speedTests?.length) {
      const speedTypes = new Set(speedTests.map(t => t.test_type).filter(Boolean));
      speedTypes.forEach(type => {
        if (type && !addedValues.has(type)) {
          metrics.push({
            value: type,
            label: formatTestLabel(type),
            unit: type.includes("1600") ? "min.s" : "s",
            source: "speed",
          });
          addedValues.add(type);
        }
      });
    }

    // Add tests from strength_tests
    if (strengthTests?.length) {
      const strengthTypes = new Set(strengthTests.map(t => t.test_name).filter(Boolean));
      strengthTypes.forEach(type => {
        if (type && !addedValues.has(type)) {
          metrics.push({
            value: type,
            label: formatTestLabel(type),
            unit: "kg",
            source: "strength",
          });
          addedValues.add(type);
        }
      });
    }

    // Add tests from jump_tests
    if (jumpTests?.length) {
      const jumpTypes = new Set(jumpTests.map(t => t.test_type).filter(Boolean));
      jumpTypes.forEach(type => {
        if (type && !addedValues.has(type)) {
          metrics.push({
            value: type,
            label: formatTestLabel(type),
            unit: "cm",
            source: "jump",
          });
          addedValues.add(type);
        }
      });
    }

    // Add tests from generic_tests
    if (genericTests?.length) {
      const genericTypes = new Set(genericTests.map(t => t.test_type).filter(Boolean));
      genericTypes.forEach(type => {
        if (type && !addedValues.has(type)) {
          const sample = genericTests.find(t => t.test_type === type);
          metrics.push({
            value: type,
            label: formatTestLabel(type),
            unit: sample?.result_unit || "",
            source: "generic",
          });
          addedValues.add(type);
        }
      });
    }

    return metrics;
  }, [sportType, speedTests, strengthTests, jumpTests, genericTests]);

  // Set default metric when available
  useMemo(() => {
    if (availableMetrics.length > 0 && !selectedMetric) {
      setSelectedMetric(availableMetrics[0].value);
    }
  }, [availableMetrics, selectedMetric]);

  // Get available athletes (not yet selected)
  const availableAthletes = useMemo(() => {
    return players?.filter(p => !selectedAthletes.includes(p.id)) || [];
  }, [players, selectedAthletes]);

  // Add athlete to comparison
  const addAthlete = (athleteId: string) => {
    if (athleteId && !selectedAthletes.includes(athleteId)) {
      setSelectedAthletes([...selectedAthletes, athleteId]);
    }
  };

  // Remove athlete from comparison
  const removeAthlete = (athleteId: string) => {
    setSelectedAthletes(selectedAthletes.filter(id => id !== athleteId));
  };

  // Get metric value for a specific athlete
  const getAthleteMetricValue = (athleteId: string, metricValue: string): number | null => {
    const metric = availableMetrics.find(m => m.value === metricValue);
    if (!metric) return null;

    const player = players?.find(p => p.id === athleteId);

    switch (metric.source) {
      case "body":
        if (metricValue === "weight") {
          const bodyData = bodyComposition?.find(b => b.player_id === athleteId);
          return bodyData?.weight_kg || null;
        }
        if (metricValue === "height") {
          const bodyData = bodyComposition?.find(b => b.player_id === athleteId);
          return bodyData?.height_cm || null;
        }
        if (metricValue === "body_fat") {
          const bodyData = bodyComposition?.find(b => b.player_id === athleteId);
          return bodyData?.body_fat_percentage || null;
        }
        return null;

      case "speed":
        const speedData = speedTests?.filter(t => t.player_id === athleteId && t.test_type === metricValue);
        if (speedData?.length) {
          if (metricValue.includes("40m")) {
            const best = Math.min(...speedData.map(t => Number(t.time_40m_seconds || 999)));
            return best < 999 ? best : null;
          }
          if (metricValue.includes("1600")) {
            const times = speedData.map(t => (Number(t.time_1600m_minutes || 0) * 60) + Number(t.time_1600m_seconds || 0));
            const best = Math.min(...times.filter(t => t > 0));
            return best > 0 ? best : null;
          }
        }
        return null;

      case "strength":
        const strengthData = strengthTests?.filter(t => t.player_id === athleteId && t.test_name === metricValue);
        if (strengthData?.length) {
          return Math.max(...strengthData.map(t => Number(t.weight_kg || 0)));
        }
        return null;

      case "jump":
        const jumpData = jumpTests?.filter(t => t.player_id === athleteId && t.test_type === metricValue);
        if (jumpData?.length) {
          return Math.max(...jumpData.map(t => Number(t.result_cm || 0)));
        }
        return null;

      case "generic":
        const genericData = genericTests?.filter(t => 
          t.player_id === athleteId && 
          (t.test_type === metricValue || t.test_type?.toLowerCase().includes(metricValue.toLowerCase()))
        );
        if (genericData?.length) {
          // For time-based tests, get best (lowest)
          if (metric.unit === "s" || metric.unit === "min.s") {
            return Math.min(...genericData.map(t => Number(t.result_value || 999)));
          }
          // For other tests, get best (highest)
          return Math.max(...genericData.map(t => Number(t.result_value || 0)));
        }
        return null;
    }

    return null;
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (selectedAthletes.length < 2 || !selectedMetric) return [];

    const currentMetric = availableMetrics.find(m => m.value === selectedMetric);
    
    return selectedAthletes.map((athleteId, index) => {
      const player = players?.find(p => p.id === athleteId);
      const value = getAthleteMetricValue(athleteId, selectedMetric);
      
      return {
        name: player?.name || "Inconnu",
        valeur: value,
        fill: ATHLETE_COLORS[index % ATHLETE_COLORS.length],
      };
    }).filter(d => d.valeur !== null);
  }, [selectedAthletes, selectedMetric, players, availableMetrics]);

  // Prepare radar data for multi-metric comparison
  const radarData = useMemo(() => {
    if (selectedAthletes.length < 2) return [];

    // Use first 5 numeric metrics for radar
    const radarMetrics = availableMetrics
      .filter(m => m.source !== "body" || m.value === "weight")
      .slice(0, 6);

    return radarMetrics.map(metric => {
      const dataPoint: Record<string, any> = { metric: metric.label };
      
      selectedAthletes.forEach((athleteId, index) => {
        const player = players?.find(p => p.id === athleteId);
        const value = getAthleteMetricValue(athleteId, metric.value);
        
        // Normalize values to 0-100 scale for radar chart
        const allValues = selectedAthletes
          .map(id => getAthleteMetricValue(id, metric.value))
          .filter((v): v is number => v !== null);
        
        const maxVal = Math.max(...allValues, 1);
        const normalizedValue = value ? (value / maxVal) * 100 : 0;
        
        dataPoint[player?.name || `Athlete ${index + 1}`] = Math.round(normalizedValue);
      });

      return dataPoint;
    });
  }, [selectedAthletes, availableMetrics, players]);

  const isLoading = loadingPlayers || loadingSpeed || loadingStrength || loadingJump || loadingGeneric;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentMetric = availableMetrics.find(m => m.value === selectedMetric);

  return (
    <div className="space-y-6">
      {/* Athlete Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sélection des Athlètes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected athletes */}
          <div className="flex flex-wrap gap-2">
            {selectedAthletes.map((athleteId, index) => {
              const player = players?.find(p => p.id === athleteId);
              return (
                <Badge
                  key={athleteId}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1.5"
                  style={{ 
                    backgroundColor: `${ATHLETE_COLORS[index % ATHLETE_COLORS.length]}20`,
                    borderColor: ATHLETE_COLORS[index % ATHLETE_COLORS.length],
                    borderWidth: 1
                  }}
                >
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: ATHLETE_COLORS[index % ATHLETE_COLORS.length] }}
                  />
                  {player?.name}
                  <button
                    onClick={() => removeAthlete(athleteId)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>

          {/* Add athlete button */}
          <div className="flex items-center gap-2">
            <Select onValueChange={addAthlete} value="">
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Ajouter un athlète..." />
              </SelectTrigger>
              <SelectContent>
                {availableAthletes.map(player => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              disabled={availableAthletes.length === 0}
              onClick={() => availableAthletes[0] && addAthlete(availableAthletes[0].id)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {selectedAthletes.length < 2 && (
            <p className="text-sm text-muted-foreground">
              Sélectionnez au moins 2 athlètes pour comparer
            </p>
          )}
        </CardContent>
      </Card>

      {/* Comparison Charts */}
      {selectedAthletes.length >= 2 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Comparaison
              </CardTitle>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Sélectionner un test..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMetrics.map(metric => (
                    <SelectItem key={metric.value} value={metric.value}>
                      {metric.label} ({metric.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="bar" className="space-y-4">
              <TabsList>
                <TabsTrigger value="bar">Barres</TabsTrigger>
                <TabsTrigger value="radar">Radar</TabsTrigger>
              </TabsList>

              <TabsContent value="bar">
                {chartData.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-medium mb-4">
                      {currentMetric?.label} ({currentMetric?.unit})
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis 
                          label={{ 
                            value: currentMetric?.unit || "", 
                            angle: -90, 
                            position: "insideLeft" 
                          }} 
                        />
                        <Tooltip 
                          formatter={(value: number) => [
                            `${value.toFixed(2)} ${currentMetric?.unit}`,
                            currentMetric?.label
                          ]}
                        />
                        <Bar 
                          dataKey="valeur" 
                          name={currentMetric?.label}
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        >
                          {chartData.map((entry, index) => (
                            <Bar 
                              key={`bar-${index}`}
                              dataKey="valeur"
                              fill={entry.fill}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune donnée disponible pour ce test
                  </p>
                )}
              </TabsContent>

              <TabsContent value="radar">
                {radarData.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-medium mb-4">
                      Profil comparatif (normalisé)
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        {selectedAthletes.map((athleteId, index) => {
                          const player = players?.find(p => p.id === athleteId);
                          return (
                            <Radar
                              key={athleteId}
                              name={player?.name || `Athlete ${index + 1}`}
                              dataKey={player?.name || `Athlete ${index + 1}`}
                              stroke={ATHLETE_COLORS[index % ATHLETE_COLORS.length]}
                              fill={ATHLETE_COLORS[index % ATHLETE_COLORS.length]}
                              fillOpacity={0.2}
                            />
                          );
                        })}
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Pas assez de données pour le graphique radar
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper to format test type labels
function formatTestLabel(testType: string): string {
  return testType
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}
