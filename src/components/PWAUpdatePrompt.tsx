import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, X } from "lucide-react";

const isPreviewHost = () => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return import.meta.env.DEV || hostname.includes("id-preview--") || hostname.includes("localhost");
};

const PWAUpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (isPreviewHost() || !("serviceWorker" in navigator)) {
      navigator.serviceWorker?.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }

    let intervalId: number | undefined;

    const onControllerChange = () => {
      setShowPrompt(true);
    };

    navigator.serviceWorker.ready
      .then((registration) => {
        intervalId = window.setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);
      })
      .catch(() => {
        setShowPrompt(false);
      });

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  const handleUpdate = () => {
    setShowPrompt(false);
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || isPreviewHost()) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-top-5">
      <Card className="p-4 shadow-lg border-2 border-primary/20 bg-background">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary animate-spin" />
              <h3 className="font-semibold">Mise à jour disponible</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Une nouvelle version de l'application est disponible. Rechargez pour profiter des dernières améliorations.
            </p>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleUpdate} size="sm" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Recharger
              </Button>
              <Button onClick={handleDismiss} size="sm" variant="ghost">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PWAUpdatePrompt;
