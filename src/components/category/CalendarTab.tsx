import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, X, Swords, MapPin, Calendar as CalendarIcon, LayoutTemplate, Target, Clock } from "lucide-react";
import { toast } from "sonner";
import { AddSessionDialog } from "./AddSessionDialog";
import { EditSessionDialog } from "./EditSessionDialog";
import { AddMatchCalendarDialog } from "./matches/AddMatchCalendarDialog";
import { QuickTestEntryDialog } from "./QuickTestEntryDialog";
import { QuickRpeEntryDialog } from "./QuickRpeEntryDialog";
import { format, isSameDay, isWithinInterval, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { useNavigate } from "react-router-dom";
import { WeeklyPlanningCalendar } from "@/components/planning/WeeklyPlanningCalendar";
import { SessionTemplatesSection } from "@/components/planning/SessionTemplatesSection";
import { SeasonObjectivesSection } from "@/components/planning/SeasonObjectivesSection";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface CalendarTabProps {
  categoryId: string;
}

const trainingTypeLabels: Record<string, string> = {
  collectif: "Collectif",
  technique_individuelle: "Technique Individuelle",
  physique: "Physique",
  musculation: "Musculation",
  repos: "Repos",
  test: "Test",
  reathlétisation: "Réathlétisation",
};

const trainingTypeColors: Record<string, string> = {
  collectif: "bg-training-collectif",
  technique_individuelle: "bg-training-technique",
  physique: "bg-training-physique",
  musculation: "bg-training-musculation",
  repos: "bg-training-repos",
  test: "bg-training-test",
  reathlétisation: "bg-amber-500",
  match: "bg-rose-500",
};

export function CalendarTab({ categoryId }: CalendarTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddMatchDialogOpen, setIsAddMatchDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<{
    id: string;
    session_date: string;
    session_start_time: string | null;
    session_end_time: string | null;
    training_type: string;
    intensity: number | null;
    notes: string | null;
  } | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedSession, setSelectedSession] = useState<{
    id: string;
    date: string;
    type: "test" | "training";
  } | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isViewer } = useViewerModeContext();

  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
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
  });

  const { data: matches, isLoading: isLoadingMatches } = useQuery({
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
  });

  const { data: weeklyPlanning, isLoading: isLoadingPlanning } = useQuery({
    queryKey: ["weekly-planning-all", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_planning")
        .select(`
          *,
          template:session_templates(name, session_type, duration_minutes, intensity)
        `)
        .eq("category_id", categoryId);
      if (error) throw error;
      return data;
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("training_sessions")
        .delete()
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      toast.success("Séance supprimée avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de la séance");
    },
  });

  // Helper to get actual date from weekly planning item
  const getWeeklyPlanningDate = (item: { week_start_date: string; day_of_week: number }) => {
    const weekStart = startOfWeek(new Date(item.week_start_date), { weekStartsOn: 1 });
    return addDays(weekStart, item.day_of_week);
  };

  const filteredSessions = sessions?.filter((session) => {
    if (!dateRange?.from) return false;
    const sessionDate = new Date(session.session_date);
    
    if (dateRange.to) {
      return isWithinInterval(sessionDate, { start: dateRange.from, end: dateRange.to });
    }
    return isSameDay(sessionDate, dateRange.from);
  });

  const filteredMatches = matches?.filter((match) => {
    if (!dateRange?.from) return false;
    const matchDate = new Date(match.match_date);
    
    if (dateRange.to) {
      return isWithinInterval(matchDate, { start: dateRange.from, end: dateRange.to });
    }
    return isSameDay(matchDate, dateRange.from);
  });

  const filteredPlanning = weeklyPlanning?.filter((item) => {
    if (!dateRange?.from) return false;
    const itemDate = getWeeklyPlanningDate(item);
    
    if (dateRange.to) {
      return isWithinInterval(itemDate, { start: dateRange.from, end: dateRange.to });
    }
    return isSameDay(itemDate, dateRange.from);
  });

  // Combine and sort events by date
  const combinedEvents = [
    ...(filteredSessions?.map((s) => ({ ...s, eventType: "session" as const })) || []),
    ...(filteredMatches?.map((m) => ({ ...m, eventType: "match" as const })) || []),
    ...(filteredPlanning?.map((p) => ({ ...p, eventType: "planning" as const, actualDate: getWeeklyPlanningDate(p) })) || []),
  ].sort((a, b) => {
    const dateA = a.eventType === "session" ? new Date(a.session_date) 
      : a.eventType === "match" ? new Date(a.match_date) 
      : a.actualDate;
    const dateB = b.eventType === "session" ? new Date(b.session_date) 
      : b.eventType === "match" ? new Date(b.match_date) 
      : b.actualDate;
    return dateB.getTime() - dateA.getTime();
  });

  const getDayContent = (day: Date) => {
    const daySessions = sessions?.filter((session) =>
      isSameDay(new Date(session.session_date), day)
    );
    const dayMatches = matches?.filter((match) =>
      isSameDay(new Date(match.match_date), day)
    );
    const dayPlanning = weeklyPlanning?.filter((item) =>
      isSameDay(getWeeklyPlanningDate(item), day)
    );

    const hasEvents = (daySessions && daySessions.length > 0) || (dayMatches && dayMatches.length > 0) || (dayPlanning && dayPlanning.length > 0);
    if (!hasEvents) return null;

    return (
      <div className="flex gap-0.5 justify-center mt-1 flex-wrap">
        {dayMatches?.slice(0, 1).map((_, index) => (
          <div
            key={`match-${index}`}
            className="h-1.5 w-1.5 rounded-full bg-rose-500"
          />
        ))}
        {daySessions?.slice(0, 2).map((session, index) => (
          <div
            key={`session-${index}`}
            className={`h-1.5 w-1.5 rounded-full ${trainingTypeColors[session.training_type] || "bg-muted"}`}
          />
        ))}
        {dayPlanning?.slice(0, 2).map((item, index) => (
          <div
            key={`planning-${index}`}
            className={`h-1.5 w-1.5 rounded-full ${item.template?.session_type ? trainingTypeColors[item.template.session_type] || "bg-primary" : "bg-primary"}`}
          />
        ))}
      </div>
    );
  };

  const isLoading = isLoadingSessions || isLoadingMatches || isLoadingPlanning;

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="global" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto no-scrollbar gap-1 h-auto flex-wrap md:flex-nowrap bg-muted">
          <TabsTrigger value="global" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Calendrier Global</span>
            <span className="sm:hidden">Global</span>
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Planning Hebdo</span>
            <span className="sm:hidden">Hebdo</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
            <LayoutTemplate className="h-4 w-4 shrink-0" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="objectives" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
            <Target className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Objectifs</span>
            <span className="sm:hidden">Obj.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <Card className="bg-gradient-card shadow-md">
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-4">
                <CardTitle>Calendrier des entraînements et matchs</CardTitle>
                <div className="flex gap-2">
                  {dateRange?.from && (
                    <Button 
                      onClick={() => setDateRange(undefined)} 
                      variant="outline" 
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Réinitialiser
                    </Button>
                  )}
                  {!isViewer && (
                    <>
                      <Button onClick={() => setIsAddMatchDialogOpen(true)} variant="outline" className="gap-2">
                        <Swords className="h-4 w-4" />
                        Ajouter un match
                      </Button>
                      <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Ajouter une séance
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Sélectionnez une période pour filtrer les événements
                  </p>
                  {dateRange?.from && (
                    <p className="text-sm font-medium">
                      {dateRange.to ? (
                        <>
                          Du {format(dateRange.from, "d MMM yyyy", { locale: fr })} au{" "}
                          {format(dateRange.to, "d MMM yyyy", { locale: fr })}
                        </>
                      ) : (
                        format(dateRange.from, "d MMMM yyyy", { locale: fr })
                      )}
                    </p>
                  )}
                </div>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  locale={fr}
                  numberOfMonths={1}
                  className="rounded-md border bg-card pointer-events-auto"
                  modifiers={{
                    hasSession: (day) =>
                      sessions?.some((session) =>
                        isSameDay(new Date(session.session_date), day)
                      ) || false,
                    hasMatch: (day) =>
                      matches?.some((match) =>
                        isSameDay(new Date(match.match_date), day)
                      ) || false,
                  }}
                  modifiersClassNames={{
                    hasSession: "font-bold",
                    hasMatch: "font-bold text-rose-600",
                  }}
                  components={{
                    DayContent: ({ date }) => (
                      <div className="relative w-full h-full flex flex-col items-center justify-center">
                        <span>{format(date, "d")}</span>
                        {getDayContent(date)}
                      </div>
                    ),
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-3 justify-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500" />
                  <span className="text-muted-foreground">Match</span>
                </div>
                {Object.entries(trainingTypeLabels).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${trainingTypeColors[key] || "bg-muted"}`} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {dateRange?.from && (
            <Card className="bg-gradient-card shadow-md mt-6">
              <CardHeader>
                <CardTitle>
                  {dateRange.to ? (
                    <>
                      Événements du {format(dateRange.from, "d MMM", { locale: fr })} au{" "}
                      {format(dateRange.to, "d MMM yyyy", { locale: fr })}
                    </>
                  ) : (
                    <>Événements du {format(dateRange.from, "d MMMM yyyy", { locale: fr })}</>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {combinedEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Aucun événement sur cette période</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {combinedEvents.map((event) => {
                      if (event.eventType === "match") {
                        return (
                          <div
                            key={`match-${event.id}`}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors animate-fade-in cursor-pointer"
                            onClick={() => navigate(`?tab=matches`)}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="h-12 w-1.5 rounded-full bg-rose-500" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(event.match_date), "d MMM yyyy", { locale: fr })}
                                  </span>
                                  {event.match_time && (
                                    <span className="text-xs text-muted-foreground">
                                      • {event.match_time}
                                    </span>
                                  )}
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-medium">
                                    {event.is_home ? "Domicile" : "Extérieur"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Swords className="h-4 w-4 text-rose-500" />
                                  <span className="font-semibold">Match vs {event.opponent}</span>
                                </div>
                                {event.location && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </p>
                                )}
                                {(event.score_home !== null && event.score_away !== null) && (
                                  <p className="text-sm font-medium mt-1">
                                    Score: {event.score_home} - {event.score_away}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (event.eventType === "planning") {
                        return (
                          <div
                            key={`planning-${event.id}`}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors animate-fade-in"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div
                                className={`h-12 w-1.5 rounded-full ${
                                  event.template?.session_type ? trainingTypeColors[event.template.session_type] || "bg-primary" : "bg-primary"
                                }`}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-muted-foreground">
                                    {format(event.actualDate, "d MMM yyyy", { locale: fr })}
                                  </span>
                                  {event.time_slot && (
                                    <span className="text-xs text-muted-foreground">
                                      • {event.time_slot.substring(0, 5)}
                                    </span>
                                  )}
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                    Planning hebdo
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">
                                    {event.template?.name || event.custom_title || "Séance planifiée"}
                                  </span>
                                </div>
                                {event.location && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </p>
                                )}
                                {event.template?.duration_minutes && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3" />
                                    {event.template.duration_minutes} min
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Training session (eventType === "session")
                      if (event.eventType === "session") {
                        return (
                          <div
                            key={`session-${event.id}`}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors animate-fade-in cursor-pointer"
                            onClick={() =>
                              setSelectedSession({
                                id: event.id,
                                date: event.session_date,
                                type:
                                  event.training_type === "test" ||
                                  event.training_type === "musculation"
                                    ? "test"
                                    : "training",
                              })
                            }
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div
                                className={`h-12 w-1.5 rounded-full ${
                                  trainingTypeColors[event.training_type] || "bg-muted"
                                }`}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(event.session_date), "d MMM yyyy", { locale: fr })}
                                  </span>
                                  {event.session_start_time && event.session_end_time ? (
                                    <span className="text-xs text-muted-foreground">
                                      • {event.session_start_time} - {event.session_end_time}
                                    </span>
                                  ) : event.session_start_time ? (
                                    <span className="text-xs text-muted-foreground">
                                      • {event.session_start_time}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">
                                    {trainingTypeLabels[event.training_type] || event.training_type}
                                  </span>
                                </div>
                                {event.intensity && (
                                  <p className="text-sm text-muted-foreground">
                                    Intensité: {event.intensity}/10
                                  </p>
                                )}
                                {event.notes && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {event.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSession({
                                    id: event.id,
                                    session_date: event.session_date,
                                    session_start_time: event.session_start_time,
                                    session_end_time: event.session_end_time,
                                    training_type: event.training_type,
                                    intensity: event.intensity,
                                    notes: event.notes,
                                  });
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Êtes-vous sûr de vouloir supprimer cette séance ?")) {
                                    deleteSession.mutate(event.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="weekly">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <WeeklyPlanningCalendar categoryId={categoryId} />
            </div>
            <div className="lg:col-span-1">
              <SessionTemplatesSection categoryId={categoryId} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="max-w-2xl">
            <SessionTemplatesSection categoryId={categoryId} />
          </div>
        </TabsContent>

        <TabsContent value="objectives">
          <SeasonObjectivesSection categoryId={categoryId} />
        </TabsContent>
      </Tabs>

      <AddSessionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categoryId={categoryId}
      />

      <AddMatchCalendarDialog
        open={isAddMatchDialogOpen}
        onOpenChange={setIsAddMatchDialogOpen}
        categoryId={categoryId}
      />

      <EditSessionDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingSession(null);
        }}
        categoryId={categoryId}
        session={editingSession}
      />

      {selectedSession?.type === "test" && (
        <QuickTestEntryDialog
          open={true}
          onOpenChange={(open) => !open && setSelectedSession(null)}
          categoryId={categoryId}
          sessionDate={selectedSession.date}
        />
      )}

      {selectedSession?.type === "training" && (
        <QuickRpeEntryDialog
          open={true}
          onOpenChange={(open) => !open && setSelectedSession(null)}
          categoryId={categoryId}
          sessionId={selectedSession.id}
          sessionDate={selectedSession.date}
        />
      )}
    </div>
  );
}
