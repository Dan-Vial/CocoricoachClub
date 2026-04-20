import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, TrendingUp, Weight, BarChart3 } from "lucide-react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

interface TonnageDashboardProps {
  categoryId: string;
  playerId?: string;
}

export function TonnageDashboard({ categoryId, playerId }: TonnageDashboardProps) {
  const [dateRange, setDateRange] = useState("90");
  const [selectedPlayer, setSelectedPlayer] = useState<string>(playerId || "all");

  const startDate = format(subDays(new Date(), parseInt(dateRange)), "yyyy-MM-dd");

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players-tonnage", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch exercise logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ["athlete-exercise-logs-dashboard", categoryId, startDate, selectedPlayer],
    queryFn: async () => {
      let query = supabase
        .from("athlete_exercise_logs")
        .select("*, training_sessions!inner(session_date)")
        .eq("category_id", categoryId)
        .gte("created_at", startDate)
        .order("created_at", { ascending: true });

      if (selectedPlayer !== "all") {
        query = query.eq("player_id", selectedPlayer);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!logs || logs.length === 0) return null;

    const totalTonnage = logs.reduce((sum, l) => sum + (Number(l.tonnage) || 0), 0);
    const sessionCount = new Set(logs.map((l) => l.training_session_id)).size;
    const avgTonnagePerSession = sessionCount > 0 ? totalTonnage / sessionCount : 0;

    // Average intensity (if prescribed_percentage_1rm exists)
    const withPercent = logs.filter((l) => l.prescribed_percentage_1rm);
    const avgIntensity = withPercent.length > 0
      ? withPercent.reduce((sum, l) => sum + Number(l.prescribed_percentage_1rm || 0), 0) / withPercent.length
      : null;

    return { totalTonnage, sessionCount, avgTonnagePerSession, avgIntensity };
  }, [logs]);

  // Chart data: tonnage per session date
  const chartData = useMemo(() => {
    if (!logs) return [];
    const byDate = new Map<string, { date: string; tonnage: number; exercises: number }>();

    logs.forEach((log) => {
      const date = (log.training_sessions as any)?.session_date || log.created_at?.split("T")[0];
      if (!date) return;
      const existing = byDate.get(date) || { date, tonnage: 0, exercises: 0 };
      existing.tonnage += Number(log.tonnage) || 0;
      existing.exercises += 1;
      byDate.set(date, existing);
    });

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({
      ...d,
      dateLabel: format(new Date(d.date), "dd/MM", { locale: fr }),
      tonnage: Math.round(d.tonnage),
    }));
  }, [logs]);

  // Chart data: tonnage per exercise
  const exerciseData = useMemo(() => {
    if (!logs) return [];
    const byExercise = new Map<string, { name: string; tonnage: number; avgWeight: number; count: number }>();

    logs.forEach((log) => {
      const existing = byExercise.get(log.exercise_name) || { name: log.exercise_name, tonnage: 0, avgWeight: 0, count: 0 };
      existing.tonnage += Number(log.tonnage) || 0;
      existing.avgWeight += Number(log.actual_weight_kg) || 0;
      existing.count += 1;
      byExercise.set(log.exercise_name, existing);
    });

    return Array.from(byExercise.values())
      .map((e) => ({
        ...e,
        avgWeight: Math.round(e.avgWeight / e.count * 10) / 10,
        tonnage: Math.round(e.tonnage),
      }))
      .sort((a, b) => b.tonnage - a.tonnage)
      .slice(0, 10);
  }, [logs]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {!playerId && (
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les athlètes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les athlètes</SelectItem>
              {players?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.first_name ? `${p.first_name} ${p.name}` : p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 jours</SelectItem>
            <SelectItem value="60">60 jours</SelectItem>
            <SelectItem value="90">90 jours</SelectItem>
            <SelectItem value="180">6 mois</SelectItem>
            <SelectItem value="365">1 an</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Weight className="h-3.5 w-3.5" />
              Tonnage total
            </div>
            <p className="text-xl font-bold">
              {stats ? `${Math.round(stats.totalTonnage).toLocaleString()} kg` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Dumbbell className="h-3.5 w-3.5" />
              Séances
            </div>
            <p className="text-xl font-bold">{stats?.sessionCount || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Moy/séance
            </div>
            <p className="text-xl font-bold">
              {stats ? `${Math.round(stats.avgTonnagePerSession).toLocaleString()} kg` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Intensité moy.
            </div>
            <p className="text-xl font-bold">
              {stats?.avgIntensity ? `${Math.round(stats.avgIntensity)}% RM` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tonnage Evolution Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Évolution du tonnage
          </CardTitle>
          <CardDescription>Tonnage total par séance</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString()} kg`, "Tonnage"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="tonnage"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              {isLoading ? "Chargement..." : "Aucune donnée de tonnage disponible"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tonnage per Exercise */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            Tonnage par exercice
          </CardTitle>
          <CardDescription>Top 10 exercices par volume total</CardDescription>
        </CardHeader>
        <CardContent>
          {exerciseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={exerciseData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "tonnage" ? `${value.toLocaleString()} kg` : `${value} kg`,
                    name === "tonnage" ? "Tonnage" : "Charge moy.",
                  ]}
                />
                <Legend />
                <Bar dataKey="tonnage" fill="hsl(var(--primary))" name="Tonnage (kg)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              {isLoading ? "Chargement..." : "Aucune donnée disponible"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercise detail table */}
      {exerciseData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Détail par exercice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Exercice</th>
                    <th className="text-right py-2 font-medium">Tonnage</th>
                    <th className="text-right py-2 font-medium">Charge moy.</th>
                    <th className="text-right py-2 font-medium">Séries</th>
                  </tr>
                </thead>
                <tbody>
                  {exerciseData.map((ex) => (
                    <tr key={ex.name} className="border-b last:border-0">
                      <td className="py-2">{ex.name}</td>
                      <td className="text-right font-semibold">{ex.tonnage.toLocaleString()} kg</td>
                      <td className="text-right">{ex.avgWeight} kg</td>
                      <td className="text-right text-muted-foreground">{ex.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
