import { WifiOff, Wifi, RefreshCw, Cloud, Loader2 } from "lucide-react";
import { useOfflineSyncContext } from "@/contexts/OfflineSyncContext";
import { Button } from "@/components/ui/button";

const OfflineIndicator = () => {
  const { isOnline, pendingCount, isSyncing, syncProgress, sync } = useOfflineSyncContext();

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

  // Show offline banner with pending count
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top-2">
        <WifiOff className="w-4 h-4" />
        <span>
          Mode hors-ligne
          {pendingCount > 0 && ` - ${pendingCount} modification(s) en attente`}
        </span>
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

  return null;
};

export default OfflineIndicator;
