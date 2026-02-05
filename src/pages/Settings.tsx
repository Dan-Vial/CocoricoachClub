import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Settings as SettingsIcon, Smartphone, RefreshCw } from "lucide-react";
import { OfflineSyncPanel } from "@/components/OfflineSyncPanel";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Settings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [pwaReminderDismissed, setPwaReminderDismissed] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    // Check if PWA reminder was dismissed
    const dismissed = localStorage.getItem("pwa-athlete-dismissed") === "true";
    setPwaReminderDismissed(dismissed);
  }, []);

  const handleReactivatePwaReminder = async () => {
    setIsReactivating(true);
    try {
      // Clear local storage flags
      localStorage.removeItem("pwa-athlete-dismissed");
      localStorage.removeItem("pwa-athlete-session-dismissed");
      localStorage.removeItem("pwa-install-dismissed");

      // If user has a player profile, update the DB flag too
      if (user?.user_metadata?.player_id) {
        await supabase
          .from("players")
          .update({ pwa_install_dismissed: false })
          .eq("id", user.user_metadata.player_id);
      }

      setPwaReminderDismissed(false);
      toast.success("Le rappel d'installation sera affiché à la prochaine connexion");
    } catch (err) {
      console.error("Error reactivating PWA reminder:", err);
      toast.error("Erreur lors de la réactivation");
    } finally {
      setIsReactivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const isInstalled = 
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Paramètres</h1>
              <p className="text-muted-foreground">Gérez vos préférences</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Push Notifications */}
          <PushNotificationSettings />

          {/* PWA Installation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Application
              </CardTitle>
              <CardDescription>
                Gérez l'installation de l'application sur votre appareil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInstalled ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <span className="text-lg">✓</span>
                  </div>
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">Application installée</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Vous utilisez l'application en mode installé
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Smartphone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Installer l'application</p>
                      <p className="text-sm text-muted-foreground">
                        Accédez rapidement à l'app depuis votre écran d'accueil
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate("/install")}>
                      Installer
                    </Button>
                  </div>

                  {pwaReminderDismissed && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Vous avez désactivé le rappel d'installation
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReactivatePwaReminder}
                        disabled={isReactivating}
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isReactivating ? "animate-spin" : ""}`} />
                        Réactiver
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Offline Sync */}
          <OfflineSyncPanel />
        </div>
      </div>
    </div>
  );
}
