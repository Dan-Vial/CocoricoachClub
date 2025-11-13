import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PlayerTestsTabProps {
  playerId: string;
  categoryId: string;
}

export function PlayerTestsTab({ playerId, categoryId }: PlayerTestsTabProps) {
  const { data: speedTests } = useQuery({
    queryKey: ["speed_tests", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_tests")
        .select("*")
        .eq("player_id", playerId)
        .order("test_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: strengthTests } = useQuery({
    queryKey: ["strength_tests", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strength_tests")
        .select("*")
        .eq("player_id", playerId)
        .order("test_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch team averages for comparison
  const { data: teamSpeedAvg } = useQuery({
    queryKey: ["team_speed_avg", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_tests")
        .select("time_40m_seconds, vma_kmh, test_type")
        .eq("category_id", categoryId);
      
      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      const sprint40m = data.filter(t => t.test_type === "40m_sprint" && t.time_40m_seconds);
      const run1600m = data.filter(t => t.test_type === "1600m_run" && t.vma_kmh);
      
      const avg40m = sprint40m.length > 0 
        ? sprint40m.reduce((sum, row) => sum + (row.time_40m_seconds || 0), 0) / sprint40m.length 
        : null;
      
      const avgVma = run1600m.length > 0
        ? run1600m.reduce((sum, row) => sum + (row.vma_kmh || 0), 0) / run1600m.length
        : null;
      
      return { avg40m, avgVma };
    },
  });

  const { data: teamStrengthAvg } = useQuery({
    queryKey: ["team_strength_avg", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strength_tests")
        .select("test_name, weight_kg")
        .eq("category_id", categoryId);
      
      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      const grouped = data.reduce((acc, test) => {
        if (!acc[test.test_name]) {
          acc[test.test_name] = { sum: 0, count: 0 };
        }
        acc[test.test_name].sum += test.weight_kg;
        acc[test.test_name].count += 1;
        return acc;
      }, {} as Record<string, { sum: number; count: number }>);
      
      return Object.entries(grouped).reduce((acc, [name, stats]) => {
        acc[name] = stats.sum / stats.count;
        return acc;
      }, {} as Record<string, number>);
    },
  });

  // Préparer les données pour les graphiques
  const sprint40mData = speedTests
    ?.filter((test) => test.test_type === "40m_sprint")
    .map((test) => ({
      date: new Date(test.test_date).toLocaleDateString("fr-FR"),
      temps: test.time_40m_seconds,
      vitesse: test.speed_kmh,
    }));

  const run1600mData = speedTests
    ?.filter((test) => test.test_type === "1600m_run")
    .map((test) => ({
      date: new Date(test.test_date).toLocaleDateString("fr-FR"),
      temps: (test.time_1600m_minutes || 0) * 60 + (test.time_1600m_seconds || 0),
      vma: test.vma_kmh,
    }));

  const strengthData = strengthTests?.reduce((acc, test) => {
    const date = new Date(test.test_date).toLocaleDateString("fr-FR");
    const existing = acc.find((item) => item.date === date);
    if (existing) {
      existing[test.test_name] = test.weight_kg;
    } else {
      acc.push({ date, [test.test_name]: test.weight_kg });
    }
    return acc;
  }, [] as any[]);

  const strengthTestNames = [...new Set(strengthTests?.map((test) => test.test_name) || [])];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="speed" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="speed">Tests de Vitesse</TabsTrigger>
          <TabsTrigger value="strength">Tests de Musculation</TabsTrigger>
        </TabsList>

        <TabsContent value="speed" className="space-y-6">
          {sprint40mData && sprint40mData.length > 0 && (
            <Card className="bg-gradient-card shadow-md">
              <CardHeader>
                <CardTitle>Évolution Sprint 40m</CardTitle>
                {teamSpeedAvg?.avg40m && sprint40mData.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Moyenne équipe: {teamSpeedAvg.avg40m.toFixed(2)}s | 
                    Dernier test: {sprint40mData[sprint40mData.length - 1].temps?.toFixed(2)}s
                    {sprint40mData[sprint40mData.length - 1].temps && (
                      <span className={`ml-2 font-semibold ${
                        sprint40mData[sprint40mData.length - 1].temps < teamSpeedAvg.avg40m
                          ? "text-primary"
                          : "text-destructive"
                      }`}>
                        ({sprint40mData[sprint40mData.length - 1].temps < teamSpeedAvg.avg40m ? "Au-dessus" : "En-dessous"} de la moyenne)
                      </span>
                    )}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sprint40mData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" label={{ value: "Temps (s)", angle: -90, position: "insideLeft" }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: "Vitesse (km/h)", angle: 90, position: "insideRight" }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="temps" stroke="hsl(var(--primary))" name="Temps (s)" />
                    <Line yAxisId="right" type="monotone" dataKey="vitesse" stroke="hsl(var(--accent))" name="Vitesse (km/h)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {run1600mData && run1600mData.length > 0 && (
            <Card className="bg-gradient-card shadow-md">
              <CardHeader>
                <CardTitle>Évolution Course 1600m</CardTitle>
                {teamSpeedAvg?.avgVma && run1600mData.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    VMA moyenne équipe: {teamSpeedAvg.avgVma.toFixed(1)} km/h | 
                    Dernier test: {run1600mData[run1600mData.length - 1].vma?.toFixed(1)} km/h
                    {run1600mData[run1600mData.length - 1].vma && (
                      <span className={`ml-2 font-semibold ${
                        run1600mData[run1600mData.length - 1].vma > teamSpeedAvg.avgVma
                          ? "text-primary"
                          : "text-destructive"
                      }`}>
                        ({run1600mData[run1600mData.length - 1].vma > teamSpeedAvg.avgVma ? "Au-dessus" : "En-dessous"} de la moyenne)
                      </span>
                    )}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={run1600mData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" label={{ value: "Temps (s)", angle: -90, position: "insideLeft" }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: "VMA (km/h)", angle: 90, position: "insideRight" }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="temps" stroke="hsl(var(--primary))" name="Temps (s)" />
                    <Line yAxisId="right" type="monotone" dataKey="vma" stroke="hsl(var(--accent))" name="VMA (km/h)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-card shadow-md">
            <CardHeader>
              <CardTitle>Historique des tests de vitesse</CardTitle>
            </CardHeader>
            <CardContent>
              {speedTests && speedTests.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Résultat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {speedTests.map((test) => (
                        <TableRow key={test.id}>
                          <TableCell>{new Date(test.test_date).toLocaleDateString("fr-FR")}</TableCell>
                          <TableCell>
                            {test.test_type === "40m_sprint" ? "Sprint 40m" : "Course 1600m"}
                          </TableCell>
                          <TableCell>
                            {test.test_type === "40m_sprint" 
                              ? `${test.time_40m_seconds?.toFixed(2)}s - ${test.speed_kmh?.toFixed(2)} km/h`
                              : `${test.time_1600m_minutes}:${test.time_1600m_seconds?.toString().padStart(2, "0")} - ${test.vma_kmh?.toFixed(2)} km/h VMA`
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucun test de vitesse</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strength" className="space-y-6">
          {strengthData && strengthData.length > 0 && (
            <Card className="bg-gradient-card shadow-md">
              <CardHeader>
                <CardTitle>Évolution des charges</CardTitle>
                {teamStrengthAvg && (
                  <p className="text-sm text-muted-foreground">
                    Comparaison avec les moyennes de l'équipe
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={strengthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: "Poids (kg)", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Legend />
                    {strengthTestNames.map((testName, index) => (
                      <Line
                        key={testName}
                        type="monotone"
                        dataKey={testName}
                        stroke={`hsl(${(index * 60) % 360}, 70%, 50%)`}
                        name={testName}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-card shadow-md">
            <CardHeader>
              <CardTitle>Historique des tests de musculation</CardTitle>
            </CardHeader>
            <CardContent>
              {strengthTests && strengthTests.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Exercise</TableHead>
                        <TableHead>Poids</TableHead>
                        {teamStrengthAvg && <TableHead>vs Moyenne Équipe</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {strengthTests.map((test) => (
                        <TableRow key={test.id}>
                          <TableCell>{new Date(test.test_date).toLocaleDateString("fr-FR")}</TableCell>
                          <TableCell>{test.test_name}</TableCell>
                          <TableCell className="font-semibold">{test.weight_kg} kg</TableCell>
                          {teamStrengthAvg && teamStrengthAvg[test.test_name] && (
                            <TableCell>
                              <span className={`font-semibold ${
                                test.weight_kg > teamStrengthAvg[test.test_name]
                                  ? "text-primary"
                                  : "text-destructive"
                              }`}>
                                {test.weight_kg > teamStrengthAvg[test.test_name] ? "+" : ""}
                                {(test.weight_kg - teamStrengthAvg[test.test_name]).toFixed(1)} kg
                              </span>
                              <span className="text-muted-foreground text-xs ml-1">
                                (Moy: {teamStrengthAvg[test.test_name].toFixed(1)} kg)
                              </span>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucun test de musculation</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
