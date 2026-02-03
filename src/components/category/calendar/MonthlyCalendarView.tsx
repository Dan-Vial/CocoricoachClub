import { useState, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Swords, Download, Printer } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { getTrainingTypeColor, getTrainingTypeLabel, TRAINING_TYPE_COLORS } from "@/lib/constants/trainingTypes";
import { isIndividualSport } from "@/lib/constants/sportTypes";
import { cn } from "@/lib/utils";
import { CalendarDayCell } from "./CalendarDayCell";
import { SessionVignette } from "./SessionVignette";
import { SessionFeedbackDialog } from "./SessionFeedbackDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Session {
  id: string;
  session_date: string;
  session_start_time: string | null;
  session_end_time: string | null;
  training_type: string;
  notes: string | null;
}

interface Match {
  id: string;
  match_date: string;
  match_time: string | null;
  opponent: string;
  location: string | null;
  is_home: boolean | null;
}

interface MonthlyCalendarViewProps {
  sessions: Session[];
  matches: Match[];
  sportType: string | undefined;
  trainingTypeLabels: Record<string, string>;
  onDayClick: (date: Date) => void;
  onAddSession: () => void;
  onAddMatch: () => void;
  onPrint: () => void;
  onExportPdf: () => void;
  isViewer: boolean;
  categoryId: string;
  calendarRef?: React.RefObject<HTMLDivElement>;
  onEditSession?: (session: Session) => void;
  onViewSession?: (session: Session) => void;
  onDeleteSession?: (sessionId: string) => void;
  onRescheduleSession?: (sessionId: string, newDate: Date) => void;
}

const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function MonthlyCalendarView({
  sessions,
  matches,
  sportType,
  trainingTypeLabels,
  onDayClick,
  onAddSession,
  onAddMatch,
  onPrint,
  onExportPdf,
  isViewer,
  categoryId,
  calendarRef,
  onEditSession,
  onViewSession,
  onDeleteSession,
  onRescheduleSession,
}: MonthlyCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [feedbackSession, setFeedbackSession] = useState<Session | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const getSessionsForDay = (day: Date) => {
    return sessions.filter((session) => 
      isSameDay(new Date(session.session_date), day)
    );
  };

  const getMatchesForDay = (day: Date) => {
    return matches.filter((match) => 
      isSameDay(new Date(match.match_date), day)
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSession(null);
    
    if (!over || !onRescheduleSession) return;
    
    const sessionId = active.id as string;
    const targetDateStr = over.id as string;
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) return;
    
    // Parse the target date
    const targetDate = new Date(targetDateStr);
    
    // Check if it's a different date
    if (session.session_date !== targetDateStr) {
      onRescheduleSession(sessionId, targetDate);
    }
  };

  const handleDragStart = (event: { active: { data: { current?: { session?: Session } } } }) => {
    const session = event.active.data.current?.session;
    if (session) {
      setActiveSession(session);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteSessionId && onDeleteSession) {
      onDeleteSession(deleteSessionId);
      setDeleteSessionId(null);
    }
  };

  return (
    <>
      <Card className="bg-gradient-card shadow-md" ref={calendarRef}>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <CardTitle>
              {isIndividualSport(sportType || "") 
                ? "Calendrier des entraînements et compétitions" 
                : "Calendrier des entraînements et matchs"}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="icon" onClick={onPrint} title="Imprimer">
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={onExportPdf} title="Exporter PDF">
                <Download className="h-4 w-4" />
              </Button>
              {!isViewer && (
                <>
                  <Button onClick={onAddMatch} variant="outline" className="gap-2">
                    <Swords className="h-4 w-4" />
                    {isIndividualSport(sportType || "") ? "Compétition" : "Match"}
                  </Button>
                  <Button onClick={onAddSession} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Séance
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </h3>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar grid with DnD */}
          <DndContext
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            collisionDetection={pointerWithin}
          >
            <div className="border rounded-lg overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-7 bg-muted">
                {DAYS_OF_WEEK.map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center text-sm font-medium text-muted-foreground border-b"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => (
                  <CalendarDayCell
                    key={index}
                    day={day}
                    currentMonth={currentMonth}
                    sessions={getSessionsForDay(day)}
                    matches={getMatchesForDay(day)}
                    sportType={sportType}
                    isViewer={isViewer}
                    onDayClick={onDayClick}
                    onPreviewSession={(session) => onViewSession?.(session)}
                    onEditSession={(session) => onEditSession?.(session)}
                    onFeedbackSession={(session) => setFeedbackSession(session)}
                    onDeleteSession={(sessionId) => setDeleteSessionId(sessionId)}
                  />
                ))}
              </div>
            </div>

            {/* Drag overlay */}
            <DragOverlay>
              {activeSession && (
                <div className="opacity-80">
                  <SessionVignette
                    session={activeSession}
                    onPreview={() => {}}
                    onEdit={() => {}}
                    onFeedback={() => {}}
                    onDelete={() => {}}
                    isViewer={true}
                    isDraggable={false}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>

      {/* Feedback Dialog */}
      {feedbackSession && (
        <SessionFeedbackDialog
          open={!!feedbackSession}
          onOpenChange={(open) => !open && setFeedbackSession(null)}
          sessionId={feedbackSession.id}
          sessionType={feedbackSession.training_type}
          categoryId={categoryId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSessionId} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la séance ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La séance sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
