import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { Users, TrendingUp, Filter, UserCheck, Shield, Zap } from "lucide-react";
import { LoadSummary, getRiskColor } from "@/lib/trainingLoadCalculations";
import { getRugbyPositionGroup, getPositionGroupLabel, isRugbySport, RugbyPositionGroup } from "@/lib/constants/sportPositions";
import { isIndividualSport } from "@/lib/constants/sportTypes";
import { getDisciplineLabel } from "@/lib/constants/athleticProfiles";
import { cn } from "@/lib/utils";

interface PlayerWithSummary {
  id: string;
  name: string;
  position?: string;
  discipline?: string | null;
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
  sportType?: string;
}

// Color palette for disciplines
const DISCIPLINE_COLORS = [
  "hsl(210, 80%, 55%)",   // Blue
  "hsl(340, 75%, 55%)",   // Pink
  "hsl(160, 65%, 42%)",   // Teal
  "hsl(32, 89%, 55%)",    // Orange
  "hsl(270, 65%, 55%)",   // Purple
  "hsl(45, 90%, 48%)",    // Amber
  "hsl(190, 80%, 42%)",   // Cyan
  "hsl(0, 75%, 55%)",     // Red
  "hsl(120, 50%, 42%)",   // Green
  "hsl(300, 50%, 55%)",   // Magenta
];

function truncateName(name: string, maxLen: number = 14): string {
  if (name.length <= maxLen) return name;
  // Try "Prénom N." format
  const parts = name.split(" ");
  if (parts.length >= 2) {
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0) + ".";
    const short = `${firstName} ${lastInitial}`;
    if (short.length <= maxLen) return short;
    // If still too long, truncate first name
    return `${firstName.substring(0, maxLen - lastInitial.length - 1)}. ${lastInitial}`;
  }
  return name.substring(0, maxLen - 1) + "…";
}

