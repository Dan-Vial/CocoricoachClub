import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, TrendingUp, TrendingDown, Minus, BarChart3, Users, User } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import ExcelJS from "exceljs";
import { cn } from "@/lib/utils";

interface AcademicStatsSectionProps {
  categoryId: string;
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
  players: { name: string; first_name: string | null } | null;
}

function normalizeGrade(grade: number | null, scale: string | null): number | null {
  if (grade === null) return null;
  const s = scale || "20";
  if (s === "letter") return null;
  const max = parseFloat(s);
  if (max <= 0) return null;
  return (grade / max) * 20;
}

export function AcademicStatsSection({ categoryId }: AcademicStatsSectionProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const { data: allData } = useQuery({
    queryKey: ["academic_stats_all", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_academic_tracking")
        .select("id, player_id, tracking_date, academic_grade, grade_scale, subject, school_absence_hours, notes, players(name, first_name)")
        .eq("category_id", categoryId)
        .order("tracking_date", { ascending: true });
      if (error) throw error;
      return data as TrackingEntry[];
    },
  });

  // Fetch all players in the category
  const { data: allPlayers } = useQuery({
    queryKey: ["category_players_for_stats", categoryId],
    queryFn: async () => {
      const query: any = supabase
        .from("players")
        .select("id, name, first_name");
      const { data, error } = await query
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; first_name: string | null }[];
    },
  });

  const availableYears = useMemo(() => {
    if (!allData) return [];
    const years = new Set(allData.map(d => new Date(d.tracking_date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [allData]);

  // Filter by year then by player
  const filteredData = useMemo(() => {
    if (!allData) return [];
    let data = allData;
    if (selectedYear !== "all") {
      data = data.filter(d => new Date(d.tracking_date).getFullYear() === parseInt(selectedYear));
    }
    if (selectedPlayerId) {
      data = data.filter(d => d.player_id === selectedPlayerId);
    }
    return data;
  }, [allData, selectedYear, selectedPlayerId]);

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

  const yearComparison = useMemo(() => {
    if (!allData) return [];
    let data = allData;
    if (selectedPlayerId) {
      data = data.filter(d => d.player_id === selectedPlayerId);
    }
    const years: Record<number, { grades: number[]; absences: number }> = {};
    data.forEach(e => {
      const y = new Date(e.tracking_date).getFullYear();
      if (!years[y]) years[y] = { grades: [], absences: 0 };
      years[y].absences += e.school_absence_hours || 0;
      const n = normalizeGrade(e.academic_grade, e.grade_scale);
      if (n !== null) years[y].grades.push(n);
    });
    return Object.entries(years)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([year, v]) => ({
        year,
        moyenne: v.grades.length > 0 ? Math.round((v.grades.reduce((a, b) => a + b, 0) / v.grades.length) * 100) / 100 : null,
        absences: v.absences,
        nbNotes: v.grades.length,
      }));
  }, [allData, selectedPlayerId]);

  const exportToExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws1 = wb.addWorksheet("Statistiques Globales");
      ws1.columns = [
        { header: "Indicateur", key: "indicator", width: 25 },
        { header: "Valeur", key: "value", width: 15 },
      ];
      ws1.getRow(1).font = { bold: true };
      if (globalStats) {
        ws1.addRow({ indicator: "Moyenne générale (/20)", value: globalStats.avg });
        ws1.addRow({ indicator: "Note min (/20)", value: globalStats.min });
        ws1.addRow({ indicator: "Note max (/20)", value: globalStats.max });
        ws1.addRow({ indicator: "Nombre de notes", value: globalStats.count });
        ws1.addRow({ indicator: "Total heures absences", value: globalStats.totalAbsences });
      }
      const ws2 = wb.addWorksheet("Par Matière");
      ws2.columns = [
        { header: "Matière", key: "name", width: 20 },
        { header: "Moyenne (/20)", key: "avg", width: 15 },
        { header: "Min (/20)", key: "min", width: 12 },
        { header: "Max (/20)", key: "max", width: 12 },
        { header: "Nb notes", key: "count", width: 12 },
      ];
      ws2.getRow(1).font = { bold: true };
      subjectStats.forEach(s => ws2.addRow(s));
      const ws4 = wb.addWorksheet("Évolution Mensuelle");
      ws4.columns = [
        { header: "Mois", key: "label", width: 15 },
        { header: "Moyenne (/20)", key: "moyenne", width: 15 },
        { header: "Nb notes", key: "nbNotes", width: 12 },
        { header: "Absences (h)", key: "absences", width: 15 },
      ];
      ws4.getRow(1).font = { bold: true };
      evolutionData.forEach(e => ws4.addRow(e));
      const ws5 = wb.addWorksheet("Comparaison Annuelle");
      ws5.columns = [
        { header: "Année", key: "year", width: 12 },
        { header: "Moyenne (/20)", key: "moyenne", width: 15 },
        { header: "Nb notes", key: "nbNotes", width: 12 },
        { header: "Absences (h)", key: "absences", width: 15 },
      ];
      ws5.getRow(1).font = { bold: true };
      yearComparison.forEach(y => ws5.addRow(y));
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `statistiques_scolaires_${selectedYear === "all" ? "toutes_annees" : selectedYear}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export Excel téléchargé");
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  const getTrendIcon = (values: { moyenne: number | null }[]) => {
    if (values.length < 2) return <Minus className="h-4 w-4 text-muted-foreground" />;
    const first = values.find(v => v.moyenne !== null)?.moyenne;
    const last = [...values].reverse().find(v => v.moyenne !== null)?.moyenne;
    if (first === undefined || last === undefined) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (last > first) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (last < first) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const selectedPlayerName = useMemo(() => {
    if (!selectedPlayerId || !allPlayers) return null;
    const p = allPlayers.find(p => p.id === selectedPlayerId);
    return p ? `${p.first_name || ""} ${p.name}`.trim() : null;
  }, [selectedPlayerId, allPlayers]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistiques Scolaires
              {selectedPlayerName && (
                <span className="text-sm font-normal text-muted-foreground">— {selectedPlayerName}</span>
              )}
            </CardTitle>
            <CardDescription>
              {selectedPlayerId ? "Statistiques individuelles" : "Sélectionnez un joueur pour voir ses statistiques"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
            <Button variant="outline" onClick={exportToExcel} disabled={!allData || allData.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Player selector list */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Sélectionner un joueur
          </p>
          <div className="flex flex-wrap gap-2">
            {allPlayers?.map(player => {
              const fullName = `${player.first_name || ""} ${player.name}`.trim();
              const isSelected = selectedPlayerId === player.id;
              return (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayerId(isSelected ? null : player.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card hover:bg-muted border-border"
                  )}
                >
                  <User className="h-4 w-4" />
                  {fullName}
                </button>
              );
            })}
          </div>
        </div>

        {!selectedPlayerId ? (
          <p className="text-center text-muted-foreground py-8">
            Cliquez sur un joueur ci-dessus pour afficher ses statistiques scolaires.
          </p>
        ) : filteredData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune donnée scolaire pour ce joueur.</p>
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
                <TabsTrigger value="years">Année par Année</TabsTrigger>
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
                  <p className="text-center text-muted-foreground py-8">Pas assez de données pour l'évolution.</p>
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

              <TabsContent value="years">
                {yearComparison.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Tendance inter-annuelle:</span>
                      {getTrendIcon(yearComparison)}
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yearComparison}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" fontSize={12} />
                          <YAxis domain={[(dataMin: number) => Math.max(0, Math.floor(dataMin) - 2), 20]} fontSize={12} allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="moyenne" name="Moyenne (/20)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={60} maxBarSize={80} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Année</TableHead>
                            <TableHead className="text-center">Moyenne (/20)</TableHead>
                            <TableHead className="text-center">Nb notes</TableHead>
                            <TableHead className="text-center">Absences (h)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {yearComparison.map(y => (
                            <TableRow key={y.year}>
                              <TableCell className="font-medium">{y.year}/{parseInt(y.year) + 1}</TableCell>
                              <TableCell className="text-center font-bold">{y.moyenne !== null ? `${y.moyenne}/20` : "-"}</TableCell>
                              <TableCell className="text-center">{y.nbNotes}</TableCell>
                              <TableCell className="text-center">{y.absences > 0 ? <span className="text-destructive">{y.absences}h</span> : "0h"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Pas assez de données pour la comparaison annuelle.</p>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}
