import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, TrendingUp, Weight } from "lucide-react";

interface BenchmarkComparisonProps {
  categoryId: string;
  sportType?: string;
}

interface BenchmarkLevel {
  label: string;
  threshold: number | null;
  color: string;
}

interface Benchmark {
  id: string;
  name: string;
  test_category: string;
  test_type: string;
  unit: string | null;
  lower_is_better: boolean;
  levels: BenchmarkLevel[];
  use_body_weight_ratio: boolean;
  body_weight_multiplier: number | null;
  filter_type: string;
  filter_value: string | null;
}

function getPlayerLevel(
  value: number,
  benchmark: Benchmark,
  playerWeight?: number | null
): { label: string; color: string } {
  const levels = benchmark.levels;
  if (!levels || levels.length === 0) {
    return { label: "N/A", color: "#94a3b8" };
  }

  // If body-weight ratio is used, adjust thresholds
  const adjustedLevels = levels.map(l => {
    if (benchmark.use_body_weight_ratio && benchmark.body_weight_multiplier && playerWeight && l.threshold != null) {
      return { ...l, threshold: l.threshold * playerWeight };
    }
    return l;
  });

  // Levels are ordered from worst to best
  // For lower_is_better: value <= threshold is good (check from best level down)
  // For higher_is_better: value >= threshold is good (check from best level down)
  for (let i = adjustedLevels.length - 1; i >= 0; i--) {
    const level = adjustedLevels[i];
    if (level.threshold == null) continue;

    if (benchmark.lower_is_better) {
      if (value <= level.threshold) {
        return { label: level.label, color: level.color };
      }
    } else {
      if (value >= level.threshold) {
        return { label: level.label, color: level.color };
      }
    }
  }

  // Didn't match any level, return the worst
  return { label: adjustedLevels[0]?.label || "N/A", color: adjustedLevels[0]?.color || "#ef4444" };
}

export function BenchmarkComparison({ categoryId, sportType }: BenchmarkComparisonProps) {
  const { data: benchmarks = [] } = useQuery({
    queryKey: ["benchmarks", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benchmarks")
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at");
      if (error) throw error;
      return (data || []).map((b: any) => ({
        ...b,
        levels: Array.isArray(b.levels) ? b.levels : [],
      })) as Benchmark[];
    },
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name, position")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch latest body composition for body-weight calculations
  const { data: bodyComps = [] } = useQuery({
    queryKey: ["body-comp-benchmark", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_composition")
        .select("player_id, weight_kg, measurement_date")
        .eq("category_id", categoryId)
        .order("measurement_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: benchmarks.some(b => b.use_body_weight_ratio),
  });

  // Latest weight per player
  const playerWeights = useMemo(() => {
    const map = new Map<string, number>();
    for (const bc of bodyComps) {
      if (bc.weight_kg && !map.has(bc.player_id)) {
        map.set(bc.player_id, bc.weight_kg);
      }
    }
    return map;
  }, [bodyComps]);

  // Fetch test results
  const { data: genericTests = [] } = useQuery({
    queryKey: ["generic_tests_benchmark", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generic_tests")
        .select("player_id, test_category, test_type, result_value, test_date")
        .eq("category_id", categoryId)
        .order("test_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: benchmarks.length > 0,
  });

  const { data: speedTests = [] } = useQuery({
    queryKey: ["speed_tests_benchmark", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_tests")
        .select("player_id, test_type, vma_kmh, speed_kmh, time_40m_seconds, test_date")
        .eq("category_id", categoryId)
        .order("test_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: benchmarks.length > 0,
  });

  const { data: strengthTests = [] } = useQuery({
    queryKey: ["strength_tests_benchmark", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strength_tests")
        .select("player_id, test_name, weight_kg, test_date")
        .eq("category_id", categoryId)
        .order("test_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: benchmarks.length > 0,
  });

  // Build player results map
  const playerResults = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    const getPlayerMap = (pid: string) => {
      if (!map.has(pid)) map.set(pid, new Map());
      return map.get(pid)!;
    };

    benchmarks.forEach(bm => {
      genericTests.forEach(t => {
        if (t.test_category === bm.test_category && t.test_type === bm.test_type) {
          const pm = getPlayerMap(t.player_id);
          if (!pm.has(bm.id)) pm.set(bm.id, t.result_value);
        }
      });

      if (bm.test_category === "speed" || bm.test_category === "sprint") {
        speedTests.forEach(t => {
          if (t.test_type === bm.test_type) {
            const pm = getPlayerMap(t.player_id);
            if (!pm.has(bm.id)) {
              const val = t.vma_kmh || t.speed_kmh || t.time_40m_seconds;
              if (val != null) pm.set(bm.id, val);
            }
          }
        });
      }

      if (bm.test_category === "strength" || bm.test_category === "force") {
        strengthTests.forEach(t => {
          if (t.test_name === bm.test_type) {
            const pm = getPlayerMap(t.player_id);
            if (!pm.has(bm.id)) pm.set(bm.id, t.weight_kg);
          }
        });
      }
    });

    return map;
  }, [benchmarks, genericTests, speedTests, strengthTests]);

  // Filter players based on benchmark filter
  const getFilteredPlayers = (bm: Benchmark) => {
    if (bm.filter_type === "all" || !bm.filter_value) return players;
    return players.filter(p => (p as any).position === bm.filter_value);
  };

  if (benchmarks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            Aucun benchmark défini. Configurez des benchmarks ci-dessus pour comparer les performances.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Comparaison des performances
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Dernier résultat de chaque joueur comparé aux benchmarks définis
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Joueur</TableHead>
                {benchmarks.map(bm => (
                  <TableHead key={bm.id} className="text-center min-w-[120px]">
                    <div>
                      <p className="font-medium">{bm.name}</p>
                      <p className="text-xs text-muted-foreground font-normal">
                        {bm.unit}
                        {bm.use_body_weight_ratio && (
                          <span className="ml-1">
                            <Weight className="h-3 w-3 inline" /> {bm.body_weight_multiplier}x PDC
                          </span>
                        )}
                      </p>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map(player => (
                <TableRow key={player.id}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    {player.first_name ? `${player.first_name} ${player.name}` : player.name}
                  </TableCell>
                  {benchmarks.map(bm => {
                    const val = playerResults.get(player.id)?.get(bm.id);
                    const weight = playerWeights.get(player.id);

                    if (val == null) {
                      return (
                        <TableCell key={bm.id} className="text-center">
                          <span className="text-muted-foreground text-xs">-</span>
                        </TableCell>
                      );
                    }

                    const { label, color } = getPlayerLevel(val, bm, weight);

                    // Show ratio if body-weight based
                    let displayValue = val.toString();
                    if (bm.use_body_weight_ratio && weight) {
                      const ratio = (val / weight).toFixed(2);
                      displayValue = `${val} (${ratio}x)`;
                    }

                    return (
                      <TableCell key={bm.id} className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono font-semibold text-sm">{displayValue}</span>
                          <Badge className="text-[10px] px-1.5 py-0 text-white" style={{ backgroundColor: color }}>
                            {label}
                          </Badge>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
