import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bell, BellOff, CheckCircle2, AlertCircle, Loader2, HelpCircle, ChevronDown, Smartphone, Globe, Apple } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { initOneSignal, oneSignalLogin, buildUserTags, requestOneSignalPermission, getOneSignalPermission, checkOneSignalSubscriptionStatus } from "@/lib/onesignal";

const ONBOARDING_KEY = "notification_onboarding_done";

export function PushNotificationSettings() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [serverSubscribed, setServerSubscribed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check browser permission
  useEffect(() => {
    setPermission(getOneSignalPermission());
    const interval = setInterval(() => {
      setPermission(getOneSignalPermission());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Check server-side OneSignal subscription status
  useEffect(() => {
    if (!user?.id) return;
    checkOneSignalSubscriptionStatus(user.id).then(setServerSubscribed);
  }, [user?.id]);

  const handleActivate = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await initOneSignal();
      const granted = await requestOneSignalPermission();
      if (granted) {
        const tags = await buildUserTags(user.id);
        await oneSignalLogin(user.id, user.email || "", tags);
        localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "done");
        setPermission("granted");
        setServerSubscribed(true);
      } else {
        setPermission(getOneSignalPermission());
      }
    } catch (err) {
      console.error("[PushNotificationSettings] Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Consider active if either browser says granted OR server confirms push subscription
  const isGranted = permission === "granted" || serverSubscribed === true;
  const isDenied = permission === "denied" && serverSubscribed !== true;
  const isChecking = serverSubscribed === null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5" />
            <div>
              <CardTitle>Notifications Push</CardTitle>
              <CardDescription>Alertes en temps réel sur votre appareil</CardDescription>
            </div>
          </div>
          {isChecking ? (
            <Badge variant="secondary">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Vérification
            </Badge>
          ) : (
            <Badge
              variant={isGranted ? "default" : isDenied ? "destructive" : "secondary"}
            >
              {isGranted ? "Activé" : isDenied ? "Refusé" : "Non activé"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
          {isGranted ? (
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div>
            <p className="font-medium text-sm">
              {isGranted
                ? "Notifications activées"
                : isDenied
                ? "Notifications bloquées"
                : "Notifications non activées"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isGranted
                ? "Vous recevrez les convocations, entraînements et rappels importants"
                : isDenied
                ? "Modifiez les paramètres de votre navigateur pour autoriser ce site"
                : "Activez pour ne manquer aucune information importante"}
            </p>
          </div>
        </div>

        {/* Permission denied warning */}
        {isDenied && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Accès bloqué par le navigateur</p>
              <p>
                Pour réactiver, allez dans les paramètres de votre navigateur
                → Confidentialité → Notifications, puis autorisez ce site.
              </p>
            </div>
          </div>
        )}

        {/* Notification types */}
        {isGranted && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Vous recevrez :</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {[
                { color: "bg-primary", label: "Convocations" },
                { color: "bg-primary/70", label: "Rappels d'entraînements" },
                { color: "bg-destructive", label: "Alertes blessures" },
                { color: "bg-muted-foreground", label: "Messages importants" },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${item.color}`} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Activate button */}
        {!isGranted && !isDenied && !isChecking && (
          <Button
            className="w-full"
            onClick={handleActivate}
            disabled={isLoading}
          >
            <Bell className="mr-2 h-4 w-4" />
            {isLoading ? "Activation..." : "Activer les notifications"}
          </Button>
        )}

        {/* Browser help guide - always visible */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm font-medium">
            <HelpCircle className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1 text-left">Comment activer / réactiver les notifications ?</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-4">
            {/* Chrome / Edge / Brave */}
            <div className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Chrome / Edge / Brave (PC & Android)</p>
              </div>
              <ol className="text-xs text-muted-foreground space-y-1 ml-6 list-decimal">
                <li>Cliquez sur l'icône 🔒 (cadenas) dans la barre d'adresse</li>
                <li>Sélectionnez <span className="font-medium text-foreground">Paramètres du site</span></li>
                <li>Trouvez <span className="font-medium text-foreground">Notifications</span></li>
                <li>Changez en <span className="font-medium text-foreground">Autoriser</span></li>
                <li>Rechargez la page</li>
              </ol>
            </div>

            {/* Safari Mac */}
            <div className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <p className="text-sm font-semibold">Safari (Mac)</p>
              </div>
              <ol className="text-xs text-muted-foreground space-y-1 ml-6 list-decimal">
                <li>Allez dans <span className="font-medium text-foreground">Safari → Réglages → Sites web</span></li>
                <li>Cliquez sur <span className="font-medium text-foreground">Notifications</span> dans le menu de gauche</li>
                <li>Trouvez ce site et sélectionnez <span className="font-medium text-foreground">Autoriser</span></li>
                <li>Rechargez la page</li>
              </ol>
            </div>

            {/* iOS / iPhone / iPad */}
            <div className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">iPhone / iPad (iOS 16.4+)</p>
              </div>
              <ol className="text-xs text-muted-foreground space-y-1 ml-6 list-decimal">
                <li><span className="font-medium text-foreground">Installez d'abord l'application</span> sur votre écran d'accueil (bouton Partager → Ajouter à l'écran d'accueil)</li>
                <li>Ouvrez l'application depuis l'écran d'accueil</li>
                <li>Acceptez la demande de notifications quand elle apparaît</li>
                <li>Si refusé : <span className="font-medium text-foreground">Réglages → Notifications</span> → trouvez l'app → Activez</li>
              </ol>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                ⚠️ Les notifications push sur iOS nécessitent que l'application soit installée en PWA (icône sur l'écran d'accueil).
              </p>
            </div>

            {/* Android PWA */}
            <div className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-500" />
                <p className="text-sm font-semibold">Android (Application installée)</p>
              </div>
              <ol className="text-xs text-muted-foreground space-y-1 ml-6 list-decimal">
                <li>Allez dans <span className="font-medium text-foreground">Paramètres → Applications</span></li>
                <li>Trouvez l'application dans la liste</li>
                <li>Appuyez sur <span className="font-medium text-foreground">Notifications</span></li>
                <li>Activez <span className="font-medium text-foreground">Afficher les notifications</span></li>
              </ol>
            </div>

            {/* Firefox */}
            <div className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-orange-500" />
                <p className="text-sm font-semibold">Firefox</p>
              </div>
              <ol className="text-xs text-muted-foreground space-y-1 ml-6 list-decimal">
                <li>Cliquez sur l'icône 🔒 dans la barre d'adresse</li>
                <li>Cliquez sur <span className="font-medium text-foreground">Autorisations</span></li>
                <li>À côté de "Notifications", cliquez sur <span className="font-medium text-foreground">×</span> pour supprimer le blocage</li>
                <li>Rechargez la page et cliquez à nouveau sur "Activer les notifications"</li>
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
