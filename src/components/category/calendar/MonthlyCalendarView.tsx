import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Swords, Download, Printer } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { getTrainingTypeColor, getTrainingTypeLabel, TRAINING_TYPE_COLORS } from "@/lib/constants/trainingTypes";
import { isIndividualSport } from "@/lib/constants/sportTypes";
import { cn } from "@/lib/utils";

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
}: MonthlyCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.substring(0, 5);
  };

  return (
    <Card className="bg-gradient-card shadow-md">
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

        {/* Calendar grid */}
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
            {calendarDays.map((day, index) => {
              const daySessions = getSessionsForDay(day);
              const dayMatches = getMatchesForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[100px] border-b border-r p-1 cursor-pointer hover:bg-muted/50 transition-colors",
                    !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                    isToday && "bg-primary/5"
                  )}
                  onClick={() => onDayClick(day)}
                >
                  {/* Day number */}
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    isToday && "text-primary font-bold"
                  )}>
                    {format(day, "d")}
                  </div>

                  {/* Events */}
                  <div className="space-y-0.5 overflow-hidden">
                    {/* Matches first */}
                    {dayMatches.slice(0, 2).map((match) => (
                      <div
                        key={match.id}
                        className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded truncate font-medium"
                        title={`${match.match_time ? formatTime(match.match_time) + " - " : ""}${match.opponent}`}
                      >
                        {match.match_time && (
                          <span className="mr-1">{formatTime(match.match_time)}</span>
                        )}
                        <span className="opacity-90">
                          {isIndividualSport(sportType || "") ? "Compét." : match.opponent}
                        </span>
                      </div>
                    ))}

                    {/* Sessions */}
                    {daySessions.slice(0, 3 - dayMatches.length).map((session) => {
                      const bgColor = getTrainingTypeColor(session.training_type);
                      const label = getTrainingTypeLabel(session.training_type);
                      
                      return (
                        <div
                          key={session.id}
                          className={cn(
                            "text-white text-[10px] px-1.5 py-0.5 rounded truncate font-medium",
                            bgColor
                          )}
                          title={`${session.session_start_time ? formatTime(session.session_start_time) + " - " : ""}${label}`}
                        >
                          {session.session_start_time && (
                            <span className="mr-1">{formatTime(session.session_start_time)}</span>
                          )}
                          <span className="opacity-90">{label}</span>
                        </div>
                      );
                    })}

                    {/* More indicator */}
                    {(daySessions.length + dayMatches.length) > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1">
                        +{daySessions.length + dayMatches.length - 3} autre(s)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center text-sm pt-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-rose-500" />
            <span className="text-muted-foreground">
              {isIndividualSport(sportType || "") ? "Compétition" : "Match"}
            </span>
          </div>
          {Object.entries(trainingTypeLabels).slice(0, 8).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={cn("h-3 w-3 rounded", TRAINING_TYPE_COLORS[key] || "bg-muted")} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
