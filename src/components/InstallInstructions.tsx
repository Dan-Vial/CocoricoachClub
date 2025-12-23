import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Monitor, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallInstructionsProps {
  onDismiss?: () => void;
  showDismiss?: boolean;
  redirectPath?: string;
}

const InstallInstructions = ({ onDismiss, showDismiss = true, redirectPath }: InstallInstructionsProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const handleContinue = () => {
    if (redirectPath) {
      navigate(redirectPath);
    } else if (onDismiss) {
      onDismiss();
    }
  };

  if (isInstalled) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-600">
            <Check className="h-5 w-5" />
            <span className="font-medium">Application déjà installée !</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Installer l'application
          </CardTitle>
          {showDismiss && onDismiss && (
            <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Installez Rugby Strength Planner sur votre appareil pour un accès rapide et une utilisation hors ligne.
        </p>

        {deferredPrompt ? (
          <Button onClick={handleInstall} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Installer maintenant
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Desktop Instructions */}
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Monitor className="h-4 w-4 text-primary" />
                Sur ordinateur (Chrome/Edge)
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                Cliquez sur l'icône d'installation dans la barre d'adresse ou le menu du navigateur → "Installer"
              </p>
            </div>

            {/* Mobile Instructions */}
            <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <Smartphone className="h-4 w-4 text-primary" />
                Sur smartphone
              </div>
              <div className="space-y-2 pl-6">
                <div>
                  <p className="text-sm font-medium">iPhone/iPad (Safari) :</p>
                  <p className="text-sm text-muted-foreground">
                    Appuyez sur <span className="inline-block">📤</span> "Partager" → "Sur l'écran d'accueil"
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Android (Chrome) :</p>
                  <p className="text-sm text-muted-foreground">
                    Menu ⋮ → "Installer l'application" ou "Ajouter à l'écran d'accueil"
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <Button onClick={handleContinue} variant="outline" className="w-full">
          Continuer sans installer
        </Button>
      </CardContent>
    </Card>
  );
};

export default InstallInstructions;
