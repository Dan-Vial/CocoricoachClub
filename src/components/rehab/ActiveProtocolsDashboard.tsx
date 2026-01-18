import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Activity, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Dumbbell,
  TrendingDown,
  TrendingUp,
  User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO, format } from "date-fns";
import { fr } from "date-fns/locale";

interface ActiveProtocolsDashboardProps {
  categoryId: string;
}

export function ActiveProtocolsDashboard({ categoryId }: ActiveProtocolsDashboardProps) {
  const navigate = useNavigate();

  // Fetch all active player rehab protocols for this category
  const { data: activeProtocols, isLoading } = useQuery({
    queryKey: ["active-rehab-protocols", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_rehab_protocols")
        .select(`
          *,
          players (
            id,
            name,
            avatar_url,
            position
          ),
          injury_protocols (
            name,
            injury_category,
            typical_duration_days_min,
            typical_duration_days_max
          ),
          injuries (
            injury_type,
            injury_date,
            estimated_return_date
          )
        `)
        .eq("category_id", categoryId)
        .eq("status", "in_progress")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch calendar events for progress calculation
  const { data: allRehabEvents } = useQuery({
    queryKey: ["all-rehab-events-category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rehab_calendar_events")
        .select("*")
        .eq("category_id", categoryId);

      if (error) throw error;
      return data;
    },
  });

  // Fetch upcoming events (next 7 days)
  const { data: upcomingEvents } = useQuery({
    queryKey: ["upcoming-rehab-events", categoryId],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data, error } = await supabase
        .from("rehab_calendar_events")
        .select(`
          *,
          players (
            id,
            name
          )
        `)
        .eq("category_id", categoryId)
        .eq("is_completed", false)
        .gte("event_date", format(today, "yyyy-MM-dd"))
        .lte("event_date", format(nextWeek, "yyyy-MM-dd"))
        .order("event_date", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const getProtocolProgress = (protocolId: string) => {
    const events = allRehabEvents?.filter(e => e.player_rehab_protocol_id === protocolId) || [];
    const total = events.length;
    const completed = events.filter(e => e.is_completed).length;
    return { total, completed, percent: total > 0 ? (completed / total) * 100 : 0 };
  };

  const getStatusBadge = (progress: number, estimatedReturn?: string | null) => {
    if (progress === 100) {
      return <Badge className="bg-green-500">Terminé</Badge>;
    }
    if (estimatedReturn) {
      const daysLeft = differenceInDays(parseISO(estimatedReturn), new Date());
      if (daysLeft < 0) {
        return <Badge variant="destructive">En retard</Badge>;
      }
      if (daysLeft <= 7) {
        return <Badge className="bg-amber-500">Retour proche</Badge>;
      }
    }
    return <Badge variant="secondary">En cours</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const totalPlayers = activeProtocols?.length || 0;
  const averageProgress = activeProtocols?.reduce((acc, p) => {
    return acc + getProtocolProgress(p.id).percent;
  }, 0) || 0;
  const avgProgressPercent = totalPlayers > 0 ? averageProgress / totalPlayers : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Dumbbell className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPlayers}</p>
                <p className="text-sm text-muted-foreground">Athlètes en réhab</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(avgProgressPercent)}%</p>
                <p className="text-sm text-muted-foreground">Progression moyenne</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingEvents?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Événements à venir</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activeProtocols?.filter(p => {
                    const injury = p.injuries as any;
                    if (!injury?.estimated_return_date) return false;
                    return differenceInDays(parseISO(injury.estimated_return_date), new Date()) < 0;
                  }).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">En retard</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Active Protocols List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Protocoles actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeProtocols && activeProtocols.length > 0 ? (
              <div className="space-y-4">
                {activeProtocols.map((protocol) => {
                  const player = protocol.players as any;
                  const injuryProtocol = protocol.injury_protocols as any;
                  const injury = protocol.injuries as any;
                  const progress = getProtocolProgress(protocol.id);

                  return (
                    <div
                      key={protocol.id}
                      className="p-4 border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/player/${player?.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={player?.avatar_url} />
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{player?.name}</p>
                            {getStatusBadge(progress.percent, injury?.estimated_return_date)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {injuryProtocol?.name} - {injury?.injury_type}
                          </p>
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Phase {protocol.current_phase}</span>
                              <span>{Math.round(progress.percent)}%</span>
                            </div>
                            <Progress value={progress.percent} className="h-1.5" />
                          </div>
                          {injury?.estimated_return_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3 inline mr-1" />
                              Retour estimé: {format(parseISO(injury.estimated_return_date), "d MMM yyyy", { locale: fr })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun protocole actif</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Prochaines échéances
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents && upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event) => {
                  const player = event.players as any;
                  const eventDate = parseISO(event.event_date);
                  const daysUntil = differenceInDays(eventDate, new Date());

                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/player/${player?.id}`)}
                    >
                      <div className={`p-2 rounded-lg ${
                        event.event_type === 'checkpoint' 
                          ? 'bg-amber-500/10' 
                          : 'bg-blue-500/10'
                      }`}>
                        {event.event_type === 'checkpoint' 
                          ? <CheckCircle2 className="h-4 w-4 text-amber-600" />
                          : <Dumbbell className="h-4 w-4 text-blue-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{player?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {daysUntil === 0 
                            ? "Aujourd'hui" 
                            : daysUntil === 1 
                              ? "Demain" 
                              : `Dans ${daysUntil}j`
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(eventDate, "d MMM", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun événement à venir</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}