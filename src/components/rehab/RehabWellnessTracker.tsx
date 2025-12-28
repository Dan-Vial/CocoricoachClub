import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  AlertTriangle, 
  Heart, 
  Moon, 
  Smile, 
  TrendingDown, 
  TrendingUp,
  Zap
} from "lucide-react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RehabWellnessTrackerProps {
  playerId: string;
  categoryId: string;
}

export function RehabWellnessTracker({ playerId, categoryId }: RehabWellnessTrackerProps) {
  // Fetch wellness data for the last 14 days
  const { data: wellnessData, isLoading } = useQuery({
    queryKey: ["player-rehab-wellness", playerId],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), 14), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("*")
        .eq("player_id", playerId)
        .gte("tracking_date", startDate)
        .order("tracking_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch AWCR data
  const { data: awcrData } = useQuery({
    queryKey: ["player-rehab-awcr", playerId],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), 14), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("*")
        .eq("player_id", playerId)
        .gte("session_date", startDate)
        .order("session_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch active rehab protocol
  const { data: activeProtocol } = useQuery({
    queryKey: ["player-active-rehab", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_rehab_protocols")
        .select("*")
        .eq("player_id", playerId)
        .eq("status", "in_progress")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const latestWellness = wellnessData?.[wellnessData.length - 1];
  const latestAwcr = awcrData?.[awcrData.length - 1];

  // Calculate overall wellness score from available fields
  const calculateWellnessScore = (w: typeof latestWellness) => {
    if (!w) return null;
    // Invert fatigue and stress (higher is worse), keep sleep quality as is
    const fatigueScore = 10 - (w.general_fatigue || 5);
    const stressScore = 10 - (w.stress_level || 5);
    const sleepScore = w.sleep_quality || 5;
    const sorenessScore = 10 - ((w.soreness_upper_body || 0) + (w.soreness_lower_body || 0)) / 2;
    return Math.round((fatigueScore + stressScore + sleepScore + sorenessScore) / 4 * 10) / 10;
  };

  // Calculate wellness trend
  const getWellnessTrend = () => {
    if (!wellnessData || wellnessData.length < 2) return null;
    const recent = wellnessData.slice(-3);
    const avgRecent = recent.reduce((acc, w) => acc + (calculateWellnessScore(w) || 0), 0) / recent.length;
    const older = wellnessData.slice(0, 3);
    const avgOlder = older.reduce((acc, w) => acc + (calculateWellnessScore(w) || 0), 0) / older.length;
    return avgRecent - avgOlder;
  };

  const trend = getWellnessTrend();

  // Prepare chart data
  const chartData = wellnessData?.map((w) => ({
    date: format(new Date(w.tracking_date), "dd/MM"),
    wellness: calculateWellnessScore(w),
    fatigue: w.general_fatigue,
    sleep: w.sleep_quality,
    stress: w.stress_level,
  })) || [];

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 8) return "text-green-600";
    if (score >= 5) return "text-amber-600";
    return "text-red-600";
  };

  const getLoadRecommendation = () => {
    const loadReduction = activeProtocol?.recommended_load_reduction || 50;
    if (!latestAwcr?.awcr) return null;
    
    if (latestAwcr.awcr > 1.5) {
      return {
        type: "warning",
        message: `AWCR élevé (${latestAwcr.awcr.toFixed(2)}). Réduire la charge de ${loadReduction}%.`,
      };
    }
    if (latestAwcr.awcr < 0.8) {
      return {
        type: "info",
        message: "Charge sous-optimale. Augmentation progressive recommandée.",
      };
    }
    return {
      type: "success",
      message: "Charge optimale pendant la réhabilitation.",
    };
  };

  const loadRec = getLoadRecommendation();
  const wellnessScore = calculateWellnessScore(latestWellness);

  return (
    <div className="space-y-4">
      {/* Load Recommendation Alert */}
      {loadRec && (
        <Card className={`border-l-4 ${
          loadRec.type === "warning" ? "border-l-amber-500 bg-amber-500/5" :
          loadRec.type === "success" ? "border-l-green-500 bg-green-500/5" :
          "border-l-blue-500 bg-blue-500/5"
        }`}>
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              {loadRec.type === "warning" ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : loadRec.type === "success" ? (
                <Activity className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingUp className="h-5 w-5 text-blue-600" />
              )}
              <p className="text-sm font-medium">{loadRec.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Wellness Score */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-muted-foreground">Wellness</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${getScoreColor(wellnessScore)}`}>
                {wellnessScore || "-"}/10
              </span>
              {trend !== null && (
                <Badge variant="outline" className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(trend).toFixed(1)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fatigue */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Fatigue</span>
            </div>
            <span className={`text-2xl font-bold ${getScoreColor(latestWellness?.general_fatigue ? 10 - latestWellness.general_fatigue : null)}`}>
              {latestWellness?.general_fatigue || "-"}/10
            </span>
          </CardContent>
        </Card>

        {/* Sleep */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-medium text-muted-foreground">Sommeil</span>
            </div>
            <span className={`text-2xl font-bold ${getScoreColor(latestWellness?.sleep_quality)}`}>
              {latestWellness?.sleep_quality || "-"}/10
            </span>
          </CardContent>
        </Card>

        {/* Stress */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Smile className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">Stress</span>
            </div>
            <span className={`text-2xl font-bold ${getScoreColor(latestWellness?.stress_level ? 10 - latestWellness.stress_level : null)}`}>
              {latestWellness?.stress_level || "-"}/10
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Wellness Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Évolution du bien-être (14 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[0, 10]} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="wellness" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Wellness"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fatigue" 
                    stroke="#f59e0b" 
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    name="Fatigue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
