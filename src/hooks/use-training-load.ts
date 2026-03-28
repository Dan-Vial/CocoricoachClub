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
  getRiskLevel,
} from "@/lib/trainingLoadCalculations";

/**
 * Build EWMA chart data from DB-computed values (acute_load, chronic_load, awcr).
 * The DB trigger compute_ewma_loads has access to full history, so these values
 * are more accurate than frontend recalculation from a limited time window.
 */
function buildEWMAFromDbData(awcrData: any[], playerId?: string): EWMAResult[] {
  // If individual player, data is already filtered; for team, aggregate per date
  const dataByDate = new Map<string, { acute: number; chronic: number; rawValue: number; count: number }>();

  const entries = playerId 
    ? awcrData.filter(d => d.player_id === playerId)
    : awcrData;

  // Track unique players per date for team averaging
  const playersByDate = new Map<string, Set<string>>();

  entries.forEach(entry => {
    const date = entry.session_date;
    if (!playersByDate.has(date)) playersByDate.set(date, new Set());
    playersByDate.get(date)!.add(entry.player_id);

    const existing = dataByDate.get(date);
    const load = entry.training_load || (entry.rpe * entry.duration_minutes) || 0;

    if (existing) {
      // For team view: sum loads and use latest EWMA values per player, then average
      existing.rawValue += load;
      // Use the entry with the most recent/highest acute_load as representative
      if (entry.acute_load != null && entry.chronic_load != null) {
        existing.acute += entry.acute_load;
        existing.chronic += entry.chronic_load;
      }
      existing.count = playersByDate.get(date)!.size;
    } else {
      dataByDate.set(date, {
        acute: entry.acute_load ?? 0,
        chronic: entry.chronic_load ?? 0,
        rawValue: load,
        count: 1,
      });
    }
  });

  // Convert to EWMAResult array, averaging for team
  return Array.from(dataByDate.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, data]) => {
      const n = Math.max(data.count, 1);
      const acute = Math.round((data.acute / n) * 100) / 100;
      const chronic = Math.round((data.chronic / n) * 100) / 100;
      const ratio = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : 0;
      return {
        date,
        rawValue: Math.round((data.rawValue / n) * 100) / 100,
        acute,
        chronic,
        ratio,
        riskLevel: getRiskLevel(ratio),
      };
    });
}

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

  // Fetch HRV data
  const { data: hrvData, isLoading: hrvLoading } = useQuery({
    queryKey: ["training-load-hrv", categoryId, playerId, periodDays],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      let query = supabase
        .from("hrv_records")
        .select("*")
        .eq("category_id", categoryId)
        .gte("record_date", startDate.toISOString().split("T")[0])
        .order("record_date", { ascending: true });

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

  // Check if data exists
  const hasGpsData = (gpsData?.length || 0) > 0;
  const hasHrvData = (hrvData?.length || 0) > 0;
  const availableMetrics = getAvailableMetrics(sportType, hasGpsData);

  // Transform and calculate
  const dailyData: DailyLoadData[] = awcrData && gpsData 
    ? transformToDailyLoadData(awcrData, gpsData)
    : [];

  // Get metric configuration
  const metricConfig = METRICS_CONFIG[metric];
  const isEwma = metric.startsWith("ewma_");

  // For EWMA sRPE: use DB-computed values (acute_load, chronic_load, awcr)
  // which have full historical context from the compute_ewma_loads trigger.
  // Only fall back to frontend recalculation for non-sRPE metrics or AWCR mode.
  const chartData: EWMAResult[] = (() => {
    let baseData: EWMAResult[];
    if (isEwma && metric === "ewma_srpe" && awcrData && awcrData.length > 0) {
      baseData = buildEWMAFromDbData(awcrData, playerId);
    } else {
      baseData = isEwma
        ? calculateEWMASeries(dailyData, metricConfig.dataKey)
        : calculateAWCR(dailyData, metricConfig.dataKey);
    }

    // Merge HRV data into chart data by date
    if (hrvData && hrvData.length > 0) {
      const hrvByDate = new Map<string, { hrvMs: number | null; avgHr: number | null; maxHr: number | null; restingHr: number | null; count: number }>();
      
      hrvData.forEach((h: any) => {
        const date = h.record_date;
        const existing = hrvByDate.get(date);
        if (existing) {
          if (h.hrv_ms != null) existing.hrvMs = (existing.hrvMs || 0) + h.hrv_ms;
          if (h.avg_hr_bpm != null) existing.avgHr = (existing.avgHr || 0) + h.avg_hr_bpm;
          if (h.max_hr_bpm != null) existing.maxHr = Math.max(existing.maxHr || 0, h.max_hr_bpm);
          if (h.resting_hr_bpm != null) existing.restingHr = (existing.restingHr || 0) + h.resting_hr_bpm;
          existing.count++;
        } else {
          hrvByDate.set(date, {
            hrvMs: h.hrv_ms,
            avgHr: h.avg_hr_bpm,
            maxHr: h.max_hr_bpm,
            restingHr: h.resting_hr_bpm,
            count: 1,
          });
        }
      });

      baseData = baseData.map(d => {
        const hrv = hrvByDate.get(d.date);
        if (hrv) {
          const n = hrv.count;
          return {
            ...d,
            hrvMs: hrv.hrvMs != null ? Math.round((hrv.hrvMs / n) * 10) / 10 : null,
            avgHrBpm: hrv.avgHr != null ? Math.round(hrv.avgHr / n) : null,
            maxHrBpm: hrv.maxHr,
            restingHrBpm: hrv.restingHr != null ? Math.round(hrv.restingHr / n) : null,
          };
        }
        return d;
      });
    }

    return baseData;
  })();

  // Calculate summary from chart data (use last entry)
  const summary: LoadSummary | null = (() => {
    if (isEwma && metric === "ewma_srpe" && chartData.length > 0) {
      const latest = chartData[chartData.length - 1];
      const oneWeekAgo = chartData.length >= 7 ? chartData[chartData.length - 7] : chartData[0];
      const weeklyChange = oneWeekAgo.acute > 0 
        ? ((latest.acute - oneWeekAgo.acute) / oneWeekAgo.acute) * 100 
        : 0;
      let trend: "increasing" | "stable" | "decreasing" = "stable";
      if (weeklyChange > 10) trend = "increasing";
      else if (weeklyChange < -10) trend = "decreasing";
      return {
        currentLoad: latest.rawValue,
        ewmaAcute: latest.acute,
        ewmaChronic: latest.chronic,
        ewmaRatio: latest.ratio,
        weeklyChange: Math.round(weeklyChange * 10) / 10,
        riskLevel: latest.riskLevel,
        trend,
      };
    }
    return calculateLoadSummary(dailyData, metricConfig.dataKey);
  })();

  return {
    chartData,
    dailyData,
    summary,
    availableMetrics,
    metricConfig,
    sportType,
    hasGpsData,
    hasHrvData,
    isLoading: awcrLoading || gpsLoading || hrvLoading,
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
        .select("id, name, first_name, position, discipline")
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
  const isEwmaSrpe = metric === "ewma_srpe";
  const playerSummaries = players?.map(player => {
    const playerAwcr = allAwcrData?.filter(d => d.player_id === player.id) || [];
    const playerGps = allGpsData?.filter(d => d.player_id === player.id) || [];

    let summary: LoadSummary | null = null;

    if (isEwmaSrpe && playerAwcr.length > 0) {
      // Use DB-computed EWMA values for accurate ratio
      const chartData = buildEWMAFromDbData(playerAwcr, player.id);
      if (chartData.length > 0) {
        const latest = chartData[chartData.length - 1];
        const oneWeekAgo = chartData.length >= 7 ? chartData[chartData.length - 7] : chartData[0];
        const weeklyChange = oneWeekAgo.acute > 0
          ? ((latest.acute - oneWeekAgo.acute) / oneWeekAgo.acute) * 100
          : 0;
        let trend: "increasing" | "stable" | "decreasing" = "stable";
        if (weeklyChange > 10) trend = "increasing";
        else if (weeklyChange < -10) trend = "decreasing";
        summary = {
          currentLoad: latest.rawValue,
          ewmaAcute: latest.acute,
          ewmaChronic: latest.chronic,
          ewmaRatio: latest.ratio,
          weeklyChange: Math.round(weeklyChange * 10) / 10,
          riskLevel: latest.riskLevel,
          trend,
        };
      }
    } else {
      const dailyData = transformToDailyLoadData(playerAwcr, playerGps);
      summary = calculateLoadSummary(dailyData, METRICS_CONFIG[metric].dataKey);
    }

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
    currentLoad: validSummaries.reduce((sum, p) => sum + (p.summary?.currentLoad || 0), 0) / validSummaries.length,
    weeklyChange: validSummaries.reduce((sum, p) => sum + (p.summary?.weeklyChange || 0), 0) / validSummaries.length,
    trend: (() => {
      const avgChange = validSummaries.reduce((sum, p) => sum + (p.summary?.weeklyChange || 0), 0) / validSummaries.length;
      if (avgChange > 10) return "increasing" as const;
      if (avgChange < -10) return "decreasing" as const;
      return "stable" as const;
    })(),
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
