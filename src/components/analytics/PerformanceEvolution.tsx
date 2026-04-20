import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, LineChartIcon, BarChart3, AreaChartIcon, Users, User, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PerformanceEvolutionProps {
  categoryId: string;
  sportType?: string;
}

type ChartType = "line" | "bar" | "area";
type ViewMode = "team" | "individual";

interface DiscoveredTest {
  key: string;
  label: string;
  unit: string;
  source: "speed" | "strength" | "jump" | "generic";
}

const PLAYER_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(198, 93%, 60%)",
  "hsl(340, 82%, 52%)",
  "hsl(25, 95%, 53%)",
];

const formatTestLabel = (testType: string): string => {
  return testType
    .replace(/_/g, " ")
    .replace(/(\d+)m/g, "$1m")
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function PerformanceEvolution({ categoryId, sportType = "XV" }: PerformanceEvolutionProps) {
  const [chartType, setChartType] = useState<ChartType>("line");
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("team");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players-evolution", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name, discipline")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data?.map(p => ({
        ...p,
        fullName: [p.first_name, p.name].filter(Boolean).join(" "),
      }));
    },
  });

  const { data: speedTests, isLoading: loadingSpeed } = useQuery({
    queryKey: ["speed-tests-evolution", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_tests")
        .select("*, players!inner(name, first_name)")
        .eq("category_id", categoryId)
        .order("test_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: strengthTests, isLoading: loadingStrength } = useQuery({
    queryKey: ["strength-tests-evolution", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strength_tests")
        .select("*, players!inner(name, first_name)")
        .eq("category_id", categoryId)
        .order("test_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: jumpTests, isLoading: loadingJump } = useQuery({
    queryKey: ["jump-tests-evolution", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jump_tests")
        .select("*, players!inner(name, first_name)")
        .eq("category_id", categoryId)
        .order("test_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: genericTests, isLoading: loadingGeneric } = useQuery({
    queryKey: ["generic-tests-evolution", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generic_tests")
        .select("*, players!inner(name, first_name)")
        .eq("category_id", categoryId)
        .order("test_date");
      if (error) throw error;
      return data;
    },
  });

  // Discover available tests
  const availableTests = useMemo(() => {
    const tests: DiscoveredTest[] = [];
    const addedKeys = new Set<string>();

    if (speedTests?.length) {
      new Set(speedTests.map(t => t.test_type).filter(Boolean)).forEach(type => {
        if (type && !addedKeys.has(type)) {
          tests.push({ key: type, label: formatTestLabel(type), unit: type.includes("1600") ? "min.s" : "s", source: "speed" });
          addedKeys.add(type);
        }
      });
    }
    if (strengthTests?.length) {
      new Set(strengthTests.map(t => t.test_name).filter(Boolean)).forEach(type => {
        if (type && !addedKeys.has(type)) {
          tests.push({ key: type, label: formatTestLabel(type), unit: "kg", source: "strength" });
          addedKeys.add(type);
        }
      });
    }
    if (jumpTests?.length) {
      new Set(jumpTests.map(t => t.test_type).filter(Boolean)).forEach(type => {
        if (type && !addedKeys.has(type)) {
          tests.push({ key: type, label: formatTestLabel(type), unit: "cm", source: "jump" });
          addedKeys.add(type);
        }
      });
    }
    if (genericTests?.length) {
      new Set(genericTests.map(t => t.test_type).filter(Boolean)).forEach(type => {
        if (type && !addedKeys.has(type)) {
          const sample = genericTests.find(t => t.test_type === type);
          tests.push({ key: type, label: formatTestLabel(type), unit: sample?.result_unit || "", source: "generic" });
          addedKeys.add(type);
        }
      });
    }
    return tests;
  }, [speedTests, strengthTests, jumpTests, genericTests]);

  // Auto-select first test
  useMemo(() => {
    if (availableTests.length > 0 && !selectedTest) {
      setSelectedTest(availableTests[0].key);
    }
  }, [availableTests, selectedTest]);

  // Extract value from a test record
  const extractValue = useCallback((record: any, test: DiscoveredTest): number | null => {
    switch (test.source) {
      case "speed":
        if (test.key.includes("1600")) {
          const totalSec = (Number(record.time_1600m_minutes || 0) * 60) + Number(record.time_1600m_seconds || 0);
          return totalSec > 0 ? totalSec : null;
        }
        const time = Number(record.time_40m_seconds || 0);
        return time > 0 ? time : null;
      case "strength":
        const w = Number(record.weight_kg || 0);
        return w > 0 ? w : null;
      case "jump":
        const r = Number(record.result_cm || 0);
        return r > 0 ? r : null;
      case "generic":
        const v = Number(record.result_value || 0);
        return v > 0 ? v : null;
    }
  }, []);

  // Get all records for the selected test
  const getRecordsForTest = useCallback((test: DiscoveredTest) => {
    switch (test.source) {
      case "speed": return speedTests?.filter(t => t.test_type === test.key) || [];
      case "strength": return strengthTests?.filter(t => t.test_name === test.key) || [];
      case "jump": return jumpTests?.filter(t => t.test_type === test.key) || [];
      case "generic": return genericTests?.filter(t => t.test_type === test.key) || [];
    }
  }, [speedTests, strengthTests, jumpTests, genericTests]);

  // Players who have data for this test
  const playersWithData = useMemo(() => {
    if (!selectedTest || !players) return [];
    const test = availableTests.find(t => t.key === selectedTest);
    if (!test) return [];
    const records = getRecordsForTest(test);
    const playerIdsWithData = new Set(records.map((r: any) => r.player_id));
    return players.filter(p => playerIdsWithData.has(p.id));
  }, [selectedTest, players, availableTests, getRecordsForTest]);

  // Chart data - team average or individual players
  const chartData = useMemo(() => {
    if (!selectedTest) return [];
    const test = availableTests.find(t => t.key === selectedTest);
    if (!test) return [];
    const records = getRecordsForTest(test);

    if (viewMode === "team") {
      // Team average per date
      const dateMap = new Map<string, { total: number; count: number }>();
      records.forEach((r: any) => {
        const val = extractValue(r, test);
        if (val === null) return;
        const date = r.test_date;
        if (!dateMap.has(date)) dateMap.set(date, { total: 0, count: 0 });
        const entry = dateMap.get(date)!;
        entry.total += val;
        entry.count += 1;
      });
      return Array.from(dateMap.entries())
        .map(([date, entry]) => ({
          date: format(new Date(date), "dd/MM/yy", { locale: fr }),
          rawDate: date,
          moyenne: entry.count > 0 ? Number((entry.total / entry.count).toFixed(2)) : 0,
        }))
        .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
    }

    // Individual mode - one series per selected player
    const activePlayers = selectedPlayerIds.length > 0 
      ? selectedPlayerIds 
      : playersWithData.slice(0, 3).map(p => p.id);

    const allDates = new Set<string>();
    const playerData = new Map<string, Map<string, number>>();

    activePlayers.forEach(pid => {
      const pRecords = records.filter((r: any) => r.player_id === pid);
      const dateValues = new Map<string, number>();
      pRecords.forEach((r: any) => {
        const val = extractValue(r, test);
        if (val !== null) {
          dateValues.set(r.test_date, val);
          allDates.add(r.test_date);
        }
      });
      playerData.set(pid, dateValues);
    });

    const sortedDates = Array.from(allDates).sort();
    return sortedDates.map(date => {
      const point: any = {
        date: format(new Date(date), "dd/MM/yy", { locale: fr }),
        rawDate: date,
      };
      activePlayers.forEach(pid => {
        const val = playerData.get(pid)?.get(date);
        point[pid] = val ?? null;
      });
      return point;
    });
  }, [selectedTest, availableTests, getRecordsForTest, extractValue, viewMode, selectedPlayerIds, playersWithData]);

  // Player progression stats
  const playerStats = useMemo(() => {
    if (viewMode !== "individual" || !selectedTest) return [];
    const test = availableTests.find(t => t.key === selectedTest);
    if (!test) return [];
    const records = getRecordsForTest(test);
    
    const activePlayers = selectedPlayerIds.length > 0 
      ? selectedPlayerIds 
      : playersWithData.slice(0, 3).map(p => p.id);

    return activePlayers.map((pid, i) => {
      const player = players?.find(p => p.id === pid);
      const pRecords = records
        .filter((r: any) => r.player_id === pid)
        .map((r: any) => ({ date: r.test_date, value: extractValue(r, test) }))
        .filter((r: any) => r.value !== null)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (pRecords.length < 1) return null;
      const first = pRecords[0].value!;
      const last = pRecords[pRecords.length - 1].value!;
      const diff = last - first;
      const pct = first !== 0 ? ((diff / first) * 100) : 0;

      return {
        id: pid,
        name: player?.fullName || "?",
        first: Number(first.toFixed(2)),
        last: Number(last.toFixed(2)),
        diff: Number(diff.toFixed(2)),
        pct: Number(pct.toFixed(1)),
        count: pRecords.length,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      };
    }).filter(Boolean);
  }, [viewMode, selectedTest, availableTests, getRecordsForTest, extractValue, selectedPlayerIds, playersWithData, players]);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const isLoading = loadingSpeed || loadingStrength || loadingJump || loadingGeneric;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentTest = availableTests.find(t => t.key === selectedTest);

  const formatValue = (value: number, unit: string): string => {
    if (unit === "min.s" && value >= 60) {
      const minutes = Math.floor(value / 60);
      const seconds = Math.round(value % 60);
      return `${minutes}'${seconds.toString().padStart(2, "0")}''`;
    }
    if (unit === "s") return `${value.toFixed(2)}s`;
    return `${value} ${unit}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const unit = currentTest?.unit || "";
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {payload.map((entry: any) => {
          const playerName = viewMode === "team" 
            ? "Moyenne équipe" 
            : players?.find(p => p.id === entry.dataKey)?.fullName || entry.name;
          return (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm">{playerName}:</span>
              <span className="text-sm font-bold">{formatValue(entry.value, unit)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const activePlayers = viewMode === "individual" 
    ? (selectedPlayerIds.length > 0 ? selectedPlayerIds : playersWithData.slice(0, 3).map(p => p.id))
    : [];

  const renderChart = () => {
    if (chartData.length === 0) {
      return <p className="text-muted-foreground text-center py-8">Aucune donnée disponible pour ce test</p>;
    }

    const dataKeys = viewMode === "team" 
      ? [{ key: "moyenne", color: "hsl(var(--primary))", name: "Moyenne équipe" }]
      : activePlayers.map((pid, i) => ({
          key: pid,
          color: PLAYER_COLORS[i % PLAYER_COLORS.length],
          name: players?.find(p => p.id === pid)?.fullName || "?",
        }));

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(value) => {
              if (viewMode === "team") return "Moyenne équipe";
              return players?.find(p => p.id === value)?.fullName || value;
            }} />
            {dataKeys.map(dk => (
              <Area key={dk.key} type="monotone" dataKey={dk.key} stroke={dk.color} fill={dk.color} fillOpacity={0.15} strokeWidth={2} connectNulls />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(value) => {
              if (viewMode === "team") return "Moyenne équipe";
              return players?.find(p => p.id === value)?.fullName || value;
            }} />
            {dataKeys.map(dk => (
              <Bar key={dk.key} dataKey={dk.key} fill={dk.color} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(value) => {
            if (viewMode === "team") return "Moyenne équipe";
            return players?.find(p => p.id === value)?.fullName || value;
          }} />
          {dataKeys.map(dk => (
            <Line key={dk.key} type="monotone" dataKey={dk.key} stroke={dk.color} strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (availableTests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            Aucun test enregistré. Ajoutez des tests dans l'onglet "Tests" pour voir l'évolution.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View mode */}
        <div className="flex items-center border rounded-lg p-1 bg-muted/30">
          <Button variant="ghost" size="sm" onClick={() => { setViewMode("team"); setSelectedPlayerIds([]); }}
            className={cn("h-8 px-3 gap-1.5", viewMode === "team" && "bg-background shadow-sm")}>
            <Users className="h-4 w-4" /> Équipe
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setViewMode("individual")}
            className={cn("h-8 px-3 gap-1.5", viewMode === "individual" && "bg-background shadow-sm")}>
            <User className="h-4 w-4" /> Individuel
          </Button>
        </div>

        {/* Test selector */}
        <Select value={selectedTest} onValueChange={setSelectedTest}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Sélectionner un test" />
          </SelectTrigger>
          <SelectContent>
            {availableTests.map((test) => (
              <SelectItem key={test.key} value={test.key}>
                {test.label} {test.unit && `(${test.unit})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Chart type */}
        <div className="flex items-center border rounded-lg p-1 bg-muted/30">
          <Button variant="ghost" size="sm" onClick={() => setChartType("line")}
            className={cn("h-8 px-2", chartType === "line" && "bg-background shadow-sm")}>
            <LineChartIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setChartType("bar")}
            className={cn("h-8 px-2", chartType === "bar" && "bg-background shadow-sm")}>
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setChartType("area")}
            className={cn("h-8 px-2", chartType === "area" && "bg-background shadow-sm")}>
            <AreaChartIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Player selection for individual mode */}
      {viewMode === "individual" && playersWithData.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground mb-2">Sélectionner les athlètes à comparer :</p>
            <ScrollArea className="w-full">
              <div className="flex flex-wrap gap-2">
                {playersWithData.map((player, i) => {
                  const isSelected = selectedPlayerIds.includes(player.id) || 
                    (selectedPlayerIds.length === 0 && i < 3);
                  const colorIndex = isSelected 
                    ? (selectedPlayerIds.length > 0 ? selectedPlayerIds.indexOf(player.id) : i)
                    : -1;
                  return (
                    <Badge
                      key={player.id}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all hover:scale-105",
                        isSelected && "pr-1"
                      )}
                      style={isSelected && colorIndex >= 0 ? { backgroundColor: PLAYER_COLORS[colorIndex % PLAYER_COLORS.length] } : {}}
                      onClick={() => togglePlayer(player.id)}
                    >
                      {player.fullName}
                      {isSelected && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {viewMode === "team" ? "Évolution moyenne" : "Comparaison individuelle"} — {currentTest?.label || "Test"}
            {currentTest?.unit && ` (${currentTest.unit})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Progression stats for individual mode */}
      {viewMode === "individual" && playerStats.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {playerStats.map((stat: any) => (
            <Card key={stat.id} className="overflow-hidden">
              <div className="h-1" style={{ backgroundColor: stat.color }} />
              <CardContent className="pt-4 pb-3 space-y-2">
                <p className="font-semibold text-sm truncate">{stat.name}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Premier → Dernier</span>
                  <span className="font-mono">
                    {formatValue(stat.first, currentTest?.unit || "")} → {formatValue(stat.last, currentTest?.unit || "")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{stat.count} mesures</span>
                  <Badge variant={stat.diff === 0 ? "secondary" : stat.diff > 0 ? "default" : "destructive"} className="gap-1">
                    {stat.diff > 0 ? <TrendingUp className="h-3 w-3" /> : stat.diff < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {stat.diff > 0 ? "+" : ""}{stat.diff} ({stat.pct > 0 ? "+" : ""}{stat.pct}%)
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
