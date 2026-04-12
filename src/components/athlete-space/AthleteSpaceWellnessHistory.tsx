import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { NAV_COLORS } from "@/components/ui/colored-nav-tabs";

interface Props {
  playerId: string;
  categoryId: string;
}

const METRIC_COLORS: Record<string, string> = {
  sleep_quality: "hsl(220, 70%, 55%)",
  general_fatigue: "hsl(35, 85%, 55%)",
  soreness_upper_body: "hsl(350, 70%, 55%)",
  soreness_lower_body: "hsl(280, 60%, 55%)",
  stress_level: "hsl(160, 60%, 45%)",
};

const METRIC_LABELS: Record<string, string> = {
  sleep_quality: "Sommeil",
  general_fatigue: "Fatigue",
  soreness_upper_body: "Douleurs haut",
  soreness_lower_body: "Douleurs bas",
  stress_level: "Stress",
  recovery_score: "Récupération",
};

export function AthleteSpaceWellnessHistory({ playerId, categoryId }: Props) {
  const { data: wellnessHistory = [], isLoading } = useQuery({
    queryKey: ["athlete-space-wellness-history", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("tracking_date, sleep_quality, sleep_duration, general_fatigue, soreness_upper_body, soreness_lower_body, stress_level")
        .eq("player_id", playerId)
        .order("tracking_date", { ascending: true })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading || wellnessHistory.length < 2) return null;

  const chartData = wellnessHistory.map((w: any) => {
    const recoveryScore = Math.round(
      ((w.sleep_quality || 3) +
        (6 - (w.general_fatigue || 3)) +
        (6 - (w.soreness_lower_body || 3)) +
        (6 - (w.soreness_upper_body || 3)) +
        (6 - (w.stress_level || 3))) / 5 * 20
    );

    return {
      date: format(new Date(w.tracking_date), "dd/MM", { locale: fr }),
      fullDate: format(new Date(w.tracking_date), "dd MMM yyyy", { locale: fr }),
      sleep_quality: w.sleep_quality,
      general_fatigue: w.general_fatigue,
      soreness_upper_body: w.soreness_upper_body,
      soreness_lower_body: w.soreness_lower_body,
      stress_level: w.stress_level,
      sleep_duration: w.sleep_duration,
      recovery_score: recoveryScore,
    };
  });

  // Latest recovery score
  const latestRecovery = chartData[chartData.length - 1]?.recovery_score || 0;
  // Convert sleep_duration score (1-5) to approximate hours: 1=>8.5, 2=>7.5, 3=>6.5, 4=>5.5, 5=>4.5
  const sleepScoreToHours = (score: number) => 9.5 - score;
  const sleepEntries = wellnessHistory.filter((w: any) => w.sleep_duration != null && w.sleep_duration > 0);
  const avgSleep = sleepEntries.length > 0
    ? (sleepEntries.reduce((s: number, w: any) => s + sleepScoreToHours(w.sleep_duration), 0) / sleepEntries.length).toFixed(1)
    : "—";

  const getRecoveryColor = (score: number) => {
    if (score >= 80) return "text-status-optimal";
    if (score >= 60) return "text-accent";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-card">
          <CardContent className="py-3 text-center">
            <p className={`text-2xl font-bold ${getRecoveryColor(latestRecovery)}`}>{latestRecovery}%</p>
            <p className="text-[10px] text-muted-foreground">Récupération actuelle</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-primary">{avgSleep}h</p>
            <p className="text-[10px] text-muted-foreground">Sommeil moyen</p>
          </CardContent>
        </Card>
      </div>

      {/* Recovery score evolution */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" style={{ color: NAV_COLORS.sante.base }} />
            Score de récupération
            <Badge variant="secondary" className="text-[10px]">{wellnessHistory.length} jours</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-[10px]" />
              <YAxis domain={[0, 100]} className="text-[10px]" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: "12px",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`${value}%`, "Récupération"]}
                labelFormatter={(_, payload: any[]) => payload?.[0]?.payload?.fullDate || ""}
              />
              <Line type="monotone" dataKey="recovery_score" stroke={NAV_COLORS.sante.base} strokeWidth={2} dot={{ r: 3 }} name="Récupération" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Wellness metrics evolution */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Détail des métriques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-[10px]" />
              <YAxis domain={[1, 5]} className="text-[10px]" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: "12px",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => [
                  `${value}/5`,
                  METRIC_LABELS[name] || name,
                ]}
                labelFormatter={(_, payload: any[]) => payload?.[0]?.payload?.fullDate || ""}
              />
              <Legend formatter={(value) => METRIC_LABELS[value] || value} />
              {Object.entries(METRIC_COLORS).map(([key, color]) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={1.5}
                  dot={false}
                  name={key}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
