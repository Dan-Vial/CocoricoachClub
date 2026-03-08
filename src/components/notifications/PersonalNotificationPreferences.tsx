import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Calendar, Dumbbell, Heart, MessageSquare, Trophy, ClipboardList, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  push_sessions: boolean;
  push_matches: boolean;
  push_wellness_reminder: boolean;
  push_rpe_reminder: boolean;
  push_injuries: boolean;
  push_messages: boolean;
  push_convocations: boolean;
  email_sessions: boolean;
  email_matches: boolean;
  email_wellness_reminder: boolean;
  email_rpe_reminder: boolean;
  email_convocations: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  push_enabled: true,
  email_enabled: true,
  push_sessions: true,
  push_matches: true,
  push_wellness_reminder: true,
  push_rpe_reminder: true,
  push_injuries: true,
  push_messages: true,
  push_convocations: true,
  email_sessions: true,
  email_matches: true,
  email_wellness_reminder: true,
  email_rpe_reminder: true,
  email_convocations: true,
};

export function PersonalNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return DEFAULT_PREFERENCES;
      
      const { data } = await supabase
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (data) {
        return data as NotificationPreferences;
      }
      
      // Create default preferences if none exist
      const { data: newPrefs } = await supabase
        .from("user_notification_preferences")
        .insert({ user_id: user.id, ...DEFAULT_PREFERENCES })
        .select()
        .single();
      
      return (newPrefs as NotificationPreferences) || DEFAULT_PREFERENCES;
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("user_notification_preferences")
        .update(updates)
        .eq("user_id", user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
      toast.success("Préférences mises à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const prefs = preferences || DEFAULT_PREFERENCES;

  const notificationTypes = [
    {
      key: "sessions",
      label: "Entraînements",
      description: "Création, modification ou annulation de séances",
      icon: Dumbbell,
      pushKey: "push_sessions" as const,
      emailKey: "email_sessions" as const,
    },
    {
      key: "matches",
      label: "Matchs / Compétitions",
      description: "Événements sportifs et convocations",
      icon: Trophy,
      pushKey: "push_matches" as const,
      emailKey: "email_matches" as const,
    },
    {
      key: "convocations",
      label: "Convocations",
      description: "Appels pour les matchs et événements",
      icon: ClipboardList,
      pushKey: "push_convocations" as const,
      emailKey: "email_convocations" as const,
    },
    {
      key: "wellness",
      label: "Rappels Wellness",
      description: "Rappel quotidien pour remplir votre wellness",
      icon: Heart,
      pushKey: "push_wellness_reminder" as const,
      emailKey: "email_wellness_reminder" as const,
    },
    {
      key: "rpe",
      label: "Rappels RPE",
      description: "Rappel pour noter vos séances d'entraînement",
      icon: Calendar,
      pushKey: "push_rpe_reminder" as const,
      emailKey: "email_rpe_reminder" as const,
    },
    {
      key: "injuries",
      label: "Alertes Blessures",
      description: "Notifications sur les blessures et retours",
      icon: Heart,
      pushKey: "push_injuries" as const,
      emailKey: null,
    },
    {
      key: "messages",
      label: "Messages",
      description: "Nouveaux messages dans la messagerie",
      icon: MessageSquare,
      pushKey: "push_messages" as const,
      emailKey: null,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Mes préférences de notifications</CardTitle>
              <CardDescription>Choisissez les notifications que vous souhaitez recevoir</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <Label className="font-medium">Notifications Push</Label>
                <p className="text-xs text-muted-foreground">Sur votre appareil</p>
              </div>
            </div>
            <Switch
              checked={prefs.push_enabled}
              onCheckedChange={(v) => handleToggle("push_enabled", v)}
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <Label className="font-medium">Notifications Email</Label>
                <p className="text-xs text-muted-foreground">Dans votre boîte mail</p>
              </div>
            </div>
            <Switch
              checked={prefs.email_enabled}
              onCheckedChange={(v) => handleToggle("email_enabled", v)}
            />
          </div>
        </div>

        <Separator />

        {/* Granular preferences */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium mb-3">Types de notifications</h4>
          <div className="space-y-3">
            {notificationTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.key}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{type.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-2">
                    {/* Push toggle */}
                    <div className="flex items-center gap-2">
                      <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                      <Switch
                        checked={prefs[type.pushKey] && prefs.push_enabled}
                        disabled={!prefs.push_enabled}
                        onCheckedChange={(v) => handleToggle(type.pushKey, v)}
                      />
                    </div>
                    {/* Email toggle */}
                    {type.emailKey && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <Switch
                          checked={prefs[type.emailKey] && prefs.email_enabled}
                          disabled={!prefs.email_enabled}
                          onCheckedChange={(v) => handleToggle(type.emailKey, v)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Les notifications désactivées ne seront pas envoyées, même si le staff les déclenche.
        </p>
      </CardContent>
    </Card>
  );
}
