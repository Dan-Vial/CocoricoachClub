import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Activity, Brain, TrendingUp, TrendingDown, X, Check, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface SmartAlert {
  id: string;
  category_id: string;
  player_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  expires_at: string | null;
  player?: { first_name: string | null; name: string };
}

interface SmartAlertsPanelProps {
  categoryId: string;
}

const alertTypeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  fatigue: { icon: <Brain className="h-4 w-4" />, color: "text-orange-500" },
  injury_risk: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-500" },
  overtraining: { icon: <TrendingUp className="h-4 w-4" />, color: "text-red-600" },
  recovery_needed: { icon: <Activity className="h-4 w-4" />, color: "text-yellow-500" },
  awcr_high: { icon: <TrendingUp className="h-4 w-4" />, color: "text-red-500" },
  awcr_low: { icon: <TrendingDown className="h-4 w-4" />, color: "text-blue-500" },
};

const severityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function SmartAlertsPanel({ categoryId }: SmartAlertsPanelProps) {
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["smart-alerts", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("smart_alerts")
        .select(`
          *,
          player:players(first_name, name)
        `)
        .eq("category_id", categoryId)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as SmartAlert[];
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("smart_alerts")
        .update({ is_dismissed: true })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-alerts", categoryId] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("smart_alerts")
        .update({ is_read: true })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-alerts", categoryId] });
    },
  });

  const unreadCount = alerts.filter(a => !a.is_read).length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Alertes Intelligentes
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Check className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>Aucune alerte active</p>
            <p className="text-sm">Tous vos athlètes sont en bonne forme !</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {alerts.map((alert) => {
                const config = alertTypeConfig[alert.alert_type] || { 
                  icon: <AlertTriangle className="h-4 w-4" />, 
                  color: "text-muted-foreground" 
                };
                
                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      alert.is_read 
                        ? "bg-background" 
                        : "bg-muted/50 border-primary/20"
                    }`}
                    onClick={() => !alert.is_read && markReadMutation.mutate(alert.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={config.color}>{config.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{alert.title}</span>
                            <Badge className={severityColors[alert.severity]} variant="secondary">
                              {alert.severity === "critical" ? "Critique" : 
                               alert.severity === "high" ? "Élevé" :
                               alert.severity === "medium" ? "Moyen" : "Faible"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {alert.player?.name && (
                              <span className="font-medium">{[alert.player.first_name, alert.player.name].filter(Boolean).join(" ")}: </span>
                            )}
                            {alert.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(alert.created_at), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissMutation.mutate(alert.id);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
