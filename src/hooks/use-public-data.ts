import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicAccess } from "@/contexts/PublicAccessContext";

type DataType = "category" | "players" | "matches" | "sessions" | "overview" | "injuries";

interface PublicDataOptions {
  dataType: DataType;
  categoryId?: string;
  enabled?: boolean;
}

/**
 * Hook that fetches data either via direct Supabase queries (for authenticated users)
 * or via the public-data edge function (for public access users).
 * This allows the same components to work in both authenticated and public modes.
 */
export function usePublicData<T>({ 
  dataType, 
  categoryId,
  enabled = true 
}: PublicDataOptions) {
  const { isPublicAccess, token } = usePublicAccess();

  return useQuery({
    queryKey: ["public-data", dataType, categoryId, isPublicAccess],
    queryFn: async (): Promise<T> => {
      if (isPublicAccess && token) {
        // Use edge function for public access
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-data?token=${token}&type=${dataType}`,
          {
            headers: {
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to fetch public data");
        }
        return result.data as T;
      } else {
        // Use direct Supabase queries for authenticated users
        return fetchDirectData(dataType, categoryId) as Promise<T>;
      }
    },
    enabled: enabled && !!categoryId,
  });
}

async function fetchDirectData(dataType: DataType, categoryId?: string) {
  if (!categoryId) return null;

  switch (dataType) {
    case "category": {
      const { data, error } = await supabase
        .from("categories")
        .select("*, clubs(name, id)")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    }
    case "players": {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position, date_of_birth, avatar_url")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    }
    case "matches": {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("category_id", categoryId)
        .order("match_date", { ascending: false });
      if (error) throw error;
      return data;
    }
    case "sessions": {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
    case "injuries": {
      const { data, error } = await supabase
        .from("injuries")
        .select("*")
        .eq("category_id", categoryId);
      if (error) throw error;
      return data;
    }
    case "overview": {
      const [players, sessions, injuries, category] = await Promise.all([
        supabase.from("players").select("id").eq("category_id", categoryId),
        supabase.from("training_sessions").select("id").eq("category_id", categoryId),
        supabase.from("injuries").select("id, status").eq("category_id", categoryId),
        supabase.from("categories").select("name, clubs(name)").eq("id", categoryId).single(),
      ]);

      return {
        totalPlayers: players.data?.length || 0,
        totalSessions: sessions.data?.length || 0,
        activeInjuries: injuries.data?.filter((i) => i.status === "active").length || 0,
        categoryName: category.data?.name || "",
        clubName: (category.data?.clubs as any)?.name || "",
      };
    }
    default:
      return null;
  }
}

/**
 * Hook specifically for category data with proper typing
 */
export function usePublicCategory(categoryId?: string) {
  return usePublicData<{
    id: string;
    name: string;
    rugby_type: string;
    cover_image_url: string | null;
    clubs: { name: string; id: string } | null;
  }>({
    dataType: "category",
    categoryId,
    enabled: !!categoryId,
  });
}

/**
 * Hook specifically for players data with proper typing
 */
export function usePublicPlayers(categoryId?: string) {
  return usePublicData<Array<{
    id: string;
    name: string;
    position: string | null;
    date_of_birth: string | null;
    avatar_url: string | null;
  }>>({
    dataType: "players",
    categoryId,
    enabled: !!categoryId,
  });
}

/**
 * Hook specifically for matches data with proper typing
 */
export function usePublicMatches(categoryId?: string) {
  return usePublicData<Array<{
    id: string;
    opponent: string;
    match_date: string;
    is_home: boolean;
    score_home: number | null;
    score_away: number | null;
    location: string | null;
    competition: string | null;
  }>>({
    dataType: "matches",
    categoryId,
    enabled: !!categoryId,
  });
}
