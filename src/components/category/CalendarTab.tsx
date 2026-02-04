import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ColoredSubTabsList, ColoredSubTabsTrigger, ColoredContentCard, ColoredCardHeader, ColoredTitle } from "@/components/ui/colored-subtabs";
import { Calendar as CalendarIcon, LayoutTemplate, Target } from "lucide-react";
import { toast } from "sonner";
import { SessionFormDialog } from "./sessions/SessionFormDialog";
import { AddMatchCalendarDialog } from "./matches/AddMatchCalendarDialog";
import { QuickTestEntryDialog } from "./QuickTestEntryDialog";
import { SessionDetailsDialog } from "./SessionDetailsDialog";
import { MatchRpeDialog } from "./MatchRpeDialog";
import { DailySessionsDialog } from "./DailySessionsDialog";
import { format, isSameDay, startOfWeek, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { WeeklyPlanningCalendar } from "@/components/planning/WeeklyPlanningCalendar";
import { SessionTemplatesSection } from "@/components/planning/SessionTemplatesSection";
import { SeasonObjectivesSection } from "@/components/planning/SeasonObjectivesSection";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { exportCalendarToPdf, printElement } from "@/lib/pdfExport";
import { getTrainingTypesForSport, TRAINING_TYPE_COLORS } from "@/lib/constants/trainingTypes";
import { DisabledTabTrigger } from "@/components/ui/disabled-tab-trigger";
import { useViewerSessions, useViewerMatches } from "@/hooks/use-viewer-data";
import { ImprovedCalendarView } from "./calendar/ImprovedCalendarView";

interface CalendarTabProps {
  categoryId: string;
}

export function CalendarTab({ categoryId }: CalendarTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addSessionDate, setAddSessionDate] = useState<string | undefined>();
  const [isAddMatchDialogOpen, setIsAddMatchDialogOpen] = useState(false);
  const [addMatchDate, setAddMatchDate] = useState<Date | undefined>();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isDailyDialogOpen, setIsDailyDialogOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
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
    // Use the calendar ref if available, otherwise fall back to PDF export
    if (calendarContentRef.current) {
      printElement(calendarContentRef.current, "Calendrier Global");
    } else {
      // Fallback: export PDF which works without ref
      handleExportPdf();
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

  // Reschedule session mutation with optimistic update
  const rescheduleSession = useMutation({
    mutationFn: async ({ sessionId, newDate }: { sessionId: string; newDate: Date }) => {
      const { error } = await supabase
        .from("training_sessions")
        .update({ session_date: format(newDate, "yyyy-MM-dd") })
        .eq("id", sessionId);
      if (error) throw error;
      return { sessionId, newDate };
    },
    onMutate: async ({ sessionId, newDate }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["training_sessions", categoryId] });
      
      // Snapshot the previous value
      const previousSessions = queryClient.getQueryData(["training_sessions", categoryId]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["training_sessions", categoryId], (old: any[]) => {
        if (!old) return old;
        return old.map((session) => 
          session.id === sessionId 
            ? { ...session, session_date: format(newDate, "yyyy-MM-dd") }
            : session
        );
      });
      
      return { previousSessions };
    },
    onSuccess: () => {
      toast.success("Séance décalée avec succès");
      setIsDailyDialogOpen(false);
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousSessions) {
        queryClient.setQueryData(["training_sessions", categoryId], context.previousSessions);
      }
      toast.error("Erreur lors du décalage de la séance");
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_session_exercises"] });
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

  const { data: sessions, isLoading: isLoadingSessions } = useViewerSessions(categoryId);

  const { data: matches, isLoading: isLoadingMatches } = useViewerMatches(categoryId);

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
      queryClient.invalidateQueries({ queryKey: ["today_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_session_exercises"] });
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


  const isLoading = isLoadingSessions || isLoadingMatches || isLoadingPlanning;

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="global" className="space-y-4">
        <ColoredSubTabsList colorKey="planification">
          <ColoredSubTabsTrigger value="global" colorKey="planification" icon={<CalendarIcon className="h-4 w-4" />}>
            <span className="hidden sm:inline">Calendrier Global</span>
            <span className="sm:hidden">Global</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger value="weekly" colorKey="planification" icon={<CalendarIcon className="h-4 w-4" />}>
            <span className="hidden sm:inline">Planning Hebdo</span>
            <span className="sm:hidden">Hebdo</span>
          </ColoredSubTabsTrigger>
          {/* Templates - Grisé en mode viewer */}
          {!isViewer && (
            <ColoredSubTabsTrigger value="templates" colorKey="planification" icon={<LayoutTemplate className="h-4 w-4" />}>
              Templates
            </ColoredSubTabsTrigger>
          )}
          {/* Objectifs - Grisé en mode viewer */}
          {!isViewer && (
            <ColoredSubTabsTrigger value="objectives" colorKey="planification" icon={<Target className="h-4 w-4" />}>
              <span className="hidden sm:inline">Objectifs</span>
              <span className="sm:hidden">Obj.</span>
            </ColoredSubTabsTrigger>
          )}
        </ColoredSubTabsList>

        <TabsContent value="global">
          <ImprovedCalendarView
            sessions={sessions || []}
            matches={matches || []}
            sportType={sportType}
            trainingTypeLabels={trainingTypeLabels}
            categoryId={categoryId}
            calendarRef={calendarContentRef}
            onDayClick={handleDayClick}
            onAddSession={(date) => {
              setAddSessionDate(date ? format(date, "yyyy-MM-dd") : undefined);
              setIsAddDialogOpen(true);
            }}
            onAddMatch={(date) => {
              setAddMatchDate(date);
              setIsAddMatchDialogOpen(true);
            }}
            onPrint={handlePrint}
            onExportPdf={handleExportPdf}
            isViewer={isViewer}
            onEditSession={(session) => {
              supabase
                .from("training_sessions")
                .select("*")
                .eq("id", session.id)
                .single()
                .then(({ data }) => {
                  if (data) {
                    setEditingSession(data);
                    setIsEditDialogOpen(true);
                  }
                });
            }}
            onViewSession={(session) => {
              setSelectedSession({
                id: session.id,
                date: session.session_date,
                type: session.training_type === "test" ? "test" : "training",
              });
            }}
            onViewMatch={(match) => {
              setSelectedMatch({
                id: match.id,
                date: match.match_date,
                opponent: match.opponent,
              });
            }}
            onDeleteSession={(sessionId) => deleteSession.mutate(sessionId)}
            onRescheduleSession={(sessionId, newDate) => {
              rescheduleSession.mutate({ sessionId, newDate });
            }}
          />
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

        {!isViewer && (
          <TabsContent value="templates">
            <div className="max-w-2xl">
              <SessionTemplatesSection categoryId={categoryId} />
            </div>
          </TabsContent>
        )}

        {!isViewer && (
          <TabsContent value="objectives">
            <SeasonObjectivesSection categoryId={categoryId} />
          </TabsContent>
        )}
      </Tabs>

      {/* New Session Dialog with optional default date */}
      <SessionFormDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setAddSessionDate(undefined);
        }}
        categoryId={categoryId}
        defaultDate={addSessionDate}
      />

      <AddMatchCalendarDialog
        open={isAddMatchDialogOpen}
        onOpenChange={(open) => {
          setIsAddMatchDialogOpen(open);
          if (!open) setAddMatchDate(undefined);
        }}
        categoryId={categoryId}
        sportType={sportType}
        defaultDate={addMatchDate}
      />

      {/* Edit Session Dialog */}
      <SessionFormDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingSession(null);
        }}
        categoryId={categoryId}
        editSession={editingSession}
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
          trainingTypeColors={TRAINING_TYPE_COLORS}
          isViewer={isViewer}
        />
      )}
    </div>
  );
}
