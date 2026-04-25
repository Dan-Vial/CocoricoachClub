import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Trophy, Timer, Target, Wind, Thermometer, Download, FileSpreadsheet, MapPin, Calendar } from "lucide-react";
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
}

interface RaceRow {
  roundId: string;
  phase: string | null;
  ranking: number | null;
  result: number | null;
  unit: string;
  isPR: boolean;
  windSpeed: number | null;
  windDirection: string | null;
  temperature: number | null;
}

interface DisciplineSection {
  discipline: string | null;
  specialty: string | null;
  unit: string;
  lowerIsBetter: boolean;
  races: RaceRow[];
  bestResult: number | null;
  avgResult: number | null;
  finalRank: number | null;
  finalPhase: string | null;
}

export function AthleticsCompetitionView({ categoryId, matchIds }: Props) {
  void categoryId;
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");

  const { data: matches = [] } = useQuery({
    queryKey: ["athl-comp-matches", matchIds],
    queryFn: async () => {
      if (matchIds.length === 0) return [];
      const { data } = await supabase
        .from("matches")
        .select("id, match_date, opponent, competition, location")
        .in("id", matchIds)
        .order("match_date", { ascending: false });
      return (data || []) as MatchInfo[];
    },
    enabled: matchIds.length > 0,
  });

  useEffect(() => {
    if (!selectedMatchId && matches.length > 0) setSelectedMatchId(matches[0].id);
  }, [matches, selectedMatchId]);

  const activeMatchIds = selectedMatchId ? [selectedMatchId] : [];

  const { data: rounds = [] } = useQuery({
    queryKey: ["athl-comp-rounds", activeMatchIds],
    queryFn: async () => {
      if (activeMatchIds.length === 0) return [];
      const { data } = await supabase
        .from("competition_rounds")
        .select("id, match_id, player_id, final_time_seconds, ranking, is_personal_record, phase, wind_conditions, wind_direction, temperature_celsius, competition_round_stats(stat_data)")
        .in("match_id", activeMatchIds);
      return ((data || []) as unknown) as RoundRow[];
    },
    enabled: activeMatchIds.length > 0,
  });

  const { data: lineups = [] } = useQuery({
    queryKey: ["athl-comp-lineups", activeMatchIds],
    queryFn: async () => {
      if (activeMatchIds.length === 0) return [];
      const { data } = await supabase
        .from("match_lineups")
        .select("player_id, match_id, discipline, specialty")
        .in("match_id", activeMatchIds);
      return (data || []) as LineupRow[];
    },
    enabled: activeMatchIds.length > 0,
  });

  const allPlayerIds = useMemo(() => {
    const s = new Set<string>();
    rounds.forEach(r => s.add(r.player_id));
    lineups.forEach(l => s.add(l.player_id));
    return [...s];
  }, [rounds, lineups]);

  const { data: players = [] } = useQuery({
    queryKey: ["athl-comp-players", allPlayerIds],
    queryFn: async () => {
      if (allPlayerIds.length === 0) return [];
      const { data } = await supabase
        .from("players")
        .select("id, name, first_name")
        .in("id", allPlayerIds);
      return (data || []) as PlayerRow[];
    },
    enabled: allPlayerIds.length > 0,
  });

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const an = `${a.first_name || ""} ${a.name}`;
      const bn = `${b.first_name || ""} ${b.name}`;
      return an.localeCompare(bn);
    });
  }, [players]);

  useEffect(() => {
    if (!selectedAthleteId && sortedPlayers.length > 0) {
      setSelectedAthleteId(sortedPlayers[0].id);
    }
    if (selectedAthleteId && !sortedPlayers.find(p => p.id === selectedAthleteId)) {
      setSelectedAthleteId(sortedPlayers[0]?.id || "");
    }
  }, [sortedPlayers, selectedAthleteId]);

  const selectedMatch = matches.find(m => m.id === selectedMatchId);
  const selectedAthlete = players.find(p => p.id === selectedAthleteId);
  const athleteName = selectedAthlete
    ? [selectedAthlete.first_name, selectedAthlete.name].filter(Boolean).join(" ")
    : "";

  // Regroupe les manches de cet athlète sur cette compétition par discipline+spécialité.
  const sections = useMemo<DisciplineSection[]>(() => {
    if (!selectedAthleteId) return [];
    const athleteRounds = rounds.filter(r => r.player_id === selectedAthleteId);

    // Map des disciplines saisies : depuis les lineups + depuis stat_data._discipline
    const groupKey = (d: string | null, s: string | null) => `${d || ""}|${s || ""}`;
    const buckets: Record<string, { discipline: string | null; specialty: string | null; rounds: RoundRow[] }> = {};

    const lineupPairs = lineups.filter(l => l.player_id === selectedAthleteId);

    athleteRounds.forEach(r => {
      const sd = r.competition_round_stats?.[0]?.stat_data || {};
      const rDisc = sd._discipline ?? null;
      const rSpec = sd._specialty ?? null;
      // Match round to lineup
      let disc: string | null = rDisc;
      let spec: string | null = rSpec;
      if ((!disc && !spec) && lineupPairs.length === 1) {
        disc = lineupPairs[0].discipline;
        spec = lineupPairs[0].specialty;
      }
      const k = groupKey(disc, spec);
      if (!buckets[k]) buckets[k] = { discipline: disc, specialty: spec, rounds: [] };
      buckets[k].rounds.push(r);
    });

    // Ajoute les épreuves du lineup même sans manche saisie (pour visibilité)
    lineupPairs.forEach(l => {
      const k = groupKey(l.discipline, l.specialty);
      if (!buckets[k]) buckets[k] = { discipline: l.discipline, specialty: l.specialty, rounds: [] };
    });

    return Object.values(buckets).map(b => {
      const { lowerIsBetter, unit: defaultUnit } = getDefaultUnitForDiscipline(
        b.discipline || undefined,
        b.specialty || undefined
      );

      const races: RaceRow[] = b.rounds.map(r => {
        const { value, unit } = extractResult(r, lowerIsBetter);
        const finalUnit = unit || defaultUnit;
        const windRaw = r.wind_conditions ?? null;
        const windNum = windRaw != null ? Number(String(windRaw).replace(",", ".")) : NaN;
        return {
          roundId: r.id,
          phase: r.phase || null,
          ranking: r.ranking != null && r.ranking > 0 ? r.ranking : null,
          result: value,
          unit: finalUnit,
          isPR: !!r.is_personal_record,
          windSpeed: Number.isFinite(windNum) ? windNum : null,
          windDirection: r.wind_direction || null,
          temperature: r.temperature_celsius ?? null,
        };
      });
      // Tri par phase (séries puis demi puis finale...)
      races.sort((a, b) => phaseRank(a.phase) - phaseRank(b.phase));

      const validResults = races.filter(r => r.result != null) as Array<RaceRow & { result: number }>;
      const bestResult = validResults.length > 0
        ? (lowerIsBetter ? Math.min(...validResults.map(r => r.result)) : Math.max(...validResults.map(r => r.result)))
        : null;
      const avgResult = validResults.length > 0
        ? validResults.reduce((s, r) => s + r.result, 0) / validResults.length
        : null;

      // Classement « final » : phase la plus avancée parmi celles avec un classement
      let finalRank: number | null = null;
      let finalPhase: string | null = null;
      races.forEach(r => {
        if (r.ranking == null) return;
        if (finalRank == null || phaseRank(r.phase) > phaseRank(finalPhase)) {
          finalRank = r.ranking;
          finalPhase = r.phase;
        }
      });

      return {
        discipline: b.discipline,
        specialty: b.specialty,
        unit: races[0]?.unit || defaultUnit,
        lowerIsBetter,
        races,
        bestResult,
        avgResult,
        finalRank,
        finalPhase,
      };
    }).sort((a, b) => {
      const al = `${disciplineLabel(a.discipline)} ${a.specialty || ""}`;
      const bl = `${disciplineLabel(b.discipline)} ${b.specialty || ""}`;
      return al.localeCompare(bl);
    });
  }, [selectedAthleteId, rounds, lineups]);

  const totalRaces = sections.reduce((s, sec) => s + sec.races.length, 0);

  // ===== Exports =====
  const handleExportExcel = () => {
    if (!selectedAthlete || !selectedMatch || sections.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    try {
      const wb = XLSX.utils.book_new();
      const compName = selectedMatch.competition || selectedMatch.opponent || "Compétition";

      // Synthèse
      const synthRows: Array<Record<string, any>> = [
        { Indicateur: "Athlète", Valeur: athleteName },
        { Indicateur: "Compétition", Valeur: compName },
        { Indicateur: "Date", Valeur: format(parseISO(selectedMatch.match_date), "dd/MM/yyyy", { locale: fr }) },
        { Indicateur: "Lieu", Valeur: selectedMatch.location || "—" },
        { Indicateur: "Nombre d'épreuves", Valeur: sections.length },
        { Indicateur: "Nombre total de manches", Valeur: totalRaces },
      ];
      sections.forEach(sec => {
        const epreuve = sec.specialty ? `${sec.specialty} (${disciplineLabel(sec.discipline)})` : disciplineLabel(sec.discipline);
        synthRows.push({ Indicateur: `— ${epreuve} : meilleure perf`, Valeur: formatResult(sec.bestResult, sec.unit) });
        synthRows.push({ Indicateur: `— ${epreuve} : moyenne`, Valeur: formatResult(sec.avgResult, sec.unit) });
        synthRows.push({ Indicateur: `— ${epreuve} : classement (${sec.finalPhase || "—"})`, Valeur: sec.finalRank != null ? `${sec.finalRank}ᵉ` : "—" });
      });
      const wsS = XLSX.utils.json_to_sheet(synthRows);
      wsS["!cols"] = [{ wch: 50 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsS, "Synthèse");

      // Une feuille par épreuve (avec la liste détaillée des manches)
      sections.forEach(sec => {
        const sheetName = (sec.specialty || disciplineLabel(sec.discipline) || "Épreuve").slice(0, 28);
        const rows = sec.races.map((r, idx) => ({
          "Manche n°": idx + 1,
          "Phase": r.phase || "—",
          "Classement": r.ranking != null ? r.ranking : "",
          "Résultat": formatResult(r.result, r.unit),
          "Résultat brut": r.result != null ? r.result : "",
          "Unité": r.unit,
          "Vent (m/s)": r.windSpeed != null ? r.windSpeed : "",
          "Direction vent": r.windDirection || "",
          "Température (°C)": r.temperature != null ? r.temperature : "",
          "Record perso": r.isPR ? "Oui" : "",
        }));
        // Ligne de récap
        rows.push({} as any);
        rows.push({ "Manche n°": "RÉCAP", Phase: "Meilleure perf", Classement: "", Résultat: formatResult(sec.bestResult, sec.unit) } as any);
        rows.push({ "Manche n°": "", Phase: "Moyenne", Classement: "", Résultat: formatResult(sec.avgResult, sec.unit) } as any);
        rows.push({ "Manche n°": "", Phase: `Classement (${sec.finalPhase || "—"})`, Classement: sec.finalRank != null ? sec.finalRank : "", Résultat: "" } as any);
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [{ wch: 10 }, { wch: 18 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      const safeName = athleteName.replace(/\s+/g, "-");
      const safeComp = compName.replace(/\s+/g, "-").slice(0, 30);
      XLSX.writeFile(wb, `competition-${safeName}-${safeComp}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Export Excel téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  const handleExportPdf = () => {
    if (!selectedAthlete || !selectedMatch || sections.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    try {
      const doc = new jsPDF({ orientation: "portrait" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      let y = margin;
      const compName = selectedMatch.competition || selectedMatch.opponent || "Compétition";

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 26, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text(athleteName, margin, 11);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(compName, margin, 18);
      const subInfo = `${format(parseISO(selectedMatch.match_date), "dd/MM/yyyy", { locale: fr })}${selectedMatch.location ? ` • ${selectedMatch.location}` : ""}`;
      doc.text(subInfo, margin, 23);
      doc.text(format(new Date(), "dd/MM/yyyy", { locale: fr }), pageWidth - margin, 23, { align: "right" });
      y = 32;
      doc.setTextColor(0, 0, 0);

      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - 10) {
          doc.addPage();
          y = margin;
        }
      };

      sections.forEach((sec, i) => {
        ensureSpace(50);
        const epreuve = sec.specialty ? `${sec.specialty} (${disciplineLabel(sec.discipline)})` : disciplineLabel(sec.discipline);
        // Section header
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`${i + 1}. ${epreuve}`, margin + 2, y + 6);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`${sec.races.length} manche${sec.races.length > 1 ? "s" : ""}`, pageWidth - margin - 2, y + 6, { align: "right" });
        y += 10;
        doc.setTextColor(0, 0, 0);

        if (sec.races.length === 0) {
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text("Aligné sur cette épreuve mais aucune manche saisie.", margin + 2, y + 4);
          doc.setTextColor(0, 0, 0);
          y += 8;
          return;
        }

        // Table header
        const headers = ["#", "Phase", "Class.", "Résultat", "Vent", "Temp.", "RP"];
        const colW = [10, 45, 18, 35, 30, 18, 12];
        doc.setFillColor(30, 41, 59);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.rect(margin, y, colW.reduce((a, b) => a + b, 0), 6, "F");
        let x = margin;
        headers.forEach((h, idx) => {
          doc.text(h, x + 1.5, y + 4);
          x += colW[idx];
        });
        y += 6;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");

        sec.races.forEach((r, idx) => {
          ensureSpace(8);
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y, colW.reduce((a, b) => a + b, 0), 5.5, "F");
          }
          const cells = [
            String(idx + 1),
            r.phase || "—",
            r.ranking != null ? `${r.ranking}` : "—",
            formatResult(r.result, r.unit),
            r.windSpeed != null ? `${r.windSpeed > 0 ? "+" : ""}${r.windSpeed.toFixed(1)} m/s` : (r.windDirection || "—"),
            r.temperature != null ? `${r.temperature}°C` : "—",
            r.isPR ? "✓" : "",
          ];
          let cx = margin;
          cells.forEach((c, cidx) => {
            doc.text(String(c), cx + 1.5, y + 4);
            cx += colW[cidx];
          });
          y += 5.5;
        });

        // Récap inline
        ensureSpace(14);
        doc.setFillColor(255, 248, 220);
        doc.rect(margin, y, pageWidth - margin * 2, 10, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        const summaryText = [
          `Meilleure : ${formatResult(sec.bestResult, sec.unit)}`,
          `Moyenne : ${formatResult(sec.avgResult, sec.unit)}`,
          `Classement (${sec.finalPhase || "—"}) : ${sec.finalRank != null ? `${sec.finalRank}ᵉ` : "—"}`,
        ].join("   •   ");
        doc.text(summaryText, margin + 2, y + 6.5);
        doc.setFont("helvetica", "normal");
        y += 14;
      });

      const safeName = athleteName.replace(/\s+/g, "-");
      const safeComp = compName.replace(/\s+/g, "-").slice(0, 30);
      doc.save(`competition-${safeName}-${safeComp}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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
          Sélectionnez au moins une compétition pour visualiser le détail.
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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Compétition</label>
              <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une compétition" />
                </SelectTrigger>
                <SelectContent>
                  {matches.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.competition || m.opponent} — {format(parseISO(m.match_date), "dd/MM/yy", { locale: fr })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Athlète</label>
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId} disabled={sortedPlayers.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un athlète" />
                </SelectTrigger>
                <SelectContent>
                  {sortedPlayers.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {[p.first_name, p.name].filter(Boolean).join(" ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedMatch && selectedAthlete && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="default" className="gap-1">
                <Activity className="h-3 w-3" />
                {athleteName}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(selectedMatch.match_date), "dd/MM/yyyy", { locale: fr })}
              </Badge>
              {selectedMatch.location && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedMatch.location}
                </Badge>
              )}
              <Badge variant="secondary">
                {sections.length} épreuve{sections.length > 1 ? "s" : ""} • {totalRaces} manche{totalRaces > 1 ? "s" : ""}
              </Badge>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportExcel} disabled={sections.length === 0}>
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Excel</span>
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPdf} disabled={sections.length === 0}>
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {sections.length === 0 ? (
        <Card className="bg-gradient-card">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucune épreuve trouvée pour cet athlète sur cette compétition.
          </CardContent>
        </Card>
      ) : (
        sections.map((sec, i) => {
          const epreuve = sec.specialty ? `${sec.specialty} (${disciplineLabel(sec.discipline)})` : disciplineLabel(sec.discipline);
          return (
            <Card key={`${sec.discipline}-${sec.specialty}-${i}`} className="bg-gradient-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">{i + 1}</span>
                    {epreuve}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {sec.races.length} manche{sec.races.length > 1 ? "s" : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sec.races.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Athlète aligné sur cette épreuve mais aucune manche saisie pour le moment.
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead>Phase / Manche</TableHead>
                            <TableHead className="text-center">Classement</TableHead>
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
                          {sec.races.map((r, idx) => {
                            const isTimedDisc = r.unit === "sec";
                            const windAided = isTimedDisc && r.windSpeed != null && r.windSpeed > 2;
                            const headWind = isTimedDisc && r.windSpeed != null && r.windSpeed < -1;
                            return (
                              <TableRow key={r.roundId}>
                                <TableCell className="text-center font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell>
                                  {r.phase ? <Badge variant="outline" className="font-normal">{r.phase}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                                </TableCell>
                                <TableCell className="text-center">
                                  {r.ranking != null ? (
                                    <Badge variant={r.ranking <= 3 ? "default" : "outline"} className="font-mono">{r.ranking}ᵉ</Badge>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-mono">{formatResult(r.result, r.unit)}</TableCell>
                                <TableCell className="text-center font-mono text-xs">
                                  {r.windSpeed != null ? (
                                    <span className={windAided ? "text-amber-600 dark:text-amber-400 font-semibold" : headWind ? "text-blue-600 dark:text-blue-400 font-semibold" : ""}>
                                      {r.windSpeed > 0 ? "+" : ""}{r.windSpeed.toFixed(1)} m/s
                                    </span>
                                  ) : r.windDirection ? (
                                    <span className="text-muted-foreground">{r.windDirection}</span>
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
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Récap de l'épreuve */}
                    <div className="mt-3 grid grid-cols-3 gap-2 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/30">
                      <RecapBox icon={<Trophy className="h-3.5 w-3.5" />} label="Meilleure perf" value={formatResult(sec.bestResult, sec.unit)} />
                      <RecapBox icon={<Timer className="h-3.5 w-3.5" />} label="Moyenne" value={formatResult(sec.avgResult, sec.unit)} />
                      <RecapBox
                        icon={<Target className="h-3.5 w-3.5" />}
                        label={`Classement${sec.finalPhase ? ` (${sec.finalPhase})` : ""}`}
                        value={sec.finalRank != null ? `${sec.finalRank}ᵉ` : "—"}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function RecapBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="font-mono font-bold text-sm">{value}</div>
    </div>
  );
}
