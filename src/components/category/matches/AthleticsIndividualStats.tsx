import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Activity, Trophy, Timer, Target, TrendingUp, TrendingDown, Minus, Wind, Thermometer, Download, FileSpreadsheet } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { getDefaultUnitForDiscipline } from "@/lib/athletics/recordsHelpers";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface AthleticsIndividualStatsProps {
  categoryId: string;
  matchIds: string[];
}

interface MatchInfo {
  id: string;
  match_date: string;
  opponent: string;
  competition?: string | null;
  location?: string | null;
}

interface RoundRow {
  id: string;
  match_id: string;
  player_id: string;
  final_time_seconds: number | null;
  ranking: number | null;
  is_personal_record: boolean | null;
  phase?: string | null;
  wind_conditions?: string | null;
  wind_direction?: string | null;
  temperature_celsius?: number | null;
  competition_round_stats?: Array<{ stat_data: Record<string, any> | null }>;
}

interface LineupRow {
  player_id: string;
  match_id: string;
  discipline: string | null;
  specialty: string | null;
}

interface PlayerRow {
  id: string;
  name: string;
  first_name: string | null;
  discipline: string | null;
  specialty: string | null;
}

export interface PerfPoint {
  roundId: string;
  matchId: string;
  matchLabel: string;
  matchDate: string;
  competition: string;
  ranking: number | null;
  result: number | null;
  unit: string;
  lowerIsBetter: boolean;
  isPersonalRecord: boolean;
  phase?: string | null;
  windSpeed: number | null;
  windDirection: string | null;
  temperature: number | null;
}


export const PRETTY_LABELS: Record<string, string> = {
  ath_sprint: "Sprint",
  ath_haies: "Haies",
  ath_endurance: "Demi-fond / Fond",
  ath_sauts: "Sauts",
  ath_perche: "Perche",
  ath_lancers: "Lancers",
  ath_combines: "Épreuves combinées",
  ath_trail: "Trail",
};

/** Format a result according to its unit (sec → mm:ss.cc when ≥60, m / cm). */
export function formatResult(value: number | null, unit: string): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (unit === "sec") {
    if (value >= 60) {
      const m = Math.floor(value / 60);
      const s = (value - m * 60).toFixed(2).padStart(5, "0");
      return `${m}:${s}`;
    }
    return `${value.toFixed(2)} s`;
  }
  if (unit === "m") return `${value.toFixed(2)} m`;
  if (unit === "cm") {
    // Convert to meters for readability when large
    if (value >= 100) return `${(value / 100).toFixed(2)} m`;
    return `${value.toFixed(0)} cm`;
  }
  if (unit === "pts") return `${Math.round(value)} pts`;
  return value.toFixed(2);
}

/**
 * Extract the best numeric performance from a round's stat_data,
 * given whether lower or higher is better.
 */
export function extractResult(round: { final_time_seconds: number | null; competition_round_stats?: Array<{ stat_data: Record<string, any> | null }> }, lowerIsBetter: boolean): { value: number | null; unit: string } {
  const sd = round.competition_round_stats?.[0]?.stat_data || {};
  const raw = sd as Record<string, any>;

  // Pick canonical keys first
  const candidates: Array<{ key: string; unit: string }> = [
    { key: "time", unit: "sec" },
    { key: "trailTime", unit: "sec" },
    { key: "bestMark", unit: "cm" },
    { key: "bestHeight", unit: "cm" },
    { key: "totalPoints", unit: "pts" },
  ];
  for (const c of candidates) {
    const v = Number(raw[c.key]);
    if (Number.isFinite(v) && v > 0) return { value: v, unit: c.unit };
  }

  // Fallback to final_time_seconds
  if (lowerIsBetter && round.final_time_seconds != null && round.final_time_seconds > 0) {
    return { value: round.final_time_seconds, unit: "sec" };
  }

  // Last fallback: best of any numeric value (excluding wind/lane/ranking/etc.)
  const nums: number[] = [];
  Object.entries(raw).forEach(([k, v]) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return;
    if (/^_/.test(k)) return;
    if (/wind|lane|ranking|round|date|attempt|hurdles|finishers|heart|approach|pole|implement|categoryRanking|personalBest|seasonBest/i.test(k)) return;
    nums.push(v);
  });
  if (nums.length === 0) return { value: null, unit: "" };
  const v = lowerIsBetter ? Math.min(...nums) : Math.max(...nums);
  return { value: v, unit: "" };
}

/** Hiérarchie des phases — finale > demi > série, etc. */
export function phaseRank(phase: string | null | undefined): number {
  if (!phase) return 0;
  const p = phase.toLowerCase();
  if (p.includes("final") && !p.includes("demi") && !p.includes("quart") && !p.includes("petite")) return 100;
  if (p.includes("petite")) return 90;
  if (p.includes("demi")) return 80;
  if (p.includes("quart")) return 70;
  if (p.includes("huiti") || p.includes("8e")) return 60;
  if (p.includes("repechage") || p.includes("repêch")) return 30;
  if (p.includes("série") || p.includes("serie") || p.includes("qualif")) return 20;
  return 10;
}

export function disciplineLabel(discipline: string | null | undefined): string {
  if (!discipline) return "—";
  return PRETTY_LABELS[discipline] || discipline.replace(/^athletisme_/, "");
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
];

