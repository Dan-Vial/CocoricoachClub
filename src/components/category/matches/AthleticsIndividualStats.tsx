import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Activity, Trophy, Timer, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { getDefaultUnitForDiscipline } from "@/lib/athletics/recordsHelpers";

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
  round_date: string | null;
  phase?: string | null;
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

interface PerfPoint {
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
}

const PRETTY_LABELS: Record<string, string> = {
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
function formatResult(value: number | null, unit: string): string {
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
function extractResult(round: RoundRow, lowerIsBetter: boolean): { value: number | null; unit: string } {
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
        .select("id, match_id, player_id, final_time_seconds, ranking, is_personal_record, round_date, phase, competition_round_stats(stat_data)")
        .in("match_id", matchIds);
      return (data || []) as RoundRow[];
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

    const byMatch: Record<string, RoundRow[]> = {};
    filtered.forEach(r => {
      if (!byMatch[r.match_id]) byMatch[r.match_id] = [];
      byMatch[r.match_id].push(r);
    });

    const points: PerfPoint[] = [];
    Object.entries(byMatch).forEach(([mid, rs]) => {
      const m = matchById.get(mid);
      if (!m) return;
      let bestVal: number | null = null;
      let bestUnit = defaultUnit;
      let bestRank: number | null = null;
      let isPR = false;
      rs.forEach(r => {
        const { value, unit } = extractResult(r, lowerIsBetter);
        if (value != null) {
          if (
            bestVal == null ||
            (lowerIsBetter ? value < bestVal : value > bestVal)
          ) {
            bestVal = value;
            if (unit) bestUnit = unit;
          }
        }
        if (r.ranking != null && r.ranking > 0) {
          if (bestRank == null || r.ranking < bestRank) bestRank = r.ranking;
        }
        if (r.is_personal_record) isPR = true;
      });
      points.push({
        matchId: mid,
        matchLabel: m.competition || m.opponent || mid.slice(0, 6),
        matchDate: m.match_date,
        competition: m.competition || m.opponent || "—",
        ranking: bestRank,
        result: bestVal,
        unit: bestUnit,
        lowerIsBetter,
        isPersonalRecord: isPR,
      });
    });

    return points.sort((a, b) => a.matchDate.localeCompare(b.matchDate));
  }, [selectedAthleteId, activePair, rounds, matches, disciplinePairs.length]);

  const summary = useMemo(() => {
    if (performancePoints.length === 0) return null;
    const valid = performancePoints.filter(p => p.result != null) as Array<PerfPoint & { result: number }>;
    const validRanks = performancePoints.filter(p => p.ranking != null) as Array<PerfPoint & { ranking: number }>;
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

    const avgRank = validRanks.length > 0
      ? validRanks.reduce((s, p) => s + p.ranking, 0) / validRanks.length
      : null;
    const bestRank = validRanks.length > 0 ? Math.min(...validRanks.map(p => p.ranking)) : null;

    return { avgResult, bestResult, lastResult, evolutionPct, avgRank, bestRank, unit, lowerIsBetter, count: valid.length };
  }, [performancePoints]);

  const chartData = useMemo(() => {
    return performancePoints
      .filter(p => p.result != null)
      .map(p => ({
        name: p.competition,
        date: p.matchDate ? format(parseISO(p.matchDate), "dd/MM", { locale: fr }) : "",
        label: `${p.competition}${p.matchDate ? ` (${format(parseISO(p.matchDate), "dd/MM/yy", { locale: fr })})` : ""}`,
        result: p.result,
        ranking: p.ranking,
      }));
  }, [performancePoints]);

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
              <span className="text-xs text-muted-foreground ml-auto">
                {performancePoints.length} compétition{performancePoints.length > 1 ? "s" : ""}
              </span>
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
                hint={summary.bestRank != null ? `Meilleur : ${summary.bestRank}ᵉ` : undefined}
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
              <TabsTrigger value="ranking" disabled={chartData.length === 0}>Classements</TabsTrigger>
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
                          <TableHead className="text-center">Classement</TableHead>
                          <TableHead className="text-right">Résultat</TableHead>
                          <TableHead className="text-center">RP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {performancePoints.map(p => (
                          <TableRow key={p.matchId}>
                            <TableCell className="text-xs text-muted-foreground">
                              {p.matchDate ? format(parseISO(p.matchDate), "dd/MM/yy", { locale: fr }) : "—"}
                            </TableCell>
                            <TableCell className="font-medium">{p.competition}</TableCell>
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
                            <TableCell className="text-center">
                              {p.isPersonalRecord && (
                                <Badge variant="default" className="bg-amber-500 hover:bg-amber-500 text-white">RP</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
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
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis
                          reversed={summary?.lowerIsBetter}
                          tick={{ fontSize: 10 }}
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ranking">
              <Card className="bg-gradient-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Classement par compétition</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis reversed tick={{ fontSize: 10 }} allowDecimals={false} />
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
                        <Bar dataKey="ranking" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
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
