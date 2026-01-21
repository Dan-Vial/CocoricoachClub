import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell,
  ComposedChart, Line, Area
} from "recharts";
import { Loader2, Plus, X, Users, Scale, Timer, Weight, Zap, Ruler, TrendingUp, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isAthletismeCategory } from "@/lib/constants/sportTypes";
import { getDisciplineLabel } from "@/lib/constants/athleticProfiles";

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
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");

  const isAthletics = isAthletismeCategory(sportType);

  // Fetch all players with discipline
  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ["players-comparison", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, discipline")
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

  // Get unique disciplines from players
  const availableDisciplines = useMemo(() => {
    if (!players) return [];
    const disciplines = new Set(
      players
        .map((p) => p.discipline)
        .filter((d): d is string => !!d && d.length > 0)
    );
    return Array.from(disciplines);
  }, [players]);

  // Get filtered players by discipline
  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    if (disciplineFilter === "all") return players;
    return players.filter((p) => p.discipline === disciplineFilter);
  }, [players, disciplineFilter]);

  // Get available athletes (not yet selected) from filtered list
  const availableAthletes = useMemo(() => {
    return filteredPlayers?.filter(p => !selectedAthletes.includes(p.id)) || [];
  }, [filteredPlayers, selectedAthletes]);

  // Function to select all athletes from current filter
  const selectAllFiltered = () => {
    const allIds = filteredPlayers.map(p => p.id);
    setSelectedAthletes(allIds);
  };

  // Function to clear all selected athletes
  const clearAllSelected = () => {
    setSelectedAthletes([]);
  };

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

  // Get unit label with icon
  const getUnitLabel = (unit: string): { label: string; icon: React.ReactNode } => {
    const unitLower = unit?.toLowerCase() || "";
    if (unitLower.includes("s") || unitLower.includes("min") || unitLower.includes("time")) {
      return { label: "Temps", icon: <Timer className="h-4 w-4" /> };
    }
    if (unitLower === "kg") {
      return { label: "Poids (kg)", icon: <Weight className="h-4 w-4" /> };
    }
    if (unitLower === "w" || unitLower === "watts") {
      return { label: "Puissance (W)", icon: <Zap className="h-4 w-4" /> };
    }
    if (unitLower === "cm" || unitLower === "m") {
      return { label: `Distance (${unit})`, icon: <Ruler className="h-4 w-4" /> };
    }
    if (unitLower === "%") {
      return { label: "Pourcentage (%)", icon: <TrendingUp className="h-4 w-4" /> };
    }
    if (unitLower === "reps" || unitLower === "score") {
      return { label: unit === "reps" ? "Répétitions" : "Score", icon: <TrendingUp className="h-4 w-4" /> };
    }
    return { label: unit || "Valeur", icon: <TrendingUp className="h-4 w-4" /> };
  };

  // Format value for display
  const formatDisplayValue = (value: number, unit: string): string => {
    if (!value) return "—";
    const unitLower = unit?.toLowerCase() || "";
    
    // Format time values
    if (unitLower.includes("min.s") || unitLower === "min.s") {
      const mins = Math.floor(value / 60);
      const secs = Math.round(value % 60);
      return `${mins}'${secs.toString().padStart(2, "0")}''`;
    }
    if (unitLower === "s" && value > 60) {
      const mins = Math.floor(value / 60);
      const secs = (value % 60).toFixed(1);
      return `${mins}'${secs}''`;
    }
    if (unitLower === "s") {
      return `${value.toFixed(2)}s`;
    }
    
    return `${value.toFixed(value % 1 === 0 ? 0 : 1)} ${unit}`;
  };

  const unitInfo = currentMetric ? getUnitLabel(currentMetric.unit) : { label: "Valeur", icon: null };

  return (
    <div className="space-y-6">
      {/* Athlete Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sélection des Athlètes
            </CardTitle>
            {isAthletics && availableDisciplines.length > 0 && (
              <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrer par discipline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les disciplines</SelectItem>
                  {availableDisciplines.map((discipline) => (
                    <SelectItem key={discipline} value={discipline}>
                      {getDisciplineLabel(discipline)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected athletes count and bulk actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              {selectedAthletes.length} athlète{selectedAthletes.length !== 1 ? "s" : ""} sélectionné{selectedAthletes.length !== 1 ? "s" : ""}
              {disciplineFilter !== "all" && ` (filtre: ${getDisciplineLabel(disciplineFilter)})`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllFiltered}
                disabled={availableAthletes.length === 0}
              >
                Tout sélectionner
              </Button>
              {selectedAthletes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllSelected}
                >
                  Tout désélectionner
                </Button>
              )}
            </div>
          </div>

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
                  <span>
                    {player?.name}
                    {isAthletics && player?.discipline && (
                      <span className="text-xs opacity-70 ml-1">
                        ({getDisciplineLabel(player.discipline)})
                      </span>
                    )}
                  </span>
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
                    {isAthletics && player.discipline && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({getDisciplineLabel(player.discipline)})
                      </span>
                    )}
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
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {unitInfo.icon}
                      <span>{currentMetric?.label} — {unitInfo.label}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={380}>
                      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <defs>
                          {chartData.map((entry, index) => (
                            <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={entry.fill} stopOpacity={0.9}/>
                              <stop offset="100%" stopColor={entry.fill} stopOpacity={0.4}/>
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          angle={-30}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          label={{ 
                            value: unitInfo.label, 
                            angle: -90, 
                            position: "insideLeft",
                            style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
                          }} 
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                          labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 600 }}
                          formatter={(value: number) => [
                            formatDisplayValue(value, currentMetric?.unit || ""),
                            currentMetric?.label
                          ]}
                        />
                        <Bar 
                          dataKey="valeur" 
                          name={currentMetric?.label}
                          radius={[8, 8, 0, 0]}
                          barSize={60}
                        >
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`url(#colorGradient-${index})`}
                              stroke={entry.fill}
                              strokeWidth={2}
                            />
                          ))}
                        </Bar>
                        {/* Reference line for average */}
                        <Line 
                          type="monotone" 
                          dataKey={() => {
                            const values = chartData.map(d => d.valeur).filter((v): v is number => v !== null);
                            return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                          }}
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          dot={false}
                          name="Moyenne"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                    
                    {/* Visual comparison cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                      {chartData.map((athlete, index) => (
                        <div 
                          key={athlete.name}
                          className="relative p-4 rounded-xl border-2 bg-gradient-to-br from-background to-muted/30"
                          style={{ borderColor: ATHLETE_COLORS[index % ATHLETE_COLORS.length] }}
                        >
                          <div 
                            className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                            style={{ backgroundColor: ATHLETE_COLORS[index % ATHLETE_COLORS.length] }}
                          />
                          <p className="text-sm font-medium truncate">{athlete.name}</p>
                          <p 
                            className="text-2xl font-bold mt-1"
                            style={{ color: ATHLETE_COLORS[index % ATHLETE_COLORS.length] }}
                          >
                            {formatDisplayValue(athlete.valeur || 0, currentMetric?.unit || "")}
                          </p>
                          {index === 0 && chartData.length > 1 && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {currentMetric?.unit?.toLowerCase().includes("s") ? "Meilleur temps" : "Meilleur"}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
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
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Profil comparatif (normalisé sur 100)
                    </h3>
                    <ResponsiveContainer width="100%" height={420}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis 
                          dataKey="metric" 
                          tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                        />
                        <PolarRadiusAxis 
                          angle={30} 
                          domain={[0, 100]} 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        {selectedAthletes.map((athleteId, index) => {
                          const player = players?.find(p => p.id === athleteId);
                          return (
                            <Radar
                              key={athleteId}
                              name={player?.name || `Athlete ${index + 1}`}
                              dataKey={player?.name || `Athlete ${index + 1}`}
                              stroke={ATHLETE_COLORS[index % ATHLETE_COLORS.length]}
                              fill={ATHLETE_COLORS[index % ATHLETE_COLORS.length]}
                              fillOpacity={0.25}
                              strokeWidth={2}
                            />
                          );
                        })}
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
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
