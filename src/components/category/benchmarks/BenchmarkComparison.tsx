import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BenchmarkComparisonProps {
  categoryId: string;
  sportType?: string;
}

interface Benchmark {
  id: string;
  name: string;
  test_category: string;
  test_type: string;
  unit: string | null;
  lower_is_better: boolean;
  level_1_label: string;
  level_1_max: number | null;
  level_2_label: string;
  level_2_max: number | null;
  level_3_label: string;
  level_3_max: number | null;
  level_4_label: string;
  level_4_max: number | null;
}

function getPlayerLevel(value: number, benchmark: Benchmark): { level: number; label: string; color: string } {
  const { lower_is_better, level_1_max, level_2_max, level_3_max, level_4_max } = benchmark;

  if (lower_is_better) {
    // Lower is better: level 4 (best) has the smallest threshold
    if (level_4_max != null && value <= level_4_max)
      return { level: 4, label: benchmark.level_4_label, color: "bg-emerald-500 text-white" };
    if (level_3_max != null && value <= level_3_max)
      return { level: 3, label: benchmark.level_3_label, color: "bg-green-500 text-white" };
    if (level_2_max != null && value <= level_2_max)
      return { level: 2, label: benchmark.level_2_label, color: "bg-amber-500 text-white" };
    return { level: 1, label: benchmark.level_1_label, color: "bg-red-500 text-white" };
  } else {
    // Higher is better: level 4 (best) has the highest threshold
    if (level_4_max != null && value >= level_4_max)
      return { level: 4, label: benchmark.level_4_label, color: "bg-emerald-500 text-white" };
    if (level_3_max != null && value >= level_3_max)
      return { level: 3, label: benchmark.level_3_label, color: "bg-green-500 text-white" };
    if (level_2_max != null && value >= level_2_max)
      return { level: 2, label: benchmark.level_2_label, color: "bg-amber-500 text-white" };
    return { level: 1, label: benchmark.level_1_label, color: "bg-red-500 text-white" };
  }
}

export function BenchmarkComparison({ categoryId, sportType }: BenchmarkComparisonProps) {
  // Fetch benchmarks
  const { data: benchmarks = [] } = useQuery({
    queryKey: ["benchmarks", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benchmarks")
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at");
      if (error) throw error;
      return data as Benchmark[];
    },
  });

  // Fetch players
  const { data: players = [] } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch latest test results for all players
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
        .select("player_id, test_type, result, test_date")
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
        .select("player_id, test_type, result, test_date")
        .eq("category_id", categoryId)
        .order("test_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: benchmarks.length > 0,
  });

  // Build a lookup: player_id -> benchmark_id -> latest result
  const playerResults = useMemo(() => {
    const map = new Map<string, Map<string, number>>();

    // Helper to get or create player map
    const getPlayerMap = (playerId: string) => {
      if (!map.has(playerId)) map.set(playerId, new Map());
      return map.get(playerId)!;
    };

    // For each benchmark, find latest matching test result per player
    benchmarks.forEach(bm => {
      // Generic tests
      genericTests.forEach(t => {
        if (t.test_category === bm.test_category && t.test_type === bm.test_type) {
          const pm = getPlayerMap(t.player_id);
          if (!pm.has(bm.id)) {
            pm.set(bm.id, t.result_value);
          }
        }
      });

      // Speed tests (test_category might be "speed" or similar)
      if (bm.test_category === "speed" || bm.test_category === "sprint") {
        speedTests.forEach(t => {
          if (t.test_type === bm.test_type) {
            const pm = getPlayerMap(t.player_id);
            if (!pm.has(bm.id)) {
              pm.set(bm.id, t.result);
            }
          }
        });
      }

      // Strength tests
      if (bm.test_category === "strength" || bm.test_category === "force") {
        strengthTests.forEach(t => {
          if (t.test_type === bm.test_type) {
            const pm = getPlayerMap(t.player_id);
            if (!pm.has(bm.id)) {
              pm.set(bm.id, t.result);
            }
          }
        });
      }
    });

    return map;
  }, [benchmarks, genericTests, speedTests, strengthTests]);

  // Stats summary
  const summaryStats = useMemo(() => {
    return benchmarks.map(bm => {
      let total = 0;
      let levels = [0, 0, 0, 0]; // count per level
      players.forEach(p => {
        const val = playerResults.get(p.id)?.get(bm.id);
        if (val != null) {
          total++;
          const { level } = getPlayerLevel(val, bm);
          levels[level - 1]++;
        }
      });
      return { benchmarkId: bm.id, total, levels };
    });
  }, [benchmarks, players, playerResults]);

  if (benchmarks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            Aucun benchmark défini. Configurez des benchmarks dans l'onglet ci-dessus pour comparer les performances.
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
                      <p className="text-xs text-muted-foreground font-normal">{bm.unit}</p>
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
                    if (val == null) {
                      return (
                        <TableCell key={bm.id} className="text-center">
                          <span className="text-muted-foreground text-xs">-</span>
                        </TableCell>
                      );
                    }
                    const { label, color } = getPlayerLevel(val, bm);
                    return (
                      <TableCell key={bm.id} className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono font-semibold text-sm">{val}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${color}`}>
                            {label}
                          </Badge>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}

              {/* Summary row */}
              <TableRow className="bg-muted/30 font-semibold border-t-2">
                <TableCell className="sticky left-0 bg-muted/30 z-10">Répartition</TableCell>
                {benchmarks.map((bm, idx) => {
                  const stats = summaryStats[idx];
                  if (!stats || stats.total === 0) {
                    return <TableCell key={bm.id} className="text-center text-xs text-muted-foreground">Aucune donnée</TableCell>;
                  }
                  return (
                    <TableCell key={bm.id} className="text-center">
                      <div className="flex justify-center gap-1">
                        {stats.levels.map((count, i) => (
                          count > 0 && (
                            <Badge
                              key={i}
                              variant="outline"
                              className={`text-[10px] ${
                                i === 0 ? "border-red-300 text-red-600" :
                                i === 1 ? "border-amber-300 text-amber-600" :
                                i === 2 ? "border-green-300 text-green-600" :
                                "border-emerald-300 text-emerald-600"
                              }`}
                            >
                              {count}
                            </Badge>
                          )
                        ))}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
