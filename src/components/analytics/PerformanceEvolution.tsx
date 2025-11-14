import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface PerformanceEvolutionProps {
  categoryId: string;
}

export function PerformanceEvolution({ categoryId }: PerformanceEvolutionProps) {
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

  const prepare40mData = () => {
    if (!speedTests || !players) return [];
    
    const tests40m = speedTests.filter(t => t.test_type === "40m_sprint");
    const dateMap = new Map();

    tests40m.forEach(test => {
      const date = test.test_date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, total: 0, count: 0 });
      }
      const entry = dateMap.get(date);
      entry.total += Number(test.time_40m_seconds || 0);
      entry.count += 1;
    });

    return Array.from(dateMap.values())
      .map(entry => ({
        date: format(new Date(entry.date), "dd/MM", { locale: fr }),
        moyenne: entry.count > 0 ? (entry.total / entry.count).toFixed(2) : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const prepare1600mData = () => {
    if (!speedTests || !players) return [];
    
    const tests1600m = speedTests.filter(t => t.test_type === "1600m_run");
    const dateMap = new Map();

    tests1600m.forEach(test => {
      const date = test.test_date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, total: 0, count: 0 });
      }
      const entry = dateMap.get(date);
      const totalSeconds = (Number(test.time_1600m_minutes || 0) * 60) + Number(test.time_1600m_seconds || 0);
      entry.total += totalSeconds;
      entry.count += 1;
    });

    return Array.from(dateMap.values())
      .map(entry => ({
        date: format(new Date(entry.date), "dd/MM", { locale: fr }),
        moyenne: entry.count > 0 ? Math.round(entry.total / entry.count) : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const prepareStrengthData = () => {
    if (!strengthTests || !players) return [];
    
    const dateMap = new Map();

    strengthTests.forEach(test => {
      const date = test.test_date;
      const key = `${date}-${test.test_name}`;
      if (!dateMap.has(key)) {
        dateMap.set(key, { date, testName: test.test_name, total: 0, count: 0 });
      }
      const entry = dateMap.get(key);
      entry.total += Number(test.weight_kg || 0);
      entry.count += 1;
    });

    return Array.from(dateMap.values())
      .map(entry => ({
        date: format(new Date(entry.date), "dd/MM", { locale: fr }),
        testName: entry.testName,
        moyenne: entry.count > 0 ? (entry.total / entry.count).toFixed(1) : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  if (loadingSpeed || loadingStrength) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const data40m = prepare40mData();
  const data1600m = prepare1600mData();
  const dataStrength = prepareStrengthData();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Évolution Sprint 40m (secondes)</CardTitle>
        </CardHeader>
        <CardContent>
          {data40m.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data40m}>
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
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucune donnée disponible</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Évolution 1600m (secondes)</CardTitle>
        </CardHeader>
        <CardContent>
          {data1600m.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data1600m}>
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
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucune donnée disponible</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Évolution Tests Force (kg)</CardTitle>
        </CardHeader>
        <CardContent>
          {dataStrength.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dataStrength}>
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
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucune donnée disponible</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
