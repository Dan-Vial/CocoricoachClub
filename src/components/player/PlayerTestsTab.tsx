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
  BarChart,
  Bar,
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

const MOBILITY_TYPE_LABELS: Record<string, string> = {
  fms: "FMS",
  hip: "Hanche",
  shoulder: "Épaule",
  ankle: "Cheville",
};

const JUMP_TYPE_LABELS: Record<string, string> = {
  vertical_jump: "Saut Vertical",
  horizontal_jump: "Saut Horizontal",
};

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

  // Fetch ALL generic tests for this player (from session builder)
  const { data: allGenericTests } = useQuery({
    queryKey: ["all_generic_tests", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generic_tests")
        .select("*")
        .eq("player_id", playerId)
        .order("test_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Filter generic tests by category
  const genericStrengthTests = allGenericTests?.filter(t => t.test_category === "musculation") || [];
  const genericSpeedTests = allGenericTests?.filter(t => t.test_category === "vitesse" || t.test_category === "cardio" || t.test_category === "endurance") || [];
  const genericMobilityTests = allGenericTests?.filter(t => t.test_category === "mobilite") || [];
  const genericJumpTests = allGenericTests?.filter(t => t.test_category === "detente") || [];

  const { data: mobilityTests } = useQuery({
    queryKey: ["mobility_tests", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mobility_tests")
        .select("*")
        .eq("player_id", playerId)
        .order("test_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: jumpTests } = useQuery({
    queryKey: ["jump_tests", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jump_tests")
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

  // Combine speed tests from both tables
  const allSpeedTestsData = [
    ...(speedTests?.map(test => ({
      id: test.id,
      test_date: test.test_date,
      test_type: test.test_type,
      time_40m_seconds: test.time_40m_seconds,
      time_1600m_minutes: test.time_1600m_minutes,
      time_1600m_seconds: test.time_1600m_seconds,
      speed_kmh: test.speed_kmh,
      vma_kmh: test.vma_kmh,
      source: "speed_tests" as const,
    })) || []),
    ...(genericSpeedTests.map(test => ({
      id: test.id,
      test_date: test.test_date,
      test_type: test.test_type || "generic",
      result_value: test.result_value,
      result_unit: test.result_unit,
      source: "generic_tests" as const,
    })) || []),
  ].sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

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

  // Combine strength tests from both tables
  const allStrengthTests = [
    ...(strengthTests?.map(test => ({
      id: test.id,
      test_date: test.test_date,
      test_name: test.test_name,
      weight_kg: test.weight_kg,
      source: "strength_tests" as const,
    })) || []),
    ...(genericStrengthTests.map(test => ({
      id: test.id,
      test_date: test.test_date,
      test_name: test.test_type?.replace(/_/g, " ") || "Test",
      weight_kg: test.result_value,
      source: "generic_tests" as const,
    })) || []),
  ].sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

  const strengthData = allStrengthTests.reduce((acc, test) => {
    const date = new Date(test.test_date).toLocaleDateString("fr-FR");
    const existing = acc.find((item) => item.date === date);
    if (existing) {
      existing[test.test_name] = test.weight_kg;
    } else {
      acc.push({ date, [test.test_name]: test.weight_kg });
    }
    return acc;
  }, [] as any[]);

  const strengthTestNames = [...new Set(allStrengthTests.map((test) => test.test_name) || [])];

  // Prepare mobility data for charts
  const mobilityChartData = mobilityTests?.reduce((acc, test) => {
    const date = new Date(test.test_date).toLocaleDateString("fr-FR");
    const existing = acc.find((item) => item.date === date);
    const typeName = MOBILITY_TYPE_LABELS[test.test_type] || test.test_type;
    
    if (test.test_type === "fms") {
      if (existing) {
        existing[typeName] = test.score;
      } else {
        acc.push({ date, [typeName]: test.score });
      }
    } else {
      // For bilateral tests, use average of left/right
      const avgScore = ((test.left_score || 0) + (test.right_score || 0)) / 2;
      if (existing) {
        existing[typeName] = avgScore;
      } else {
        acc.push({ date, [typeName]: avgScore });
      }
    }
    return acc;
  }, [] as any[]) || [];

  const mobilityTestTypes = [...new Set(mobilityTests?.map((test) => test.test_type) || [])];

  // Combine jump tests from both tables
  const allJumpTestsData = [
    ...(jumpTests?.map(test => ({
      id: test.id,
      test_date: test.test_date,
      test_type: test.test_type,
      result_cm: Number(test.result_cm),
      notes: test.notes,
      source: "jump_tests" as const,
    })) || []),
    ...(genericJumpTests.map(test => ({
      id: test.id,
      test_date: test.test_date,
      test_type: test.test_type || "generic",
      result_cm: test.result_value,
      notes: test.notes,
      source: "generic_tests" as const,
    })) || []),
  ].sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

  // Combine mobility tests from both tables
  const allMobilityTestsData = [
    ...(mobilityTests?.map(test => ({
      id: test.id,
      test_date: test.test_date,
      test_type: test.test_type,
      score: test.score,
      left_score: test.left_score,
      right_score: test.right_score,
      notes: test.notes,
      source: "mobility_tests" as const,
    })) || []),
    ...(genericMobilityTests.map(test => ({
      id: test.id,
      test_date: test.test_date,
      test_type: test.test_type || "generic",
      score: test.result_value,
      left_score: null,
      right_score: null,
      notes: test.notes,
      source: "generic_tests" as const,
    })) || []),
  ].sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

  // Prepare jump data for charts
  const verticalJumpData = allJumpTestsData
    .filter((test) => test.test_type === "vertical_jump" || test.test_type === "cmj")
    .map((test) => ({
      date: new Date(test.test_date).toLocaleDateString("fr-FR"),
      result: Number(test.result_cm),
    }));

  const horizontalJumpData = allJumpTestsData
    .filter((test) => test.test_type === "horizontal_jump")
    .map((test) => ({
      date: new Date(test.test_date).toLocaleDateString("fr-FR"),
      result: Number(test.result_cm),
    }));

  return (
    <div className="space-y-6">
      <Tabs defaultValue="speed" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="speed">Vitesse</TabsTrigger>
          <TabsTrigger value="strength">Musculation</TabsTrigger>
          <TabsTrigger value="mobility">Mobilité</TabsTrigger>
          <TabsTrigger value="jump">Détente</TabsTrigger>
          <TabsTrigger value="all">Tous</TabsTrigger>
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
              {allSpeedTestsData && allSpeedTestsData.length > 0 ? (
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
                      {allSpeedTestsData.slice().reverse().map((test) => (
                        <TableRow key={test.id}>
                          <TableCell>{new Date(test.test_date).toLocaleDateString("fr-FR")}</TableCell>
                          <TableCell>
                            {test.source === "generic_tests"
                              ? (test.test_type?.replace(/_/g, " ") || "Test")
                              : (test.test_type === "40m_sprint" ? "Sprint 40m" : "Course 1600m")
                            }
                          </TableCell>
                          <TableCell>
                            {test.source === "generic_tests"
                              ? `${test.result_value} ${test.result_unit || ""}`
                              : (test.test_type === "40m_sprint" 
                                ? `${test.time_40m_seconds?.toFixed(2)}s - ${test.speed_kmh?.toFixed(2)} km/h`
                                : `${test.time_1600m_minutes}:${test.time_1600m_seconds?.toString().padStart(2, "0")} - ${test.vma_kmh?.toFixed(2)} km/h VMA`
                              )
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
              {allStrengthTests && allStrengthTests.length > 0 ? (
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
                      {allStrengthTests.slice().reverse().map((test) => (
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

        <TabsContent value="mobility" className="space-y-6">
          {mobilityChartData.length > 0 && (
            <Card className="bg-gradient-card shadow-md">
              <CardHeader>
                <CardTitle>Évolution des scores de mobilité</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mobilityChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: "Score", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Legend />
                    {mobilityTestTypes.map((type, index) => (
                      <Line
                        key={type}
                        type="monotone"
                        dataKey={MOBILITY_TYPE_LABELS[type] || type}
                        stroke={`hsl(${(index * 90) % 360}, 70%, 50%)`}
                        name={MOBILITY_TYPE_LABELS[type] || type}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-card shadow-md">
            <CardHeader>
              <CardTitle>Historique des tests de mobilité</CardTitle>
            </CardHeader>
            <CardContent>
              {allMobilityTestsData && allMobilityTestsData.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Gauche/Droit</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allMobilityTestsData.slice().reverse().map((test) => (
                        <TableRow key={test.id}>
                          <TableCell>{new Date(test.test_date).toLocaleDateString("fr-FR")}</TableCell>
                          <TableCell>
                            {test.source === "generic_tests"
                              ? (test.test_type?.replace(/_/g, " ") || "Test")
                              : (MOBILITY_TYPE_LABELS[test.test_type] || test.test_type)
                            }
                          </TableCell>
                          <TableCell className="font-semibold">
                            {test.score ?? "-"}
                            {test.test_type === "fms" && test.score && <span className="text-muted-foreground">/21</span>}
                          </TableCell>
                          <TableCell>
                            {test.left_score !== null || test.right_score !== null
                              ? `${test.left_score ?? "-"} / ${test.right_score ?? "-"}`
                              : "-"}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">{test.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucun test de mobilité</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jump" className="space-y-6">
          {verticalJumpData.length > 0 && (
            <Card className="bg-gradient-card shadow-md">
              <CardHeader>
                <CardTitle>Évolution Saut Vertical (CMJ)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={verticalJumpData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: "Hauteur (cm)", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Bar dataKey="result" fill="hsl(var(--primary))" name="Hauteur (cm)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {horizontalJumpData.length > 0 && (
            <Card className="bg-gradient-card shadow-md">
              <CardHeader>
                <CardTitle>Évolution Saut Horizontal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={horizontalJumpData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: "Distance (cm)", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Bar dataKey="result" fill="hsl(var(--accent))" name="Distance (cm)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-card shadow-md">
            <CardHeader>
              <CardTitle>Historique des tests de détente</CardTitle>
            </CardHeader>
            <CardContent>
              {allJumpTestsData && allJumpTestsData.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Résultat</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allJumpTestsData.slice().reverse().map((test) => (
                        <TableRow key={test.id}>
                          <TableCell>{new Date(test.test_date).toLocaleDateString("fr-FR")}</TableCell>
                          <TableCell>
                            {test.source === "generic_tests"
                              ? (test.test_type?.replace(/_/g, " ") || "Test")
                              : (JUMP_TYPE_LABELS[test.test_type] || test.test_type)
                            }
                          </TableCell>
                          <TableCell className="font-semibold">{test.result_cm} cm</TableCell>
                          <TableCell className="max-w-[150px] truncate">{test.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucun test de détente</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All tests tab */}
        <TabsContent value="all" className="space-y-6">
          <Card className="bg-gradient-card shadow-md">
            <CardHeader>
              <CardTitle>Historique complet des tests</CardTitle>
            </CardHeader>
            <CardContent>
              {allGenericTests && allGenericTests.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Résultat</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allGenericTests.slice().reverse().map((test) => (
                        <TableRow key={test.id}>
                          <TableCell>{new Date(test.test_date).toLocaleDateString("fr-FR")}</TableCell>
                          <TableCell className="capitalize">
                            {test.test_category?.replace(/_/g, " ") || "-"}
                          </TableCell>
                          <TableCell>
                            {test.test_type?.replace(/_/g, " ") || "-"}
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            {test.result_value} {test.result_unit || ""}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">{test.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucun test enregistré</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
