import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ATHLETISME_DISCIPLINES } from "@/lib/constants/sportTypes";
import { computeDelta, type AthleticsMinima, type AthleticsRecord } from "@/lib/athletics/recordsHelpers";
import { getMinimaLevel } from "@/lib/athletics/minimaLevels";
import { cn } from "@/lib/utils";

interface Props {
  categoryId: string;
}

interface Player {
  id: string;
  name: string;
  first_name: string | null;
  discipline: string | null;
  specialty: string | null;
}

interface RoundRow {
  player_id: string;
  final_time_seconds: number | null;
  competition_round_stats: { stat_data: Record<string, any> | null }[] | null;
  players: { discipline: string | null; specialty: string | null } | null;
}

/**
 * Extracts the best performance value for an athletics round.
 * - For time-based events: uses final_time_seconds (lowest = best)
 * - For distance/height/points: scans stat_data for the max numeric "throw/jump" value
 */
function extractBestFromRound(
  round: RoundRow,
  lowerIsBetter: boolean
): number | null {
  // Time-based: use final_time_seconds
  if (lowerIsBetter && round.final_time_seconds != null) {
    return round.final_time_seconds;
  }

  const statData = round.competition_round_stats?.[0]?.stat_data;
  if (!statData || typeof statData !== "object") return null;

  // Collect all numeric values that look like attempts/throws/jumps
  const numericValues: number[] = [];
  Object.entries(statData).forEach(([key, val]) => {
    if (typeof val !== "number" || val <= 0) return;
    // Skip metadata fields
    if (/wind|temperature|temp_|condition|ranking|lane/i.test(key)) return;
    numericValues.push(val);
  });

  if (numericValues.length === 0) return null;
  return lowerIsBetter ? Math.min(...numericValues) : Math.max(...numericValues);
}

/**
 * Aggregates the best season performance per player per (discipline, specialty).
 */
function aggregateBestPerformances(
  rounds: RoundRow[],
  minimasByKey: Map<string, AthleticsMinima>
): Map<string, number> {
  const bestMap = new Map<string, number>(); // key: `${player_id}|${discipline}|${specialty}`

  rounds.forEach((round) => {
    const player = round.players;
    if (!player?.discipline) return;

    const key = `${round.player_id}|${player.discipline}|${player.specialty || ""}`;
    // Look up matching minima to know lowerIsBetter
    const minimaKey = `${player.discipline}|${player.specialty || ""}`;
    const refMinima =
      minimasByKey.get(minimaKey) ||
      minimasByKey.get(`${player.discipline}|`);
    const lowerIsBetter = refMinima?.lower_is_better ?? true;

    const value = extractBestFromRound(round, lowerIsBetter);
    if (value == null) return;

    const existing = bestMap.get(key);
    if (existing == null) {
      bestMap.set(key, value);
    } else {
      bestMap.set(key, lowerIsBetter ? Math.min(existing, value) : Math.max(existing, value));
    }
  });

  return bestMap;
}

