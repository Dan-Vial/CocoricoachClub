import { useState, useEffect, useCallback } from "react";
import { useOnlineStatus } from "./use-online-status";
import {
  queueOperation,
  syncAllOperations,
  getPendingCount,
  clearFailedOperations,
} from "@/lib/offlineQueue";
import { toast } from "sonner";

export interface OfflineSyncState {
  pendingCount: number;
  isSyncing: boolean;
  syncProgress: { current: number; total: number } | null;
}

export function useOfflineSync() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [state, setState] = useState<OfflineSyncState>({
    pendingCount: 0,
    isSyncing: false,
    syncProgress: null,
  });

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setState((prev) => ({ ...prev, pendingCount: count }));
    } catch (error) {
      console.error("Failed to get pending count:", error);
    }
  }, []);

  // Sync all pending operations
  const sync = useCallback(async () => {
    if (!isOnline || state.isSyncing) return;

    const pendingCount = await getPendingCount();
    if (pendingCount === 0) return;

    setState((prev) => ({ ...prev, isSyncing: true, syncProgress: { current: 0, total: pendingCount } }));

    try {
      const result = await syncAllOperations((current, total) => {
        setState((prev) => ({ ...prev, syncProgress: { current, total } }));
      });

      if (result.success > 0) {
        toast.success(`${result.success} modification(s) synchronisée(s)`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} modification(s) en échec`);
      }
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setState((prev) => ({ ...prev, isSyncing: false, syncProgress: null }));
      await updatePendingCount();
    }
  }, [isOnline, state.isSyncing, updatePendingCount]);

  // Queue an operation for later sync
  const queueOfflineOperation = useCallback(
    async (
      table: string,
      operation: "insert" | "update" | "delete",
      data: Record<string, unknown>
    ) => {
      await queueOperation(table, operation, data);
      await updatePendingCount();
      toast.info("Modification enregistrée localement");
    },
    [updatePendingCount]
  );

  // Clear failed operations
  const clearFailed = useCallback(async () => {
    await clearFailedOperations();
    await updatePendingCount();
    toast.success("Opérations en échec supprimées");
  }, [updatePendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => {
        sync();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, sync]);

  // Update pending count on mount
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  return {
    ...state,
    isOnline,
    sync,
    queueOfflineOperation,
    clearFailed,
    updatePendingCount,
  };
}
