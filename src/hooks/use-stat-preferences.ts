import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStatsForSport, type StatField } from "@/lib/constants/sportStats";

interface UseStatPreferencesOptions {
  categoryId: string;
  sportType: string;
  matchId?: string;
  isGoalkeeper?: boolean;
}

export function useStatPreferences({
  categoryId,
  sportType,
  matchId,
  isGoalkeeper = false,
}: UseStatPreferencesOptions) {
  // Fetch category-level preferences
  const { data: categoryPrefs, isLoading: loadingCategory } = useQuery({
    queryKey: ["stat-preferences", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_stat_preferences")
        .select("enabled_stats")
        .eq("category_id", categoryId)
        .maybeSingle();
      if (error) throw error;
      return data?.enabled_stats as string[] | null;
    },
    enabled: !!categoryId,
  });

  // Fetch match-level overrides if matchId is provided
  const { data: matchOverrides, isLoading: loadingMatch } = useQuery({
    queryKey: ["match-stat-overrides", matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const { data, error } = await supabase
        .from("match_stat_overrides")
        .select("enabled_stats")
        .eq("match_id", matchId)
        .maybeSingle();
      if (error) throw error;
      return data?.enabled_stats as string[] | null;
    },
    enabled: !!matchId,
  });

  // Get all stats for the sport
  const allStats = getStatsForSport(sportType, isGoalkeeper);

  // Determine which stats to show
  // Priority: match overrides > category preferences > all stats
  const enabledStatKeys = matchOverrides ?? categoryPrefs ?? allStats.map(s => s.key);

  // Filter stats based on enabled keys
  const filteredStats: StatField[] = allStats.filter(stat => 
    enabledStatKeys.includes(stat.key)
  );

  const isLoading = loadingCategory || loadingMatch;

  // Check if preferences have been configured
  const hasCustomPreferences = !!(categoryPrefs || matchOverrides);

  return {
    stats: filteredStats,
    allStats,
    enabledStatKeys,
    isLoading,
    hasCustomPreferences,
  };
}
