import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { FlaskConical, TrendingUp, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getTestCategoriesForSport } from "@/lib/constants/testCategories";

interface Props {
  playerId: string;
  categoryId: string;
  sportType?: string;
}

const CHART_COLORS = [
  "hsl(220, 80%, 55%)",
  "hsl(350, 75%, 55%)",
  "hsl(35, 90%, 55%)",
  "hsl(160, 65%, 45%)",
  "hsl(280, 70%, 55%)",
  "hsl(200, 85%, 50%)",
];

export function AthleteSpaceTests({ playerId, categoryId, sportType }: Props) {
  const testCategories = useMemo(() => getTestCategoriesForSport(sportType || ""), [sportType]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: genericTests = [], isLoading } = useQuery({
    queryKey: ["athlete-space-all-tests", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generic_tests")
        .select("*")
        .eq("player_id", playerId)
        .order("test_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: speedTests = [] } = useQuery({
    queryKey: ["athlete-space-speed-tests-tab", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_tests")
        .select("*")
        .eq("player_id", playerId)
        .order("test_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: strengthTests = [] } = useQuery({
    queryKey: ["athlete-space-strength-tests-tab", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strength_tests")
        .select("*")
        .eq("player_id", playerId)
        .order("test_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Group generic tests by test_type
  const genericByType = useMemo(() => {
    const map: Record<string, { date: string; fullDate: string; value: number; unit: string; label: string; categoryLabel: string; categoryValue: string; notes: string | null }[]> = {};
    genericTests.forEach((t: any) => {
      const key = `${t.test_category}__${t.test_type}`;
      if (!map[key]) map[key] = [];
      const cat = testCategories.find(c => c.value === t.test_category);
      const testDef = cat?.tests.find(tt => tt.value === t.test_type);
      const label = testDef?.label || t.test_type?.replace(/_/g, " ") || "Test";
      const categoryLabel = cat?.label || t.test_category?.replace(/_/g, " ") || "";
      map[key].push({
        date: format(new Date(t.test_date), "dd/MM", { locale: fr }),
        fullDate: format(new Date(t.test_date), "dd MMM yyyy", { locale: fr }),
        value: t.result_value,
        unit: t.result_unit || "",
        label,
        categoryLabel,
        categoryValue: t.test_category,
        notes: t.notes,
      });
    });
    return map;
  }, [genericTests, testCategories]);

  // Categories with data
  const categoriesWithData = useMemo(() => {
    const catSet = new Set<string>();
    if (speedTests.length > 0) catSet.add("__speed__");
    if (strengthTests.length > 0) catSet.add("__strength__");
    genericTests.forEach((t: any) => catSet.add(t.test_category));
    return catSet;
  }, [speedTests, strengthTests, genericTests]);

  const availableFilters = useMemo(() => {
    const filters: { value: string; label: string }[] = [];
    if (categoriesWithData.has("__speed__")) filters.push({ value: "__speed__", label: "Vitesse" });
    if (categoriesWithData.has("__strength__")) filters.push({ value: "__strength__", label: "Musculation" });
    testCategories.forEach(cat => {
      if (categoriesWithData.has(cat.value)) filters.push({ value: cat.value, label: cat.label });
    });
    return filters;
  }, [categoriesWithData, testCategories]);

  const showSpeed = selectedCategory === "all" || selectedCategory === "__speed__";
  const showStrength = selectedCategory === "all" || selectedCategory === "__strength__";

  const filteredGeneric = useMemo(() => {
    if (selectedCategory === "all") return genericByType;
    return Object.fromEntries(
      Object.entries(genericByType).filter(([, data]) => data[0]?.categoryValue === selectedCategory)
    );
  }, [selectedCategory, genericByType]);

  if (isLoading) return null;

  const noData = genericTests.length === 0 && speedTests.length === 0 && strengthTests.length === 0;
  if (noData) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="py-8 text-center">
          <FlaskConical className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Aucun test enregistré pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  // Speed chart
  const speedChartData = speedTests
    .filter((t: any) => t.time_40m_seconds)
    .map((t: any) => ({
      date: format(new Date(t.test_date), "dd/MM", { locale: fr }),
      fullDate: format(new Date(t.test_date), "dd MMM yyyy", { locale: fr }),
      temps: t.time_40m_seconds,
    }));

  // Strength by exercise
  const strengthByExercise: Record<string, { date: string; fullDate: string; value: number }[]> = {};
  strengthTests.forEach((t: any) => {
    if (!strengthByExercise[t.test_name]) strengthByExercise[t.test_name] = [];
    strengthByExercise[t.test_name].push({
      date: format(new Date(t.test_date), "dd/MM", { locale: fr }),
      fullDate: format(new Date(t.test_date), "dd MMM yyyy", { locale: fr }),
      value: t.weight_kg,
    });
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      {availableFilters.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filtrer</span>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Tous
              </button>
              {availableFilters.map(f => (
                <button
                  key={f.value}
                  onClick={() => setSelectedCategory(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Speed chart */}
      {showSpeed && speedChartData.length > 1 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Évolution vitesse (40m)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={speedChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-[10px]" />
                <YAxis className="text-[10px]" reversed />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: "12px", borderRadius: "8px" }}
                  formatter={(v: number) => [`${v}s`, "Temps"]}
                  labelFormatter={(_, p: any[]) => p?.[0]?.payload?.fullDate || ""}
                />
                <Line type="monotone" dataKey="temps" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Strength charts */}
      {showStrength && Object.entries(strengthByExercise).map(([exercise, data]) => (
        data.length > 1 && (
          <Card key={exercise} className="bg-gradient-card shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{exercise}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-[10px]" />
                  <YAxis className="text-[10px]" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: "12px", borderRadius: "8px" }}
                    formatter={(v: number) => [`${v}kg`, exercise]}
                    labelFormatter={(_, p: any[]) => p?.[0]?.payload?.fullDate || ""}
                  />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )
      ))}

      {/* Generic test charts */}
      {Object.entries(filteredGeneric).map(([key, data], i) => (
        data.length > 1 && (
          <Card key={key} className="bg-gradient-card shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-muted-foreground">{data[0].categoryLabel} :</span> {data[0].label}
                <Badge variant="secondary" className="text-[10px]">{data[0].unit}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-[10px]" />
                  <YAxis className="text-[10px]" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: "12px", borderRadius: "8px" }}
                    formatter={(v: number) => [`${v} ${data[0].unit}`, data[0].label]}
                    labelFormatter={(_, p: any[]) => p?.[0]?.payload?.fullDate || ""}
                  />
                  <Line type="monotone" dataKey="value" stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )
      ))}

      {/* Full test history table */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            Historique complet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Résultat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {genericTests.slice().reverse().slice(0, 30).map((test: any) => {
                  const cat = testCategories.find(c => c.value === test.test_category);
                  const testDef = cat?.tests.find(t => t.value === test.test_type);
                  return (
                    <TableRow key={test.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(test.test_date), "dd/MM/yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-xs">{cat?.label || test.test_category?.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-xs">{testDef?.label || test.test_type?.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-xs font-semibold text-primary">
                        {test.result_value} {test.result_unit || ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {speedTests.slice().reverse().slice(0, 10).map((test: any) => (
                  <TableRow key={test.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(test.test_date), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-xs">Vitesse</TableCell>
                    <TableCell className="text-xs">Sprint 40m</TableCell>
                    <TableCell className="text-xs font-semibold text-primary">
                      {test.time_40m_seconds}s
                    </TableCell>
                  </TableRow>
                ))}
                {strengthTests.slice().reverse().slice(0, 10).map((test: any) => (
                  <TableRow key={test.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(test.test_date), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-xs">Musculation</TableCell>
                    <TableCell className="text-xs">{test.test_name}</TableCell>
                    <TableCell className="text-xs font-semibold text-primary">
                      {test.weight_kg}kg
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
