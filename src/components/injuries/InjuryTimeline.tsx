import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Activity, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { INJURY_STATUS } from "@/lib/constants/injury";

interface InjuryTimelineProps {
  playerId?: string;
  categoryId: string;
  limit?: number;
}

export function InjuryTimeline({ playerId, categoryId, limit = 10 }: InjuryTimelineProps) {
  const { data: injuries, isLoading } = useQuery({
    queryKey: ["injury-timeline", playerId, categoryId],
    queryFn: async () => {
      let query = supabase
        .from("injuries")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("injury_date", { ascending: false })
        .limit(limit);

      if (playerId) {
        query = query.eq("player_id", playerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-card">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case INJURY_STATUS.ACTIVE:
        return { 
          status: "critical" as const, 
          icon: AlertTriangle, 
          label: "Active" 
        };
      case INJURY_STATUS.REHABILITATION:
        return { 
          status: "attention" as const, 
          icon: TrendingUp, 
          label: "Réathlétisation" 
        };
      case INJURY_STATUS.HEALED:
        return { 
          status: "optimal" as const, 
          icon: CheckCircle, 
          label: "Guérie" 
        };
      default:
        return { 
          status: "attention" as const, 
          icon: Activity, 
          label: status 
        };
    }
  };

  const getSeverityStatus = (severity: string) => {
    switch (severity) {
      case "légère":
        return "attention";
      case "modérée":
        return "attention";
      case "grave":
        return "critical";
      default:
        return "attention";
    }
  };

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Historique des Blessures
        </CardTitle>
      </CardHeader>
      <CardContent>
        {injuries && injuries.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {injuries.map((injury, index) => {
                const statusInfo = getStatusInfo(injury.status);
                const StatusIcon = statusInfo.icon;
                const daysAgo = differenceInDays(new Date(), new Date(injury.injury_date));
                const healingDays = injury.actual_return_date 
                  ? differenceInDays(new Date(injury.actual_return_date), new Date(injury.injury_date))
                  : null;

                return (
                  <div 
                    key={injury.id} 
                    className="relative pl-10 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Timeline dot */}
                    <div 
                      className={`absolute left-2 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${injury.status === INJURY_STATUS.ACTIVE 
                          ? "bg-status-critical/20 border-status-critical" 
                          : injury.status === INJURY_STATUS.REHABILITATION
                            ? "bg-status-attention/20 border-status-attention"
                            : "bg-status-optimal/20 border-status-optimal"
                        }`}
                    >
                      <StatusIcon className={`h-2.5 w-2.5 
                        ${injury.status === INJURY_STATUS.ACTIVE 
                          ? "text-status-critical" 
                          : injury.status === INJURY_STATUS.REHABILITATION
                            ? "text-status-attention"
                            : "text-status-optimal"
                        }`} 
                      />
                    </div>

                    {/* Content */}
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {injury.injury_type}
                          </p>
                          {!playerId && (
                            <p className="text-sm text-muted-foreground">
                              {injury.players?.name}
                            </p>
                          )}
                        </div>
                        <StatusBadge 
                          status={statusInfo.status} 
                          animated={injury.status === INJURY_STATUS.ACTIVE}
                        >
                          {statusInfo.label}
                        </StatusBadge>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {format(new Date(injury.injury_date), "d MMMM yyyy", { locale: fr })}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <StatusBadge status={getSeverityStatus(injury.severity) as "optimal" | "attention" | "critical"}>
                          {injury.severity}
                        </StatusBadge>
                        {healingDays !== null && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-status-optimal">
                              Guérie en {healingDays} jours
                            </span>
                          </>
                        )}
                        {injury.status === INJURY_STATUS.ACTIVE && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-status-critical">
                              Il y a {daysAgo} jour{daysAgo > 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </div>

                      {injury.estimated_return_date && injury.status !== INJURY_STATUS.HEALED && (
                        <p className="text-xs text-muted-foreground">
                          Retour estimé: {format(new Date(injury.estimated_return_date), "d MMMM yyyy", { locale: fr })}
                        </p>
                      )}

                      {injury.description && (
                        <p className="text-xs text-muted-foreground italic">
                          {injury.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">
            Aucune blessure enregistrée
          </p>
        )}
      </CardContent>
    </Card>
  );
}
