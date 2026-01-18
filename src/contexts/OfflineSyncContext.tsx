import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from "react";
import { useOfflineSync, OfflineSyncState } from "@/hooks/use-offline-sync";
import { useAuth } from "./AuthContext";
import { 
  preloadOfflineData, 
  offlineData, 
  hasOfflineData,
  clearOfflineData 
} from "@/lib/offlineDataStore";
import { toast } from "sonner";

interface OfflineDataStats {
  clubs: number;
  categories: number;
  players: number;
  wellness: number;
  awcr: number;
  injuries: number;
  matches: number;
}

interface OfflineSyncContextType extends OfflineSyncState {
  isOnline: boolean;
  sync: () => Promise<void>;
  queueOfflineOperation: (
    table: string,
    operation: "insert" | "update" | "delete",
    data: Record<string, unknown>
  ) => Promise<void>;
  clearFailed: () => Promise<void>;
  updatePendingCount: () => Promise<void>;
  // New offline data features
  isPreloading: boolean;
  hasOfflineData: boolean;
  lastDataSync: Date | null;
  offlineDataStats: OfflineDataStats | null;
  preloadOfflineData: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
  offlineData: typeof offlineData;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const offlineSync = useOfflineSync();
  const { user } = useAuth();
  
  // Offline data state
  const [isPreloading, setIsPreloading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [lastDataSync, setLastDataSync] = useState<Date | null>(null);
  const [stats, setStats] = useState<OfflineDataStats | null>(null);

  // Check for existing offline data on mount
  useEffect(() => {
    async function checkExistingData() {
      try {
        const hasExisting = await hasOfflineData();
        if (hasExisting) {
          const lastSync = await offlineData.getLastSync();
          setHasData(true);
          setLastDataSync(lastSync ? new Date(lastSync) : null);
        }
      } catch (error) {
        console.error("Error checking offline data:", error);
      }
    }
    checkExistingData();
  }, []);

  // Pre-load function
  const handlePreload = useCallback(async () => {
    if (!user?.id || !offlineSync.isOnline) {
      toast.error("Connexion requise pour télécharger les données");
      return;
    }

    setIsPreloading(true);

    try {
      const result = await preloadOfflineData(user.id);

      if (result.success) {
        const lastSync = await offlineData.getLastSync();
        setHasData(true);
        setLastDataSync(lastSync ? new Date(lastSync) : null);
        setStats(result.stats || null);
        
        toast.success("Données prêtes pour utilisation hors-ligne", {
          description: `${result.stats?.players || 0} athlètes, ${result.stats?.matches || 0} matchs`,
          duration: 4000,
        });
      } else {
        toast.error("Erreur lors du téléchargement", {
          description: result.error,
        });
      }
    } catch (error) {
      console.error("Preload error:", error);
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setIsPreloading(false);
    }
  }, [user?.id, offlineSync.isOnline]);

  // Auto-preload when user logs in (if no existing data)
  useEffect(() => {
    if (user?.id && offlineSync.isOnline && !hasData && !isPreloading) {
      // Delay to avoid blocking auth flow
      const timer = setTimeout(() => {
        handlePreload();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user?.id, offlineSync.isOnline, hasData, isPreloading, handlePreload]);

  // Refresh data periodically when online (every 30 minutes if data is older than 1 hour)
  useEffect(() => {
    if (!user?.id || !offlineSync.isOnline || !hasData) return;

    const checkAndRefresh = async () => {
      if (!lastDataSync) return;
      
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (lastDataSync.getTime() < oneHourAgo && !isPreloading) {
        console.log("Refreshing offline data (older than 1 hour)");
        await handlePreload();
      }
    };

    const interval = setInterval(checkAndRefresh, 30 * 60 * 1000); // Check every 30 minutes
    return () => clearInterval(interval);
  }, [user?.id, offlineSync.isOnline, hasData, lastDataSync, isPreloading, handlePreload]);

  // Clear offline data
  const handleClearData = useCallback(async () => {
    await clearOfflineData();
    setHasData(false);
    setLastDataSync(null);
    setStats(null);
    toast.success("Données hors-ligne supprimées");
  }, []);

  const value: OfflineSyncContextType = {
    ...offlineSync,
    isPreloading,
    hasOfflineData: hasData,
    lastDataSync,
    offlineDataStats: stats,
    preloadOfflineData: handlePreload,
    clearOfflineData: handleClearData,
    offlineData,
  };

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSyncContext() {
  const context = useContext(OfflineSyncContext);
  if (context === undefined) {
    throw new Error("useOfflineSyncContext must be used within an OfflineSyncProvider");
  }
  return context;
}
