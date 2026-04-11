import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Dumbbell, Activity, CheckCircle2, Swords, Video, Stethoscope, Users, CalendarDays, LayoutDashboard } from "lucide-react";
import { isWithinInterval, parseISO } from "date-fns";
import { getDisplayNotes, parseTestsFromNotes } from "@/lib/utils/sessionNotes";
import { TEST_CATEGORIES } from "@/lib/constants/testCategories";
import { AnnualPlanningView } from "@/components/planning/AnnualPlanningView";

interface PlayerCalendarTabProps {
  playerId: string;
  categoryId: string;
}

// Helper to get training type label
const getTrainingTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    collective: "Entraînement collectif",
    individuelle: "Entraînement individuel",
    musculation: "Musculation",
    cardio: "Cardio",
    video: "Analyse vidéo",
    repos: "Repos / RDV médical",
    reunion: "Réunion d'équipe",
    autre: "Autre",
    recovery: "Récupération",
    match_preparation: "Préparation match",
    tactical: "Tactique",
    technique: "Technique",
  };
  return labels[type] || type.replace(/_/g, " ");
};

// Helper to get training type icon
const getTrainingTypeIcon = (type: string) => {
  switch (type) {
    case "video": return Video;
    case "repos": return Stethoscope;
    case "reunion": return Users;
    default: return Activity;
  }
};

// Helper to get human-readable test name from test_type
const getTestLabel = (testType: string): string => {
  for (const category of TEST_CATEGORIES) {
    const test = category.tests.find((t) => t.value === testType);
    if (test) return test.label;
  }
  return testType.replace(/_/g, " ");
};

