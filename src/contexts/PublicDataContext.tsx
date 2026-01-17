import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicAccess } from "@/contexts/PublicAccessContext";

interface PublicDataState {
  category: any | null;
  players: any[];
  matches: any[];
  sessions: any[];
  injuries: any[];
  wellness: any[];
  awcr: any[];
  overview: {
    totalPlayers: number;
    totalSessions: number;
    activeInjuries: number;
    categoryName: string;
    clubName: string;
  } | null;
  isLoading: boolean;
  error: string | null;
}

interface PublicDataContextType extends PublicDataState {
  refetch: () => void;
}

const PublicDataContext = createContext<PublicDataContextType | undefined>(undefined);

interface PublicDataProviderProps {
  children: ReactNode;
  categoryId: string;
}

export function PublicDataProvider({ children, categoryId }: PublicDataProviderProps) {
  const { isPublicAccess, token } = usePublicAccess();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["public-all-data", categoryId, token],
    queryFn: async () => {
      if (!isPublicAccess || !token) {
        return null;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-data?token=${token}&type=all`,
        {
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      return result.data;
    },
    enabled: isPublicAccess && !!token && !!categoryId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const contextValue: PublicDataContextType = {
    category: data?.category || null,
    players: data?.players || [],
    matches: data?.matches || [],
    sessions: data?.sessions || [],
    injuries: data?.injuries || [],
    wellness: data?.wellness || [],
    awcr: data?.awcr || [],
    overview: data?.overview || null,
    isLoading,
    error: error?.message || null,
    refetch,
  };

  return (
    <PublicDataContext.Provider value={contextValue}>
      {children}
    </PublicDataContext.Provider>
  );
}

export function usePublicDataContext() {
  const context = useContext(PublicDataContext);
  if (context === undefined) {
    // Not in public data provider - return empty state
    return {
      category: null,
      players: [],
      matches: [],
      sessions: [],
      injuries: [],
      wellness: [],
      awcr: [],
      overview: null,
      isLoading: false,
      error: null,
      refetch: () => {},
    };
  }
  return context;
}

/**
 * Hook to get data that works in both authenticated and public modes
 * Falls back to public data context when in public access mode
 */
export function useDataWithPublicFallback<T>(
  queryKey: string[],
  directQueryFn: () => Promise<T>,
  publicDataKey: keyof Omit<PublicDataState, 'isLoading' | 'error'>
) {
  const { isPublicAccess } = usePublicAccess();
  const publicData = usePublicDataContext();

  const directQuery = useQuery({
    queryKey,
    queryFn: directQueryFn,
    enabled: !isPublicAccess,
  });

  if (isPublicAccess) {
    return {
      data: publicData[publicDataKey] as T,
      isLoading: publicData.isLoading,
      error: publicData.error ? new Error(publicData.error) : null,
    };
  }

  return {
    data: directQuery.data,
    isLoading: directQuery.isLoading,
    error: directQuery.error,
  };
}
