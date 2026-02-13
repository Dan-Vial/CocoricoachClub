import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Clock, Trophy } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  playerId: string;
  categoryId: string;
  sportType?: string;
}

export function AthleteSpaceProgression({ playerId, categoryId, sportType }: Props) {
  const { data: speedTests = [] } = useQuery({
    queryKey: ["athlete-space-speed-tests", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_tests")
        .select("*")
        .eq("player_id", playerId)
        .order("test_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: strengthTests = [] } = useQuery({
    queryKey: ["athlete-space-strength-tests", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strength_tests")
        .select("*")
        .eq("player_id", playerId)
        .order("test_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: matchStats = [] } = useQuery({
    queryKey: ["athlete-space-match-stats", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_match_stats")
        .select("*, matches!inner(match_date, opponent, score_home, score_away)")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Speed test chart - use time_40m_seconds
  const speedChartData = speedTests
    .filter(t => t.time_40m_seconds)
    .map(t => ({
      date: format(new Date(t.test_date), "dd/MM", { locale: fr }),
      temps: t.time_40m_seconds,
    }));

  // Strength - group by test_name
  const strengthByExercise: Record<string, { date: string; value: number }[]> = {};
  strengthTests.forEach(t => {
    const key = t.test_name;
    if (!strengthByExercise[key]) strengthByExercise[key] = [];
    strengthByExercise[key].push({
      date: format(new Date(t.test_date), "dd/MM", { locale: fr }),
      value: t.weight_kg,
    });
  });

  const getProgressionFeedback = (): string[] => {
    const msgs: string[] = [];

    if (speedTests.length >= 2) {
      const latest = speedTests[speedTests.length - 1];
      const previous = speedTests[speedTests.length - 2];
      if (latest.time_40m_seconds && previous.time_40m_seconds) {
        const diff = latest.time_40m_seconds - previous.time_40m_seconds;
        if (diff < 0) {
          msgs.push(`🏃 Vitesse: tu as progressé de ${Math.abs(diff).toFixed(2)}s par rapport à ton dernier test !`);
        } else if (diff > 0) {
          msgs.push(`🏃 Vitesse: +${diff.toFixed(2)}s par rapport à ton dernier test. Continue de travailler ta vitesse.`);
        }
      }
    }

    Object.entries(strengthByExercise).forEach(([exercise, data]) => {
      if (data.length >= 2) {
        const latest = data[data.length - 1].value;
        const previous = data[data.length - 2].value;
        const diff = latest - previous;
        if (diff > 0) {
          msgs.push(`💪 ${exercise}: +${diff}kg depuis ton dernier test. Belle progression !`);
        }
      }
    });

    if (msgs.length === 0) {
      msgs.push("📊 Tes résultats de tests s'afficheront ici au fur et à mesure.");
    }

    return msgs;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            Ta progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getProgressionFeedback().map((msg, i) => (
            <p key={i} className="text-sm leading-relaxed mb-1">{msg}</p>
          ))}
        </CardContent>
      </Card>

      {speedChartData.length > 1 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Évolution vitesse (40m)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={speedChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-[10px]" />
                <YAxis className="text-[10px]" reversed />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: "12px" }} />
                <Line type="monotone" dataKey="temps" stroke="hsl(var(--accent))" strokeWidth={2} name="Temps (s)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {Object.entries(strengthByExercise).map(([exercise, data]) => (
        data.length > 1 && (
          <Card key={exercise} className="bg-gradient-card shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{exercise}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-[10px]" />
                  <YAxis className="text-[10px]" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} name="Charge (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )
      ))}

      {matchStats.length > 0 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-warning" />
              Derniers matchs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {matchStats.slice(0, 5).map((stat: any) => (
                <div key={stat.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">vs {stat.matches.opponent}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(stat.matches.match_date), "dd MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      {stat.matches.score_home} - {stat.matches.score_away}
                    </Badge>
                    {stat.minutes_played && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3 inline mr-0.5" />
                        {stat.minutes_played} min
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