export function AthleticsMinimasMatrix({ categoryId }: Props) {
  // Fetch players
  const { data: players = [] } = useQuery({
    queryKey: ["athletics_matrix_players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name, discipline, specialty")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return (data || []) as Player[];
    },
  });

  // Fetch minimas
  const { data: minimas = [] } = useQuery({
    queryKey: ["athletics_minimas_matrix", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletics_minimas" as any)
        .select("*")
        .eq("category_id", categoryId);
      if (error) throw error;
      return (data || []) as unknown as AthleticsMinima[];
    },
  });

  // Fetch personal records (for fallback comparison)
  const { data: records = [] } = useQuery({
    queryKey: ["athletics_records_matrix", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletics_records" as any)
        .select("*")
        .eq("category_id", categoryId);
      if (error) throw error;
      return (data || []) as unknown as AthleticsRecord[];
    },
  });

  // Fetch competition rounds for the season (current year)
  const { data: rounds = [] } = useQuery({
    queryKey: ["athletics_matrix_rounds", categoryId],
    queryFn: async () => {
      // First get matches in this category
      const { data: matches, error: mErr } = await supabase
        .from("matches")
        .select("id")
        .eq("category_id", categoryId);
      if (mErr) throw mErr;
      const matchIds = (matches || []).map((m) => m.id);
      if (matchIds.length === 0) return [];

      const { data, error } = await supabase
        .from("competition_rounds")
        .select(
          "player_id, final_time_seconds, competition_round_stats(stat_data), players(discipline, specialty)"
        )
        .in("match_id", matchIds);
      if (error) throw error;
      return (data || []) as unknown as RoundRow[];
    },
  });

  // Index minimas by discipline+specialty for fast lookup
  const minimasByKey = useMemo(() => {
    const map = new Map<string, AthleticsMinima>();
    minimas.forEach((m) => {
      map.set(`${m.discipline}|${m.specialty || ""}`, m);
    });
    return map;
  }, [minimas]);

  // Best performance per (player, discipline, specialty)
  const bestMap = useMemo(
    () => aggregateBestPerformances(rounds, minimasByKey),
    [rounds, minimasByKey]
  );

  // Group minimas by (discipline + specialty) → list of minima rows (sorted by rank desc)
  const groupedMinimas = useMemo(() => {
    const groups: Record<
      string,
      { discipline: string; specialty: string | null; minimas: AthleticsMinima[] }
    > = {};
    minimas.forEach((m) => {
      const key = `${m.discipline}|${m.specialty || ""}`;
      if (!groups[key]) {
        groups[key] = { discipline: m.discipline, specialty: m.specialty, minimas: [] };
      }
      groups[key].minimas.push(m);
    });
    Object.values(groups).forEach((g) =>
      g.minimas.sort(
        (a, b) => (getMinimaLevel(a.level)?.rank || 0) - (getMinimaLevel(b.level)?.rank || 0)
      )
    );
    return groups;
  }, [minimas]);

  // Athletes per group (matching discipline + specialty)
  const playersForGroup = (discipline: string, specialty: string | null) =>
    players.filter((p) => {
      if (p.discipline !== discipline) return false;
      // If group has a specialty, prefer exact match; otherwise include all of this discipline
      if (specialty) return p.specialty === specialty;
      return true;
    });

  if (minimas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Matrice Minimas × Athlètes
          </CardTitle>
          <CardDescription>
            Compare automatiquement la meilleure performance de chaque athlète aux minimas définis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
            Définis d'abord des minimas ci-dessous pour voir la matrice.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Matrice Minimas × Athlètes
          </CardTitle>
          <CardDescription>
            Delta entre la meilleure performance de la saison (compétition) et chaque minima.
            <span className="text-emerald-600 font-medium"> Vert</span> = minima atteint,
            <span className="text-destructive font-medium"> rouge</span> = en dessous.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedMinimas).map(([groupKey, group]) => {
            const discLabel =
              ATHLETISME_DISCIPLINES.find((d) => d.value === group.discipline)?.label ||
              group.discipline;
            const groupPlayers = playersForGroup(group.discipline, group.specialty);

            return (
              <div key={groupKey} className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">
                    {discLabel}
                  </h4>
                  {group.specialty && (
                    <Badge variant="outline" className="text-xs">
                      {group.specialty}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {groupPlayers.length} athlète{groupPlayers.length > 1 ? "s" : ""}
                  </Badge>
                </div>

                {groupPlayers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-2 py-3 border rounded-md">
                    Aucun athlète assigné à cette discipline/spécialité.
                  </p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[180px] sticky left-0 bg-card z-10">
                            Athlète
                          </TableHead>
                          <TableHead className="text-center whitespace-nowrap">
                            Meilleure perf.
                          </TableHead>
                          {group.minimas.map((m) => {
                            const lvl = getMinimaLevel(m.level);
                            return (
                              <TableHead key={m.id} className="text-center whitespace-nowrap">
                                <div className="flex flex-col items-center gap-1">
                                  {lvl && (
                                    <Badge
                                      className={cn("text-[10px] border-transparent", lvl.badgeClass)}
                                    >
                                      {lvl.label}
                                    </Badge>
                                  )}
                                  <span className="font-mono text-xs normal-case font-semibold text-foreground">
                                    {m.target_value} {m.unit}
                                  </span>
                                </div>
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupPlayers.map((player) => {
                          const bestKey = `${player.id}|${group.discipline}|${
                            player.specialty || ""
                          }`;
                          // Try exact specialty match first, else discipline match
                          const best =
                            bestMap.get(bestKey) ??
                            bestMap.get(`${player.id}|${group.discipline}|`);

                          const playerRecord = records.find(
                            (r) =>
                              r.player_id === player.id &&
                              r.discipline === group.discipline &&
                              (r.specialty || "") === (group.specialty || player.specialty || "")
                          );
                          const pb = playerRecord?.personal_best ?? null;
                          const sb = playerRecord?.season_best ?? null;
                          // Use the best between actual competition perf and stored season best
                          const lowerIsBetter = group.minimas[0]?.lower_is_better ?? true;
                          let displayBest: number | null = best ?? sb ?? pb ?? null;
                          if (best != null && sb != null) {
                            displayBest = lowerIsBetter
                              ? Math.min(best, sb)
                              : Math.max(best, sb);
                          }

                          return (
                            <TableRow key={player.id}>
                              <TableCell className="font-medium sticky left-0 bg-card z-10">
                                <div className="flex flex-col">
                                  <span>
                                    {player.first_name ? `${player.first_name} ` : ""}
                                    {player.name}
                                  </span>
                                  {player.specialty && !group.specialty && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {player.specialty}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {displayBest != null ? (
                                  <span className="font-mono font-semibold text-sm">
                                    {displayBest.toFixed(2)} {group.minimas[0]?.unit}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">—</span>
                                )}
                              </TableCell>
                              {group.minimas.map((m) => {
                                const delta = computeDelta(
                                  displayBest,
                                  m.target_value,
                                  m.lower_is_better,
                                  m.unit
                                );
                                if (!delta) {
                                  return (
                                    <TableCell key={m.id} className="text-center">
                                      <span className="text-xs text-muted-foreground italic">
                                        —
                                      </span>
                                    </TableCell>
                                  );
                                }
                                const isAchieved = delta.isBetter;
                                return (
                                  <TableCell key={m.id} className="text-center">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
                                          className={cn(
                                            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-mono font-semibold",
                                            isAchieved
                                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                              : "bg-destructive/15 text-destructive"
                                          )}
                                        >
                                          {isAchieved ? (
                                            <TrendingUp className="h-3 w-3" />
                                          ) : Math.abs(delta.delta) < 0.01 ? (
                                            <Minus className="h-3 w-3" />
                                          ) : (
                                            <TrendingDown className="h-3 w-3" />
                                          )}
                                          {delta.display}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {isAchieved
                                          ? `✅ Minima ${getMinimaLevel(m.level)?.label || ""} atteint`
                                          : `Manque ${Math.abs(delta.delta).toFixed(2)} ${m.unit} pour atteindre ${m.label}`}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
