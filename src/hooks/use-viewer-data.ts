import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicDataContext } from "@/contexts/PublicDataContext";

type PublicDataKey = 
  | "players" 
  | "matches" 
  | "sessions" 
  | "todaySessions"
  | "injuries" 
  | "wellness" 
  | "awcr" 
  | "attendance" 
  | "programs"
  | "matchLineups"
  | "category";

interface UseViewerDataOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  publicDataKey: PublicDataKey;
  enabled?: boolean;
}

/**
 * Hook that automatically uses public data context when in viewer mode,
 * or fetches directly from Supabase when authenticated.
 */
export function useViewerData<T>({
  queryKey,
  queryFn,
  publicDataKey,
  enabled = true,
}: UseViewerDataOptions<T>): {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const publicContext = usePublicDataContext();
  const isPublicMode = publicContext.isPublicMode;

  // Direct query for authenticated users
  const directQuery = useQuery({
    queryKey: [...queryKey, "direct"],
    queryFn,
    enabled: enabled && !isPublicMode,
  });

  // In public mode, return data from context
  if (isPublicMode) {
    const publicData = publicContext[publicDataKey];
    return {
      data: publicData as T,
      isLoading: publicContext.isLoading,
      error: publicContext.error ? new Error(publicContext.error) : null,
    };
  }

  return {
    data: directQuery.data,
    isLoading: directQuery.isLoading,
    error: directQuery.error,
  };
}

/**
 * Hook for fetching players that works in both authenticated and viewer modes
 */
export function useViewerPlayers(categoryId: string) {
  return useViewerData<any[]>({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      // Fetch direct players
      const { data: directPlayers, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;

      // Fetch linked players via player_categories junction table
      const { data: linkedEntries } = await supabase
        .from("player_categories")
        .select("player_id, players(*)")
        .eq("category_id", categoryId)
        .eq("status", "accepted");

      const directIds = new Set((directPlayers || []).map((p: any) => p.id));
      const linkedPlayers = (linkedEntries || [])
        .filter((e: any) => e.players && !directIds.has(e.player_id))
        .map((e: any) => ({ ...e.players, _linked: true }));

      return [...(directPlayers || []), ...linkedPlayers];
    },
    publicDataKey: "players",
    enabled: !!categoryId,
  });
}

/**
 * Hook for fetching sessions that works in both authenticated and viewer modes
 */
export function useViewerSessions(categoryId: string) {
  return useViewerData<any[]>({
    queryKey: ["sessions", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    publicDataKey: "sessions",
    enabled: !!categoryId,
  });
}

/**
 * Hook for fetching matches that works in both authenticated and viewer modes
 */
export function useViewerMatches(categoryId: string) {
  return useViewerData<any[]>({
    queryKey: ["matches", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("category_id", categoryId)
        .order("match_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    publicDataKey: "matches",
    enabled: !!categoryId,
  });
}

/**
 * Hook for fetching injuries that works in both authenticated and viewer modes
 */
export function useViewerInjuries(categoryId: string) {
  return useViewerData<any[]>({
    queryKey: ["injuries", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injuries")
        .select("*, players(name)")
        .eq("category_id", categoryId);
      if (error) throw error;
      return data || [];
    },
    publicDataKey: "injuries",
    enabled: !!categoryId,
  });
}

/**
 * Hook for fetching wellness data that works in both authenticated and viewer modes
 */
export function useViewerWellness(categoryId: string) {
  return useViewerData<any[]>({
    queryKey: ["wellness", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("wellness_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    publicDataKey: "wellness",
    enabled: !!categoryId,
  });
}

/**
 * Hook for fetching AWCR data that works in both authenticated and viewer modes
 */
export function useViewerAwcr(categoryId: string) {
  return useViewerData<any[]>({
    queryKey: ["awcr", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    publicDataKey: "awcr",
    enabled: !!categoryId,
  });
}

/**
 * Hook for fetching attendance data that works in both authenticated and viewer modes
 */
export function useViewerAttendance(categoryId: string) {
  return useViewerData<any[]>({
    queryKey: ["attendance", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_attendance")
        .select("*, players(name), training_sessions(session_date, training_type)")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    publicDataKey: "attendance",
    enabled: !!categoryId,
  });
}
