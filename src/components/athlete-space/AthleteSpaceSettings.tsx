import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Lock, Mail, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { NAV_COLORS } from "@/components/ui/colored-nav-tabs";
import { requestOneSignalPermission, getOneSignalPermission } from "@/lib/onesignal";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useQuery } from "@tanstack/react-query";

interface AthleteSpaceSettingsProps {
  playerId?: string;
}

export function AthleteSpaceSettings({ playerId }: AthleteSpaceSettingsProps) {
  const { user } = useAuth();
  const { isSupported, subscribe } = usePushNotifications();
  const [permission, setPermission] = useState<NotificationPermission>(getOneSignalPermission());
  const [isActivating, setIsActivating] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Refresh permission on mount and when tab becomes visible
  useEffect(() => {
    const refresh = () => setPermission(getOneSignalPermission());
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  // Fetch the athlete's email from player profile
  const { data: playerData } = useQuery({
    queryKey: ["player-settings-email", playerId],
    queryFn: async () => {
      if (!playerId) return null;
      const { data } = await supabase
        .from("players")
        .select("email, name, first_name, user_id")
        .eq("id", playerId)
        .single();
      return data;
    },
    enabled: !!playerId,
  });

  // Fetch the athlete's auth email if they have a user account
  const { data: athleteProfile } = useQuery({
    queryKey: ["athlete-profile-email", playerData?.user_id],
    queryFn: async () => {
      if (!playerData?.user_id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", playerData.user_id)
        .single();
      return data;
    },
    enabled: !!playerData?.user_id,
  });

  // Check if email is registered in OneSignal (via tags sync)
  const { data: emailNotifStatus } = useQuery({
    queryKey: ["email-notif-status", playerData?.user_id || user?.id],
    queryFn: async () => {
      // If there's a push subscription or OneSignal sync, email notifications are active
      const targetUserId = playerData?.user_id || user?.id;
      if (!targetUserId) return false;
      const { data } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", targetUserId)
        .limit(1);
      return (data?.length || 0) > 0;
    },
    enabled: !!(playerData?.user_id || user?.id),
  });

  // Determine the email to display:
  // 1. Athlete's profile email (from profiles table via user_id)
  // 2. Player's email (from players table)
  // 3. Current user's email (fallback)
  const displayEmail = athleteProfile?.email || playerData?.email || user?.email || "—";

  const handleActivateNotifications = async () => {
    setIsActivating(true);
    try {
      const granted = await requestOneSignalPermission();
      if (granted) {
        await subscribe();
        setPermission("granted");
        toast.success("Notifications activées !");
      } else {
        setPermission(getOneSignalPermission());
        toast.error("Notifications refusées par le navigateur");
      }
    } catch {
      toast.error("Erreur lors de l'activation");
    } finally {
      setIsActivating(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Mot de passe modifié avec succès !");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du changement de mot de passe");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Determine push status: use OneSignal SDK permission + subscription
  const pushIsGranted = permission === "granted";
  const pushIsDenied = permission === "denied";
  const pushIsDefault = !pushIsGranted && !pushIsDenied;

  return (
    <div className="space-y-6">
      {/* Push Notifications */}
      <Card className="shadow-md border-2" style={{ borderColor: `${NAV_COLORS.communication.base}30` }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" style={{ color: NAV_COLORS.communication.base }} />
            Notifications Push
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <BellOff className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Non disponible</p>
                <p className="text-xs text-muted-foreground">
                  Les notifications push ne sont pas supportées sur ce navigateur.
                </p>
              </div>
            </div>
          ) : pushIsGranted ? (
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: `${NAV_COLORS.communication.base}10` }}>
              <CheckCircle2 className="h-5 w-5 text-status-optimal" />
              <div>
                <p className="text-sm font-medium">Notifications activées</p>
                <p className="text-xs text-muted-foreground">
                  Tu recevras les notifications de messages, convocations et annonces.
                </p>
              </div>
            </div>
          ) : pushIsDenied ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium">Notifications bloquées</p>
                <p className="text-xs text-muted-foreground">
                  Les notifications sont bloquées dans les paramètres de ton navigateur. 
                  Va dans les paramètres de ton navigateur pour les réactiver.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10">
                <Bell className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-medium">Notifications non activées</p>
                  <p className="text-xs text-muted-foreground">
                    Active les notifications pour ne rien manquer !
                  </p>
                </div>
              </div>
              <Button
                onClick={handleActivateNotifications}
                disabled={isActivating}
                className="w-full"
                style={{ backgroundColor: NAV_COLORS.communication.base }}
              >
                <Bell className="h-4 w-4 mr-2" />
                {isActivating ? "Activation..." : "Activer les notifications"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications Status */}
      <Card className="shadow-md border-2" style={{ borderColor: `${NAV_COLORS.planification.base}30` }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" style={{ color: NAV_COLORS.planification.base }} />
            Notifications Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: emailNotifStatus ? `${NAV_COLORS.sante.base}10` : `${NAV_COLORS.performance.base}10` }}>
            {emailNotifStatus ? (
              <CheckCircle2 className="h-5 w-5" style={{ color: NAV_COLORS.sante.base }} />
            ) : (
              <AlertCircle className="h-5 w-5" style={{ color: NAV_COLORS.performance.base }} />
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {emailNotifStatus ? "Actif" : "Inactif"}
                </p>
                <Badge 
                  variant={emailNotifStatus ? "default" : "secondary"}
                  className="text-[10px] h-5"
                  style={emailNotifStatus ? { backgroundColor: NAV_COLORS.sante.base } : {}}
                >
                  {emailNotifStatus ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {emailNotifStatus 
                  ? "Tu recevras les notifications importantes par email."
                  : "Les notifications email ne sont pas encore activées. Active les notifications push pour les activer."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card className="shadow-md border-2" style={{ borderColor: `${NAV_COLORS.effectif.base}30` }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" style={{ color: NAV_COLORS.effectif.base }} />
            Mon compte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Email / Identifiant</Label>
              <Badge variant="outline" className="text-xs max-w-[200px] truncate">{displayEmail}</Badge>
            </div>
          </div>

          {!showPasswordForm ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPasswordForm(true)}
            >
              <Lock className="h-4 w-4 mr-2" />
              Modifier mon mot de passe
            </Button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg border">
              <div>
                <Label className="text-sm">Nouveau mot de passe</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm">Confirmer le mot de passe</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmer"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                >
                  {isChangingPassword ? "..." : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
