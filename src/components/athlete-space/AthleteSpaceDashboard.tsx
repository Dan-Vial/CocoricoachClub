import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { calculateEWMASeries, transformToDailyLoadData } from "@/lib/trainingLoadCalculations";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  playerId: string;
  categoryId: string;
  playerName: string;
  sportType?: string;
}

export function AthleteSpaceDashboard({ playerId, categoryId, playerName, sportType }: Props) {
  const { data: awcrData } = useQuery({
    queryKey: ["athlete-space-awcr", playerId],
    queryFn: async () => {
      const startDate = subDays(new Date(), 56);
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("*")
        .eq("player_id", playerId)
        .gte("session_date", startDate.toISOString().split("T")[0])
        .order("session_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: todayWellness } = useQuery({
    queryKey: ["athlete-space-wellness-today", playerId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("*")
        .eq("player_id", playerId)
        .eq("tracking_date", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: injuries } = useQuery({
    queryKey: ["athlete-space-injuries", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injuries")
        .select("*")
        .eq("player_id", playerId)
        .in("status", ["active", "recovering"]);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: nextTest } = useQuery({
    queryKey: ["athlete-space-next-test", categoryId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("test_reminders")
        .select("*")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const ewmaResults = awcrData && awcrData.length > 0
    ? calculateEWMASeries(transformToDailyLoadData(awcrData, []), "sRPE")
    : [];

  const latestEwma = ewmaResults.length > 0 ? ewmaResults[ewmaResults.length - 1] : null;

  const getDayStatus = () => {
    const hasInjury = injuries && injuries.length > 0;
    const ratioAlert = latestEwma && (latestEwma.ratio > 1.5 || latestEwma.ratio < 0.8);
    const wellnessLow = todayWellness && (
      (todayWellness.sleep_quality || 0) <= 2 || 
      (todayWellness.general_fatigue || 0) >= 4 || 
      (todayWellness.soreness_lower_body || 0) >= 4
    );

    if (hasInjury || ratioAlert) return { label: "Adaptation", color: "bg-destructive text-destructive-foreground", icon: AlertTriangle };
    if (wellnessLow) return { label: "À surveiller", color: "bg-warning text-warning-foreground", icon: Activity };
    return { label: "OK", color: "bg-status-optimal text-white", icon: CheckCircle2 };
  };

  const dayStatus = getDayStatus();

  const getFeedback = (): string[] => {
    const msgs: string[] = [];
    if (!latestEwma) {
      msgs.push("📊 Commence à enregistrer tes séances pour recevoir un suivi personnalisé.");
      return msgs;
    }

    if (latestEwma.ratio >= 0.85 && latestEwma.ratio <= 1.3) {
      msgs.push("✅ Ta charge d'entraînement est cohérente avec ta capacité. Continue comme ça !");
    } else if (latestEwma.ratio > 1.5) {
      msgs.push("⚠️ Attention : surcharge détectée. Pense à optimiser ta récupération (sommeil, nutrition, hydratation).");
    } else if (latestEwma.ratio > 1.3) {
      msgs.push("🔶 Ta charge augmente. Reste attentif à tes sensations et communique avec ton staff.");
    } else if (latestEwma.ratio < 0.8) {
      msgs.push("📉 Charge en baisse — risque de désentraînement. Parle à ton préparateur physique.");
    }

    const last3 = ewmaResults.slice(-3);
    if (last3.length === 3 && last3.every(r => r.ratio > 1.3)) {
      msgs.push("🚨 Surcharge détectée sur 3 semaines consécutives. Une période de récupération est recommandée.");
    }

    if (todayWellness) {
      if ((todayWellness.sleep_quality || 0) <= 2) {
        msgs.push("😴 Ton sommeil était insuffisant. Essaye de dormir 8h+ cette nuit.");
      }
      if ((todayWellness.general_fatigue || 0) >= 4) {
        msgs.push("🔋 Niveau de fatigue élevé. Privilégie la récupération active aujourd'hui.");
      }
    } else {
      msgs.push("💡 N'oublie pas de remplir ton wellness quotidien pour un suivi optimal.");
    }

    return msgs;
  };

  const feedback = getFeedback();

  const chartData = ewmaResults.slice(-14).map(r => ({
    date: format(new Date(r.date), "dd/MM", { locale: fr }),
    acute: Math.round(r.acute),
    chronic: Math.round(r.chronic),
  }));

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Statut du jour</p>
              <Badge className={`text-base px-4 py-1.5 ${dayStatus.color}`}>
                <dayStatus.icon className="h-4 w-4 mr-1.5" />
                {dayStatus.label}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Ratio EWMA</p>
              <p className={`text-3xl font-bold ${
                latestEwma
                  ? latestEwma.ratio >= 0.85 && latestEwma.ratio <= 1.3
                    ? "text-status-optimal"
                    : latestEwma.ratio > 1.5 || latestEwma.ratio < 0.8
                    ? "text-destructive"
                    : "text-warning"
                  : "text-muted-foreground"
              }`}>
                {latestEwma ? latestEwma.ratio.toFixed(2) : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gradient-card">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Charge 7j</p>
            <p className="text-xl font-bold">{latestEwma ? Math.round(latestEwma.acute) : "—"}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Charge 28j</p>
            <p className="text-xl font-bold">{latestEwma ? Math.round(latestEwma.chronic) : "—"}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Blessures</p>
            <p className={`text-xl font-bold ${injuries && injuries.length > 0 ? "text-destructive" : "text-status-optimal"}`}>
              {injuries?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Prochain test</p>
            <p className="text-sm font-semibold">
              {nextTest?.start_date ? format(new Date(nextTest.start_date), "dd MMM", { locale: fr }) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Évolution de ta charge</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-[10px]" />
                <YAxis className="text-[10px]" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="acute" stroke="hsl(var(--accent))" name="Aiguë (7j)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="chronic" stroke="hsl(var(--primary))" name="Chronique (28j)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            Feedback personnalisé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {feedback.map((msg, i) => (
              <p key={i} className="text-sm leading-relaxed">{msg}</p>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
