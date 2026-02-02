import { useState } from "react";
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
import { cn } from "@/lib/utils";

interface PerformanceEvolutionProps {
  categoryId: string;
  sportType?: string;
}

// Get sport-specific chart configurations
const getSportCharts = (sportType: string) => {
  const sport = sportType?.toLowerCase() || "";
  
  if (sport.includes("judo")) {
    return [
      { key: "sjft", title: "Évolution SJFT Index", unit: "score", testFilter: (t: any) => t.test_type?.toLowerCase().includes("sjft") },
      { key: "pullups", title: "Évolution Tractions Max", unit: "répétitions", testFilter: (t: any) => t.test_type?.toLowerCase().includes("traction") },
      { key: "strength", title: "Évolution Force (kg)", unit: "kg" },
    ];
  }
  
  if (sport.includes("handball") || sport.includes("basketball")) {
    return [
      { key: "sprint30", title: "Évolution Sprint 30m (secondes)", unit: "secondes", testFilter: (t: any) => t.test_type?.includes("30m") },
      { key: "cmj", title: "Évolution CMJ (cm)", unit: "cm", testType: "cmj" },
      { key: "strength", title: "Évolution Force (kg)", unit: "kg" },
    ];
  }
  
  if (sport.includes("football")) {
    return [
      { key: "sprint30", title: "Évolution Sprint 30m (secondes)", unit: "secondes", testFilter: (t: any) => t.test_type?.includes("30m") },
      { key: "ift", title: "Évolution 30-15 IFT (km/h)", unit: "km/h", testFilter: (t: any) => t.test_type?.toLowerCase().includes("30-15") },
      { key: "strength", title: "Évolution Force (kg)", unit: "kg" },
    ];
  }
  
  if (sport.includes("aviron")) {
    return [
      { key: "ergo2000", title: "Évolution Ergo 2000m", unit: "temps", testFilter: (t: any) => t.test_type?.toLowerCase().includes("ergo") || t.test_type?.includes("2000") },
      { key: "power", title: "Évolution Puissance (W)", unit: "watts", testFilter: (t: any) => t.test_type?.toLowerCase().includes("puissance") || t.test_type?.toLowerCase().includes("power") },
      { key: "strength", title: "Évolution Force (kg)", unit: "kg" },
    ];
  }
  
  if (sport.includes("volleyball")) {
    return [
      { key: "cmj", title: "Évolution CMJ (cm)", unit: "cm", testType: "cmj" },
      { key: "dropJump", title: "Évolution Drop Jump (cm)", unit: "cm", testType: "drop" },
      { key: "strength", title: "Évolution Force (kg)", unit: "kg" },
    ];
  }
  
  if (sport.includes("bowling")) {
    return [
      { key: "avgScore", title: "Évolution Score Moyen", unit: "points" },
      { key: "strikeRate", title: "Évolution % Strikes", unit: "%" },
      { key: "strength", title: "Évolution Force (kg)", unit: "kg" },
    ];
  }
  
  // Default (Rugby)
  return [
    { key: "40m", title: "Évolution Sprint 40m (secondes)", unit: "secondes" },
    { key: "1600m", title: "Évolution 1600m (secondes)", unit: "secondes" },
    { key: "strength", title: "Évolution Tests Force (kg)", unit: "kg" },
  ];
};

type ChartType = "line" | "bar" | "area";

export function PerformanceEvolution({ categoryId, sportType = "XV" }: PerformanceEvolutionProps) {
  const [chartType, setChartType] = useState<ChartType>("line");
  const chartConfigs = getSportCharts(sportType);

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

  const prepareData = (chartKey: string, testFilter?: (t: any) => boolean, testType?: string) => {
    const dateMap = new Map();

    if (chartKey === "40m" && speedTests) {
      const tests = speedTests.filter(t => t.test_type === "40m_sprint");
      tests.forEach(test => {
        const date = test.test_date;
        if (!dateMap.has(date)) dateMap.set(date, { total: 0, count: 0 });
        const entry = dateMap.get(date);
        entry.total += Number(test.time_40m_seconds || 0);
        entry.count += 1;
      });
    } else if (chartKey === "1600m" && speedTests) {
      const tests = speedTests.filter(t => t.test_type === "1600m_run");
      tests.forEach(test => {
        const date = test.test_date;
        if (!dateMap.has(date)) dateMap.set(date, { total: 0, count: 0 });
        const entry = dateMap.get(date);
        const totalSeconds = (Number(test.time_1600m_minutes || 0) * 60) + Number(test.time_1600m_seconds || 0);
        entry.total += totalSeconds;
        entry.count += 1;
      });
    } else if (chartKey === "strength" && strengthTests) {
      strengthTests.forEach(test => {
        const date = test.test_date;
        if (!dateMap.has(date)) dateMap.set(date, { total: 0, count: 0 });
        const entry = dateMap.get(date);
        entry.total += Number(test.weight_kg || 0);
        entry.count += 1;
      });
    } else if ((chartKey === "cmj" || chartKey === "dropJump") && jumpTests) {
      const filtered = testType 
        ? jumpTests.filter(t => t.test_type?.toLowerCase().includes(testType))
        : jumpTests;
      filtered.forEach(test => {
        const date = test.test_date;
        if (!dateMap.has(date)) dateMap.set(date, { total: 0, count: 0 });
        const entry = dateMap.get(date);
        entry.total += Number(test.result_cm || 0);
        entry.count += 1;
      });
    } else if (testFilter && genericTests) {
      const filtered = genericTests.filter(testFilter);
      filtered.forEach(test => {
        const date = test.test_date;
        if (!dateMap.has(date)) dateMap.set(date, { total: 0, count: 0 });
        const entry = dateMap.get(date);
        entry.total += Number(test.result_value || 0);
        entry.count += 1;
      });
    }

    return Array.from(dateMap.entries())
      .map(([date, entry]) => ({
        date: format(new Date(date), "dd/MM", { locale: fr }),
        moyenne: entry.count > 0 ? Number((entry.total / entry.count).toFixed(2)) : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  if (loadingSpeed || loadingStrength || loadingJump || loadingGeneric) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderChart = (data: { date: string; moyenne: number }[]) => {
    const commonProps = {
      data,
      children: (
        <>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
        </>
      ),
    };

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

  return (
    <div className="space-y-6">
      {/* Chart type selector */}
      <div className="flex items-center justify-end gap-1 border rounded-lg p-1 w-fit ml-auto bg-muted/30">
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

      {chartConfigs.map((config) => {
        const data = prepareData(config.key, config.testFilter, config.testType);
        
        return (
          <Card key={config.key}>
            <CardHeader>
              <CardTitle>{config.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  {renderChart(data)}
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">Aucune donnée disponible</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
