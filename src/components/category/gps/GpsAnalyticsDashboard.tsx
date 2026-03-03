import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { TrendingUp, Users, Zap, Activity } from "lucide-react";
import { format, subDays, isAfter, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface GpsSession {
  id: string;
  session_date: string;
  session_name: string | null;
  total_distance_m: number | null;
  high_speed_distance_m: number | null;
  sprint_distance_m: number | null;
  max_speed_ms: number | null;
  player_load: number | null;
  accelerations: number | null;
  decelerations: number | null;
  sprint_count: number | null;
  duration_minutes: number | null;
  players: {
    id: string;
    name: string;
    first_name: string | null;
    position: string | null;
  } | null;
}

const getFullName = (player: GpsSession['players']) => {
  if (!player) return '';
  return player.first_name ? `${player.first_name} ${player.name}` : player.name;
};

interface GpsAnalyticsDashboardProps {
  sessions: GpsSession[];
  categoryId: string;
}

type TimeRange = '7d' | '14d' | '30d' | 'all';

export function GpsAnalyticsDashboard({ sessions, categoryId }: GpsAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('14d');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');

  // Filter sessions by time range
  const filteredSessions = useMemo(() => {
    let filtered = sessions;
    
    if (timeRange !== 'all') {
      const days = parseInt(timeRange);
      const cutoffDate = subDays(new Date(), days);
      filtered = sessions.filter(s => isAfter(parseISO(s.session_date), cutoffDate));
    }

    if (selectedPlayer !== 'all') {
      filtered = filtered.filter(s => s.players?.id === selectedPlayer);
    }

    return filtered;
  }, [sessions, timeRange, selectedPlayer]);

  // Get unique players
  const players = useMemo(() => {
    const playerMap = new Map<string, { id: string; name: string }>();
    sessions.forEach(s => {
      if (s.players) {
        playerMap.set(s.players.id, {
          id: s.players.id,
          name: getFullName(s.players)
        });
      }
    });
    return Array.from(playerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  // Distance over time
  const distanceData = useMemo(() => {
    const byDate = new Map<string, { total: number; hsr: number; sprint: number; count: number }>();
    
    filteredSessions.forEach(s => {
      const existing = byDate.get(s.session_date) || { total: 0, hsr: 0, sprint: 0, count: 0 };
      byDate.set(s.session_date, {
        total: existing.total + (Number(s.total_distance_m) || 0),
        hsr: existing.hsr + (Number(s.high_speed_distance_m) || 0),
        sprint: existing.sprint + (Number(s.sprint_distance_m) || 0),
        count: existing.count + 1
      });
    });

    return Array.from(byDate.entries())
      .map(([date, data]) => ({
        date: format(parseISO(date), 'dd/MM', { locale: fr }),
        fullDate: date,
        distance: Math.round(data.total / data.count),
        hsr: Math.round(data.hsr / data.count),
        sprint: Math.round(data.sprint / data.count),
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [filteredSessions]);

  // Player comparison
  const playerComparison = useMemo(() => {
    const byPlayer = new Map<string, { 
      name: string;
      distance: number; 
      load: number; 
      speed: number;
      sessions: number;
    }>();

    filteredSessions.forEach(s => {
      if (!s.players) return;
      const key = s.players.id;
      const fullName = getFullName(s.players);
      const existing = byPlayer.get(key) || { 
        name: fullName.split(' ').length > 2 
          ? fullName.split(' ').map((n, i) => i === 0 ? n : n.charAt(0) + '.').join(' ')
          : fullName,
        distance: 0, 
        load: 0, 
        speed: 0,
        sessions: 0
      };
      
      byPlayer.set(key, {
        name: existing.name,
        distance: existing.distance + (Number(s.total_distance_m) || 0),
        load: existing.load + (Number(s.player_load) || 0),
        speed: Math.max(existing.speed, Number(s.max_speed_ms) || 0),
        sessions: existing.sessions + 1
      });
    });

    return Array.from(byPlayer.values())
      .map(p => ({
        ...p,
        avgDistance: Math.round(p.distance / p.sessions),
        avgLoad: Math.round(p.load / p.sessions * 10) / 10,
      }))
      .sort((a, b) => b.avgDistance - a.avgDistance)
      .slice(0, 10);
  }, [filteredSessions]);

  // Radar data for selected player or team average
  const radarData = useMemo(() => {
    if (filteredSessions.length === 0) return [];

    const metrics = {
      distance: 0,
      hsr: 0,
      sprint: 0,
      load: 0,
      accel: 0,
      speed: 0,
      count: 0
    };

    filteredSessions.forEach(s => {
      metrics.distance += Number(s.total_distance_m) || 0;
      metrics.hsr += Number(s.high_speed_distance_m) || 0;
      metrics.sprint += Number(s.sprint_distance_m) || 0;
      metrics.load += Number(s.player_load) || 0;
      metrics.accel += (Number(s.accelerations) || 0) + (Number(s.decelerations) || 0);
      metrics.speed = Math.max(metrics.speed, Number(s.max_speed_ms) || 0);
      metrics.count++;
    });

    // Normalize to 0-100 scale based on typical values
    return [
      { metric: 'Distance', value: Math.min(100, (metrics.distance / metrics.count) / 60), fullMark: 100 },
      { metric: 'HSR', value: Math.min(100, (metrics.hsr / metrics.count) / 8), fullMark: 100 },
      { metric: 'Sprint', value: Math.min(100, (metrics.sprint / metrics.count) / 3), fullMark: 100 },
      { metric: 'Load', value: Math.min(100, (metrics.load / metrics.count) / 8), fullMark: 100 },
      { metric: 'Acc/Dec', value: Math.min(100, (metrics.accel / metrics.count) / 0.8), fullMark: 100 },
      { metric: 'V. Max', value: Math.min(100, metrics.speed * 12), fullMark: 100 },
    ];
  }, [filteredSessions]);

  // Top performers
  const topPerformers = useMemo(() => {
    if (filteredSessions.length === 0) return { distance: null, speed: null, load: null };

    const byPlayer = new Map<string, GpsSession[]>();
    filteredSessions.forEach(s => {
      if (!s.players) return;
      const existing = byPlayer.get(s.players.id) || [];
      existing.push(s);
      byPlayer.set(s.players.id, existing);
    });

    let topDistance = { player: '', value: 0 };
    let topSpeed = { player: '', value: 0 };
    let topLoad = { player: '', value: 0 };

    byPlayer.forEach((sessions, playerId) => {
      const player = sessions[0].players!;
      const name = getFullName(player);
      
      const avgDistance = sessions.reduce((acc, s) => acc + (Number(s.total_distance_m) || 0), 0) / sessions.length;
      const maxSpeed = Math.max(...sessions.map(s => Number(s.max_speed_ms) || 0));
      const avgLoad = sessions.reduce((acc, s) => acc + (Number(s.player_load) || 0), 0) / sessions.length;

      if (avgDistance > topDistance.value) topDistance = { player: name, value: avgDistance };
      if (maxSpeed > topSpeed.value) topSpeed = { player: name, value: maxSpeed };
      if (avgLoad > topLoad.value) topLoad = { player: name, value: avgLoad };
    });

    return {
      distance: topDistance.value > 0 ? topDistance : null,
      speed: topSpeed.value > 0 ? topSpeed : null,
      load: topLoad.value > 0 ? topLoad : null,
    };
  }, [filteredSessions]);

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Pas encore de données</h3>
          <p className="text-sm text-muted-foreground">
            Importez des sessions GPS pour voir les analyses
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={timeRange} onValueChange={(v: TimeRange) => setTimeRange(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 derniers jours</SelectItem>
            <SelectItem value="14d">14 derniers jours</SelectItem>
            <SelectItem value="30d">30 derniers jours</SelectItem>
            <SelectItem value="all">Toutes les données</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les joueurs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les joueurs</SelectItem>
            {players.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Top Performers */}
      {(topPerformers.distance || topPerformers.speed || topPerformers.load) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topPerformers.distance && (
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Top Distance</span>
                </div>
                <p className="text-lg font-bold">{topPerformers.distance.player}</p>
                <p className="text-sm text-muted-foreground">
                  Moy. {Math.round(topPerformers.distance.value)} m
                </p>
              </CardContent>
            </Card>
          )}
          {topPerformers.speed && (
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">Top Vitesse</span>
                </div>
                <p className="text-lg font-bold">{topPerformers.speed.player}</p>
                <p className="text-sm text-muted-foreground">
                  Max {topPerformers.speed.value.toFixed(1)} m/s
                </p>
              </CardContent>
            </Card>
          )}
          {topPerformers.load && (
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">Top Player Load</span>
                </div>
                <p className="text-lg font-bold">{topPerformers.load.player}</p>
                <p className="text-sm text-muted-foreground">
                  Moy. {topPerformers.load.value.toFixed(1)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Distance Evolution Chart */}
      {distanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution de la distance moyenne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={distanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="distance" 
                    name="Distance totale (m)"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="hsr" 
                    name="HSR (m)"
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-2))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sprint" 
                    name="Sprint (m)"
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-3))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Comparison */}
        {playerComparison.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Comparaison des joueurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={playerComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))'
                      }}
                    />
                    <Bar 
                      dataKey="avgDistance" 
                      name="Distance moy. (m)"
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Radar Chart */}
        {radarData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Profil de performance
                {selectedPlayer !== 'all' && (
                  <Badge variant="outline" className="ml-2">
                    {players.find(p => p.id === selectedPlayer)?.name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" className="text-xs" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-xs" />
                    <Radar
                      name="Performance"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
