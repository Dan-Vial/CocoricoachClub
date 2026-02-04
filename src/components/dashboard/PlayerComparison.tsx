import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PlayerComparisonProps {
  categoryIds: string[];
}

// Sport-specific metrics configuration
const getSportMetrics = (sportType: string) => {
  const sport = sportType?.toLowerCase() || "";
  
  if (sport.includes("judo")) {
    return {
      metrics: ["ewmaRatio", "load", "pullups", "sjft"],
      labels: {
        ewmaRatio: "Ratio EWMA",
        load: "Charge Moy.",
        pullups: "Max Tractions",
        sjft: "Score SJFT",
      },
      units: {
        ewmaRatio: "",
        load: "",
        pullups: " reps",
        sjft: "",
      },
    };
  }
  
  if (sport.includes("handball")) {
    return {
      metrics: ["ewmaRatio", "load", "sprint30", "cmj"],
      labels: {
        ewmaRatio: "Ratio EWMA",
        load: "Charge Moy.",
        sprint30: "Sprint 30m",
        cmj: "CMJ",
      },
      units: {
        ewmaRatio: "",
        load: "",
        sprint30: "s",
        cmj: " cm",
      },
    };
  }
  
  if (sport.includes("football")) {
    return {
      metrics: ["ewmaRatio", "load", "sprint30", "ift"],
      labels: {
        ewmaRatio: "Ratio EWMA",
        load: "Charge Moy.",
        sprint30: "Sprint 30m",
        ift: "30-15 IFT",
      },
      units: {
        ewmaRatio: "",
        load: "",
        sprint30: "s",
        ift: " km/h",
      },
    };
  }
  
  if (sport.includes("aviron")) {
    return {
      metrics: ["ewmaRatio", "load", "ergo2000", "peakPower"],
      labels: {
        ewmaRatio: "Ratio EWMA",
        load: "Charge Moy.",
        ergo2000: "Ergo 2000m",
        peakPower: "Puissance Max",
      },
      units: {
        ewmaRatio: "",
        load: "",
        ergo2000: "",
        peakPower: " W",
      },
    };
  }
  
  if (sport.includes("volleyball")) {
    return {
      metrics: ["ewmaRatio", "load", "cmj", "dropJump"],
      labels: {
        ewmaRatio: "Ratio EWMA",
        load: "Charge Moy.",
        cmj: "CMJ",
        dropJump: "Drop Jump",
      },
      units: {
        ewmaRatio: "",
        load: "",
        cmj: " cm",
        dropJump: " cm",
      },
    };
  }
  
  if (sport.includes("bowling")) {
    return {
      metrics: ["ewmaRatio", "load", "avgScore", "strikeRate"],
      labels: {
        ewmaRatio: "Ratio EWMA",
        load: "Charge Moy.",
        avgScore: "Score Moyen",
        strikeRate: "% Strikes",
      },
      units: {
        ewmaRatio: "",
        load: "",
        avgScore: "",
        strikeRate: "%",
      },
    };
  }
  
  if (sport.includes("basketball")) {
    return {
      metrics: ["ewmaRatio", "load", "sprint20", "cmj"],
      labels: {
        ewmaRatio: "Ratio EWMA",
        load: "Charge Moy.",
        sprint20: "Sprint 20m",
        cmj: "CMJ/DJ",
      },
      units: {
        ewmaRatio: "",
        load: "",
        sprint20: "s",
        cmj: " cm",
      },
    };
  }
  
  // Default (Rugby and others)
  return {
    metrics: ["ewmaRatio", "load", "sprint40m", "vma"],
    labels: {
      ewmaRatio: "Ratio EWMA",
      load: "Charge Moy.",
      sprint40m: "Meilleur 40m",
      vma: "VMA Moy.",
    },
    units: {
      ewmaRatio: "",
      load: "",
      sprint40m: "s",
      vma: " km/h",
    },
  };
};

