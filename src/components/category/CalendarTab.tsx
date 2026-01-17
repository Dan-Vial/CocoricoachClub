import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, X, Swords, MapPin, Calendar as CalendarIcon, LayoutTemplate, Target, Clock, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { AddSessionDialog } from "./AddSessionDialog";
import { EditSessionDialog } from "./EditSessionDialog";
import { AddMatchCalendarDialog } from "./matches/AddMatchCalendarDialog";
import { QuickTestEntryDialog } from "./QuickTestEntryDialog";
import { SessionDetailsDialog } from "./SessionDetailsDialog";
import { MatchRpeDialog } from "./MatchRpeDialog";
import { DailySessionsDialog } from "./DailySessionsDialog";
import { format, isSameDay, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { WeeklyPlanningCalendar } from "@/components/planning/WeeklyPlanningCalendar";
import { SessionTemplatesSection } from "@/components/planning/SessionTemplatesSection";
import { SeasonObjectivesSection } from "@/components/planning/SeasonObjectivesSection";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { exportCalendarToPdf, printElement } from "@/lib/pdfExport";
import { getTrainingTypesForSport, TRAINING_TYPE_COLORS } from "@/lib/constants/trainingTypes";
import { isIndividualSport } from "@/lib/constants/sportTypes";

interface CalendarTabProps {
  categoryId: string;
}

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isDailyDialogOpen, setIsDailyDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<{
    id: string;
    date: string;
    type: "test" | "training";
  } | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<{
    id: string;
    date: string;
    opponent: string;
  } | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isViewer } = useViewerModeContext();
  const calendarContentRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = async () => {
    if (sessions && matches) {
      await exportCalendarToPdf(
        sessions, 
        matches, 
        "Catégorie"
      );
      toast.success("PDF exporté avec succès");
    }
  };

  const handlePrint = () => {
    if (calendarContentRef.current) {
      printElement(calendarContentRef.current, "Calendrier Global");
    }
  };

  // Handle day click to open daily dialog
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsDailyDialogOpen(true);
  };

  // Get sessions for a specific date
  const getSessionsForDate = (date: Date) => {
    return sessions?.filter((session) =>
      isSameDay(new Date(session.session_date), date)
    ) || [];
  };

  // Get matches for a specific date
  const getMatchesForDate = (date: Date) => {
    return matches?.filter((match) =>
      isSameDay(new Date(match.match_date), date)
    ) || [];
  };

  // Get planning items for a specific date
  const getPlanningForDate = (date: Date) => {
    return weeklyPlanning?.filter((item) =>
      isSameDay(getWeeklyPlanningDate(item), date)
    ) || [];
  };

  // Reschedule session mutation
  const rescheduleSession = useMutation({
    mutationFn: async ({ sessionId, newDate }: { sessionId: string; newDate: Date }) => {
      const { error } = await supabase
        .from("training_sessions")
        .update({ session_date: format(newDate, "yyyy-MM-dd") })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      toast.success("Séance décalée avec succès");
      setIsDailyDialogOpen(false);
    },
    onError: () => {
      toast.error("Erreur lors du décalage de la séance");
    },
  });

  // Fetch category to get sport type
  const { data: category } = useQuery({
    queryKey: ["category-sport-type", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Get training types based on sport type
  const sportType = category?.rugby_type;
  const trainingTypes = useMemo(() => getTrainingTypesForSport(sportType), [sportType]);
  
  // Create labels and colors maps from training types
  const trainingTypeLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    trainingTypes.forEach(t => {
      labels[t.value] = t.label;
    });
    return labels;
  }, [trainingTypes]);

  const trainingTypeColors = TRAINING_TYPE_COLORS;

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
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="icon" onClick={handlePrint} title="Imprimer">
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleExportPdf} title="Exporter PDF">
                    <Download className="h-4 w-4" />
                  </Button>
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
            <CardContent className="space-y-6" ref={calendarContentRef}>
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Cliquez sur un jour pour voir les séances détaillées
                  </p>
                </div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(day) => {
                    if (day) {
                      handleDayClick(day);
                    }
                  }}
                  locale={fr}
                  numberOfMonths={1}
                  className="rounded-md border bg-card pointer-events-auto p-4"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-base font-semibold",
                    table: "w-full border-collapse",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-12 h-10 font-medium text-sm",
                    row: "flex w-full mt-2",
                    cell: "h-12 w-12 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-12 w-12 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground font-semibold",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                  }}
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
                        <span className="text-sm">{format(date, "d")}</span>
                        {getDayContent(date)}
                      </div>
                    ),
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-3 justify-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500" />
                  <span className="text-muted-foreground">
                    {isIndividualSport(sportType || "") ? "Compétition" : "Match"}
                  </span>
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
        <SessionDetailsDialog
          open={true}
          onOpenChange={(open) => !open && setSelectedSession(null)}
          categoryId={categoryId}
          sessionId={selectedSession.id}
          sessionDate={selectedSession.date}
        />
      )}

      {selectedMatch && (
        <MatchRpeDialog
          open={true}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
          categoryId={categoryId}
          matchId={selectedMatch.id}
          matchDate={selectedMatch.date}
          opponent={selectedMatch.opponent}
        />
      )}

      {selectedDate && (
        <DailySessionsDialog
          open={isDailyDialogOpen}
          onOpenChange={setIsDailyDialogOpen}
          date={selectedDate}
          sessions={getSessionsForDate(selectedDate)}
          matches={getMatchesForDate(selectedDate)}
          planning={getPlanningForDate(selectedDate)}
          onEditSession={(session) => {
            setEditingSession(session);
            setIsEditDialogOpen(true);
            setIsDailyDialogOpen(false);
          }}
          onRescheduleSession={(sessionId, newDate) => {
            rescheduleSession.mutate({ sessionId, newDate });
          }}
          onViewMatch={(match) => {
            setSelectedMatch({
              id: match.id,
              date: match.match_date,
              opponent: match.opponent,
            });
            setIsDailyDialogOpen(false);
          }}
          onViewSession={(session) => {
            setSelectedSession({
              id: session.id,
              date: session.session_date,
              type: session.training_type === "test" ? "test" : "training",
            });
            setIsDailyDialogOpen(false);
          }}
          trainingTypeLabels={trainingTypeLabels}
          trainingTypeColors={trainingTypeColors}
          isViewer={isViewer}
        />
      )}
    </div>
  );
}
