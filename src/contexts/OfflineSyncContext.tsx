import React, { createContext, useContext, ReactNode } from "react";
import { useOfflineSync, OfflineSyncState } from "@/hooks/use-offline-sync";

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
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const offlineSync = useOfflineSync();

  return (
    <OfflineSyncContext.Provider value={offlineSync}>
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
