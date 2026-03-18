import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, Target, TrendingUp } from "lucide-react";
import { athletePortalHeaders, buildAthletePortalFunctionUrl } from "@/lib/athletePortalClient";
import { SPARE_EXERCISE_TYPES } from "@/lib/constants/bowlingBallBrands";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface AthleteTrainingStatsProps {
  token?: string;
  playerId: string;
  categoryId: string;
}

interface SpareStatRow {
  exercise_type: string;
  attempts: number;
  successes: number;
  success_rate: number;
  session_date: string;
}

interface TrainingRound {
  id: string;
  round_number: number;
  created_at: string;
  competition_round_stats: Array<{
    stat_data: Record<string, unknown>;
  }>;
}

export function AthleteTrainingStats({ token, playerId, categoryId }: AthleteTrainingStatsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [spareStats, setSpareStats] = useState<SpareStatRow[]>([]);
  const [trainingRounds, setTrainingRounds] = useState<TrainingRound[]>([]);

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      const res = await fetch(buildAthletePortalFunctionUrl("training-stats", token), {
        headers: athletePortalHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSpareStats(data.spareStats || []);
        setTrainingRounds(data.trainingRounds || []);
      }
    } catch {
      console.error("Error fetching training stats");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Aggregate spare stats by exercise type
  const spareByType = SPARE_EXERCISE_TYPES.map((type) => {
    const entries = spareStats.filter((s) => s.exercise_type === type.value);
    const totalAttempts = entries.reduce((sum, e) => sum + e.attempts, 0);
    const totalSuccesses = entries.reduce((sum, e) => sum + e.successes, 0);
    return {
      type: type.label,
      value: type.value,
      totalAttempts,
      totalSuccesses,
      rate: totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0,
      sessions: entries.length,
    };
  }).filter((s) => s.totalAttempts > 0);

  // Training game scores
  const gameScores = trainingRounds
    .filter((r) => r.competition_round_stats?.length > 0)
    .map((r) => {
      const stats = r.competition_round_stats[0]?.stat_data as Record<string, number>;
      return {
        date: format(parseISO(r.created_at), "dd/MM", { locale: fr }),
        score: stats?.gameScore || 0,
        strikes: stats?.strikes || 0,
        spares: stats?.spares || 0,
        strikePercentage: stats?.strikePercentage || 0,
      };
    })
    .reverse();

  // Spare progression chart data
  const spareProgression = spareStats
    .reduce((acc, entry) => {
      const dateKey = entry.session_date;
      const existing = acc.find((a) => a.date === dateKey);
      if (existing) {
        existing.attempts += entry.attempts;
        existing.successes += entry.successes;
      } else {
        acc.push({ date: dateKey, attempts: entry.attempts, successes: entry.successes });
      }
      return acc;
    }, [] as Array<{ date: string; attempts: number; successes: number }>)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      date: format(parseISO(d.date), "dd/MM", { locale: fr }),
      rate: d.attempts > 0 ? Math.round((d.successes / d.attempts) * 100) : 0,
    }));

  const avgScore = gameScores.length > 0
    ? Math.round(gameScores.reduce((s, g) => s + g.score, 0) / gameScores.length)
    : 0;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="games" className="gap-1 text-xs">
            <BarChart3 className="h-3 w-3" />
            Stats Parties
          </TabsTrigger>
          <TabsTrigger value="specific" className="gap-1 text-xs">
            <Target className="h-3 w-3" />
            Stats Spécifiques
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-1 text-xs">
            <TrendingUp className="h-3 w-3" />
            Progression
          </TabsTrigger>
        </TabsList>

        {/* STATS PARTIES */}
        <TabsContent value="games" className="mt-4 space-y-4">
          {gameScores.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                Aucune partie d'entraînement enregistrée
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{avgScore}</p>
                    <p className="text-xs text-muted-foreground">Moyenne</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {Math.max(...gameScores.map((g) => g.score))}
                    </p>
                    <p className="text-xs text-muted-foreground">Meilleur</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{gameScores.length}</p>
                    <p className="text-xs text-muted-foreground">Parties</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Scores des parties</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={gameScores}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 300]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Détail des parties</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {gameScores.map((g, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-sm">{g.date}</span>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {g.strikes} X
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {g.spares} /
                          </Badge>
                          <span className="font-bold text-primary">{g.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* STATS SPÉCIFIQUES */}
        <TabsContent value="specific" className="mt-4 space-y-4">
          {spareByType.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                Aucune donnée d'entraînement de précision
              </CardContent>
            </Card>
          ) : (
            <>
              {spareByType.map((s) => (
                <Card key={s.value}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{s.type}</span>
                      <Badge className={s.rate >= 70 ? "bg-green-600" : s.rate >= 40 ? "bg-yellow-600" : "bg-red-600"}>
                        {s.rate}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{s.totalSuccesses}/{s.totalAttempts} réussites</span>
                      <span>{s.sessions} séance(s)</span>
                    </div>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${s.rate}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {/* PROGRESSION */}
        <TabsContent value="progress" className="mt-4 space-y-4">
          {gameScores.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Progression des scores</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={gameScores}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 300]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {spareProgression.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Taux de réussite précision</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={spareProgression}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="rate" stroke="hsl(var(--chart-2))" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {gameScores.length <= 1 && spareProgression.length <= 1 && (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                Pas assez de données pour afficher la progression (minimum 2 séances)
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
