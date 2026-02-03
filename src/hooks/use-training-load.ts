import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  DailyLoadData, 
  MetricType, 
  EWMAResult,
  LoadSummary,
  calculateEWMASeries, 
  calculateAWCR,
  calculateLoadSummary,
  transformToDailyLoadData,
  METRICS_CONFIG,
  getAvailableMetrics,
} from "@/lib/trainingLoadCalculations";

interface UseTrainingLoadOptions {
  categoryId: string;
  playerId?: string;
  metric?: MetricType;
  periodDays?: number;
}

export function useTrainingLoad({ 
  categoryId, 
  playerId, 
  metric = "ewma_srpe",
  periodDays = 56 // 8 weeks by default
}: UseTrainingLoadOptions) {
  
  // Fetch category sport type
  const { data: category } = useQuery({
    queryKey: ["category-sport", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const sportType = category?.rugby_type || "XV";

  // Fetch AWCR/RPE data
  const { data: awcrData, isLoading: awcrLoading } = useQuery({
    queryKey: ["training-load-awcr", categoryId, playerId, periodDays],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      let query = supabase
        .from("awcr_tracking")
        .select("*")
        .eq("category_id", categoryId)
        .gte("session_date", startDate.toISOString().split("T")[0])
        .order("session_date", { ascending: true });

      if (playerId) {
        query = query.eq("player_id", playerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch GPS data
  const { data: gpsData, isLoading: gpsLoading } = useQuery({
    queryKey: ["training-load-gps", categoryId, playerId, periodDays],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      let query = supabase
        .from("gps_sessions")
        .select("*")
        .eq("category_id", categoryId)
        .gte("session_date", startDate.toISOString().split("T")[0])
        .order("session_date", { ascending: true });

      if (playerId) {
        query = query.eq("player_id", playerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Check if GPS data exists
  const hasGpsData = (gpsData?.length || 0) > 0;
  const availableMetrics = getAvailableMetrics(sportType, hasGpsData);

  // Transform and calculate
  const dailyData: DailyLoadData[] = awcrData && gpsData 
    ? transformToDailyLoadData(awcrData, gpsData)
    : [];

  // Get metric configuration
  const metricConfig = METRICS_CONFIG[metric];
  const isEwma = metric.startsWith("ewma_");

  // Calculate results based on metric type
  const chartData: EWMAResult[] = isEwma
    ? calculateEWMASeries(dailyData, metricConfig.dataKey)
    : calculateAWCR(dailyData, metricConfig.dataKey);

  // Calculate summary
  const summary: LoadSummary | null = calculateLoadSummary(dailyData, metricConfig.dataKey);

  return {
    chartData,
    dailyData,
    summary,
    availableMetrics,
    metricConfig,
    sportType,
    hasGpsData,
    isLoading: awcrLoading || gpsLoading,
  };
}

/**
 * Hook for team-level training load comparison
 */
export function useTeamTrainingLoad({ 
  categoryId,
  metric = "ewma_srpe",
  periodDays = 28
}: {
  categoryId: string;
  metric?: MetricType;
  periodDays?: number;
}) {
  // Fetch all players
  const { data: players } = useQuery({
    queryKey: ["players-for-load", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position")
        .eq("category_id", categoryId);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all AWCR data
  const { data: allAwcrData, isLoading } = useQuery({
    queryKey: ["team-awcr", categoryId, periodDays],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("*")
        .eq("category_id", categoryId)
        .gte("session_date", startDate.toISOString().split("T")[0])
        .order("session_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all GPS data
  const { data: allGpsData } = useQuery({
    queryKey: ["team-gps", categoryId, periodDays],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      const { data, error } = await supabase
        .from("gps_sessions")
        .select("*")
        .eq("category_id", categoryId)
        .gte("session_date", startDate.toISOString().split("T")[0])
        .order("session_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate per-player summaries
  const playerSummaries = players?.map(player => {
    const playerAwcr = allAwcrData?.filter(d => d.player_id === player.id) || [];
    const playerGps = allGpsData?.filter(d => d.player_id === player.id) || [];
    const dailyData = transformToDailyLoadData(playerAwcr, playerGps);
    const summary = calculateLoadSummary(dailyData, METRICS_CONFIG[metric].dataKey);

    return {
      ...player,
      summary,
    };
  }) || [];

  // Calculate team average
  const validSummaries = playerSummaries.filter(p => p.summary !== null);
  const teamAverage = validSummaries.length > 0 ? {
    ewmaRatio: validSummaries.reduce((sum, p) => sum + (p.summary?.ewmaRatio || 0), 0) / validSummaries.length,
    ewmaAcute: validSummaries.reduce((sum, p) => sum + (p.summary?.ewmaAcute || 0), 0) / validSummaries.length,
    ewmaChronic: validSummaries.reduce((sum, p) => sum + (p.summary?.ewmaChronic || 0), 0) / validSummaries.length,
  } : null;

  // Players at risk
  const playersAtRisk = playerSummaries.filter(p => 
    p.summary?.riskLevel === "danger" || p.summary?.riskLevel === "warning"
  );

  return {
    players: playerSummaries,
    teamAverage,
    playersAtRisk,
    isLoading,
  };
}