export function PlayerComparison({ categoryIds }: PlayerComparisonProps) {
  // First get the category to determine sport type
  const { data: category } = useQuery({
    queryKey: ["category-sport", categoryIds[0]],
    queryFn: async () => {
      if (!categoryIds[0]) return null;
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryIds[0])
        .single();
      if (error) throw error;
      return data;
    },
    enabled: categoryIds.length > 0,
  });

  const sportType = category?.rugby_type || "XV";
  const sportConfig = getSportMetrics(sportType);

  const { data: comparison, isLoading } = useQuery({
    queryKey: ["player-comparison", categoryIds, sportType],
    queryFn: async () => {
      if (categoryIds.length === 0) return [];

      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name")
        .in("category_id", categoryIds);

      if (playersError) throw playersError;
      if (!players || players.length === 0) return [];

      const playerIds = players.map((p) => p.id);

      // Fetch AWCR data (universal)
      const { data: awcrData } = await supabase
        .from("awcr_tracking")
        .select("player_id, awcr, training_load, session_date, acute_load, chronic_load")
        .in("player_id", playerIds)
        .not("awcr", "is", null)
        .order("session_date", { ascending: false })
        .limit(100);

      // Fetch speed tests
      const { data: speedData } = await supabase
        .from("speed_tests")
        .select("player_id, time_40m_seconds, vma_kmh, test_type")
        .in("player_id", playerIds)
        .order("test_date", { ascending: false })
        .limit(100);

      // Fetch jump tests
      const { data: jumpData } = await supabase
        .from("jump_tests")
        .select("player_id, result_cm, test_type")
        .in("player_id", playerIds)
        .order("test_date", { ascending: false })
        .limit(100);

      // Fetch generic tests (for sport-specific metrics)
      const { data: genericData } = await supabase
        .from("generic_tests")
        .select("player_id, result_value, test_type, test_category")
        .in("player_id", playerIds)
        .order("test_date", { ascending: false })
        .limit(200);

      return players.map((player) => {
        const playerAwcr = awcrData?.filter((a) => a.player_id === player.id) || [];
        const playerSpeed = speedData?.filter((s) => s.player_id === player.id) || [];
        const playerJump = jumpData?.filter((j) => j.player_id === player.id) || [];
        const playerGeneric = genericData?.filter((g) => g.player_id === player.id) || [];

        // Calculate EWMA Ratio (Acute/Chronic) from awcr_tracking data
        // Sort by date to get recent data for EWMA calculation
        const sortedAwcr = [...playerAwcr].sort((a, b) => 
          new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        );
        
        // Use existing acute_load and chronic_load if available, otherwise calculate from recent data
        const latestWithLoads = sortedAwcr.find(a => a.acute_load && a.chronic_load);
        let ewmaRatio: number | null = null;
        
        if (latestWithLoads && latestWithLoads.chronic_load && latestWithLoads.chronic_load > 0) {
          ewmaRatio = Number((latestWithLoads.acute_load! / latestWithLoads.chronic_load).toFixed(2));
        } else if (sortedAwcr.length >= 7) {
          // Calculate from training loads using EWMA approximation
          const recentLoads = sortedAwcr.slice(0, 28).map(a => a.training_load || 0);
          const acuteLoads = recentLoads.slice(0, 7);
          const chronicLoads = recentLoads.slice(0, 28);
          
          const acuteAvg = acuteLoads.reduce((a, b) => a + b, 0) / acuteLoads.length;
          const chronicAvg = chronicLoads.reduce((a, b) => a + b, 0) / chronicLoads.length;
          
          if (chronicAvg > 0) {
            ewmaRatio = Number((acuteAvg / chronicAvg).toFixed(2));
          }
        }
        
        // Calculate Load
        const avgLoad =
          playerAwcr.length > 0
            ? playerAwcr.reduce((sum, a) => sum + (a.training_load || 0), 0) / playerAwcr.length
            : null;

        // Speed tests
        const sprint40 = playerSpeed.filter(s => s.time_40m_seconds).length > 0
          ? Math.min(...playerSpeed.filter(s => s.time_40m_seconds).map(s => Number(s.time_40m_seconds)))
          : null;

        const sprint30 = playerGeneric.filter(g => g.test_type?.includes("30m")).length > 0
          ? Math.min(...playerGeneric.filter(g => g.test_type?.includes("30m")).map(g => Number(g.result_value)))
          : null;

        const sprint20 = playerGeneric.filter(g => g.test_type?.includes("20m")).length > 0
          ? Math.min(...playerGeneric.filter(g => g.test_type?.includes("20m")).map(g => Number(g.result_value)))
          : null;

        const vma = playerSpeed.filter(s => s.vma_kmh).length > 0
          ? playerSpeed.filter(s => s.vma_kmh).reduce((sum, s) => sum + Number(s.vma_kmh), 0) / playerSpeed.filter(s => s.vma_kmh).length
          : null;

        // Jump tests
        const cmjTests = playerJump.filter(j => j.test_type?.toLowerCase().includes("cmj"));
        const cmj = cmjTests.length > 0
          ? Math.max(...cmjTests.map(j => Number(j.result_cm)))
          : null;

        const djTests = playerJump.filter(j => j.test_type?.toLowerCase().includes("drop"));
        const dropJump = djTests.length > 0
          ? Math.max(...djTests.map(j => Number(j.result_cm)))
          : null;

        // Sport-specific metrics from generic tests
        const pullups = playerGeneric.filter(g => g.test_type?.toLowerCase().includes("traction")).length > 0
          ? Math.max(...playerGeneric.filter(g => g.test_type?.toLowerCase().includes("traction")).map(g => Number(g.result_value)))
          : null;

        const sjft = playerGeneric.filter(g => g.test_type?.toLowerCase().includes("sjft")).length > 0
          ? playerGeneric.filter(g => g.test_type?.toLowerCase().includes("sjft"))[0]?.result_value
          : null;

        const ift = playerGeneric.filter(g => g.test_type?.toLowerCase().includes("30-15")).length > 0
          ? Math.max(...playerGeneric.filter(g => g.test_type?.toLowerCase().includes("30-15")).map(g => Number(g.result_value)))
          : null;

        const ergo2000 = playerGeneric.filter(g => g.test_type?.toLowerCase().includes("ergo") || g.test_type?.toLowerCase().includes("2000")).length > 0
          ? playerGeneric.filter(g => g.test_type?.toLowerCase().includes("ergo") || g.test_type?.toLowerCase().includes("2000"))[0]?.result_value
          : null;

        const peakPower = playerGeneric.filter(g => g.test_type?.toLowerCase().includes("puissance") || g.test_type?.toLowerCase().includes("power")).length > 0
          ? Math.max(...playerGeneric.filter(g => g.test_type?.toLowerCase().includes("puissance") || g.test_type?.toLowerCase().includes("power")).map(g => Number(g.result_value)))
          : null;

        return {
          name: player.name,
          ewmaRatio,
          load: avgLoad ? Math.round(avgLoad) : null,
          sprint40m: sprint40 ? Number(sprint40.toFixed(2)) : null,
          sprint30: sprint30 ? Number(sprint30.toFixed(2)) : null,
          sprint20: sprint20 ? Number(sprint20.toFixed(2)) : null,
          vma: vma ? Number(vma.toFixed(1)) : null,
          cmj: cmj ? Number(cmj.toFixed(0)) : null,
          dropJump: dropJump ? Number(dropJump.toFixed(0)) : null,
          pullups: pullups ? Number(pullups) : null,
          sjft: sjft ? Number(sjft) : null,
          ift: ift ? Number(ift.toFixed(1)) : null,
          ergo2000: ergo2000 ? formatTime(ergo2000) : null,
          peakPower: peakPower ? Number(peakPower) : null,
          avgScore: null,
          strikeRate: null,
        };
      });
    },
    enabled: categoryIds.length > 0,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getEwmaBadge = (ratio: number | null) => {
    if (!ratio) return null;
    if (ratio < 0.8)
      return (
        <Badge variant="secondary" className="bg-status-info/20 text-status-info">
          Sous-charge
        </Badge>
      );
    if (ratio > 1.5)
      return (
        <Badge variant="destructive" className="bg-status-error/20 text-status-error">
          Surcharge
        </Badge>
      );
    if (ratio > 1.3)
      return (
        <Badge className="bg-status-warning/20 text-status-warning">
          Vigilance
        </Badge>
      );
    return (
      <Badge variant="default" className="bg-status-success/20 text-status-success">
        Optimal
      </Badge>
    );
  };

  const formatValue = (metric: string, value: any, unit: string) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "string") return value;
    return `${value}${unit}`;
  };

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle>Comparaison des Athlètes</CardTitle>
      </CardHeader>
      <CardContent>
        {comparison && comparison.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Athlète</TableHead>
                {sportConfig.metrics.map((metric) => (
                  <TableHead key={metric}>
                    {sportConfig.labels[metric as keyof typeof sportConfig.labels]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.map((player, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  {sportConfig.metrics.map((metric) => (
                    <TableCell key={metric}>
                      {metric === "ewmaRatio" ? (
                        <div className="flex items-center gap-2">
                          {player.ewmaRatio || "—"}
                          {player.ewmaRatio && getEwmaBadge(player.ewmaRatio)}
                        </div>
                      ) : (
                        formatValue(
                          metric,
                          player[metric as keyof typeof player],
                          sportConfig.units[metric as keyof typeof sportConfig.units]
                        )
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Aucune donnée de comparaison disponible
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Helper to format time in seconds to MM:SS
function formatTime(seconds: number): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
