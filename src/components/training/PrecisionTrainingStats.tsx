import { useState, useMemo } from "react";
import { LineoutFieldSVG, aggregateLineoutStats } from "@/components/rugby/LineoutFieldSVG";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RugbyFieldSVG } from "@/components/rugby/RugbyFieldSVG";
import { BUTEUR_EXERCISES } from "@/lib/constants/rugbyPrecisionExercises";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, Target, CalendarIcon, Users, User, Download, FileSpreadsheet, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
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
  const [exportPlayerId, setExportPlayerId] = useState<string>("");

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
  // Group data by session for session-based exports
  const groupBySession = (data: any[]) => {
    const map = new Map<string, { date: string; sessionId: string; exercises: Map<string, { attempts: number; successes: number }> }>();
    data.forEach((r: any) => {
      const dateKey = r.session_date;
      const sessionId = r.training_session_id || dateKey;
      const key = `${dateKey}-${sessionId}`;
      if (!map.has(key)) map.set(key, { date: dateKey, sessionId, exercises: new Map() });
      const session = map.get(key)!;
      const exLabel = r.exercise_label || "Inconnu";
      const prev = session.exercises.get(exLabel) || { attempts: 0, successes: 0 };
      prev.attempts += r.attempts || 0;
      prev.successes += r.successes || 0;
      session.exercises.set(exLabel, prev);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const handleExportExcel = async (singlePlayerId?: string, mode: "exercise" | "session" | "both" = "both") => {
    const exportData = singlePlayerId ? filtered.filter((r: any) => r.player_id === singlePlayerId) : filtered;
    const singlePlayerName = singlePlayerId ? players.find(pl => pl.id === singlePlayerId)?.name : undefined;
    const recomputeByExercise = (data: any[]) => {
      const map = new Map<string, { attempts: number; successes: number }>();
      data.forEach((r: any) => {
        const key = r.exercise_label || "Inconnu";
        const prev = map.get(key) || { attempts: 0, successes: 0 };
        map.set(key, { attempts: prev.attempts + (r.attempts || 0), successes: prev.successes + (r.successes || 0) });
      });
      return Array.from(map.entries()).map(([label, v]) => ({
        label, ...v, rate: v.attempts > 0 ? Math.round((v.successes / v.attempts) * 100) : 0, progression: 0,
      }));
    };
    const exportByExercise = singlePlayerId ? recomputeByExercise(exportData) : byExercise;
    const exportByPlayer = singlePlayerId ? byPlayer.filter(p => p.name === singlePlayerName) : byPlayer;
    try {
      const branding = await getExcelBranding(categoryId);
      const wb = new ExcelJS.Workbook();
      const titleSuffix = singlePlayerName ? ` - ${singlePlayerName}` : "";

      // Sheet: By exercise
      if (mode === "exercise" || mode === "both") {
        const ws1 = wb.addWorksheet("Par exercice");
        ws1.columns = [
          { header: "Exercice", key: "label", width: 25 },
          { header: "Tentatives", key: "attempts", width: 14 },
          { header: "Réussites", key: "successes", width: 14 },
          { header: "Taux %", key: "rate", width: 12 },
          { header: "Progression", key: "progression", width: 14 },
        ];
        const startRow1 = addBrandedHeader(ws1, `Stats entraînement - Par exercice${titleSuffix}`, branding, [
          ["Période", `${dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Début"} → ${dateTo ? format(dateTo, "dd/MM/yyyy") : "Fin"}`],
          ...(singlePlayerName ? [["Athlète", singlePlayerName] as [string, string]] : []),
        ]);
        styleDataHeaderRow(ws1, startRow1, 5, branding.headerColor);
        ws1.getRow(startRow1).values = ["Exercice", "Tentatives", "Réussites", "Taux %", "Progression"];
        exportByExercise.forEach((ex, i) => {
          const row = ws1.getRow(startRow1 + 1 + i);
          row.values = [ex.label, ex.attempts, ex.successes, ex.rate, ex.progression > 0 ? `+${ex.progression}%` : `${ex.progression}%`];
          const progCell = row.getCell(5);
          progCell.font = { color: { argb: ex.progression > 0 ? "FF16A34A" : ex.progression < 0 ? "FFDC2626" : "FF64748B" } };
        });
        addZebraRows(ws1, startRow1 + 1, startRow1 + exportByExercise.length, 5);
        addFooter(ws1, startRow1 + exportByExercise.length + 1, 5, branding.footerText);

        if (!singlePlayerId) {
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
          exportByPlayer.forEach((p, i) => {
            const row = ws2.getRow(startRow2 + 1 + i);
            row.values = [p.name, p.attempts, p.successes, p.rate, p.progression > 0 ? `+${p.progression}%` : `${p.progression}%`];
            const progCell = row.getCell(5);
            progCell.font = { color: { argb: p.progression > 0 ? "FF16A34A" : p.progression < 0 ? "FFDC2626" : "FF64748B" } };
          });
          addZebraRows(ws2, startRow2 + 1, startRow2 + exportByPlayer.length, 5);
        }
      }

      // Sheet: By training session
      if (mode === "session" || mode === "both") {
        const sessions = groupBySession(exportData);
        const ws = wb.addWorksheet("Par entraînement");
        ws.columns = [
          { header: "Date", key: "date", width: 14 },
          { header: "Exercice", key: "exercise", width: 25 },
          { header: "Tentatives", key: "attempts", width: 14 },
          { header: "Réussites", key: "successes", width: 14 },
          { header: "Taux %", key: "rate", width: 12 },
        ];
        const startRow = addBrandedHeader(ws, `Stats entraînement - Par séance${titleSuffix}`, branding, [
          ["Période", `${dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Début"} → ${dateTo ? format(dateTo, "dd/MM/yyyy") : "Fin"}`],
          ...(singlePlayerName ? [["Athlète", singlePlayerName] as [string, string]] : []),
        ]);
        styleDataHeaderRow(ws, startRow, 5, branding.headerColor);
        ws.getRow(startRow).values = ["Date", "Exercice", "Tentatives", "Réussites", "Taux %"];
        let rowIdx = startRow + 1;
        sessions.forEach((s) => {
          s.exercises.forEach((v, exLabel) => {
            const row = ws.getRow(rowIdx);
            const rate = v.attempts > 0 ? Math.round((v.successes / v.attempts) * 100) : 0;
            row.values = [format(new Date(s.date), "dd/MM/yyyy"), exLabel, v.attempts, v.successes, rate];
            rowIdx++;
          });
          // Session total row
          const totalA = Array.from(s.exercises.values()).reduce((sum, v) => sum + v.attempts, 0);
          const totalS = Array.from(s.exercises.values()).reduce((sum, v) => sum + v.successes, 0);
          const totalRate = totalA > 0 ? Math.round((totalS / totalA) * 100) : 0;
          const totalRow = ws.getRow(rowIdx);
          totalRow.values = ["", "TOTAL SÉANCE", totalA, totalS, totalRate];
          totalRow.font = { bold: true };
          totalRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
          totalRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
          totalRow.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
          totalRow.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
          totalRow.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
          rowIdx++;
        });
        addFooter(ws, rowIdx, 5, branding.footerText);
      }

      // Raw data sheet
      const ws3 = wb.addWorksheet("Données brutes");
      ws3.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Athlète", key: "player", width: 22 },
        { header: "Exercice", key: "exercise", width: 25 },
        { header: "Tentatives", key: "attempts", width: 14 },
        { header: "Réussites", key: "successes", width: 14 },
        { header: "Taux %", key: "rate", width: 12 },
      ];
      const startRow3 = addBrandedHeader(ws3, `Stats entraînement - Données brutes${titleSuffix}`, branding);
      styleDataHeaderRow(ws3, startRow3, 6, branding.headerColor);
      ws3.getRow(startRow3).values = ["Date", "Athlète", "Exercice", "Tentatives", "Réussites", "Taux %"];
      exportData.forEach((r: any, i: number) => {
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
      addZebraRows(ws3, startRow3 + 1, startRow3 + exportData.length, 6);

      const modeLabel = mode === "exercise" ? "-exercices" : mode === "session" ? "-seances" : "";
      const fileSuffix = singlePlayerName ? `-${singlePlayerName.replace(/\s+/g, '-')}` : "";
      await downloadWorkbook(wb, `stats-entrainement${modeLabel}${fileSuffix}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Export Excel téléchargé !");
    } catch (e) {
      toast.error("Erreur lors de l'export Excel");
    }
  };

  // Build zone stats from filtered data for PDF field visual
  const fieldZoneStats = useMemo(() => {
    const map = new Map<string, { attempts: number; successes: number; x: number; y: number }>();
    filtered.forEach((e: any) => {
      if (e.zone_x == null || e.zone_y == null) return;
      const zoneKey = `${Math.round(e.zone_x / 15) * 15}-${Math.round(e.zone_y / 15) * 15}`;
      const prev = map.get(zoneKey) || { attempts: 0, successes: 0, x: Math.round(e.zone_x / 15) * 15, y: Math.round(e.zone_y / 15) * 15 };
      prev.attempts += e.attempts || 0;
      prev.successes += e.successes || 0;
      map.set(zoneKey, prev);
    });
    return Array.from(map.values());
  }, [filtered]);

  // Separate zone entries by exercise type category
  const zoneGridEntries = useMemo(() => {
    const map: Record<string, { attempts: number; successes: number }> = {};
    filtered.forEach((e: any) => {
      if (e.zone_x == null || e.zone_y == null) return;
      if (!e.exercise_label?.startsWith("Jeu de zone")) return;
      const key = `${e.zone_x}-${e.zone_y}`;
      if (!map[key]) map[key] = { attempts: 0, successes: 0 };
      map[key].attempts += e.attempts || 0;
      map[key].successes += e.successes || 0;
    });
    return map;
  }, [filtered]);

  const lineoutEntries = useMemo(() => {
    // Legacy format for PDF
    const map: Record<string, { attempts: number; successes: number }> = {};
    ["devant", "milieu", "fond"].forEach(k => { map[k] = { attempts: 0, successes: 0 }; });
    filtered.forEach((e: any) => {
      if (!e.exercise_label?.startsWith("Touche")) return;
      if (e.lineout_distance) {
        const k = e.lineout_distance;
        if (map[k]) { map[k].attempts += e.attempts || 0; map[k].successes += e.successes || 0; }
      } else {
        if (e.zone_y === 20 && map["devant"]) { map["devant"].attempts += e.attempts || 0; map["devant"].successes += e.successes || 0; }
        if (e.zone_y === 50 && map["milieu"]) { map["milieu"].attempts += e.attempts || 0; map["milieu"].successes += e.successes || 0; }
        if (e.zone_y === 80 && map["fond"]) { map["fond"].attempts += e.attempts || 0; map["fond"].successes += e.successes || 0; }
      }
    });
    return map;
  }, [filtered]);

  // Lineout zone stats for the visual mapping
  const lineoutZoneStats = useMemo(() => {
    return aggregateLineoutStats(filtered as any[]);
  }, [filtered]);

  const kickFieldEntries = useMemo(() => {
    const map = new Map<string, { attempts: number; successes: number; x: number; y: number }>();
    filtered.forEach((e: any) => {
      if (e.zone_x == null || e.zone_y == null) return;
      if (e.exercise_label?.startsWith("Jeu de zone") || e.exercise_label?.startsWith("Touche")) return;
      const zoneKey = `${Math.round(e.zone_x / 15) * 15}-${Math.round(e.zone_y / 15) * 15}`;
      const prev = map.get(zoneKey) || { attempts: 0, successes: 0, x: Math.round(e.zone_x / 15) * 15, y: Math.round(e.zone_y / 15) * 15 };
      prev.attempts += e.attempts || 0;
      prev.successes += e.successes || 0;
      map.set(zoneKey, prev);
    });
    return Array.from(map.values());
  }, [filtered]);

  const hasZoneData = filtered.some((e: any) => e.zone_x != null && e.zone_y != null);

  // PDF drawing helpers
  const drawPdfField = (doc: jsPDF, x: number, y: number, w: number, h: number, zones: { x: number; y: number; attempts: number; successes: number }[]) => {
    // Green field background
    doc.setFillColor(21, 128, 61);
    doc.roundedRect(x, y, w, h, 3, 3, "F");
    // Field outline
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    const fx = x + 3, fy = y + 2, fw = w - 6, fh = h - 4;
    doc.rect(fx, fy, fw, fh);

    // All regulation rugby field lines
    const fieldLines = [
      { pct: 0, label: "BM", solid: true, thick: false },
      { pct: 0.05, label: "En-but", solid: true, thick: true },
      { pct: 0.1, label: "5m", solid: false, thick: false },
      { pct: 0.15, label: "10m", solid: false, thick: false },
      { pct: 0.27, label: "22m", solid: true, thick: false },
      { pct: 0.45, label: "40m", solid: false, thick: false },
      { pct: 0.5, label: "½", solid: true, thick: true },
      { pct: 0.55, label: "40m", solid: false, thick: false },
      { pct: 0.73, label: "22m", solid: true, thick: false },
      { pct: 0.85, label: "10m", solid: false, thick: false },
      { pct: 0.9, label: "5m", solid: false, thick: false },
      { pct: 0.95, label: "En-but", solid: true, thick: true },
      { pct: 1, label: "BM", solid: true, thick: false },
    ];

    // In-goal shading
    doc.setFillColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
    doc.rect(fx, fy, fw * 0.05, fh, "F");
    doc.rect(fx + fw * 0.95, fy, fw * 0.05, fh, "F");
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    doc.setFontSize(4);
    doc.setTextColor(255, 255, 255);
    fieldLines.forEach((line) => {
      const lx = fx + line.pct * fw;
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(line.thick ? 0.5 : 0.3);
      if (!line.solid) {
        // Dashed
        const dashLen = 2, gapLen = 2;
        for (let dy = fy; dy < fy + fh; dy += dashLen + gapLen) {
          doc.line(lx, dy, lx, Math.min(dy + dashLen, fy + fh));
        }
      } else {
        doc.line(lx, fy, lx, fy + fh);
      }
      doc.text(line.label, lx, y + h + 3, { align: "center" });
    });

    // Width marks (5m and 15m)
    [5, 15].forEach(wm => {
      const yTop = fy + (wm / 70) * fh;
      const yBot = fy + ((70 - wm) / 70) * fh;
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.15);
      for (let dx = fx; dx < fx + fw; dx += 5) {
        doc.line(dx, yTop, Math.min(dx + 1.5, fx + fw), yTop);
        doc.line(dx, yBot, Math.min(dx + 1.5, fx + fw), yBot);
      }
    });

    // Center circle
    const centerX = fx + fw * 0.5;
    const centerY = fy + fh * 0.5;
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.circle(centerX, centerY, fh * 0.14, "S");

    // Goals (both sides)
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1);
    const gy1 = fy + fh * 0.35, gy2 = fy + fh * 0.65;
    doc.line(fx + fw * 0.95, gy1, fx + fw * 0.95, gy2);
    doc.setLineWidth(0.5);
    doc.line(fx + fw * 0.05, gy1, fx + fw * 0.05, gy2);

    // Zone bubbles with color coding
    zones.forEach(z => {
      const cx = fx + (z.x / 100) * fw;
      const cy = fy + (z.y / 100) * fh;
      const rate = z.attempts > 0 ? Math.round((z.successes / z.attempts) * 100) : 0;
      if (rate >= 70) doc.setFillColor(34, 197, 94);
      else if (rate >= 50) doc.setFillColor(245, 158, 11);
      else doc.setFillColor(239, 68, 68);
      doc.circle(cx, cy, 5, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.circle(cx, cy, 5, "S");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.text(`${rate}%`, cx, cy - 0.5, { align: "center" });
      doc.setFontSize(4);
      doc.setFont("helvetica", "normal");
      doc.text(`${z.successes}/${z.attempts}`, cx, cy + 2.5, { align: "center" });
    });

    // Legend
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    const legendY = y + h + 7;
    const legends = [
      { label: "≥ 70%", r: 34, g: 197, b: 94 },
      { label: "50-69%", r: 245, g: 158, b: 11 },
      { label: "< 50%", r: 239, g: 68, b: 68 },
    ];
    let legendX = x + 5;
    legends.forEach(l => {
      doc.setFillColor(l.r, l.g, l.b);
      doc.circle(legendX, legendY, 1.5, "F");
      doc.setTextColor(30, 41, 59);
      doc.text(l.label, legendX + 3, legendY + 1);
      legendX += 20;
    });
  };

  const drawPdfZoneGrid = (doc: jsPDF, x: number, y: number, w: number, h: number, zones: Record<string, { attempts: number; successes: number }>) => {
    doc.setFillColor(21, 128, 61);
    doc.roundedRect(x, y, w, h, 3, 3, "F");
    const cols = 4, rows = 3;
    const cellW = (w - 8) / cols, cellH = (h - 8) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = x + 4 + c * cellW;
        const cy = y + 4 + r * cellH;
        const key = `${c}-${r}`;
        const stat = zones[key] || { attempts: 0, successes: 0 };
        const rate = stat.attempts > 0 ? Math.round((stat.successes / stat.attempts) * 100) : -1;
        if (rate < 0) doc.setFillColor(255, 255, 255, 30);
        else if (rate >= 75) doc.setFillColor(34, 197, 94);
        else if (rate >= 50) doc.setFillColor(245, 158, 11);
        else doc.setFillColor(239, 68, 68);
        doc.roundedRect(cx, cy, cellW - 2, cellH - 2, 1, 1, "F");
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.3);
        doc.roundedRect(cx, cy, cellW - 2, cellH - 2, 1, 1, "S");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(5);
        doc.text(`Zone ${r * cols + c + 1}`, cx + (cellW - 2) / 2, cy + 4, { align: "center" });
        if (stat.attempts > 0) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(`${rate}%`, cx + (cellW - 2) / 2, cy + (cellH - 2) / 2 + 1, { align: "center" });
          doc.setFontSize(5);
          doc.setFont("helvetica", "normal");
          doc.text(`${stat.successes}/${stat.attempts}`, cx + (cellW - 2) / 2, cy + (cellH - 2) / 2 + 5, { align: "center" });
        } else {
          doc.setFontSize(5);
          doc.text("—", cx + (cellW - 2) / 2, cy + (cellH - 2) / 2 + 1, { align: "center" });
        }
      }
    }
  };

  const drawPdfLineout = (doc: jsPDF, x: number, y: number, w: number, h: number, stats: Record<string, { attempts: number; successes: number }>) => {
    doc.setFillColor(21, 128, 61);
    doc.roundedRect(x, y, w, h, 3, 3, "F");
    // Touch line
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1);
    doc.line(x + 5, y + 10, x + 5, y + h - 5);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5);
    doc.text("Lanceur", x + 5, y + 7, { align: "center" });
    const positions = [
      { key: "devant", label: "Devant (2-4m)", yPct: 0.2 },
      { key: "milieu", label: "Milieu (6-8m)", yPct: 0.5 },
      { key: "fond", label: "Fond (12-15m)", yPct: 0.8 },
    ];
    const barW = w - 30;
    positions.forEach(pos => {
      const py = y + pos.yPct * h;
      const stat = stats[pos.key] || { attempts: 0, successes: 0 };
      const rate = stat.attempts > 0 ? Math.round((stat.successes / stat.attempts) * 100) : -1;
      if (rate < 0) doc.setFillColor(255, 255, 255, 40);
      else if (rate >= 75) doc.setFillColor(34, 197, 94);
      else if (rate >= 50) doc.setFillColor(245, 158, 11);
      else doc.setFillColor(239, 68, 68);
      doc.roundedRect(x + 15, py - 6, barW, 12, 2, 2, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.roundedRect(x + 15, py - 6, barW, 12, 2, 2, "S");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(pos.label, x + 20, py + 1);
      if (stat.attempts > 0) {
        doc.setFontSize(10);
        doc.text(`${rate}%`, x + 15 + barW - 5, py - 0.5, { align: "right" });
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(`${stat.successes}/${stat.attempts}`, x + 15 + barW - 5, py + 4, { align: "right" });
      } else {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("—", x + 15 + barW - 5, py + 1, { align: "right" });
      }
    });
    // Arrow
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    const arrowY = y + h - 3;
    doc.line(x + 10, arrowY, x + w - 5, arrowY);
    doc.setFontSize(4);
    doc.text("← Lanceur", x + 12, arrowY - 1);
    doc.text("Fond →", x + w - 10, arrowY - 1, { align: "right" });
  };

  // Export PDF
  const handleExportPdf = async (singlePlayerId?: string, mode: "exercise" | "session" | "both" = "both") => {
    const exportData = singlePlayerId ? filtered.filter((r: any) => r.player_id === singlePlayerId) : filtered;
    const singlePlayerName = singlePlayerId ? players.find(pl => pl.id === singlePlayerId)?.name : undefined;
    const exportTotalAttempts = exportData.reduce((s: number, r: any) => s + (r.attempts || 0), 0);
    const exportTotalSuccesses = exportData.reduce((s: number, r: any) => s + (r.successes || 0), 0);
    const exportGlobalRate = exportTotalAttempts > 0 ? Math.round((exportTotalSuccesses / exportTotalAttempts) * 100) : 0;
    try {
      const { settings, logoBase64, clubName, categoryName, seasonName } = await preparePdfWithSettings(categoryId);
      const doc = new jsPDF({ orientation: "landscape" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

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
      doc.text(`Stats entraînement - Précision${singlePlayerName ? ` — ${singlePlayerName}` : ""}`, 14, 12);
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
      doc.text(`Enregistrements: ${exportData.length}  |  Tentatives: ${exportTotalAttempts}  |  Réussites: ${exportTotalSuccesses}  |  Taux: ${exportGlobalRate}%`, 14, y);
      y += 12;

      // ===== TERRAIN VISUALS =====
      if (hasZoneData) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Cartographie terrain", 14, y);
        y += 6;

        const fieldW = 120;
        const fieldH = 70;
        let fieldX = 14;

        // Draw kick field if there are kick entries
        if (kickFieldEntries.length > 0) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text("Coups de pied / Passes", fieldX + fieldW / 2, y, { align: "center" });
          drawPdfField(doc, fieldX, y + 2, fieldW, fieldH, kickFieldEntries);
          // Stats below field
          const kickTotal = kickFieldEntries.reduce((s, z) => s + z.attempts, 0);
          const kickSuccess = kickFieldEntries.reduce((s, z) => s + z.successes, 0);
          const kickRate = kickTotal > 0 ? Math.round((kickSuccess / kickTotal) * 100) : 0;
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(30, 41, 59);
          doc.text(`${kickSuccess}/${kickTotal} — ${kickRate}%`, fieldX + fieldW / 2, y + fieldH + 7, { align: "center" });
          fieldX += fieldW + 10;
        }

        // Draw zone grid if there are zone entries
        const hasZoneGrid = Object.values(zoneGridEntries).some(v => v.attempts > 0);
        if (hasZoneGrid) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text("Jeu de zone", fieldX + fieldW / 2, y, { align: "center" });
          drawPdfZoneGrid(doc, fieldX, y + 2, fieldW, fieldH, zoneGridEntries);
          const zgTotal = Object.values(zoneGridEntries).reduce((s, v) => s + v.attempts, 0);
          const zgSuccess = Object.values(zoneGridEntries).reduce((s, v) => s + v.successes, 0);
          const zgRate = zgTotal > 0 ? Math.round((zgSuccess / zgTotal) * 100) : 0;
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(30, 41, 59);
          doc.text(`${zgSuccess}/${zgTotal} — ${zgRate}%`, fieldX + fieldW / 2, y + fieldH + 7, { align: "center" });
          fieldX += fieldW + 10;
        }

        // Draw lineout if there are lineout entries
        const hasLineout = Object.values(lineoutEntries).some(v => v.attempts > 0);
        if (hasLineout) {
          const lineoutW = 80;
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text("Touches", fieldX + lineoutW / 2, y, { align: "center" });
          drawPdfLineout(doc, fieldX, y + 2, lineoutW, fieldH, lineoutEntries);
          const ltTotal = Object.values(lineoutEntries).reduce((s, v) => s + v.attempts, 0);
          const ltSuccess = Object.values(lineoutEntries).reduce((s, v) => s + v.successes, 0);
          const ltRate = ltTotal > 0 ? Math.round((ltSuccess / ltTotal) * 100) : 0;
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(30, 41, 59);
          doc.text(`${ltSuccess}/${ltTotal} — ${ltRate}%`, fieldX + lineoutW / 2, y + fieldH + 7, { align: "center" });
        }

        y += fieldH + 16;
      }

      // By exercise table
      if (mode === "exercise" || mode === "both") {
        if (y > pageH - 50) { doc.addPage(); y = 15; }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
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
          if (y > pageH - 20) { doc.addPage(); y = 15; }
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
        if (!singlePlayerId) {
          y += 8;
          if (y > pageH - 40) { doc.addPage(); y = 15; }
          doc.setTextColor(30, 41, 59);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text("Par athlète", 14, y);
          y += 6;
          doc.setFillColor(241, 245, 249);
          doc.rect(14, y, pageW - 28, 7, "F");
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          const cols2 = [14, 120, 155, 190, 225];
          const headers2 = ["Athlète", "Tentatives", "Réussites", "Taux", "Évolution"];
          headers2.forEach((h, i) => doc.text(h, cols2[i], y + 5));
          y += 9;
          doc.setFont("helvetica", "normal");

          byPlayer.forEach((p) => {
            if (y > pageH - 20) { doc.addPage(); y = 15; }
            doc.setTextColor(30, 41, 59);
            doc.text(p.name, cols2[0], y + 4);
            doc.text(String(p.attempts), cols2[1], y + 4);
            doc.text(String(p.successes), cols2[2], y + 4);
            doc.text(`${p.rate}%`, cols2[3], y + 4);
            if (p.progression > 0) doc.setTextColor(22, 163, 74);
            else if (p.progression < 0) doc.setTextColor(220, 38, 38);
            else doc.setTextColor(100, 116, 139);
            doc.text(p.progression > 0 ? `+${p.progression}%` : `${p.progression}%`, cols2[4], y + 4);
            y += 7;
          });
        }
      }

      // By training session table
      if (mode === "session" || mode === "both") {
        const sessions = groupBySession(exportData);
        if (y > pageH - 50) { doc.addPage(); y = 15; }
        y += 8;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Par entraînement", 14, y);
        y += 6;

        const sCols = [14, 50, 160, 195, 230];
        const sHeaders = ["Date", "Exercice", "Tentatives", "Réussites", "Taux"];
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, pageW - 28, 7, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        sHeaders.forEach((h, i) => doc.text(h, sCols[i], y + 5));
        y += 9;
        doc.setFont("helvetica", "normal");

        sessions.forEach((s) => {
          const dateStr = format(new Date(s.date), "dd/MM/yyyy");
          let firstRow = true;
          s.exercises.forEach((v, exLabel) => {
            if (y > pageH - 20) { doc.addPage(); y = 15; }
            doc.setTextColor(30, 41, 59);
            doc.text(firstRow ? dateStr : "", sCols[0], y + 4);
            doc.text(exLabel, sCols[1], y + 4);
            doc.text(String(v.attempts), sCols[2], y + 4);
            doc.text(String(v.successes), sCols[3], y + 4);
            const rate = v.attempts > 0 ? Math.round((v.successes / v.attempts) * 100) : 0;
            doc.text(`${rate}%`, sCols[4], y + 4);
            y += 7;
            firstRow = false;
          });
          // Session total
          const totalA = Array.from(s.exercises.values()).reduce((sum, v) => sum + v.attempts, 0);
          const totalS = Array.from(s.exercises.values()).reduce((sum, v) => sum + v.successes, 0);
          const totalRate = totalA > 0 ? Math.round((totalS / totalA) * 100) : 0;
          if (y > pageH - 20) { doc.addPage(); y = 15; }
          doc.setFillColor(241, 245, 249);
          doc.rect(14, y, pageW - 28, 7, "F");
          doc.setFont("helvetica", "bold");
          doc.text("", sCols[0], y + 5);
          doc.text("TOTAL SÉANCE", sCols[1], y + 5);
          doc.text(String(totalA), sCols[2], y + 5);
          doc.text(String(totalS), sCols[3], y + 5);
          doc.text(`${totalRate}%`, sCols[4], y + 5);
          doc.setFont("helvetica", "normal");
          y += 9;
        });
      }

      const modeLabel = mode === "exercise" ? "-exercices" : mode === "session" ? "-seances" : "";
      const fileSuffix = singlePlayerName ? `-${singlePlayerName.replace(/\s+/g, '-')}` : "";
      doc.save(`stats-entrainement${modeLabel}${fileSuffix}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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

            <div className="flex gap-2 items-center">
              <Select value={exportPlayerId} onValueChange={setExportPlayerId}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Exporter un athlète" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous les athlètes</SelectItem>
                  {players.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <FileSpreadsheet className="h-4 w-4" /><span className="hidden sm:inline">Excel</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs">Exporter en Excel</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExportExcel(exportPlayerId && exportPlayerId !== "__all__" ? exportPlayerId : undefined, "both")}>
                    📊 Par exercice + entraînement
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportExcel(exportPlayerId && exportPlayerId !== "__all__" ? exportPlayerId : undefined, "exercise")}>
                    🎯 Par exercice uniquement
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportExcel(exportPlayerId && exportPlayerId !== "__all__" ? exportPlayerId : undefined, "session")}>
                    📅 Par entraînement uniquement
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Download className="h-4 w-4" /><span className="hidden sm:inline">PDF</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs">Exporter en PDF</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExportPdf(exportPlayerId && exportPlayerId !== "__all__" ? exportPlayerId : undefined, "both")}>
                    📊 Par exercice + entraînement
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportPdf(exportPlayerId && exportPlayerId !== "__all__" ? exportPlayerId : undefined, "exercise")}>
                    🎯 Par exercice uniquement
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportPdf(exportPlayerId && exportPlayerId !== "__all__" ? exportPlayerId : undefined, "session")}>
                    📅 Par entraînement uniquement
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

      {/* Buteur kick mapping visual */}
      {kickFieldEntries.length > 0 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              🎯 Cartographie Buteur (Entraînement)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-3xl mx-auto">
              <RugbyFieldSVG goalsOnRight showCursorTracker={false}>
                {kickFieldEntries.map((zone, i) => {
                  const cx = 20 + (zone.x / 100) * 560;
                  const cy = 10 + (zone.y / 100) * 380;
                  const rate = zone.attempts > 0 ? Math.round((zone.successes / zone.attempts) * 100) : 0;
                  const color = rate >= 75 ? "#22c55e" : rate >= 50 ? "#f59e0b" : "#ef4444";
                  return (
                    <g key={i}>
                      <circle cx={cx} cy={cy} r={16} fill={color} opacity={0.7} stroke="white" strokeWidth="2" />
                      <text x={cx} y={cy - 2} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">{rate}%</text>
                      <text x={cx} y={cy + 9} textAnchor="middle" fill="white" fontSize="6" opacity={0.9}>{zone.successes}/{zone.attempts}</text>
                    </g>
                  );
                })}
              </RugbyFieldSVG>
              <div className="flex flex-wrap gap-3 mt-2 justify-center text-xs">
                {BUTEUR_EXERCISES.map(b => (
                  <span key={b.value} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: b.color }} />
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {lineoutZoneStats.length > 0 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              📏 Cartographie Touche (Lanceur)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-2xl mx-auto">
              <LineoutFieldSVG
                zoneStats={lineoutZoneStats}
                disabled
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
