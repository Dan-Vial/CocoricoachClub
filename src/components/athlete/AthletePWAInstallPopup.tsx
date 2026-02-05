import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Smartphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface AthletePWAInstallPopupProps {
  playerId?: string;
}

export function AthletePWAInstallPopup({ playerId }: AthletePWAInstallPopupProps) {
  const { user } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed as standalone
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if running in iOS standalone mode
    if ((window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if user has dismissed the popup before
    checkPwaStatus();

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (playerId && !isInstalled) {
      checkPwaStatus();
    }
  }, [playerId, isInstalled]);

  const checkPwaStatus = async () => {
    if (!playerId) {
      // Fallback to localStorage for non-athlete users
      const dismissed = localStorage.getItem("pwa-athlete-dismissed");
      if (!dismissed && deferredPrompt) {
        setShowPopup(true);
      }
      return;
    }

    try {
      const { data } = await supabase
        .from("players")
        .select("pwa_install_dismissed")
        .eq("id", playerId)
        .single();

      if (data && !data.pwa_install_dismissed) {
        // Show popup after a short delay
        setTimeout(() => setShowPopup(true), 1000);
      }
    } catch (err) {
      console.error("Error checking PWA status:", err);
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowPopup(false);
        // Mark as installed to prevent future popups
        if (playerId) {
          await supabase
            .from("players")
            .update({ pwa_install_dismissed: true })
            .eq("id", playerId);
        }
        localStorage.setItem("pwa-athlete-installed", "true");
      }
    } else {
      // Fallback for iOS - redirect to install instructions
      window.location.href = "/install";
    }
  };

  const handleLater = async () => {
    setShowPopup(false);
    // Don't save to DB - will show again next time
    // Only save to localStorage temporarily
    localStorage.setItem("pwa-athlete-session-dismissed", "true");
  };

  const handleNeverShow = async () => {
    setShowPopup(false);
    if (playerId) {
      await supabase
        .from("players")
        .update({ pwa_install_dismissed: true })
        .eq("id", playerId);
    }
    localStorage.setItem("pwa-athlete-dismissed", "true");
  };

  // Don't show if already installed
  if (isInstalled) return null;

  // Check if already dismissed this session
  if (localStorage.getItem("pwa-athlete-session-dismissed")) return null;

  return (
    <Dialog open={showPopup} onOpenChange={setShowPopup}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Smartphone className="h-10 w-10 text-primary-foreground" />
          </div>
          <DialogTitle className="text-2xl">Installe l'application 📱</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Pour un accès rapide et recevoir les notifications de ton équipe, installe l'application sur ton téléphone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">⚡</span>
            </div>
            <div>
              <p className="font-medium text-sm">Accès instantané</p>
              <p className="text-xs text-muted-foreground">Lance l'app directement depuis ton écran d'accueil</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🔔</span>
            </div>
            <div>
              <p className="font-medium text-sm">Notifications push</p>
              <p className="text-xs text-muted-foreground">Reçois les rappels de séances et questionnaires</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📴</span>
            </div>
            <div>
              <p className="font-medium text-sm">Mode hors-ligne</p>
              <p className="text-xs text-muted-foreground">Consulte tes données même sans connexion</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleInstall} className="w-full" size="lg">
            <Download className="mr-2 h-5 w-5" />
            Installer l'application
          </Button>
          <Button onClick={handleLater} variant="ghost" className="w-full">
            Plus tard
          </Button>
          <button
            onClick={handleNeverShow}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            Ne plus afficher
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
