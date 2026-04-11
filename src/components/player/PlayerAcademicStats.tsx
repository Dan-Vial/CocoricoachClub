import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

interface PlayerAcademicStatsProps {
  playerId: string;
  categoryId: string;
  playerName: string;
}

interface TrackingEntry {
  id: string;
  player_id: string;
  tracking_date: string;
  academic_grade: number | null;
  grade_scale: string | null;
  subject: string | null;
  school_absence_hours: number | null;
  notes: string | null;
}

function normalizeGrade(grade: number | null, scale: string | null): number | null {
  if (grade === null) return null;
  const s = scale || "20";
  if (s === "letter") return null;
  const max = parseFloat(s);
  if (max <= 0) return null;
  return (grade / max) * 20;
}

export function PlayerAcademicStats({ playerId, categoryId, playerName }: PlayerAcademicStatsProps) {
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const { data: allData } = useQuery({
    queryKey: ["player_academic_stats", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_academic_tracking")
        .select("id, player_id, tracking_date, academic_grade, grade_scale, subject, school_absence_hours, notes")
        .eq("player_id", playerId)
        .order("tracking_date", { ascending: true });
      if (error) throw error;
      return data as TrackingEntry[];
    },
  });

  const availableYears = useMemo(() => {
    if (!allData) return [];
    const years = new Set(allData.map(d => new Date(d.tracking_date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [allData]);

  const filteredData = useMemo(() => {
    if (!allData) return [];
    if (selectedYear === "all") return allData;
    return allData.filter(d => new Date(d.tracking_date).getFullYear() === parseInt(selectedYear));
  }, [allData, selectedYear]);

  const gradeEntries = useMemo(() => {
    return filteredData.filter(d => d.academic_grade !== null && (d.grade_scale || "20") !== "letter");
  }, [filteredData]);

  const globalStats = useMemo(() => {
    if (gradeEntries.length === 0) return null;
    const normalized = gradeEntries.map(e => normalizeGrade(e.academic_grade, e.grade_scale)!).filter(n => n !== null);
    if (normalized.length === 0) return null;
    const avg = normalized.reduce((a, b) => a + b, 0) / normalized.length;
    const min = Math.min(...normalized);
    const max = Math.max(...normalized);
    const totalAbsences = filteredData.reduce((s, d) => s + (d.school_absence_hours || 0), 0);
    return { avg: Math.round(avg * 100) / 100, min: Math.round(min * 100) / 100, max: Math.round(max * 100) / 100, count: normalized.length, totalAbsences };
  }, [gradeEntries, filteredData]);

  const subjectStats = useMemo(() => {
    const subjects: Record<string, { grades: number[]; name: string }> = {};
    gradeEntries.forEach(e => {
      const subj = e.subject || "Non spécifié";
      if (!subjects[subj]) subjects[subj] = { grades: [], name: subj };
      const n = normalizeGrade(e.academic_grade, e.grade_scale);
      if (n !== null) subjects[subj].grades.push(n);
    });
    return Object.values(subjects).map(s => ({
      name: s.name,
      avg: Math.round((s.grades.reduce((a, b) => a + b, 0) / s.grades.length) * 100) / 100,
      min: Math.round(Math.min(...s.grades) * 100) / 100,
      max: Math.round(Math.max(...s.grades) * 100) / 100,
      count: s.grades.length,
    })).sort((a, b) => b.avg - a.avg);
  }, [gradeEntries]);

  const subjectEvolutionData = useMemo(() => {
    const subjectEntries: Record<string, { date: string; grade: number }[]> = {};
    gradeEntries.forEach(e => {
      const subj = e.subject || "Non spécifié";
      const n = normalizeGrade(e.academic_grade, e.grade_scale);
      if (n !== null) {
        if (!subjectEntries[subj]) subjectEntries[subj] = [];
        subjectEntries[subj].push({ date: e.tracking_date, grade: Math.round(n * 100) / 100 });
      }
    });
    const allDates = [...new Set(gradeEntries.map(e => e.tracking_date))].sort();
    const subjects = Object.keys(subjectEntries).sort();
    const chartData = allDates.map(date => {
      const row: Record<string, any> = {
        date,
        label: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      };
      subjects.forEach(subj => {
        const entry = subjectEntries[subj]?.find(e => e.date === date);
        row[subj] = entry ? entry.grade : null;
      });
      return row;
    });
    return { chartData, subjects };
  }, [gradeEntries]);

  const evolutionData = useMemo(() => {
    const months: Record<string, { grades: number[]; label: string; absences: number }> = {};
    filteredData.forEach(e => {
      const d = new Date(e.tracking_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = new Date(d.getFullYear(), d.getMonth()).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      if (!months[key]) months[key] = { grades: [], label, absences: 0 };
      months[key].absences += e.school_absence_hours || 0;
      const n = normalizeGrade(e.academic_grade, e.grade_scale);
      if (n !== null) months[key].grades.push(n);
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        label: v.label,
        moyenne: v.grades.length > 0 ? Math.round((v.grades.reduce((a, b) => a + b, 0) / v.grades.length) * 100) / 100 : null,
        absences: v.absences,
        nbNotes: v.grades.length,
      }));
  }, [filteredData]);

  const getTrendIcon = (values: { moyenne: number | null }[]) => {
    if (values.length < 2) return <Minus className="h-4 w-4 text-muted-foreground" />;
    const first = values.find(v => v.moyenne !== null)?.moyenne;
    const last = [...values].reverse().find(v => v.moyenne !== null)?.moyenne;
    if (first === undefined || last === undefined) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (last > first) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (last < first) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistiques — {playerName}
            </CardTitle>
            <CardDescription>Analyse des notes et absences</CardDescription>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les années</SelectItem>
              {availableYears.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}/{y + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!allData || allData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune donnée scolaire.</p>
        ) : (
          <>
            {globalStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Moyenne générale</p>
                  <p className="text-2xl font-bold text-primary">{globalStats.avg}/20</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Note min</p>
                  <p className="text-2xl font-bold">{globalStats.min}/20</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Note max</p>
                  <p className="text-2xl font-bold">{globalStats.max}/20</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Nombre de notes</p>
                  <p className="text-2xl font-bold">{globalStats.count}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Heures absences</p>
                  <p className="text-2xl font-bold text-destructive">{globalStats.totalAbsences}h</p>
                </div>
              </div>
            )}

            <Tabs defaultValue="evolution" className="space-y-4">
              <TabsList>
                <TabsTrigger value="evolution">Évolution</TabsTrigger>
                <TabsTrigger value="subjects">Par Matière</TabsTrigger>
              </TabsList>

              <TabsContent value="evolution">
                {evolutionData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Tendance:</span>
                      {getTrendIcon(evolutionData)}
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={evolutionData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" fontSize={12} />
                          <YAxis domain={[(dataMin: number) => Math.max(0, Math.floor(dataMin) - 2), 20]} fontSize={12} allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="moyenne" name="Moyenne (/20)" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={evolutionData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="absences" name="Absences (h)" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Pas assez de données.</p>
                )}
              </TabsContent>

              <TabsContent value="subjects">
                {subjectStats.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={subjectEvolutionData.chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" fontSize={12} />
                          <YAxis domain={[(dataMin: number) => Math.max(0, Math.floor(dataMin) - 2), 20]} fontSize={12} allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          {subjectEvolutionData.subjects.map((subj, i) => {
                            const colors = [
                              "hsl(var(--primary))", "#e11d48", "#2563eb", "#16a34a", "#d97706",
                              "#7c3aed", "#0891b2", "#be185d", "#65a30d", "#dc2626",
                              "#4f46e5", "#059669", "#ca8a04", "#9333ea", "#0284c7"
                            ];
                            return (
                              <Line
                                key={subj}
                                type="monotone"
                                dataKey={subj}
                                name={subj}
                                stroke={colors[i % colors.length]}
                                strokeWidth={2}
                                dot={{ r: 5 }}
                                connectNulls
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Matière</TableHead>
                            <TableHead className="text-center">Moyenne</TableHead>
                            <TableHead className="text-center">Min</TableHead>
                            <TableHead className="text-center">Max</TableHead>
                            <TableHead className="text-center">Nb notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subjectStats.map(s => (
                            <TableRow key={s.name}>
                              <TableCell className="font-medium">{s.name}</TableCell>
                              <TableCell className="text-center font-bold">{s.avg}/20</TableCell>
                              <TableCell className="text-center">{s.min}/20</TableCell>
                              <TableCell className="text-center">{s.max}/20</TableCell>
                              <TableCell className="text-center">{s.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Aucune note par matière.</p>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}