export function TeamLoadComparison({
  players,
  teamAverage,
  onPlayerClick,
  isLoading,
  sportType,
}: TeamLoadComparisonProps) {
  const [sortBy, setSortBy] = useState<"name" | "ratio" | "risk">("risk");
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");

  const isRugby = isRugbySport(sportType);
  const isIndividual = isIndividualSport(sportType || "");

  // Get unique positions
  const positions = useMemo(() => 
    [...new Set(players.filter(p => p.position).map(p => p.position!))],
    [players]
  );

  // Get unique disciplines for individual sports
  const disciplines = useMemo(() => {
    if (!isIndividual) return [];
    const discs = [...new Set(players.filter(p => p.discipline).map(p => p.discipline!))];
    return discs.sort();
  }, [players, isIndividual]);

  // Map discipline to color
  const disciplineColorMap = useMemo(() => {
    const map = new Map<string, string>();
    disciplines.forEach((d, i) => {
      map.set(d, DISCIPLINE_COLORS[i % DISCIPLINE_COLORS.length]);
    });
    return map;
  }, [disciplines]);

  // Enrich players
  const enrichedPlayers = useMemo(() => 
    players.map(p => ({
      ...p,
      positionGroup: isRugby ? getRugbyPositionGroup(p.position) : null,
    })),
    [players, isRugby]
  );

  // Filter and sort players
  const filteredPlayers = useMemo(() => 
    enrichedPlayers
      .filter(p => p.summary !== null)
      .filter(p => filterPosition === "all" || p.position === filterPosition)
      .filter(p => {
        if (filterGroup === "all") return true;
        if (isRugby) return p.positionGroup === filterGroup;
        if (isIndividual) return p.discipline === filterGroup;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "ratio") return (b.summary?.ewmaRatio || 0) - (a.summary?.ewmaRatio || 0);
        const riskOrder = { danger: 0, warning: 1, optimal: 2 };
        return (riskOrder[a.summary?.riskLevel || "optimal"] || 2) - (riskOrder[b.summary?.riskLevel || "optimal"] || 2);
      }),
    [enrichedPlayers, filterPosition, filterGroup, sortBy, isRugby, isIndividual]
  );

  // Calculate group averages for rugby
  const groupAverages = useMemo(() => {
    if (!isRugby) return null;
    
    const avantsPlayers = enrichedPlayers.filter(p => p.positionGroup === "avants" && p.summary);
    const tqPlayers = enrichedPlayers.filter(p => p.positionGroup === "trois_quarts" && p.summary);
    
    return {
      avants: avantsPlayers.length > 0 ? {
        count: avantsPlayers.length,
        avgRatio: avantsPlayers.reduce((sum, p) => sum + (p.summary?.ewmaRatio || 0), 0) / avantsPlayers.length,
        avgAcute: avantsPlayers.reduce((sum, p) => sum + (p.summary?.ewmaAcute || 0), 0) / avantsPlayers.length,
      } : null,
      troisQuarts: tqPlayers.length > 0 ? {
        count: tqPlayers.length,
        avgRatio: tqPlayers.reduce((sum, p) => sum + (p.summary?.ewmaRatio || 0), 0) / tqPlayers.length,
        avgAcute: tqPlayers.reduce((sum, p) => sum + (p.summary?.ewmaAcute || 0), 0) / tqPlayers.length,
      } : null,
    };
  }, [enrichedPlayers, isRugby]);

  // Calculate discipline averages for individual sports
  const disciplineAverages = useMemo(() => {
    if (!isIndividual || disciplines.length === 0) return null;
    
    return disciplines.map(disc => {
      const discPlayers = enrichedPlayers.filter(p => p.discipline === disc && p.summary);
      if (discPlayers.length === 0) return null;
      return {
        discipline: disc,
        label: getDisciplineLabel(disc),
        color: disciplineColorMap.get(disc) || "hsl(var(--muted-foreground))",
        count: discPlayers.length,
        avgRatio: discPlayers.reduce((sum, p) => sum + (p.summary?.ewmaRatio || 0), 0) / discPlayers.length,
      };
    }).filter(Boolean);
  }, [enrichedPlayers, disciplines, disciplineColorMap, isIndividual]);

  // Prepare chart data
  const chartData = filteredPlayers.map(p => ({
    name: truncateName(p.name),
    fullName: p.name,
    ratio: p.summary?.ewmaRatio || 0,
    riskLevel: p.summary?.riskLevel || "optimal",
    id: p.id,
    position: p.position,
    discipline: p.discipline,
    group: p.positionGroup,
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
    <Card className="bg-gradient-card shadow-lg border-0">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Comparaison Équipe
          </CardTitle>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Rugby Group Filter */}
            {isRugby && (
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-[120px] h-9">
                  <Shield className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="avants">
                    <span className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      Avants
                    </span>
                  </SelectItem>
                  <SelectItem value="trois_quarts">
                    <span className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-cyan-500" />
                      3/4
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Discipline Filter for individual sports */}
            {isIndividual && disciplines.length > 0 && (
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-[150px] h-9">
                  <Zap className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Discipline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {disciplines.map(disc => (
                    <SelectItem key={disc} value={disc}>
                      <span className="flex items-center gap-1.5">
                        <div 
                          className="h-2 w-2 rounded-full" 
                          style={{ backgroundColor: disciplineColorMap.get(disc) }}
                        />
                        {getDisciplineLabel(disc)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Position Filter */}
            {positions.length > 0 && !isIndividual && (
              <Select value={filterPosition} onValueChange={setFilterPosition}>
                <SelectTrigger className="w-[140px] h-9">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Poste" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous postes</SelectItem>
                  {positions.map(pos => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[120px] h-9">
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

        {/* Rugby Group Stats */}
        {isRugby && groupAverages && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {teamAverage && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground font-medium">Équipe</p>
                <p className="text-xl font-bold text-primary">{teamAverage.ewmaRatio.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Ratio moyen</p>
              </div>
            )}
            {groupAverages.avants && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <p className="text-xs text-muted-foreground font-medium">Avants ({groupAverages.avants.count})</p>
                </div>
                <p className="text-xl font-bold text-amber-600">{groupAverages.avants.avgRatio.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Ratio moyen</p>
              </div>
            )}
            {groupAverages.troisQuarts && (
              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-cyan-500" />
                  <p className="text-xs text-muted-foreground font-medium">3/4 ({groupAverages.troisQuarts.count})</p>
                </div>
                <p className="text-xl font-bold text-cyan-600">{groupAverages.troisQuarts.avgRatio.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Ratio moyen</p>
              </div>
            )}
          </div>
        )}

        {/* Discipline Group Stats for individual sports */}
        {isIndividual && disciplineAverages && disciplineAverages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
            {teamAverage && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground font-medium">Groupe</p>
                <p className="text-xl font-bold text-primary">{teamAverage.ewmaRatio.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Ratio moyen</p>
              </div>
            )}
            {disciplineAverages.map(avg => avg && (
              <div 
                key={avg.discipline} 
                className="p-3 rounded-lg border"
                style={{ 
                  backgroundColor: `${avg.color}10`,
                  borderColor: `${avg.color}40`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: avg.color }} />
                  <p className="text-xs text-muted-foreground font-medium">{avg.label} ({avg.count})</p>
                </div>
                <p className="text-xl font-bold" style={{ color: avg.color }}>{avg.avgRatio.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Ratio moyen</p>
              </div>
            ))}
          </div>
        )}

        {/* Standard team average (non-rugby, non-individual with disciplines) */}
        {!isRugby && (!isIndividual || !disciplineAverages || disciplineAverages.length === 0) && teamAverage && (
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
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 40)}>
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
                width={130}
                className="text-xs"
                tick={({ x, y, payload }) => {
                  const player = chartData.find(p => p.name === payload.value);
                  let dotColor: string | undefined;
                  
                  if (isRugby) {
                    dotColor = player?.group === "avants" ? "hsl(var(--warning))" : 
                               player?.group === "trois_quarts" ? "hsl(var(--accent))" : undefined;
                  } else if (isIndividual && player?.discipline) {
                    dotColor = disciplineColorMap.get(player.discipline);
                  }
                  
                  return (
                    <g>
                      {dotColor && (
                        <circle cx={x - 120} cy={y} r={4} fill={dotColor} />
                      )}
                      <text x={x - 5} y={y} dy={4} textAnchor="end" fontSize={11} fill="currentColor">
                        {payload.value}
                      </text>
                    </g>
                  );
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="font-medium">{data.fullName}</p>
                      {data.position && (
                        <p className="text-xs text-muted-foreground">{data.position}</p>
                      )}
                      {isRugby && data.group && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {getPositionGroupLabel(data.group)}
                        </Badge>
                      )}
                      {isIndividual && data.discipline && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {getDisciplineLabel(data.discipline)}
                        </Badge>
                      )}
                      <p className="text-sm mt-1">
                        Ratio: <span className={cn("font-semibold", getRiskColor(data.riskLevel))}>{data.ratio.toFixed(2)}</span>
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
                radius={[0, 6, 6, 0]}
                onClick={(data) => onPlayerClick?.(data.id)}
                style={{ cursor: "pointer" }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.riskLevel === "optimal" ? "hsl(160, 60%, 42%)" :
                      entry.riskLevel === "warning" ? "hsl(32, 89%, 55%)" :
                      "hsl(0, 84%, 60%)"
                    }
                    fillOpacity={0.85}
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