import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export function PushNotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    showLocalNotification,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTestNotification = () => {
    showLocalNotification(
      "🔔 Test de notification",
      "Les notifications fonctionnent correctement !"
    );
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications Push
          </CardTitle>
          <CardDescription>Non supportées par ce navigateur</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Votre navigateur ne supporte pas les notifications push. 
              Utilisez Chrome, Firefox ou Edge pour activer cette fonctionnalité.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5" />
            <div>
              <CardTitle>Notifications Push</CardTitle>
              <CardDescription>
                Recevez des alertes sur votre appareil
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={permission === "granted" ? "default" : permission === "denied" ? "destructive" : "secondary"}
          >
            {permission === "granted" ? "Autorisé" : permission === "denied" ? "Refusé" : "Non demandé"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle switch */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">Notifications activées</p>
              <p className="text-sm text-muted-foreground">
                {isSubscribed 
                  ? "Vous recevrez des alertes pour les blessures et retours d'athlètes"
                  : "Activez pour recevoir des alertes importantes"
                }
              </p>
            </div>
          </div>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Switch
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={permission === "denied"}
            />
          )}
        </div>

        {/* Permission denied warning */}
        {permission === "denied" && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Notifications bloquées</p>
              <p>
                Les notifications ont été refusées. Pour les activer, modifiez les 
                paramètres de votre navigateur pour ce site.
              </p>
            </div>
          </div>
        )}

        {/* Notification types info */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Types de notifications :</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Nouvelles blessures
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Retours imminents d'athlètes
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Changements de statut de blessures
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Rappels de tests médicaux
            </li>
          </ul>
        </div>

        {/* Test button */}
        {isSubscribed && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleTestNotification}
          >
            Tester les notifications
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
