import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Users, Wind, Thermometer, Download, FileSpreadsheet } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { getDefaultUnitForDiscipline } from "@/lib/athletics/recordsHelpers";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { formatResult, extractResult, phaseRank, disciplineLabel } from "./AthleticsIndividualStats";

interface Props {
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
  gender?: string | null;
}

interface AthleteResultRow {
  playerId: string;
  playerName: string;
  matchId: string;
  matchLabel: string;
  matchDate: string;
  bestResult: number | null;
  bestPhase: string | null;
  finalRank: number | null;
  finalPhase: string | null;
  windSpeed: number | null;
  windDirection: string | null;
  temperature: number | null;
  isPR: boolean;
  raceCount: number;
}

export function AthleticsEventView({ categoryId, matchIds }: Props) {
  const [selectedDiscKey, setSelectedDiscKey] = useState<string>("");
  const [genderFilter, setGenderFilter] = useState<"all" | "M" | "F">("all");

  const { data: matches = [] } = useQuery({
    queryKey: ["athl-event-matches", matchIds],
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
    queryKey: ["athl-event-rounds", matchIds],
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
    queryKey: ["athl-event-lineups", matchIds],
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
    queryKey: ["athl-event-players", allPlayerIds],
    queryFn: async () => {
      if (allPlayerIds.length === 0) return [];
      const [playersRes, pcRes] = await Promise.all([
        supabase.from("players").select("id, name, first_name").in("id", allPlayerIds),
        supabase
          .from("player_categories")
          .select("player_id, categories(gender)")
          .in("player_id", allPlayerIds),
      ]);
      const genderByPlayer = new Map<string, string | null>();
      ((pcRes.data || []) as any[]).forEach((row) => {
        const g = row?.categories?.gender ?? null;
        if (g && !genderByPlayer.has(row.player_id)) {
          genderByPlayer.set(row.player_id, g);
        }
      });
      return ((playersRes.data || []) as any[]).map((p) => ({
        ...p,
        gender: genderByPlayer.get(p.id) ?? null,
      })) as PlayerRow[];
    },
    enabled: allPlayerIds.length > 0,
  });

  // Liste de toutes les épreuves disponibles (discipline + spécialité)
  const availableEvents = useMemo(() => {
    const set = new Map<string, { discipline: string | null; specialty: string | null; count: number }>();
    const add = (d: string | null, s: string | null) => {
      const key = `${d || ""}|${s || ""}`;
      if (key === "|") return;
      const cur = set.get(key);
      if (cur) cur.count += 1;
      else set.set(key, { discipline: d, specialty: s, count: 1 });
    };
    lineups.forEach(l => add(l.discipline, l.specialty));
    rounds.forEach(r => {
      const sd = r.competition_round_stats?.[0]?.stat_data || {};
      add(sd._discipline ?? null, sd._specialty ?? null);
    });
    return [...set.entries()].map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => {
        const al = `${disciplineLabel(a.discipline)} ${a.specialty || ""}`;
        const bl = `${disciplineLabel(b.discipline)} ${b.specialty || ""}`;
        return al.localeCompare(bl);
      });
  }, [lineups, rounds]);

  useEffect(() => {
    if (!selectedDiscKey && availableEvents.length > 0) {
      setSelectedDiscKey(availableEvents[0].key);
    }
    if (selectedDiscKey && !availableEvents.find(e => e.key === selectedDiscKey)) {
      setSelectedDiscKey(availableEvents[0]?.key || "");
    }
  }, [availableEvents, selectedDiscKey]);

  const activeEvent = availableEvents.find(e => e.key === selectedDiscKey);

  // Construit la liste : 1 ligne par (athlète × compétition) qui correspond à l'épreuve sélectionnée
  const rows = useMemo<AthleteResultRow[]>(() => {
    if (!activeEvent) return [];
    const { lowerIsBetter, unit: defaultUnit } = getDefaultUnitForDiscipline(
      activeEvent.discipline || undefined,
      activeEvent.specialty || undefined
    );
    void defaultUnit;
    const matchById = new Map(matches.map(m => [m.id, m]));
    const playerById = new Map(players.map(p => [p.id, p]));

    // Genre filter — gender vient de categories.gender (masculine/male/feminine/female/mixed)
    const isMale = (g: string) => ["M", "MALE", "MASCULINE", "HOMME", "HOMMES", "MIXED", "MIXTE"].includes(g);
    const isFemale = (g: string) => ["F", "FEMALE", "FEMININE", "FEMME", "FEMMES", "MIXED", "MIXTE"].includes(g);
    const allowed = new Set<string>();
    players.forEach(p => {
      if (genderFilter === "all") { allowed.add(p.id); return; }
      const g = (p.gender || "").toUpperCase();
      // Si pas de genre connu → on inclut quand même (pour ne pas masquer les athlètes)
      if (!g) { allowed.add(p.id); return; }
      if (genderFilter === "M" && isMale(g)) allowed.add(p.id);
      if (genderFilter === "F" && isFemale(g)) allowed.add(p.id);
    });

    // Athletes alignés (lineups) sur cette épreuve, par compétition
    const lineupKey = (l: LineupRow) => `${l.player_id}|${l.match_id}`;
    const lineupSet = new Set<string>();
    lineups.forEach(l => {
      if (l.discipline === (activeEvent.discipline || null) && l.specialty === (activeEvent.specialty || null)) {
        lineupSet.add(lineupKey(l));
      }
    });

    // Filtrage des manches
    const matchingRounds = rounds.filter(r => {
      const sd = r.competition_round_stats?.[0]?.stat_data || {};
      const rDisc = sd._discipline ?? null;
      const rSpec = sd._specialty ?? null;
      if (rDisc == null && rSpec == null) {
        // Inclus si c'est aussi le seul aligné de cet athlète sur ce match
        return lineupSet.has(`${r.player_id}|${r.match_id}`);
      }
      return rDisc === (activeEvent.discipline || null) && rSpec === (activeEvent.specialty || null);
    });

    // Group rounds par (player, match)
    const byPair: Record<string, RoundRow[]> = {};
    matchingRounds.forEach(r => {
      if (!allowed.has(r.player_id)) return;
      const k = `${r.player_id}|${r.match_id}`;
      if (!byPair[k]) byPair[k] = [];
      byPair[k].push(r);
    });

    // Inclus aussi les athlètes alignés sans aucune manche (pour visibilité)
    lineupSet.forEach(k => {
      if (!byPair[k]) {
        const [pid] = k.split("|");
        if (allowed.has(pid)) byPair[k] = [];
      }
    });

    const results: AthleteResultRow[] = [];
    Object.entries(byPair).forEach(([k, rs]) => {
      const [pid, mid] = k.split("|");
      const p = playerById.get(pid);
      const m = matchById.get(mid);
      if (!p || !m) return;
      const playerName = [p.first_name, p.name].filter(Boolean).join(" ");

      let bestVal: number | null = null;
      let bestPhase: string | null = null;
      let bestRoundIdx = -1;
      let finalRank: number | null = null;
      let finalPhase: string | null = null;
      let isPR = false;
      rs.forEach((r, idx) => {
        const { value } = extractResult(r, lowerIsBetter);
        if (value != null) {
          if (bestVal == null || (lowerIsBetter ? value < bestVal : value > bestVal)) {
            bestVal = value;
            bestPhase = r.phase || null;
            bestRoundIdx = idx;
          }
        }
        if (r.ranking != null && r.ranking > 0) {
          if (finalRank == null || phaseRank(r.phase) > phaseRank(finalPhase)) {
            finalRank = r.ranking;
            finalPhase = r.phase || null;
          }
        }
        if (r.is_personal_record) isPR = true;
      });

      const weatherSource = bestRoundIdx >= 0
        ? rs[bestRoundIdx]
        : rs.find(r => r.wind_conditions || r.wind_direction || r.temperature_celsius != null);
      const windRaw = weatherSource?.wind_conditions ?? null;
      const windNum = windRaw != null ? Number(String(windRaw).replace(",", ".")) : NaN;

      results.push({
        playerId: pid,
        playerName,
        matchId: mid,
        matchLabel: m.competition || m.opponent || mid.slice(0, 6),
        matchDate: m.match_date,
        bestResult: bestVal,
        bestPhase,
        finalRank,
        finalPhase,
        windSpeed: Number.isFinite(windNum) ? windNum : null,
        windDirection: weatherSource?.wind_direction || null,
        temperature: weatherSource?.temperature_celsius ?? null,
        isPR,
        raceCount: rs.length,
      });
    });

    // Tri : compétition (date desc) puis classement final asc puis meilleur résultat
    return results.sort((a, b) => {
      const d = b.matchDate.localeCompare(a.matchDate);
      if (d !== 0) return d;
      // Classement asc (1er en haut)
      if (a.finalRank != null && b.finalRank != null) return a.finalRank - b.finalRank;
      if (a.finalRank != null) return -1;
      if (b.finalRank != null) return 1;
      // Sinon par meilleure perf
      if (a.bestResult != null && b.bestResult != null) {
        return lowerIsBetter ? a.bestResult - b.bestResult : b.bestResult - a.bestResult;
      }
      return a.playerName.localeCompare(b.playerName);
    });
  }, [activeEvent, matches, rounds, lineups, players, genderFilter]);

  // Groupement visuel par compétition
  const rowsByMatch = useMemo(() => {
    const grouped: Record<string, { match: MatchInfo; rows: AthleteResultRow[] }> = {};
    rows.forEach(r => {
      const m = matches.find(x => x.id === r.matchId);
      if (!m) return;
      if (!grouped[r.matchId]) grouped[r.matchId] = { match: m, rows: [] };
      grouped[r.matchId].rows.push(r);
    });
    return Object.values(grouped).sort((a, b) => b.match.match_date.localeCompare(a.match.match_date));
  }, [rows, matches]);

  const eventLabel = activeEvent
    ? (activeEvent.specialty ? `${activeEvent.specialty} (${disciplineLabel(activeEvent.discipline)})` : disciplineLabel(activeEvent.discipline))
    : "";

  // ===== Exports =====
  const handleExportExcel = () => {
    if (!activeEvent || rows.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    try {
      const { lowerIsBetter, unit } = getDefaultUnitForDiscipline(
        activeEvent.discipline || undefined,
        activeEvent.specialty || undefined
      );
      void lowerIsBetter;
      const wb = XLSX.utils.book_new();

      const data = rows.map(r => ({
        "Compétition": r.matchLabel,
        "Date": r.matchDate ? format(parseISO(r.matchDate), "dd/MM/yyyy", { locale: fr }) : "",
        "Athlète": r.playerName,
        "Manches saisies": r.raceCount,
        "Classement final": r.finalRank != null ? r.finalRank : "",
        "Phase classement": r.finalPhase || "",
        "Meilleure perf": formatResult(r.bestResult, unit),
        "Perf brute": r.bestResult != null ? r.bestResult : "",
        "Phase meilleure perf": r.bestPhase || "",
        "Vent (m/s)": r.windSpeed != null ? r.windSpeed : "",
        "Direction vent": r.windDirection || "",
        "Température (°C)": r.temperature != null ? r.temperature : "",
        "Record perso": r.isPR ? "Oui" : "",
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = [
        { wch: 28 }, { wch: 11 }, { wch: 22 }, { wch: 10 },
        { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
        { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Résultats");

      const safeEvent = (activeEvent.specialty || disciplineLabel(activeEvent.discipline)).replace(/\s+/g, "-");
      XLSX.writeFile(wb, `epreuve-${safeEvent}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Export Excel téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  const handleExportPdf = () => {
    if (!activeEvent || rows.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    try {
      const { unit } = getDefaultUnitForDiscipline(
        activeEvent.discipline || undefined,
        activeEvent.specialty || undefined
      );
      const doc = new jsPDF({ orientation: "landscape" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      let y = margin;

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Épreuve : ${eventLabel}`, margin, 10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${rowsByMatch.length} compétition${rowsByMatch.length > 1 ? "s" : ""} • ${rows.length} performance${rows.length > 1 ? "s" : ""}`, margin, 17);
      doc.text(format(new Date(), "dd/MM/yyyy", { locale: fr }), pageWidth - margin, 17, { align: "right" });
      y = 28;
      doc.setTextColor(0, 0, 0);

      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - 10) {
          doc.addPage();
          y = margin;
        }
      };

      rowsByMatch.forEach(({ match, rows: mrows }) => {
        ensureSpace(20);
        const compLabel = `${match.competition || match.opponent} — ${format(parseISO(match.match_date), "dd/MM/yyyy", { locale: fr })}${match.location ? ` • ${match.location}` : ""}`;
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(compLabel, margin + 2, y + 5);
        y += 9;
        doc.setTextColor(0, 0, 0);

        const headers = ["Class.", "Athlète", "Phase", "Meilleure perf", "Manches", "Vent", "Temp.", "RP"];
        const colW = [16, 70, 30, 38, 18, 30, 18, 12];
        doc.setFillColor(30, 41, 59);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.rect(margin, y, colW.reduce((a, b) => a + b, 0), 6, "F");
        let x = margin;
        headers.forEach((h, i) => { doc.text(h, x + 1.5, y + 4); x += colW[i]; });
        y += 6;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");

        mrows.forEach((r, idx) => {
          ensureSpace(7);
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y, colW.reduce((a, b) => a + b, 0), 5.5, "F");
          }
          const playerStr = r.playerName.length > 32 ? r.playerName.slice(0, 30) + "…" : r.playerName;
          const cells = [
            r.finalRank != null ? `${r.finalRank}${r.finalPhase ? ` (${r.finalPhase.slice(0, 5)})` : ""}` : "—",
            playerStr,
            r.bestPhase || "—",
            formatResult(r.bestResult, unit),
            String(r.raceCount),
            r.windSpeed != null ? `${r.windSpeed > 0 ? "+" : ""}${r.windSpeed.toFixed(1)} m/s` : "—",
            r.temperature != null ? `${r.temperature}°C` : "—",
            r.isPR ? "✓" : "",
          ];
          let cx = margin;
          cells.forEach((c, i) => { doc.text(String(c), cx + 1.5, y + 4); cx += colW[i]; });
          y += 5.5;
        });
        y += 4;
      });

      const safeEvent = (activeEvent.specialty || disciplineLabel(activeEvent.discipline)).replace(/\s+/g, "-");
      doc.save(`epreuve-${safeEvent}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Export PDF téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  if (matchIds.length === 0) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Sélectionnez au moins une compétition pour analyser une épreuve.
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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Épreuve (discipline / spécialité)</label>
              <Select value={selectedDiscKey} onValueChange={setSelectedDiscKey} disabled={availableEvents.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une épreuve" />
                </SelectTrigger>
                <SelectContent>
                  {availableEvents.map(e => {
                    const lab = e.specialty ? `${e.specialty} (${disciplineLabel(e.discipline)})` : disciplineLabel(e.discipline);
                    return (
                      <SelectItem key={e.key} value={e.key}>{lab}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-44">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catégorie</label>
              <Select value={genderFilter} onValueChange={(v: any) => setGenderFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="M">Hommes</SelectItem>
                  <SelectItem value="F">Femmes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeEvent && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="default" className="gap-1">
                <Trophy className="h-3 w-3" />
                {eventLabel}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {new Set(rows.map(r => r.playerId)).size} athlète{new Set(rows.map(r => r.playerId)).size > 1 ? "s" : ""}
              </Badge>
              <Badge variant="secondary">
                {rowsByMatch.length} compét. • {rows.length} perf.
              </Badge>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportExcel} disabled={rows.length === 0}>
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Excel</span>
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPdf} disabled={rows.length === 0}>
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {rowsByMatch.length === 0 ? (
        <Card className="bg-gradient-card">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun athlète aligné sur cette épreuve dans les compétitions sélectionnées.
          </CardContent>
        </Card>
      ) : (
        rowsByMatch.map(({ match, rows: mrows }) => (
          <Card key={match.id} className="bg-gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{match.competition || match.opponent}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {format(parseISO(match.match_date), "dd/MM/yyyy", { locale: fr })}
                  {match.location ? ` • ${match.location}` : ""}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-20">Class.</TableHead>
                      <TableHead>Athlète</TableHead>
                      <TableHead>Phase</TableHead>
                      <TableHead className="text-right">Meilleure perf</TableHead>
                      <TableHead className="text-center w-16">Manches</TableHead>
                      <TableHead className="text-center">
                        <span className="inline-flex items-center gap-1"><Wind className="h-3.5 w-3.5" />Vent</span>
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="inline-flex items-center gap-1"><Thermometer className="h-3.5 w-3.5" />Temp.</span>
                      </TableHead>
                      <TableHead className="text-center w-12">RP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mrows.map(r => (
                      <TableRow key={`${r.playerId}-${r.matchId}`}>
                        <TableCell className="text-center">
                          {r.finalRank != null ? (
                            <Badge variant={r.finalRank <= 3 ? "default" : "outline"} className="font-mono">
                              {r.finalRank}ᵉ
                              {r.finalPhase && <span className="ml-1 text-[10px] opacity-70">{r.finalPhase}</span>}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{r.playerName}</TableCell>
                        <TableCell className="text-xs">
                          {r.bestPhase ? <Badge variant="outline" className="font-normal">{r.bestPhase}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {(() => {
                            const { unit } = getDefaultUnitForDiscipline(
                              activeEvent?.discipline || undefined,
                              activeEvent?.specialty || undefined
                            );
                            return formatResult(r.bestResult, unit);
                          })()}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {r.raceCount > 0 ? r.raceCount : "—"}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {r.windSpeed != null ? (
                            <span>{r.windSpeed > 0 ? "+" : ""}{r.windSpeed.toFixed(1)} m/s</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {r.temperature != null ? `${r.temperature}°C` : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.isPR && <Badge variant="default" className="bg-amber-500 hover:bg-amber-500 text-white">RP</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
