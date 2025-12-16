import { WifiOff, Cloud, RefreshCw, Loader2, Database, CheckCircle } from "lucide-react";
import { useOfflineSyncContext } from "@/contexts/OfflineSyncContext";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const OfflineIndicator = () => {
  const { 
    isOnline, 
    pendingCount, 
    isSyncing, 
    syncProgress, 
    sync,
    isPreloading,
    hasOfflineData,
    lastDataSync,
    preloadOfflineData,
  } = useOfflineSyncContext();

  // Show preloading status
  if (isPreloading) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top-2">
        <Database className="w-4 h-4 animate-pulse" />
        <span>Téléchargement des données pour mode hors-ligne...</span>
      </div>
    );
  }

  // Show sync in progress
  if (isSyncing && syncProgress) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>
          Synchronisation en cours... ({syncProgress.current}/{syncProgress.total})
        </span>
      </div>
    );
  }

  // Show offline banner with cached data status
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top-2">
        <WifiOff className="w-4 h-4" />
        <span>
          Mode hors-ligne
          {hasOfflineData && " - Données disponibles localement"}
          {pendingCount > 0 && ` - ${pendingCount} modification(s) en attente`}
        </span>
        {hasOfflineData && <CheckCircle className="w-4 h-4 ml-1 text-white/80" />}
      </div>
    );
  }

  // Show pending operations when online (can manually sync)
  if (pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top-2">
        <Cloud className="w-4 h-4" />
        <span>{pendingCount} modification(s) à synchroniser</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-white hover:bg-white/20"
          onClick={sync}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Sync
        </Button>
      </div>
    );
  }

  // Show success banner briefly after data download
  if (hasOfflineData && lastDataSync) {
    const timeSinceSync = Date.now() - lastDataSync.getTime();
    // Show for 5 seconds after sync
    if (timeSinceSync < 5000) {
      return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4" />
          <span>
            Données hors-ligne prêtes - Dernière sync: {format(lastDataSync, "HH:mm", { locale: fr })}
          </span>
        </div>
      );
    }
  }

  return null;
};

export default OfflineIndicator;
