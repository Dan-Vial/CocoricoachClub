import { useOnlineStatus } from "@/hooks/use-online-status";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

const OfflineIndicator = () => {
  const { isOnline, wasOffline } = useOnlineStatus();

  // Show reconnection message briefly
  if (isOnline && wasOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top-2">
        <Wifi className="w-4 h-4" />
        <span>Connexion rétablie - Synchronisation en cours...</span>
      </div>
    );
  }

  // Show offline banner
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top-2">
        <WifiOff className="w-4 h-4" />
        <span>Mode hors-ligne - Les données seront synchronisées à la reconnexion</span>
      </div>
    );
  }

  return null;
};

export default OfflineIndicator;