export function PlayerCalendarTab({ playerId, categoryId }: PlayerCalendarTabProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Fetch training sessions - refetch on focus to catch new events
  const { data: sessions } = useQuery({
    queryKey: ["training_sessions", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false })
        .order("session_start_time", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: true,
  });

  // Fetch matches for this category
  const { data: matches } = useQuery({
    queryKey: ["matches", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("category_id", categoryId)
        .order("match_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: true,
  });

  // Fetch rehab calendar events for this player
  const { data: rehabEvents } = useQuery({
    queryKey: ["rehab-calendar-events", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rehab_calendar_events")
        .select(`
          *,
          player_rehab_protocols (
            injury_protocols (
              name
            )
          )
        `)
        .eq("player_id", playerId)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredSessions = sessions?.filter((session) => {
    if (!dateRange?.from) return true;
    const sessionDate = new Date(session.session_date);
    if (dateRange.to) {
      return isWithinInterval(sessionDate, { start: dateRange.from, end: dateRange.to });
    }
    return sessionDate.toDateString() === dateRange.from.toDateString();
  });

  const filteredMatches = matches?.filter((match) => {
    if (!dateRange?.from) return true;
    const matchDate = new Date(match.match_date);
    if (dateRange.to) {
      return isWithinInterval(matchDate, { start: dateRange.from, end: dateRange.to });
    }
    return matchDate.toDateString() === dateRange.from.toDateString();
  });

  const filteredRehabEvents = rehabEvents?.filter((event) => {
    if (!dateRange?.from) return true;
    const eventDate = parseISO(event.event_date);
    if (dateRange.to) {
      return isWithinInterval(eventDate, { start: dateRange.from, end: dateRange.to });
    }
    return eventDate.toDateString() === dateRange.from.toDateString();
  });

  const sessionDates = sessions?.map((session) => new Date(session.session_date)) || [];
  const matchDates = matches?.map((match) => new Date(match.match_date)) || [];
  const rehabDates = rehabEvents?.map((event) => parseISO(event.event_date)) || [];

  const getRehabEventTypeLabel = (type: string) => {
    switch (type) {
      case 'phase_start': return 'Début de phase';
      case 'checkpoint': return 'Évaluation';
      case 'phase_end': return 'Fin de phase';
      default: return type;
    }
  };

  const getRehabEventTypeColor = (type: string, isCompleted: boolean) => {
    if (isCompleted) return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500';
    switch (type) {
      case 'phase_start': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500';
      case 'checkpoint': return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Combine all events for display, sorted by date
  const allEvents = [
    ...(filteredSessions?.map(s => ({ 
      ...s, 
      _type: 'session' as const, 
      _date: new Date(s.session_date) 
    })) || []),
    ...(filteredMatches?.map(m => ({ 
      ...m, 
      _type: 'match' as const, 
      _date: new Date(m.match_date) 
    })) || []),
    ...(filteredRehabEvents?.map(e => ({ 
      ...e, 
      _type: 'rehab' as const, 
      _date: parseISO(e.event_date) 
    })) || []),
  ].sort((a, b) => b._date.getTime() - a._date.getTime());

  return (
    <Tabs defaultValue="calendar" className="space-y-4">
      <div className="flex justify-center">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="annual" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Planification annuelle
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="calendar">
        <Card className="bg-gradient-card shadow-md">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Calendrier du joueur</CardTitle>
              {dateRange?.from && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange(undefined)}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Réinitialiser
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex justify-center">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  modifiers={{
                    session: sessionDates,
                    match: matchDates,
                    rehab: rehabDates,
                  }}
                  modifiersStyles={{
                    session: {
                      fontWeight: "bold",
                      textDecoration: "underline",
                    },
                    match: {
                      backgroundColor: "hsl(346, 77%, 50%, 0.2)",
                      borderRadius: "4px",
                      fontWeight: "bold",
                    },
                    rehab: {
                      backgroundColor: "hsl(var(--primary) / 0.2)",
                      borderRadius: "4px",
                    },
                  }}
                  className="rounded-md border pointer-events-auto"
                />
              </div>

              <div className="space-y-4">
                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-muted-foreground" />
                    <span>Entraînement</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Swords className="w-3 h-3 text-rose-500" />
                    <span>Match</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Dumbbell className="w-3 h-3 text-primary" />
                    <span>Réhabilitation</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">
                    {dateRange?.from
                      ? dateRange.to
                        ? `Événements du ${dateRange.from.toLocaleDateString("fr-FR")} au ${dateRange.to.toLocaleDateString("fr-FR")}`
                        : `Événements du ${dateRange.from.toLocaleDateString("fr-FR")}`
                      : "Tous les événements"}
                  </h3>
                  
                  {allEvents.length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {allEvents.map((event) => {
                        if (event._type === 'session') {
                          const Icon = getTrainingTypeIcon(event.training_type);
                          return (
                            <div
                              key={`session-${event.id}`}
                              className="p-3 border rounded-lg bg-card hover:bg-accent/10 transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2">
                                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{getTrainingTypeLabel(event.training_type)}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {event._date.toLocaleDateString("fr-FR", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </p>
                                    {event.session_start_time && (
                                      <p className="text-sm text-muted-foreground">
                                        {event.session_start_time}
                                        {event.session_end_time && ` - ${event.session_end_time}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {event.intensity && event.intensity > 1 && (
                                  <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                                    Intensité: {event.intensity}/10
                                  </span>
                                )}
                              </div>
                              {(() => {
                                const tests = parseTestsFromNotes(event.notes);
                                const displayNotes = getDisplayNotes(event.notes);
                                return (
                                  <>
                                    {tests.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2 ml-6">
                                        {tests.map((t, i) => (
                                          <Badge key={i} variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                            {getTestLabel(t.test_type)}{t.result_unit ? ` (${t.result_unit})` : ''}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                    {displayNotes && (
                                      <p className="text-sm mt-2 text-muted-foreground ml-6">{displayNotes}</p>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          );
                        } else if (event._type === 'match') {
                          return (
                            <div
                              key={`match-${event.id}`}
                              className="p-3 border-l-4 border-rose-500 rounded-lg bg-rose-50 dark:bg-rose-950/20 transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2">
                                  <Swords className="h-4 w-4 mt-0.5 text-rose-600" />
                                  <div>
                                    <p className="font-medium">vs {event.opponent}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {event._date.toLocaleDateString("fr-FR", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </p>
                                    {event.location && (
                                      <p className="text-xs text-muted-foreground">{event.location}</p>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs border-rose-300 text-rose-600">
                                  {event.is_home ? 'Domicile' : 'Extérieur'}
                                </Badge>
                              </div>
                            </div>
                          );
                        } else {
                          // Rehab event
                          const rehabEvent = event as typeof event & { 
                            title: string; 
                            event_type: string;
                            is_completed?: boolean; 
                            description?: string;
                            player_rehab_protocols?: { injury_protocols?: { name: string } };
                          };
                          const protocolName = rehabEvent.player_rehab_protocols?.injury_protocols?.name;
                          return (
                            <div
                              key={`rehab-${event.id}`}
                              className={`p-3 border-l-4 rounded-lg transition-colors ${getRehabEventTypeColor(rehabEvent.event_type, rehabEvent.is_completed || false)}`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2">
                                  <Dumbbell className="h-4 w-4 mt-0.5" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{rehabEvent.title}</p>
                                      {rehabEvent.is_completed && (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {event._date.toLocaleDateString("fr-FR", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </p>
                                    {protocolName && (
                                      <p className="text-xs text-muted-foreground">
                                        Protocole: {protocolName}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {getRehabEventTypeLabel(rehabEvent.event_type)}
                                </Badge>
                              </div>
                              {rehabEvent.description && (
                                <p className="text-sm mt-2 text-muted-foreground ml-6">{rehabEvent.description}</p>
                              )}
                            </div>
                          );
                        }
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Aucun événement pour cette période</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="annual">
        <AnnualPlanningView categoryId={categoryId} />
      </TabsContent>
    </Tabs>
  );
}
