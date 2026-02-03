import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Users, TrendingUp, Filter, UserCheck } from "lucide-react";
import { LoadSummary, getRiskColor } from "@/lib/trainingLoadCalculations";

interface PlayerWithSummary {
  id: string;
  name: string;
  position?: string;
  summary: LoadSummary | null;
}

interface TeamLoadComparisonProps {
  players: PlayerWithSummary[];
  teamAverage: {
    ewmaRatio: number;
    ewmaAcute: number;
    ewmaChronic: number;
  } | null;
  onPlayerClick?: (playerId: string) => void;
  isLoading?: boolean;
}

export function TeamLoadComparison({
  players,
  teamAverage,
  onPlayerClick,
  isLoading,
}: TeamLoadComparisonProps) {
  const [sortBy, setSortBy] = useState<"name" | "ratio" | "risk">("risk");
  const [filterPosition, setFilterPosition] = useState<string>("all");

  // Get unique positions
  const positions = [...new Set(players.filter(p => p.position).map(p => p.position!))];

  // Filter and sort players
  const filteredPlayers = players
    .filter(p => p.summary !== null)
    .filter(p => filterPosition === "all" || p.position === filterPosition)
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "ratio") return (b.summary?.ewmaRatio || 0) - (a.summary?.ewmaRatio || 0);
      // Risk: danger first, then warning, then optimal
      const riskOrder = { danger: 0, warning: 1, optimal: 2 };
      return (riskOrder[a.summary?.riskLevel || "optimal"] || 2) - (riskOrder[b.summary?.riskLevel || "optimal"] || 2);
    });

  // Prepare chart data
  const chartData = filteredPlayers.map(p => ({
    name: p.name.split(" ").pop() || p.name, // Last name only for chart
    fullName: p.name,
    ratio: p.summary?.ewmaRatio || 0,
    riskLevel: p.summary?.riskLevel || "optimal",
    id: p.id,
  }));

  if (isLoading) {
    return (
      <Card className="bg-gradient-card shadow-md">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/4" />
            <div className="h-[300px] bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Comparaison Équipe
          </CardTitle>

          <div className="flex items-center gap-2 flex-wrap">
            {positions.length > 0 && (
              <Select value={filterPosition} onValueChange={setFilterPosition}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Poste" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {positions.map(pos => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="risk">Risque</SelectItem>
                <SelectItem value="ratio">Ratio</SelectItem>
                <SelectItem value="name">Nom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Team average info */}
        {teamAverage && (
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Moyenne équipe:</span>
              <span className="font-semibold">{teamAverage.ewmaRatio.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Aiguë moy:</span>
              <span className="font-medium">{teamAverage.ewmaAcute.toFixed(0)}</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <UserCheck className="h-12 w-12 mb-4 opacity-50" />
            <p>Aucune donnée de charge pour les athlètes</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 35)}>
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ left: 10, right: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted" />
              <XAxis 
                type="number" 
                domain={[0.5, 2]}
                className="text-xs"
                tickFormatter={(v) => v.toFixed(1)}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="font-medium">{data.fullName}</p>
                      <p className="text-sm">
                        Ratio: <span className={getRiskColor(data.riskLevel)}>{data.ratio.toFixed(2)}</span>
                      </p>
                    </div>
                  );
                }}
              />
              
              {/* Reference lines for zones */}
              <ReferenceLine x={0.85} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <ReferenceLine x={1.0} stroke="hsl(var(--primary))" strokeDasharray="5 5" strokeWidth={1.5} />
              <ReferenceLine x={1.3} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              
              {/* Team average line */}
              {teamAverage && (
                <ReferenceLine 
                  x={teamAverage.ewmaRatio} 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  label={{ value: "Moy", position: "top", fontSize: 10 }}
                />
              )}

              <Bar 
                dataKey="ratio" 
                radius={[0, 4, 4, 0]}
                onClick={(data) => onPlayerClick?.(data.id)}
                style={{ cursor: "pointer" }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.riskLevel === "optimal" ? "hsl(142, 76%, 36%)" :
                      entry.riskLevel === "warning" ? "hsl(45, 93%, 47%)" :
                      "hsl(0, 84%, 60%)"
                    }
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
