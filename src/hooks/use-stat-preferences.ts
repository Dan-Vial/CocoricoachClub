import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStatsForSport, type StatField } from "@/lib/constants/sportStats";

interface CustomStat {
  id: string;
  key: string;
  label: string;
  short_label: string;
  category_type: string;
  measurement_type: string;
  unit: string | null;
  min_value: number | null;
  max_value: number | null;
}

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
  // Returns { exists: boolean, keys: string[] } to distinguish "no row" from "empty selection"
  const { data: categoryPrefs, isLoading: loadingCategory } = useQuery({
    queryKey: ["stat-preferences", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_stat_preferences")
        .select("enabled_stats, enabled_custom_stats")
        .eq("category_id", categoryId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null; // No row = no preferences configured
      // Row exists = user has configured preferences, respect the saved selection
      const allEnabled = [
        ...(data.enabled_stats ?? []),
        ...(data.enabled_custom_stats ?? []),
      ];
      return allEnabled; // Return array even if empty (user chose to disable all)
    },
    enabled: !!categoryId,
    staleTime: 5000,
  });

  // Fetch custom stats for the category
  const { data: customStats = [], isLoading: loadingCustom } = useQuery({
    queryKey: ["custom-stats", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_stats")
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CustomStat[];
    },
    enabled: !!categoryId,
    staleTime: 5000,
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

  // Convert custom stats to StatField format
  const customStatFields: StatField[] = customStats.map(cs => ({
    key: cs.key,
    label: cs.label,
    shortLabel: cs.short_label,
    category: cs.category_type as StatField["category"],
    type: cs.measurement_type.includes("time") ? "time" : "number",
    min: cs.min_value ?? undefined,
    max: cs.max_value ?? undefined,
  }));

  // Combine standard and custom stats
  const allAvailableStats = [...allStats, ...customStatFields];

  // Determine which stats to show
  // Priority: match overrides > category preferences (even if empty) > all stats
  // categoryPrefs is null only when no row exists (never configured)
  // categoryPrefs is [] when user explicitly disabled all stats
  const enabledStatKeys: string[] = matchOverrides 
    ?? (categoryPrefs !== null && categoryPrefs !== undefined ? categoryPrefs : allAvailableStats.map(s => s.key));

  // Filter stats based on enabled keys
  const filteredStats: StatField[] = allAvailableStats.filter(stat => 
    enabledStatKeys.includes(stat.key)
  );

  const isLoading = loadingCategory || loadingMatch || loadingCustom;

  // Check if preferences have been configured
  const hasCustomPreferences = !!(categoryPrefs || matchOverrides);

  return {
    stats: filteredStats,
    allStats: allAvailableStats,
    customStats: customStatFields,
    enabledStatKeys,
    isLoading,
    hasCustomPreferences,
  };
}
