import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Trophy, Users, MapPin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AddNationalEventDialog } from "./AddNationalEventDialog";
import { NationalTeamCalendar } from "./NationalTeamCalendar";
import { PlayerCapsSection } from "./PlayerCapsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NationalTeamTabProps {
  categoryId: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  test_match: "Test Match",
  six_nations: "Tournoi des 6 Nations",
  world_cup: "Coupe du Monde",
  autumn_nations: "Autumn Nations Series",
  summer_tour: "Tournée d'été",
  stage: "Stage",
  rassemblement: "Rassemblement",
  other: "Autre",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  test_match: "bg-blue-500",
  six_nations: "bg-green-600",
  world_cup: "bg-amber-500",
  autumn_nations: "bg-orange-500",
  summer_tour: "bg-cyan-500",
  stage: "bg-purple-500",
  rassemblement: "bg-indigo-500",
  other: "bg-gray-500",
};

export function NationalTeamTab({ categoryId }: NationalTeamTabProps) {
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["national_team_events", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("national_team_events")
        .select("*")
        .eq("category_id", categoryId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: capsStats } = useQuery({
    queryKey: ["player_caps_stats", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_caps")
        .select("player_id, players(name)")
        .eq("category_id", categoryId);
      if (error) throw error;
      
      // Count caps per player
      const capCounts: Record<string, { name: string; count: number }> = {};
      data?.forEach((cap: any) => {
        if (!capCounts[cap.player_id]) {
          capCounts[cap.player_id] = { name: cap.players?.name || "Unknown", count: 0 };
        }
        capCounts[cap.player_id].count++;
      });
      
      return Object.entries(capCounts)
        .map(([id, { name, count }]) => ({ id, name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
  });

  const upcomingEvents = events?.filter(
    (e) => new Date(e.start_date) >= new Date()
  ).slice(0, 3);

  const recentEvents = events?.filter(
    (e) => new Date(e.start_date) < new Date()
  ).slice(0, 5);

  if (isLoading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Équipe Nationale</h2>
        <Button onClick={() => setIsAddEventOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un événement
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          <TabsTrigger value="caps">Sélections</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Événements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{events?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Matchs joués
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {events?.filter((e) => 
                    ["test_match", "six_nations", "world_cup", "autumn_nations", "summer_tour"].includes(e.event_type)
                  ).length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Stages/Rassemblements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {events?.filter((e) => 
                    ["stage", "rassemblement"].includes(e.event_type)
                  ).length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Joueurs sélectionnés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{capsStats?.length || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Événements à venir
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents && upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${EVENT_TYPE_COLORS[event.event_type]}`} />
                        <div>
                          <p className="font-medium">{event.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {EVENT_TYPE_LABELS[event.event_type]}
                            {event.opponent && ` vs ${event.opponent}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(event.start_date), "dd MMM yyyy", { locale: fr })}
                        </p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Aucun événement à venir
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Événements récents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentEvents && recentEvents.length > 0 ? (
                <div className="space-y-3">
                  {recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${EVENT_TYPE_COLORS[event.event_type]}`} />
                        <div>
                          <p className="font-medium">{event.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {EVENT_TYPE_LABELS[event.event_type]}
                            {event.opponent && ` vs ${event.opponent}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(event.start_date), "dd MMM yyyy", { locale: fr })}
                        </p>
                        {event.score_home !== null && event.score_away !== null && (
                          <p className="text-sm font-bold">
                            {event.score_home} - {event.score_away}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Aucun événement passé
                </p>
              )}
            </CardContent>
          </Card>

          {/* Top Players by Caps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Sélections
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capsStats && capsStats.length > 0 ? (
                <div className="space-y-2">
                  {capsStats.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6">
                          {index + 1}
                        </span>
                        <span className="font-medium">{player.name}</span>
                      </div>
                      <span className="font-bold text-primary">{player.count} sél.</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Aucune sélection enregistrée
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <NationalTeamCalendar categoryId={categoryId} events={events || []} />
        </TabsContent>

        <TabsContent value="caps">
          <PlayerCapsSection categoryId={categoryId} />
        </TabsContent>
      </Tabs>

      <AddNationalEventDialog
        open={isAddEventOpen}
        onOpenChange={setIsAddEventOpen}
        categoryId={categoryId}
      />
    </div>
  );
}
