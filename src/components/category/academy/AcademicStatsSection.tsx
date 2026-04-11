import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import ExcelJS from "exceljs";

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
  players: { name: string } | null;
}

function normalizeGrade(grade: number | null, scale: string | null): number | null {
  if (grade === null) return null;
  const s = scale || "20";
  if (s === "letter") return null;
  const max = parseFloat(s);
  if (max <= 0) return null;
  return (grade / max) * 20; // Normalize to /20
}

export function AcademicStatsSection({ categoryId }: AcademicStatsSectionProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [statsView, setStatsView] = useState<"global" | "subject">("global");

  const { data: allData } = useQuery({
    queryKey: ["academic_stats_all", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_academic_tracking")
        .select("id, player_id, tracking_date, academic_grade, grade_scale, subject, school_absence_hours, notes, players(name)")
        .eq("category_id", categoryId)
        .order("tracking_date", { ascending: true });
      if (error) throw error;
      return data as TrackingEntry[];
    },
  });

  // Get available years
  const availableYears = useMemo(() => {
    if (!allData) return [];
    const years = new Set(allData.map(d => new Date(d.tracking_date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [allData]);

  // Filter data by year
  const filteredData = useMemo(() => {
    if (!allData) return [];
    if (selectedYear === "all") return allData;
    return allData.filter(d => new Date(d.tracking_date).getFullYear() === parseInt(selectedYear));
  }, [allData, selectedYear]);

  // Only entries with grades
  const gradeEntries = useMemo(() => {
    return filteredData.filter(d => d.academic_grade !== null && (d.grade_scale || "20") !== "letter");
  }, [filteredData]);

  // Global stats
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

  // Per-subject stats
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

  // Per-player stats
  const playerStats = useMemo(() => {
    const players: Record<string, { grades: number[]; name: string; absences: number }> = {};
    filteredData.forEach(e => {
      const pid = e.player_id;
      if (!players[pid]) players[pid] = { grades: [], name: e.players?.name || "Inconnu", absences: 0 };
      players[pid].absences += e.school_absence_hours || 0;
      const n = normalizeGrade(e.academic_grade, e.grade_scale);
      if (n !== null) players[pid].grades.push(n);
    });
    return Object.values(players).map(p => ({
      name: p.name,
      avg: p.grades.length > 0 ? Math.round((p.grades.reduce((a, b) => a + b, 0) / p.grades.length) * 100) / 100 : null,
      count: p.grades.length,
      absences: p.absences,
    })).sort((a, b) => (b.avg || 0) - (a.avg || 0));
  }, [filteredData]);

  // Evolution data by month
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

  // Year-over-year comparison
  const yearComparison = useMemo(() => {
    if (!allData) return [];
    const years: Record<number, { grades: number[]; absences: number }> = {};
    allData.forEach(e => {
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
  }, [allData]);

  // Export to Excel
  const exportToExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();

      // Sheet 1: Global stats
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

      // Sheet 2: Per subject
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

      // Sheet 3: Per player
      const ws3 = wb.addWorksheet("Par Joueur");
      ws3.columns = [
        { header: "Joueur", key: "name", width: 25 },
        { header: "Moyenne (/20)", key: "avg", width: 15 },
        { header: "Nb notes", key: "count", width: 12 },
        { header: "Heures absences", key: "absences", width: 18 },
      ];
      ws3.getRow(1).font = { bold: true };
      playerStats.forEach(p => ws3.addRow(p));

      // Sheet 4: Evolution
      const ws4 = wb.addWorksheet("Évolution Mensuelle");
      ws4.columns = [
        { header: "Mois", key: "label", width: 15 },
        { header: "Moyenne (/20)", key: "moyenne", width: 15 },
        { header: "Nb notes", key: "nbNotes", width: 12 },
        { header: "Absences (h)", key: "absences", width: 15 },
      ];
      ws4.getRow(1).font = { bold: true };
      evolutionData.forEach(e => ws4.addRow(e));

      // Sheet 5: Year comparison
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistiques Scolaires
            </CardTitle>
            <CardDescription>Analyse des notes et absences par période</CardDescription>
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
        {!allData || allData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune donnée scolaire pour générer des statistiques.</p>
        ) : (
          <>
            {/* Summary cards */}
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

            {/* Tabs for views */}
            <Tabs defaultValue="evolution" className="space-y-4">
              <TabsList>
                <TabsTrigger value="evolution">Évolution</TabsTrigger>
                <TabsTrigger value="subjects">Par Matière</TabsTrigger>
                <TabsTrigger value="players">Par Joueur</TabsTrigger>
                <TabsTrigger value="years">Année par Année</TabsTrigger>
              </TabsList>

              {/* Evolution */}
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
                          <YAxis domain={[0, 20]} fontSize={12} />
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

              {/* Per subject */}
              <TabsContent value="subjects">
                {subjectStats.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectStats} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 20]} fontSize={12} />
                          <YAxis type="category" dataKey="name" width={120} fontSize={12} />
                          <Tooltip />
                          <Bar dataKey="avg" name="Moyenne (/20)" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
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

              {/* Per player */}
              <TabsContent value="players">
                {playerStats.length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Joueur</TableHead>
                          <TableHead className="text-center">Moyenne (/20)</TableHead>
                          <TableHead className="text-center">Nb notes</TableHead>
                          <TableHead className="text-center">Heures absences</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {playerStats.map(p => (
                          <TableRow key={p.name}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="text-center font-bold">{p.avg !== null ? `${p.avg}/20` : "-"}</TableCell>
                            <TableCell className="text-center">{p.count}</TableCell>
                            <TableCell className="text-center">{p.absences > 0 ? <span className="text-destructive font-medium">{p.absences}h</span> : "0h"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Aucune donnée par joueur.</p>
                )}
              </TabsContent>

              {/* Year comparison */}
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
                          <YAxis domain={[0, 20]} fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="moyenne" name="Moyenne (/20)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
