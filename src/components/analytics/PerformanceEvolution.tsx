import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, LineChartIcon, BarChart3, AreaChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PerformanceEvolutionProps {
  categoryId: string;
  sportType?: string;
}

type ChartType = "line" | "bar" | "area";

interface DiscoveredTest {
  key: string;
  label: string;
  unit: string;
  source: "speed" | "strength" | "jump" | "generic";
}

// Format test type to readable label
const formatTestLabel = (testType: string): string => {
  return testType
    .replace(/_/g, " ")
    .replace(/(\d+)m/g, "$1m")
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function PerformanceEvolution({ categoryId, sportType = "XV" }: PerformanceEvolutionProps) {
  const [chartType, setChartType] = useState<ChartType>("line");
  const [selectedTest, setSelectedTest] = useState<string>("");

  const { data: speedTests, isLoading: loadingSpeed } = useQuery({
    queryKey: ["speed-tests-evolution", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_tests")
        .select("*")
        .eq("category_id", categoryId)
        .order("test_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: strengthTests, isLoading: loadingStrength } = useQuery({
    queryKey: ["strength-tests-evolution", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strength_tests")
        .select("*")
        .eq("category_id", categoryId)
        .order("test_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: jumpTests, isLoading: loadingJump } = useQuery({
    queryKey: ["jump-tests-evolution", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jump_tests")
        .select("*")
        .eq("category_id", categoryId)
        .order("test_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: genericTests, isLoading: loadingGeneric } = useQuery({
    queryKey: ["generic-tests-evolution", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generic_tests")
        .select("*")
        .eq("category_id", categoryId)
        .order("test_date");
      if (error) throw error;
      return data;
    },
  });

  // Dynamically discover all available tests
  const availableTests = useMemo(() => {
    const tests: DiscoveredTest[] = [];
    const addedKeys = new Set<string>();

    // Discover speed tests
    if (speedTests?.length) {
      const speedTypes = new Set(speedTests.map(t => t.test_type).filter(Boolean));
      speedTypes.forEach(type => {
        if (type && !addedKeys.has(type)) {
          tests.push({
            key: type,
            label: formatTestLabel(type),
            unit: type.includes("1600") ? "min.s" : "s",
            source: "speed",
          });
          addedKeys.add(type);
        }
      });
    }

    // Discover strength tests
    if (strengthTests?.length) {
      const strengthTypes = new Set(strengthTests.map(t => t.test_name).filter(Boolean));
      strengthTypes.forEach(type => {
        if (type && !addedKeys.has(type)) {
          tests.push({
            key: type,
            label: formatTestLabel(type),
            unit: "kg",
            source: "strength",
          });
          addedKeys.add(type);
        }
      });
    }

    // Discover jump tests
    if (jumpTests?.length) {
      const jumpTypes = new Set(jumpTests.map(t => t.test_type).filter(Boolean));
      jumpTypes.forEach(type => {
        if (type && !addedKeys.has(type)) {
          tests.push({
            key: type,
            label: formatTestLabel(type),
            unit: "cm",
            source: "jump",
          });
          addedKeys.add(type);
        }
      });
    }

    // Discover generic tests
    if (genericTests?.length) {
      const genericTypes = new Set(genericTests.map(t => t.test_type).filter(Boolean));
      genericTypes.forEach(type => {
        if (type && !addedKeys.has(type)) {
          const sample = genericTests.find(t => t.test_type === type);
          tests.push({
            key: type,
            label: formatTestLabel(type),
            unit: sample?.result_unit || "",
            source: "generic",
          });
          addedKeys.add(type);
        }
      });
    }

    return tests;
  }, [speedTests, strengthTests, jumpTests, genericTests]);

  // Auto-select first test when available
  useMemo(() => {
    if (availableTests.length > 0 && !selectedTest) {
      setSelectedTest(availableTests[0].key);
    }
  }, [availableTests, selectedTest]);

  // Prepare data for selected test
  const chartData = useMemo(() => {
    if (!selectedTest) return [];

    const test = availableTests.find(t => t.key === selectedTest);
    if (!test) return [];

    const dateMap = new Map<string, { total: number; count: number }>();

    switch (test.source) {
      case "speed":
        speedTests?.filter(t => t.test_type === selectedTest).forEach(t => {
          const date = t.test_date;
          if (!dateMap.has(date)) dateMap.set(date, { total: 0, count: 0 });
          const entry = dateMap.get(date)!;
          
          if (selectedTest.includes("1600")) {
            const totalSec = (Number(t.time_1600m_minutes || 0) * 60) + Number(t.time_1600m_seconds || 0);
            if (totalSec > 0) {
              entry.total += totalSec;
              entry.count += 1;
            }
          } else if (selectedTest.includes("40m")) {
            const time = Number(t.time_40m_seconds || 0);
            if (time > 0) {
              entry.total += time;
              entry.count += 1;
            }
          } else {
            // Other speed tests - use 40m time field
            const time = Number(t.time_40m_seconds || 0);
            if (time > 0) {
              entry.total += time;
              entry.count += 1;
            }
          }
        });
        break;

      case "strength":
        strengthTests?.filter(t => t.test_name === selectedTest).forEach(t => {
          const date = t.test_date;
          if (!dateMap.has(date)) dateMap.set(date, { total: 0, count: 0 });
          const entry = dateMap.get(date)!;
          const weight = Number(t.weight_kg || 0);
          if (weight > 0) {
            entry.total += weight;
            entry.count += 1;
          }
        });
        break;

      case "jump":
        jumpTests?.filter(t => t.test_type === selectedTest).forEach(t => {
          const date = t.test_date;
          if (!dateMap.has(date)) dateMap.set(date, { total: 0, count: 0 });
          const entry = dateMap.get(date)!;
          const result = Number(t.result_cm || 0);
          if (result > 0) {
            entry.total += result;
            entry.count += 1;
          }
        });
        break;

      case "generic":
        genericTests?.filter(t => t.test_type === selectedTest).forEach(t => {
          const date = t.test_date;
          if (!dateMap.has(date)) dateMap.set(date, { total: 0, count: 0 });
          const entry = dateMap.get(date)!;
          const result = Number(t.result_value || 0);
          if (result > 0) {
            entry.total += result;
            entry.count += 1;
          }
        });
        break;
    }

    return Array.from(dateMap.entries())
      .map(([date, entry]) => ({
        date: format(new Date(date), "dd/MM", { locale: fr }),
        rawDate: date,
        moyenne: entry.count > 0 ? Number((entry.total / entry.count).toFixed(2)) : 0,
      }))
      .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
  }, [selectedTest, availableTests, speedTests, strengthTests, jumpTests, genericTests]);

  if (loadingSpeed || loadingStrength || loadingJump || loadingGeneric) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentTest = availableTests.find(t => t.key === selectedTest);

  const renderChart = (data: { date: string; moyenne: number }[]) => {
    if (chartType === "bar") {
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar 
            dataKey="moyenne" 
            name="Moyenne équipe" 
            fill="hsl(var(--primary))" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      );
    }

    if (chartType === "area") {
      return (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="moyenne" 
            name="Moyenne équipe" 
            stroke="hsl(var(--primary))" 
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
          />
        </AreaChart>
      );
    }

    return (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="moyenne" 
          name="Moyenne équipe" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
        />
      </LineChart>
    );
  };

  if (availableTests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            Aucun test enregistré. Ajoutez des tests dans l'onglet "Tests" pour voir l'évolution.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Test selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Test :</span>
          <Select value={selectedTest} onValueChange={setSelectedTest}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Sélectionner un test" />
            </SelectTrigger>
            <SelectContent>
              {availableTests.map((test) => (
                <SelectItem key={test.key} value={test.key}>
                  {test.label} {test.unit && `(${test.unit})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chart type selector */}
        <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChartType("line")}
            className={cn(
              "h-8 px-3 gap-1.5",
              chartType === "line" && "bg-background shadow-sm"
            )}
          >
            <LineChartIcon className="h-4 w-4" />
            Ligne
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChartType("bar")}
            className={cn(
              "h-8 px-3 gap-1.5",
              chartType === "bar" && "bg-background shadow-sm"
            )}
          >
            <BarChart3 className="h-4 w-4" />
            Barres
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChartType("area")}
            className={cn(
              "h-8 px-3 gap-1.5",
              chartType === "area" && "bg-background shadow-sm"
            )}
          >
            <AreaChartIcon className="h-4 w-4" />
            Aire
          </Button>
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            Évolution {currentTest?.label || "Test"} 
            {currentTest?.unit && ` (${currentTest.unit})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              {renderChart(chartData)}
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Aucune donnée disponible pour ce test
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