export function AthleticsIndividualStats({ categoryId, matchIds }: AthleticsIndividualStatsProps) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [selectedDisciplineKey, setSelectedDisciplineKey] = useState<string>("");

  const { data: matches = [] } = useQuery({
    queryKey: ["athl-individual-matches", categoryId, matchIds],
    queryFn: async () => {
      if (matchIds.length === 0) return [];
      const { data } = await supabase
        .from("matches")
        .select("id, match_date, opponent, competition, location")
        .in("id", matchIds);
      return (data || []) as MatchInfo[];
    },
    enabled: matchIds.length > 0,
  });

  const { data: rounds = [] } = useQuery({
    queryKey: ["athl-individual-rounds", categoryId, matchIds],
    queryFn: async () => {
      if (matchIds.length === 0) return [];
      const { data } = await supabase
        .from("competition_rounds")
        .select("id, match_id, player_id, final_time_seconds, ranking, is_personal_record, phase, wind_conditions, wind_direction, temperature_celsius, competition_round_stats(stat_data)")
        .in("match_id", matchIds);
      return ((data || []) as unknown) as RoundRow[];
    },
    enabled: matchIds.length > 0,
  });

  const { data: lineups = [] } = useQuery({
    queryKey: ["athl-individual-lineups", categoryId, matchIds],
    queryFn: async () => {
      if (matchIds.length === 0) return [];
      const { data } = await supabase
        .from("match_lineups")
        .select("player_id, match_id, discipline, specialty")
        .in("match_id", matchIds);
      return (data || []) as LineupRow[];
    },
    enabled: matchIds.length > 0,
  });

  const allPlayerIds = useMemo(() => {
    const s = new Set<string>();
    rounds.forEach(r => s.add(r.player_id));
    lineups.forEach(l => s.add(l.player_id));
    return [...s];
  }, [rounds, lineups]);

  const { data: players = [] } = useQuery({
    queryKey: ["athl-individual-players", allPlayerIds],
    queryFn: async () => {
      if (allPlayerIds.length === 0) return [];
      const { data } = await supabase
        .from("players")
        .select("id, name, first_name, discipline, specialty")
        .in("id", allPlayerIds);
      return (data || []) as PlayerRow[];
    },
    enabled: allPlayerIds.length > 0,
  });

  const athleteDisciplines = useMemo(() => {
    const map: Record<string, Array<{ discipline: string | null; specialty: string | null }>> = {};
    const seen: Record<string, Set<string>> = {};

    const add = (pid: string, discipline: string | null, specialty: string | null) => {
      if (!pid) return;
      const key = `${discipline || ""}|${specialty || ""}`;
      if (key === "|") return;
      if (!seen[pid]) seen[pid] = new Set();
      if (seen[pid].has(key)) return;
      seen[pid].add(key);
      if (!map[pid]) map[pid] = [];
      map[pid].push({ discipline, specialty });
    };

    lineups.forEach(l => add(l.player_id, l.discipline, l.specialty));
    rounds.forEach(r => {
      const sd = r.competition_round_stats?.[0]?.stat_data || {};
      add(r.player_id, sd._discipline ?? null, sd._specialty ?? null);
    });
    players.forEach(p => {
      if (!map[p.id] || map[p.id].length === 0) {
        if (p.discipline || p.specialty) add(p.id, p.discipline, p.specialty);
      }
    });

    return map;
  }, [lineups, rounds, players]);

  useEffect(() => {
    if (!selectedAthleteId && players.length > 0) {
      const sorted = [...players].sort((a, b) => {
        const an = `${a.first_name || ""} ${a.name}`;
        const bn = `${b.first_name || ""} ${b.name}`;
        return an.localeCompare(bn);
      });
      const firstWithData = sorted.find(p => athleteDisciplines[p.id]?.length);
      setSelectedAthleteId((firstWithData || sorted[0]).id);
    }
  }, [players, athleteDisciplines, selectedAthleteId]);

  const selectedAthlete = players.find(p => p.id === selectedAthleteId);
  const athleteName = selectedAthlete
    ? [selectedAthlete.first_name, selectedAthlete.name].filter(Boolean).join(" ")
    : "";

  const disciplinePairs = useMemo(() => {
    return athleteDisciplines[selectedAthleteId] || [];
  }, [athleteDisciplines, selectedAthleteId]);

  useEffect(() => {
    if (disciplinePairs.length === 0) {
      setSelectedDisciplineKey("");
      return;
    }
    const keys = disciplinePairs.map(p => `${p.discipline || ""}|${p.specialty || ""}`);
    if (!keys.includes(selectedDisciplineKey)) {
      setSelectedDisciplineKey(keys[0]);
    }
  }, [disciplinePairs, selectedDisciplineKey]);

  const activePair = useMemo(() => {
    return disciplinePairs.find(p => `${p.discipline || ""}|${p.specialty || ""}` === selectedDisciplineKey);
  }, [disciplinePairs, selectedDisciplineKey]);

  const performancePoints = useMemo(() => {
    if (!selectedAthleteId || !activePair) return [] as PerfPoint[];
    const { lowerIsBetter, unit: defaultUnit } = getDefaultUnitForDiscipline(
      activePair.discipline || undefined,
      activePair.specialty || undefined
    );

    const matchById = new Map(matches.map(m => [m.id, m]));

    const filtered = rounds.filter(r => {
      if (r.player_id !== selectedAthleteId) return false;
      const sd = r.competition_round_stats?.[0]?.stat_data || {};
      const rDisc = sd._discipline ?? null;
      const rSpec = sd._specialty ?? null;
      if (rDisc == null && rSpec == null) return disciplinePairs.length === 1;
      return rDisc === (activePair.discipline || null) && rSpec === (activePair.specialty || null);
    });



    const points: PerfPoint[] = [];
    filtered.forEach(r => {
      const m = matchById.get(r.match_id);
      if (!m) return;
      const { value, unit } = extractResult(r, lowerIsBetter);
      const finalUnit = unit || defaultUnit;

      const windRaw = r.wind_conditions ?? null;
      const windNum = windRaw != null ? Number(String(windRaw).replace(",", ".")) : NaN;

      points.push({
        roundId: r.id,
        matchId: r.match_id,
        matchLabel: m.competition || m.opponent || r.match_id.slice(0, 6),
        matchDate: m.match_date,
        competition: m.competition || m.opponent || "—",
        ranking: r.ranking != null && r.ranking > 0 ? r.ranking : null,
        result: value,
        unit: finalUnit,
        lowerIsBetter,
        isPersonalRecord: !!r.is_personal_record,
        phase: r.phase || null,
        windSpeed: Number.isFinite(windNum) ? windNum : null,
        windDirection: r.wind_direction || null,
        temperature: r.temperature_celsius ?? null,
      });
    });

    // Logical phase order: qualifs → séries → demi → finale → autre
    const phaseOrder = (phase: string | null): number => {
      if (!phase) return 99;
      const p = phase.toLowerCase();
      if (p.includes("qualif")) return 1;
      if (p.includes("serie") || p.includes("série")) return 2;
      if (p.includes("repechage") || p.includes("repêchage")) return 3;
      if (p.includes("quart")) return 4;
      if (p.includes("demi")) return 5;
      if (p.includes("finale") || p === "final") return 6;
      return 50;
    };

    return points.sort((a, b) => {
      const d = a.matchDate.localeCompare(b.matchDate);
      if (d !== 0) return d;
      const c = a.competition.localeCompare(b.competition);
      if (c !== 0) return c;
      const ph = phaseOrder(a.phase) - phaseOrder(b.phase);
      if (ph !== 0) return ph;
      return a.roundId.localeCompare(b.roundId);
    });
  }, [selectedAthleteId, activePair, rounds, matches, disciplinePairs.length]);

  // Pour chaque compétition, on conserve uniquement le classement issu de la phase
  // la plus avancée saisie (ex : finale > demi > série). Tant que seule la série est
  // renseignée, c'est ce classement-là qui apparaît, étiqueté avec sa phase.
  const finalRankByMatch = useMemo(() => {
    const map: Record<string, { ranking: number; phase: string | null }> = {};
    performancePoints.forEach(p => {
      if (p.ranking == null) return;
      const cur = map[p.matchId];
      if (!cur || phaseRank(p.phase) > phaseRank(cur.phase)) {
        map[p.matchId] = { ranking: p.ranking, phase: p.phase ?? null };
      }
    });
    return map;
  }, [performancePoints]);

  const summary = useMemo(() => {
    if (performancePoints.length === 0) return null;
    const valid = performancePoints.filter(p => p.result != null) as Array<PerfPoint & { result: number }>;
    const lowerIsBetter = performancePoints[0].lowerIsBetter;
    const unit = performancePoints[0].unit;

    const avgResult = valid.length > 0
      ? valid.reduce((s, p) => s + p.result, 0) / valid.length
      : null;
    const bestResult = valid.length > 0
      ? (lowerIsBetter ? Math.min(...valid.map(p => p.result)) : Math.max(...valid.map(p => p.result)))
      : null;
    const lastResult = valid.length > 0 ? valid[valid.length - 1].result : null;
    const firstResult = valid.length > 0 ? valid[0].result : null;
    const evolutionPct = (firstResult != null && lastResult != null && firstResult !== 0)
      ? ((lastResult - firstResult) / firstResult) * 100
      : null;

    // Classement = uniquement la phase la plus avancée par compétition
    const finalRanks = Object.values(finalRankByMatch).map(r => r.ranking);
    const avgRank = finalRanks.length > 0
      ? finalRanks.reduce((s, r) => s + r, 0) / finalRanks.length
      : null;
    const bestRank = finalRanks.length > 0 ? Math.min(...finalRanks) : null;

    return { avgResult, bestResult, lastResult, evolutionPct, avgRank, bestRank, unit, lowerIsBetter, count: valid.length, rankCount: finalRanks.length };
  }, [performancePoints, finalRankByMatch]);

  const chartData = useMemo(() => {
    return performancePoints
      .filter(p => p.result != null)
      .map(p => {
        const weatherBits: string[] = [];
        if (p.windSpeed != null) {
          const windStr = `${p.windSpeed > 0 ? "+" : ""}${p.windSpeed.toFixed(1)} m/s${p.windDirection ? ` ${p.windDirection}` : ""}`;
          weatherBits.push(`💨 ${windStr}`);
        } else if (p.windDirection) {
          weatherBits.push(`💨 ${p.windDirection}`);
        }
        if (p.temperature != null) weatherBits.push(`🌡️ ${p.temperature}°C`);
        const dateStr = p.matchDate ? format(parseISO(p.matchDate), "dd/MM", { locale: fr }) : "";
        const xLabel = p.phase ? `${dateStr} • ${p.phase}` : dateStr;
        return {
          name: p.competition,
          date: xLabel,
          label: `${p.competition}${p.phase ? ` — ${p.phase}` : ""}${p.matchDate ? ` (${format(parseISO(p.matchDate), "dd/MM/yy", { locale: fr })})` : ""}${weatherBits.length ? `\n${weatherBits.join(" · ")}` : ""}`,
          result: p.result,
          ranking: p.ranking,
        };
      });
  }, [performancePoints]);

  // Données du graphique de classement : 1 point par compétition (phase la plus avancée).
  const rankingChartData = useMemo(() => {
    // Récupérer le 1er point performance de chaque compétition pour la date / le label.
    const byMatch: Record<string, PerfPoint> = {};
    performancePoints.forEach(p => {
      if (!byMatch[p.matchId]) byMatch[p.matchId] = p;
    });
    return Object.entries(finalRankByMatch)
      .map(([mid, info]) => {
        const ref = byMatch[mid];
        if (!ref) return null;
        const dateStr = ref.matchDate ? format(parseISO(ref.matchDate), "dd/MM", { locale: fr }) : "";
        return {
          date: dateStr,
          label: `${ref.competition}${info.phase ? ` — ${info.phase}` : ""}${ref.matchDate ? ` (${format(parseISO(ref.matchDate), "dd/MM/yy", { locale: fr })})` : ""}`,
          ranking: info.ranking,
          phase: info.phase,
          matchDate: ref.matchDate,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => a.matchDate.localeCompare(b.matchDate));
  }, [performancePoints, finalRankByMatch]);

  // Export Excel — détail des manches individuelles
  const handleExportExcel = () => {
    if (!selectedAthlete || !activePair || performancePoints.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    try {
      const wb = XLSX.utils.book_new();
      const discLabel = activePair.discipline
        ? (PRETTY_LABELS[activePair.discipline] || activePair.discipline.replace(/^athletisme_/, ""))
        : "—";

      const rows = performancePoints.map(p => ({
        "Date": p.matchDate ? format(parseISO(p.matchDate), "dd/MM/yyyy", { locale: fr }) : "",
        "Compétition": p.competition,
        "Phase / Manche": p.phase || "",
        "Discipline": discLabel,
        "Spécialité": activePair.specialty || "",
        "Classement": p.ranking != null ? p.ranking : "",
        "Résultat": formatResult(p.result, p.unit),
        "Résultat brut": p.result != null ? p.result : "",
        "Unité": p.unit,
        "Vent (m/s)": p.windSpeed != null ? p.windSpeed : "",
        "Direction vent": p.windDirection || "",
        "Température (°C)": p.temperature != null ? p.temperature : "",
        "Record perso": p.isPersonalRecord ? "Oui" : "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 11 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
        { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 8 },
        { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Performances");

      // Synthèse
      if (summary) {
        const synthRows = [
          { Indicateur: "Athlète", Valeur: athleteName },
          { Indicateur: "Discipline", Valeur: discLabel },
          { Indicateur: "Spécialité", Valeur: activePair.specialty || "—" },
          { Indicateur: "Nombre de courses / essais", Valeur: summary.count },
          { Indicateur: "Meilleure performance", Valeur: formatResult(summary.bestResult, summary.unit) },
          { Indicateur: "Performance moyenne", Valeur: formatResult(summary.avgResult, summary.unit) },
          { Indicateur: "Dernière performance", Valeur: formatResult(summary.lastResult, summary.unit) },
          { Indicateur: "Classement moyen", Valeur: summary.avgRank != null ? summary.avgRank.toFixed(1) : "—" },
          { Indicateur: "Meilleur classement", Valeur: summary.bestRank != null ? `${summary.bestRank}ᵉ` : "—" },
          { Indicateur: "Évolution (%)", Valeur: summary.evolutionPct != null ? `${summary.evolutionPct > 0 ? "+" : ""}${summary.evolutionPct.toFixed(1)} %` : "—" },
        ];
        const wsS = XLSX.utils.json_to_sheet(synthRows);
        wsS["!cols"] = [{ wch: 30 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsS, "Synthèse");
      }

      const safeName = athleteName.replace(/\s+/g, "-");
      const safeDisc = (activePair.specialty || discLabel).replace(/\s+/g, "-");
      XLSX.writeFile(wb, `stats-${safeName}-${safeDisc}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Export Excel téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  // Export PDF — détail des manches individuelles
  const handleExportPdf = () => {
    if (!selectedAthlete || !activePair || performancePoints.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      let y = margin;

      const discLabel = activePair.discipline
        ? (PRETTY_LABELS[activePair.discipline] || activePair.discipline.replace(/^athletisme_/, ""))
        : "—";

      // Palette
      const COL_PRIMARY: [number, number, number] = [15, 23, 42];      // slate-900
      const COL_ACCENT: [number, number, number] = [37, 99, 235];      // blue-600
      const COL_SUCCESS: [number, number, number] = [16, 185, 129];    // emerald-500
      const COL_DANGER: [number, number, number] = [239, 68, 68];      // red-500
      const COL_MUTED: [number, number, number] = [100, 116, 139];     // slate-500
      const COL_BORDER: [number, number, number] = [226, 232, 240];    // slate-200
      const COL_ZEBRA: [number, number, number] = [248, 250, 252];     // slate-50
      const COL_AMBER: [number, number, number] = [245, 158, 11];      // amber-500

      // Header bandeau dégradé simulé (bande sombre + accent)
      doc.setFillColor(...COL_PRIMARY);
      doc.rect(0, 0, pageWidth, 24, "F");
      doc.setFillColor(...COL_ACCENT);
      doc.rect(0, 22, pageWidth, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text(`Performances individuelles — ${athleteName}`, margin, 11);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${discLabel}${activePair.specialty ? ` • ${activePair.specialty}` : ""}`, margin, 18);
      doc.text(format(new Date(), "dd MMMM yyyy", { locale: fr }), pageWidth - margin, 18, { align: "right" });
      y = 30;
      doc.setTextColor(0, 0, 0);

      // Calcul best / worst pour mise en valeur
      const lowerIsBetter = summary?.lowerIsBetter ?? true;
      const validResults = performancePoints
        .map((p) => Number(p.result))
        .filter((v) => Number.isFinite(v));
      const bestVal = validResults.length
        ? (lowerIsBetter ? Math.min(...validResults) : Math.max(...validResults))
        : null;
      const worstVal = validResults.length
        ? (lowerIsBetter ? Math.max(...validResults) : Math.min(...validResults))
        : null;

      // KPI summary
      if (summary) {
        const kpis: Array<{ label: string; value: string; color?: [number, number, number] }> = [
          { label: "Meilleure perf", value: formatResult(summary.bestResult, summary.unit), color: COL_SUCCESS },
          { label: `Moyenne (${summary.count})`, value: formatResult(summary.avgResult, summary.unit) },
          { label: "Classement moyen", value: summary.avgRank != null ? summary.avgRank.toFixed(1) : "—" },
          { label: "Évolution", value: summary.evolutionPct != null ? `${summary.evolutionPct > 0 ? "+" : ""}${summary.evolutionPct.toFixed(1)} %` : "—",
            color: summary.evolutionPct == null ? undefined : ((lowerIsBetter ? summary.evolutionPct < 0 : summary.evolutionPct > 0) ? COL_SUCCESS : COL_DANGER) },
        ];
        const cardW = (pageWidth - margin * 2 - 9) / 4;
        kpis.forEach((k, i) => {
          const x = margin + i * (cardW + 3);
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(...COL_BORDER);
          doc.setLineWidth(0.3);
          doc.roundedRect(x, y, cardW, 20, 2, 2, "FD");
          // accent bar
          if (k.color) {
            doc.setFillColor(...k.color);
            doc.roundedRect(x, y, 1.5, 20, 0.5, 0.5, "F");
          }
          doc.setFontSize(8);
          doc.setTextColor(...COL_MUTED);
          doc.setFont("helvetica", "normal");
          doc.text(k.label, x + 4, y + 7);
          doc.setFontSize(13);
          doc.setFont("helvetica", "bold");
          if (k.color) doc.setTextColor(...k.color);
          else doc.setTextColor(...COL_PRIMARY);
          doc.text(k.value, x + 4, y + 16);
        });
        y += 26;
      }

      // ============ GRAPHIQUE ÉVOLUTION ============
      if (validResults.length >= 2) {
        const chartH = 55;
        const chartX = margin;
        const chartY = y;
        const chartW = pageWidth - 2 * margin;
        const padL = 22, padR = 8, padT = 10, padB = 14;
        const innerX = chartX + padL;
        const innerY = chartY + padT;
        const innerW = chartW - padL - padR;
        const innerH = chartH - padT - padB;

        // Card
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...COL_BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(chartX, chartY, chartW, chartH, 2, 2, "FD");
        // Title
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COL_PRIMARY);
        doc.text("Évolution du résultat", chartX + 4, chartY + 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...COL_MUTED);
        doc.text(lowerIsBetter ? "(courbe descendante = progrès)" : "(courbe ascendante = progrès)", chartX + 50, chartY + 6);

        const minV = Math.min(...validResults);
        const maxV = Math.max(...validResults);
        const range = maxV - minV;
        const pad = range > 0 ? range * 0.15 : Math.max(Math.abs(maxV) * 0.02, 0.01);
        const yMin = minV - pad;
        const yMax = maxV + pad;
        const yScale = (v: number) => {
          const t = (v - yMin) / (yMax - yMin);
          // Petite valeur = bas du graphique, grande valeur = haut.
          // Pour la vitesse (lowerIsBetter), un meilleur temps (plus petit) sera donc en bas → courbe descendante = progrès.
          return innerY + (1 - t) * innerH;
        };

        // Y axis ticks (3 ticks)
        doc.setDrawColor(...COL_BORDER);
        doc.setLineWidth(0.2);
        doc.setFontSize(6);
        doc.setTextColor(...COL_MUTED);
        for (let i = 0; i <= 3; i++) {
          const v = yMin + (yMax - yMin) * (i / 3);
          const py = yScale(v);
          doc.line(innerX, py, innerX + innerW, py);
          doc.text(formatResult(v, summary?.unit || ""), innerX - 1, py + 1.5, { align: "right" });
        }

        // Points
        const n = performancePoints.length;
        const xStep = n > 1 ? innerW / (n - 1) : 0;
        const points = performancePoints.map((p, i) => ({
          x: innerX + i * xStep,
          y: yScale(Number(p.result)),
          val: Number(p.result),
          label: p.matchDate ? format(parseISO(p.matchDate), "dd/MM", { locale: fr }) : "",
        }));

        // Ligne
        doc.setDrawColor(...COL_ACCENT);
        doc.setLineWidth(0.6);
        for (let i = 1; i < points.length; i++) {
          doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
        }

        // Dots + x labels
        points.forEach((pt) => {
          const isBest = bestVal != null && pt.val === bestVal;
          const isWorst = worstVal != null && pt.val === worstVal && bestVal !== worstVal;
          const color = isBest ? COL_SUCCESS : isWorst ? COL_DANGER : COL_ACCENT;
          doc.setFillColor(...color);
          doc.circle(pt.x, pt.y, isBest || isWorst ? 1.6 : 1.2, "F");
          doc.setFillColor(255, 255, 255);
          doc.circle(pt.x, pt.y, 0.5, "F");
          // x label
          doc.setFontSize(6);
          doc.setTextColor(...COL_MUTED);
          doc.text(pt.label, pt.x, chartY + chartH - 3, { align: "center" });
        });

        y += chartH + 5;
      }

      // Section title
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COL_PRIMARY);
      doc.text("Détail des compétitions", margin, y + 2);
      // Légende couleurs
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setFillColor(...COL_SUCCESS);
      doc.circle(pageWidth - margin - 50, y, 1.2, "F");
      doc.setTextColor(...COL_MUTED);
      doc.text("Meilleure perf.", pageWidth - margin - 47, y + 1);
      doc.setFillColor(...COL_DANGER);
      doc.circle(pageWidth - margin - 22, y, 1.2, "F");
      doc.text("Pire perf.", pageWidth - margin - 19, y + 1);
      y += 5;

      // Table header
      const headers = ["Date", "Compétition", "Phase", "Class.", "Résultat", "Vent", "Temp.", "RP"];
      const colW = [20, 75, 30, 18, 30, 25, 18, 12];
      const tableW = colW.reduce((a, b) => a + b, 0);
      const drawHeader = () => {
        doc.setFillColor(...COL_PRIMARY);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.rect(margin, y, tableW, 7, "F");
        let x = margin;
        headers.forEach((h, i) => {
          doc.text(h, x + 2, y + 5);
          x += colW[i];
        });
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
      };
      drawHeader();

      doc.setFontSize(9);
      performancePoints.forEach((p, idx) => {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = margin;
          drawHeader();
        }
        // Zebra
        if (idx % 2 === 0) {
          doc.setFillColor(...COL_ZEBRA);
          doc.rect(margin, y, tableW, 7, "F");
        }
        const val = Number(p.result);
        const isBest = bestVal != null && val === bestVal;
        const isWorst = worstVal != null && val === worstVal && bestVal !== worstVal;

        // Highlight band
        if (isBest) {
          doc.setFillColor(220, 252, 231); // emerald-100
          doc.rect(margin, y, tableW, 7, "F");
        } else if (isWorst) {
          doc.setFillColor(254, 226, 226); // red-100
          doc.rect(margin, y, tableW, 7, "F");
        }

        const cells = [
          p.matchDate ? format(parseISO(p.matchDate), "dd/MM/yy", { locale: fr }) : "—",
          p.competition.length > 38 ? p.competition.slice(0, 36) + "…" : p.competition,
          p.phase || "—",
          p.ranking != null ? `${p.ranking}` : "—",
          formatResult(val, p.unit),
          p.windSpeed != null ? `${p.windSpeed > 0 ? "+" : ""}${p.windSpeed.toFixed(1)} m/s` : (p.windDirection || "—"),
          p.temperature != null ? `${p.temperature}°C` : "—",
          p.isPersonalRecord ? "RP" : "",
        ];
        let x = margin;
        cells.forEach((c, i) => {
          // Colonne Résultat (index 4) : couleur best/worst en gras
          if (i === 4 && (isBest || isWorst)) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...(isBest ? COL_SUCCESS : COL_DANGER));
          } else if (i === 7 && p.isPersonalRecord) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COL_AMBER);
          } else {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...COL_PRIMARY);
          }
          doc.text(String(c), x + 2, y + 4.5);
          x += colW[i];
        });
        y += 7;
      });

      // Footer pagination
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setTextColor(...COL_MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(`Page ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: "right" });
        doc.text("CocoriCoach Club — Athlétisme", margin, pageHeight - 5);
      }

      const safeName = athleteName.replace(/\s+/g, "-");
      const safeDisc = (activePair.specialty || discLabel).replace(/\s+/g, "-");
      doc.save(`stats-${safeName}-${safeDisc}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Export PDF téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  const sortedAthletes = useMemo(() => {
    return [...players]
      .filter(p => athleteDisciplines[p.id]?.length)
      .sort((a, b) => {
        const an = `${a.first_name || ""} ${a.name}`;
        const bn = `${b.first_name || ""} ${b.name}`;
        return an.localeCompare(bn);
      });
  }, [players, athleteDisciplines]);

  if (matchIds.length === 0) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Sélectionnez au moins une compétition pour analyser les performances individuelles.
        </CardContent>
      </Card>
    );
  }

  if (sortedAthletes.length === 0) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Aucun athlète aligné avec des résultats sur les compétitions sélectionnées.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Athlète</label>
              <Select value={selectedAthleteId} onValueChange={(v) => { setSelectedAthleteId(v); setSelectedDisciplineKey(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un athlète" />
                </SelectTrigger>
                <SelectContent>
                  {sortedAthletes.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {[p.first_name, p.name].filter(Boolean).join(" ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Discipline / Spécialité</label>
              <Select
                value={selectedDisciplineKey}
                onValueChange={setSelectedDisciplineKey}
                disabled={disciplinePairs.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une discipline" />
                </SelectTrigger>
                <SelectContent>
                  {disciplinePairs.map((pair, i) => {
                    const k = `${pair.discipline || ""}|${pair.specialty || ""}`;
                    const discLabel = pair.discipline
                      ? (PRETTY_LABELS[pair.discipline] || pair.discipline.replace(/^athletisme_/, ""))
                      : "—";
                    return (
                      <SelectItem key={k + i} value={k}>
                        {pair.specialty ? `${pair.specialty} (${discLabel})` : discLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedAthlete && activePair && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="default" className="gap-1">
                <Activity className="h-3 w-3" />
                {athleteName}
              </Badge>
              {activePair.discipline && (
                <Badge variant="outline">
                  {PRETTY_LABELS[activePair.discipline] || activePair.discipline.replace(/^athletisme_/, "")}
                </Badge>
              )}
              {activePair.specialty && (
                <Badge variant="secondary">{activePair.specialty}</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {performancePoints.length} course{performancePoints.length > 1 ? "s" : ""} / essai{performancePoints.length > 1 ? "s" : ""}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleExportExcel}
                  disabled={performancePoints.length === 0}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Excel</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleExportPdf}
                  disabled={performancePoints.length === 0}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {performancePoints.length === 0 ? (
        <Card className="bg-gradient-card">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucune performance saisie pour cet athlète sur cette discipline.
          </CardContent>
        </Card>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                icon={<Trophy className="h-4 w-4" />}
                label="Meilleure perf"
                value={formatResult(summary.bestResult, summary.unit)}
                accent="text-amber-600 dark:text-amber-400"
              />
              <KpiCard
                icon={<Timer className="h-4 w-4" />}
                label={`Moyenne (${summary.count} compét.)`}
                value={formatResult(summary.avgResult, summary.unit)}
              />
              <KpiCard
                icon={<Target className="h-4 w-4" />}
                label="Classement moyen"
                value={summary.avgRank != null ? summary.avgRank.toFixed(1) : "—"}
                hint={
                  summary.bestRank != null
                    ? `Meilleur : ${summary.bestRank}ᵉ • ${summary.rankCount ?? 0} compét.`
                    : "Phase la plus avancée saisie"
                }
              />
              <KpiCard
                icon={summary.evolutionPct == null ? <Minus className="h-4 w-4" /> : (summary.lowerIsBetter ? (summary.evolutionPct < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />) : (summary.evolutionPct > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />))}
                label="Évolution"
                value={summary.evolutionPct == null ? "—" : `${summary.evolutionPct > 0 ? "+" : ""}${summary.evolutionPct.toFixed(1)} %`}
                accent={
                  summary.evolutionPct == null ? "" :
                  ((summary.lowerIsBetter ? summary.evolutionPct < 0 : summary.evolutionPct > 0)
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400")
                }
                hint={summary.lowerIsBetter ? "Baisse = progrès" : "Hausse = progrès"}
              />
            </div>
          )}

          <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="results">Résultats</TabsTrigger>
              <TabsTrigger value="evolution" disabled={chartData.length < 2}>Évolution</TabsTrigger>
              <TabsTrigger value="ranking" disabled={rankingChartData.length === 0}>Classements</TabsTrigger>
            </TabsList>

            <TabsContent value="results">
              <Card className="bg-gradient-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Performances par compétition</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Compétition</TableHead>
                          <TableHead>Phase / Manche</TableHead>
                          <TableHead className="text-center" title="Classement de la manche/phase indiquée">Classement (par phase)</TableHead>
                          <TableHead className="text-right">Résultat</TableHead>
                          <TableHead className="text-center">
                            <span className="inline-flex items-center gap-1"><Wind className="h-3.5 w-3.5" />Vent</span>
                          </TableHead>
                          <TableHead className="text-center">
                            <span className="inline-flex items-center gap-1"><Thermometer className="h-3.5 w-3.5" />Temp.</span>
                          </TableHead>
                          <TableHead className="text-center">RP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          // Build group index per competition+date so each group gets an alternating pale colour band
                          const groupColors = [
                            "bg-blue-50/60 dark:bg-blue-950/20",
                            "bg-amber-50/60 dark:bg-amber-950/20",
                            "bg-emerald-50/60 dark:bg-emerald-950/20",
                            "bg-purple-50/60 dark:bg-purple-950/20",
                            "bg-rose-50/60 dark:bg-rose-950/20",
                            "bg-cyan-50/60 dark:bg-cyan-950/20",
                          ];
                          const groupIndexByKey = new Map<string, number>();
                          performancePoints.forEach((p) => {
                            const key = `${p.matchDate}__${p.competition}`;
                            if (!groupIndexByKey.has(key)) {
                              groupIndexByKey.set(key, groupIndexByKey.size);
                            }
                          });

                          return performancePoints.map((p, idx) => {
                            const isTimedDisc = p.unit === "sec";
                            const windAided = isTimedDisc && p.windSpeed != null && p.windSpeed > 2;
                            const headWind = isTimedDisc && p.windSpeed != null && p.windSpeed < -1;
                            const groupKey = `${p.matchDate}__${p.competition}`;
                            const groupIdx = groupIndexByKey.get(groupKey) ?? 0;
                            const bandClass = groupColors[groupIdx % groupColors.length];
                            const prev = performancePoints[idx - 1];
                            const isFirstOfGroup =
                              !prev || `${prev.matchDate}__${prev.competition}` !== groupKey;
                            return (
                              <TableRow
                                key={p.roundId}
                                className={`${bandClass} ${isFirstOfGroup ? "border-t-2 border-t-border" : ""}`}
                              >
                                <TableCell className="text-xs text-muted-foreground">
                                  {p.matchDate ? format(parseISO(p.matchDate), "dd/MM/yy", { locale: fr }) : "—"}
                                </TableCell>
                                <TableCell className="font-medium">{p.competition}</TableCell>
                                <TableCell className="text-xs">
                                  {p.phase ? <Badge variant="outline" className="font-normal">{p.phase}</Badge> : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="text-center">
                                  {p.ranking != null ? (
                                    <Badge variant={p.ranking <= 3 ? "default" : "outline"} className="font-mono">
                                      {p.ranking}ᵉ
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatResult(p.result, p.unit)}
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs">
                                  {p.windSpeed != null ? (
                                    <span
                                      className={
                                        windAided
                                          ? "text-amber-600 dark:text-amber-400 font-semibold"
                                          : headWind
                                            ? "text-blue-600 dark:text-blue-400 font-semibold"
                                            : ""
                                      }
                                      title={
                                        windAided
                                          ? "Vent favorable > +2 m/s (perf. non homologable comme RP officiel)"
                                          : headWind
                                            ? "Vent contraire — perf. dégradée"
                                            : undefined
                                      }
                                    >
                                      {p.windSpeed > 0 ? "+" : ""}{p.windSpeed.toFixed(1)} m/s
                                      {p.windDirection && (
                                        <span className="ml-1 text-muted-foreground">({p.windDirection})</span>
                                      )}
                                    </span>
                                  ) : p.windDirection ? (
                                    <span className="text-muted-foreground">{p.windDirection}</span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs">
                                  {p.temperature != null ? `${p.temperature}°C` : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="text-center">
                                  {p.isPersonalRecord && (
                                    <Badge variant="default" className="bg-amber-500 hover:bg-amber-500 text-white">RP</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evolution">
              <Card className="bg-gradient-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Évolution du résultat — {athleteName}
                    {summary?.lowerIsBetter && (
                      <span className="text-xs text-muted-foreground ml-2">(courbe descendante = progrès)</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   {(() => {
                     const values = chartData.map((d: any) => Number(d.result)).filter((v) => Number.isFinite(v));
                     const minV = values.length ? Math.min(...values) : 0;
                     const maxV = values.length ? Math.max(...values) : 1;
                     const range = maxV - minV;
                     // Marge: 10% de l'amplitude, ou 2% de la valeur si toutes identiques
                     const pad = range > 0 ? range * 0.15 : Math.max(Math.abs(maxV) * 0.02, 0.01);
                     const yMin = Math.max(0, minV - pad);
                     const yMax = maxV + pad;
                     return (
                   <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis
                          reversed={summary?.lowerIsBetter}
                          tick={{ fontSize: 10 }}
                          domain={[yMin, yMax]}
                          allowDecimals
                          tickCount={6}
                          tickFormatter={(v) => formatResult(Number(v), summary?.unit || "")}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          formatter={(v: number) => [formatResult(v, summary?.unit || ""), "Résultat"]}
                          labelFormatter={(_, payload: any) => payload?.[0]?.payload?.label || ""}
                        />
                        {summary?.avgResult != null && (
                          <ReferenceLine
                            y={summary.avgResult}
                            stroke="hsl(var(--muted-foreground))"
                            strokeDasharray="4 4"
                            label={{ value: "Moyenne", fill: "hsl(var(--muted-foreground))", fontSize: 10, position: "right" }}
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey="result"
                          stroke={COLORS[0]}
                          strokeWidth={2}
                          dot={{ r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ranking">
              <Card className="bg-gradient-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Classement par compétition
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                      Phase la plus avancée saisie pour chaque compétition (finale prioritaire sur série)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const ranks = rankingChartData.map((d: any) => Number(d.ranking)).filter((v) => Number.isFinite(v));
                    const maxRank = ranks.length ? Math.max(...ranks) : 1;
                    // Domaine: 1 (haut) à maxRank+1 (bas) pour laisser respirer
                    const yMax = Math.max(maxRank + 1, 3);
                    return (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={rankingChartData} margin={{ left: 10, right: 20, top: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis
                          reversed
                          domain={[1, yMax]}
                          tick={{ fontSize: 10 }}
                          allowDecimals={false}
                          tickFormatter={(v) => `${v}ᵉ`}
                          width={40}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          formatter={(v: number) => [`${v}ᵉ`, "Classement"]}
                          labelFormatter={(_, payload: any) => payload?.[0]?.payload?.label || ""}
                        />
                        {summary?.avgRank != null && (
                          <ReferenceLine
                            y={summary.avgRank}
                            stroke="hsl(var(--muted-foreground))"
                            strokeDasharray="4 4"
                            label={{ value: `Moy. ${summary.avgRank.toFixed(1)}`, fill: "hsl(var(--muted-foreground))", fontSize: 10, position: "right" }}
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey="ranking"
                          stroke={COLORS[2]}
                          strokeWidth={2}
                          dot={{ r: 6, fill: COLORS[2], stroke: "hsl(var(--background))", strokeWidth: 2 }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, hint, accent }: { icon: React.ReactNode; label: string; value: string; hint?: string; accent?: string }) {
  return (
    <Card className="bg-gradient-card">
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className={`text-xl font-bold font-mono ${accent || ""}`}>{value}</div>
        {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}
