import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, Target, CalendarIcon, Users, Download, FileSpreadsheet, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getExcelBranding, addBrandedHeader, styleDataHeaderRow, addZebraRows, addFooter, downloadWorkbook } from "@/lib/excelExport";
import { preparePdfWithSettings, drawPdfHeader as drawPdfHeaderCustom, type PdfCustomSettings } from "@/lib/pdfExport";

interface PrecisionTrainingStatsProps {
  categoryId: string;
}

export function PrecisionTrainingStats({ categoryId }: PrecisionTrainingStatsProps) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("all");
  const [selectedExercise, setSelectedExercise] = useState<string>("all");

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["precision-training-stats", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("precision_training")
        .select("*, players(id, name, first_name)")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    if (!rawData) return [];
    return rawData.filter((row: any) => {
      if (dateFrom && isBefore(new Date(row.session_date), startOfDay(dateFrom))) return false;
      if (dateTo && isAfter(new Date(row.session_date), endOfDay(dateTo))) return false;
      if (selectedPlayerId !== "all" && row.player_id !== selectedPlayerId) return false;
      if (selectedExercise !== "all" && row.exercise_label !== selectedExercise) return false;
      return true;
    });
  }, [rawData, dateFrom, dateTo, selectedPlayerId, selectedExercise]);

  const players = useMemo(() => {
    if (!rawData) return [];
    const map = new Map<string, string>();
    rawData.forEach((r: any) => {
      const p = r.players as any;
      if (p) map.set(p.id, [p.first_name, p.name].filter(Boolean).join(" "));
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rawData]);

  const exerciseLabels = useMemo(() => {
    if (!rawData) return [];
    return [...new Set(rawData.map((r: any) => r.exercise_label))].sort();
  }, [rawData]);

  // Global stats
  const totalAttempts = filtered.reduce((s: number, r: any) => s + (r.attempts || 0), 0);
  const totalSuccesses = filtered.reduce((s: number, r: any) => s + (r.successes || 0), 0);
  const globalRate = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0;

  // Per exercise breakdown with progression
  const byExercise = useMemo(() => {
    const map = new Map<string, { attempts: number; successes: number; history: { date: string; rate: number }[] }>();
    // filtered is already sorted by date ascending
    filtered.forEach((r: any) => {
      const key = r.exercise_label || "Inconnu";
      const prev = map.get(key) || { attempts: 0, successes: 0, history: [] };
      const newAttempts = prev.attempts + (r.attempts || 0);
      const newSuccesses = prev.successes + (r.successes || 0);
      prev.history.push({
        date: r.session_date,
        rate: r.attempts > 0 ? Math.round((r.successes / r.attempts) * 100) : 0,
      });
      map.set(key, { attempts: newAttempts, successes: newSuccesses, history: prev.history });
    });
    return Array.from(map.entries())
      .map(([label, v]) => {
        const rate = v.attempts > 0 ? Math.round((v.successes / v.attempts) * 100) : 0;
        // Progression: compare first half vs second half of history
        let progression = 0;
        if (v.history.length >= 2) {
          const mid = Math.floor(v.history.length / 2);
          const firstHalf = v.history.slice(0, mid);
          const secondHalf = v.history.slice(mid);
          const avgFirst = firstHalf.reduce((s, h) => s + h.rate, 0) / firstHalf.length;
          const avgSecond = secondHalf.reduce((s, h) => s + h.rate, 0) / secondHalf.length;
          progression = Math.round(avgSecond - avgFirst);
        }
        return { label, ...v, rate, progression };
      })
      .sort((a, b) => b.attempts - a.attempts);
  }, [filtered]);

  // Per player breakdown with progression
  const byPlayer = useMemo(() => {
    const map = new Map<string, { name: string; attempts: number; successes: number; history: { date: string; rate: number }[] }>();
    filtered.forEach((r: any) => {
      const p = r.players as any;
      const name = p ? [p.first_name, p.name].filter(Boolean).join(" ") : "Inconnu";
      const prev = map.get(r.player_id) || { name, attempts: 0, successes: 0, history: [] };
      prev.history.push({
        date: r.session_date,
        rate: r.attempts > 0 ? Math.round((r.successes / r.attempts) * 100) : 0,
      });
      map.set(r.player_id, {
        name,
        attempts: prev.attempts + (r.attempts || 0),
        successes: prev.successes + (r.successes || 0),
        history: prev.history,
      });
    });
    return Array.from(map.values())
      .map((v) => {
        const rate = v.attempts > 0 ? Math.round((v.successes / v.attempts) * 100) : 0;
        let progression = 0;
        if (v.history.length >= 2) {
          const mid = Math.floor(v.history.length / 2);
          const firstHalf = v.history.slice(0, mid);
          const secondHalf = v.history.slice(mid);
          const avgFirst = firstHalf.reduce((s, h) => s + h.rate, 0) / firstHalf.length;
          const avgSecond = secondHalf.reduce((s, h) => s + h.rate, 0) / secondHalf.length;
          progression = Math.round(avgSecond - avgFirst);
        }
        return { ...v, rate, progression };
      })
      .sort((a, b) => b.rate - a.rate);
  }, [filtered]);

  // Export Excel
  const handleExportExcel = async () => {
    try {
      const branding = await getExcelBranding(categoryId);
      const wb = new ExcelJS.Workbook();

      // Sheet 1: By exercise
      const ws1 = wb.addWorksheet("Par exercice");
      ws1.columns = [
        { header: "Exercice", key: "label", width: 25 },
        { header: "Tentatives", key: "attempts", width: 14 },
        { header: "Réussites", key: "successes", width: 14 },
        { header: "Taux %", key: "rate", width: 12 },
        { header: "Progression", key: "progression", width: 14 },
      ];
      const startRow1 = addBrandedHeader(ws1, "Stats entraînement - Par exercice", branding, [
        ["Période", `${dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Début"} → ${dateTo ? format(dateTo, "dd/MM/yyyy") : "Fin"}`],
      ]);
      styleDataHeaderRow(ws1, startRow1, 5, branding.headerColor);
      ws1.getRow(startRow1).values = ["Exercice", "Tentatives", "Réussites", "Taux %", "Progression"];
      byExercise.forEach((ex, i) => {
        const row = ws1.getRow(startRow1 + 1 + i);
        row.values = [ex.label, ex.attempts, ex.successes, ex.rate, ex.progression > 0 ? `+${ex.progression}%` : `${ex.progression}%`];
        const progCell = row.getCell(5);
        progCell.font = { color: { argb: ex.progression > 0 ? "FF16A34A" : ex.progression < 0 ? "FFDC2626" : "FF64748B" } };
      });
      addZebraRows(ws1, startRow1 + 1, startRow1 + byExercise.length, 5);
      addFooter(ws1, startRow1 + byExercise.length + 1, 5, branding.footerText);

      // Sheet 2: By player
      const ws2 = wb.addWorksheet("Par athlète");
      ws2.columns = [
        { header: "Athlète", key: "name", width: 25 },
        { header: "Tentatives", key: "attempts", width: 14 },
        { header: "Réussites", key: "successes", width: 14 },
        { header: "Taux %", key: "rate", width: 12 },
        { header: "Progression", key: "progression", width: 14 },
      ];
      const startRow2 = addBrandedHeader(ws2, "Stats entraînement - Par athlète", branding);
      styleDataHeaderRow(ws2, startRow2, 5, branding.headerColor);
      ws2.getRow(startRow2).values = ["Athlète", "Tentatives", "Réussites", "Taux %", "Progression"];
      byPlayer.forEach((p, i) => {
        const row = ws2.getRow(startRow2 + 1 + i);
        row.values = [p.name, p.attempts, p.successes, p.rate, p.progression > 0 ? `+${p.progression}%` : `${p.progression}%`];
        const progCell = row.getCell(5);
        progCell.font = { color: { argb: p.progression > 0 ? "FF16A34A" : p.progression < 0 ? "FFDC2626" : "FF64748B" } };
      });
      addZebraRows(ws2, startRow2 + 1, startRow2 + byPlayer.length, 5);

      // Sheet 3: Raw data
      const ws3 = wb.addWorksheet("Données brutes");
      ws3.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Athlète", key: "player", width: 22 },
        { header: "Exercice", key: "exercise", width: 25 },
        { header: "Tentatives", key: "attempts", width: 14 },
        { header: "Réussites", key: "successes", width: 14 },
        { header: "Taux %", key: "rate", width: 12 },
      ];
      const startRow3 = addBrandedHeader(ws3, "Stats entraînement - Données brutes", branding);
      styleDataHeaderRow(ws3, startRow3, 6, branding.headerColor);
      ws3.getRow(startRow3).values = ["Date", "Athlète", "Exercice", "Tentatives", "Réussites", "Taux %"];
      filtered.forEach((r: any, i: number) => {
        const p = r.players as any;
        const row = ws3.getRow(startRow3 + 1 + i);
        row.values = [
          format(new Date(r.session_date), "dd/MM/yyyy"),
          p ? [p.first_name, p.name].filter(Boolean).join(" ") : "Inconnu",
          r.exercise_label,
          r.attempts,
          r.successes,
          r.success_rate || 0,
        ];
      });
      addZebraRows(ws3, startRow3 + 1, startRow3 + filtered.length, 6);

      await downloadWorkbook(wb, `stats-entrainement-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Export Excel téléchargé !");
    } catch (e) {
      toast.error("Erreur lors de l'export Excel");
    }
  };

  // Export PDF
  const handleExportPdf = async () => {
    try {
      const { settings, logoBase64, clubName, categoryName, seasonName } = await preparePdfWithSettings(categoryId);
      const doc = new jsPDF({ orientation: "landscape" });
      const pageW = doc.internal.pageSize.getWidth();

      // Header
      let y = 15;
      if (settings?.header_color) {
        const hc = settings.header_color.replace("#", "");
        doc.setFillColor(parseInt(hc.substring(0, 2), 16), parseInt(hc.substring(2, 4), 16), parseInt(hc.substring(4, 6), 16));
      } else {
        doc.setFillColor(34, 67, 120);
      }
      doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text("Stats entraînement - Précision", 14, 12);
      doc.setFontSize(10);
      doc.text(`${clubName || ""} • ${categoryName || ""} • ${seasonName || ""}`, 14, 20);
      doc.text(format(new Date(), "dd/MM/yyyy"), pageW - 14, 20, { align: "right" });

      y = 36;
      doc.setTextColor(30, 41, 59);

      // Summary
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Résumé global", 14, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Enregistrements: ${filtered.length}  |  Tentatives: ${totalAttempts}  |  Réussites: ${totalSuccesses}  |  Taux: ${globalRate}%`, 14, y);
      y += 12;

      // By exercise table
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Par exercice", 14, y);
      y += 6;
      const cols = [14, 120, 155, 190, 225];
      const headers = ["Exercice", "Tentatives", "Réussites", "Taux", "Évolution"];
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, pageW - 28, 7, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      headers.forEach((h, i) => doc.text(h, cols[i], y + 5));
      y += 9;
      doc.setFont("helvetica", "normal");

      byExercise.forEach((ex) => {
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 15;
        }
        doc.setTextColor(30, 41, 59);
        doc.text(ex.label, cols[0], y + 4);
        doc.text(String(ex.attempts), cols[1], y + 4);
        doc.text(String(ex.successes), cols[2], y + 4);
        doc.text(`${ex.rate}%`, cols[3], y + 4);
        if (ex.progression > 0) doc.setTextColor(22, 163, 74);
        else if (ex.progression < 0) doc.setTextColor(220, 38, 38);
        else doc.setTextColor(100, 116, 139);
        doc.text(ex.progression > 0 ? `+${ex.progression}%` : `${ex.progression}%`, cols[4], y + 4);
        y += 7;
      });

      // By player table
      y += 8;
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 15;
      }
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Par athlète", 14, y);
      y += 6;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, pageW - 28, 7, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const headers2 = ["Athlète", "Tentatives", "Réussites", "Taux", "Évolution"];
      headers2.forEach((h, i) => doc.text(h, cols[i], y + 5));
      y += 9;
      doc.setFont("helvetica", "normal");

      byPlayer.forEach((p) => {
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 15;
        }
        doc.setTextColor(30, 41, 59);
        doc.text(p.name, cols[0], y + 4);
        doc.text(String(p.attempts), cols[1], y + 4);
        doc.text(String(p.successes), cols[2], y + 4);
        doc.text(`${p.rate}%`, cols[3], y + 4);
        if (p.progression > 0) doc.setTextColor(22, 163, 74);
        else if (p.progression < 0) doc.setTextColor(220, 38, 38);
        else doc.setTextColor(100, 116, 139);
        doc.text(p.progression > 0 ? `+${p.progression}%` : `${p.progression}%`, cols[4], y + 4);
        y += 7;
      });

      doc.save(`stats-entrainement-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Export PDF téléchargé !");
    } catch (e) {
      toast.error("Erreur lors de l'export PDF");
    }
  };

  const ProgressionBadge = ({ value }: { value: number }) => {
    if (value > 0) return (
      <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 gap-1">
        <TrendingUp className="h-3 w-3" />+{value}%
      </Badge>
    );
    if (value < 0) return (
      <Badge className="bg-destructive/20 text-destructive gap-1">
        <TrendingDown className="h-3 w-3" />{value}%
      </Badge>
    );
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />0%
      </Badge>
    );
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  if (!rawData || rawData.length === 0) {
    return (
      <Card className="bg-gradient-card shadow-md">
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune donnée de précision enregistrée.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Les stats apparaîtront quand les athlètes saisiront leurs résultats d'exercices de précision.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters + Export */}
      <Card className="bg-gradient-card shadow-md">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Athlète</label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {players.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Exercice</label>
                <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {exerciseLabels.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Du</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {dateFrom ? format(dateFrom, "dd/MM/yy") : "Début"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={fr} /></PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Au</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {dateTo ? format(dateTo, "dd/MM/yy") : "Fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={fr} disabled={(d) => dateFrom ? d < dateFrom : false} /></PopoverContent>
                </Popover>
              </div>

              {(dateFrom || dateTo || selectedPlayerId !== "all" || selectedExercise !== "all") && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setSelectedPlayerId("all"); setSelectedExercise("all"); }}>
                  Réinitialiser
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-card shadow-md">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Enregistrements</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-md">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{totalAttempts}</p>
            <p className="text-xs text-muted-foreground">Tentatives</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-md">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">{totalSuccesses}</p>
            <p className="text-xs text-muted-foreground">Réussites</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-md">
          <CardContent className="pt-4 pb-3 text-center">
            <p className={cn("text-2xl font-bold", globalRate >= 70 ? "text-emerald-500" : globalRate >= 50 ? "text-amber-500" : "text-destructive")}>
              {globalRate}%
            </p>
            <p className="text-xs text-muted-foreground">Taux de réussite</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart - By exercise with progression */}
      {byExercise.length > 0 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Réussite par exercice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              {byExercise.map((ex) => (
                <div key={ex.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{ex.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{ex.successes}/{ex.attempts}</span>
                    <Badge className={cn(
                      "min-w-[45px] justify-center",
                      ex.rate >= 70 ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" :
                      ex.rate >= 50 ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" :
                      "bg-destructive/20 text-destructive"
                    )}>
                      {ex.rate}%
                    </Badge>
                    <ProgressionBadge value={ex.progression} />
                  </div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={Math.max(200, byExercise.length * 40)}>
              <BarChart data={byExercise} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Taux"]} />
                <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Player ranking with progression */}
      {byPlayer.length > 0 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Classement par athlète
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byPlayer.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                      {i + 1}
                    </Badge>
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{p.successes}/{p.attempts}</span>
                    <Badge className={cn(
                      "min-w-[45px] justify-center",
                      p.rate >= 70 ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" :
                      p.rate >= 50 ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" :
                      "bg-destructive/20 text-destructive"
                    )}>
                      {p.rate}%
                    </Badge>
                    <ProgressionBadge value={p.progression} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
