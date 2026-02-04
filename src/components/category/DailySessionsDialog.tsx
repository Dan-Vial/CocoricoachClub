import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Pencil, ArrowRight, Clock, MapPin, ChevronRight, X } from "lucide-react";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { TRAINING_TYPE_COLORS } from "@/lib/constants/trainingTypes";

interface Session {
  id: string;
  session_date: string;
  session_start_time: string | null;
  session_end_time: string | null;
  training_type: string;
  intensity: number | null;
  notes: string | null;
}

interface Match {
  id: string;
  match_date: string;
  match_time: string | null;
  opponent: string;
  location: string | null;
  competition: string | null;
  is_home: boolean | null;
}

interface PlanningItem {
  id: string;
  day_of_week: number;
  time_slot: string | null;
  notes: string | null;
  template?: {
    name: string;
    session_type: string;
    duration_minutes: number | null;
    intensity: number | string | null;
  } | null;
}

interface DailySessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  sessions: Session[];
  matches: Match[];
  planning: PlanningItem[];
  onEditSession: (session: Session) => void;
  onRescheduleSession: (sessionId: string, newDate: Date) => void;
  onViewMatch: (match: Match) => void;
  onViewSession: (session: Session) => void;
  trainingTypeLabels: Record<string, string>;
  trainingTypeColors: Record<string, string>;
  isViewer?: boolean;
}

export function DailySessionsDialog({
  open,
  onOpenChange,
  date,
  sessions,
  matches,
  planning,
  onEditSession,
  onRescheduleSession,
  onViewMatch,
  onViewSession,
  trainingTypeLabels,
  trainingTypeColors,
  isViewer = false,
}: DailySessionsDialogProps) {
  const [rescheduleSessionId, setRescheduleSessionId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);

  const handleReschedule = (sessionId: string) => {
    if (rescheduleDate) {
      onRescheduleSession(sessionId, rescheduleDate);
      setRescheduleSessionId(null);
      setRescheduleDate(undefined);
    }
  };

  const getRelativeDay = (d: Date) => {
    if (isToday(d)) return "Aujourd'hui";
    if (isTomorrow(d)) return "Demain";
    if (isYesterday(d)) return "Hier";
    return format(d, "EEEE", { locale: fr });
  };

  const totalEvents = sessions.length + matches.length + planning.length;

  // Sort all events by time
  const sortedSessions = [...sessions].sort((a, b) => {
    const timeA = a.session_start_time || "99:99";
    const timeB = b.session_start_time || "99:99";
    return timeA.localeCompare(timeB);
  });

  const sortedMatches = [...matches].sort((a, b) => {
    const timeA = a.match_time || "99:99";
    const timeB = b.match_time || "99:99";
    return timeA.localeCompare(timeB);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-background border-0 shadow-2xl">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 h-8 w-8 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center h-14 w-14 rounded-2xl text-primary-foreground font-bold text-xl",
              isToday(date) ? "bg-primary" : "bg-muted text-muted-foreground"
            )}>
              {format(date, "d")}
            </div>
            <div>
              <p className={cn(
                "text-sm font-medium",
                isToday(date) ? "text-primary" : "text-muted-foreground"
              )}>
                {getRelativeDay(date)}
              </p>
              <p className="text-lg font-semibold capitalize">
                {format(date, "MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
          {totalEvents === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Aucun événement prévu</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Matches */}
              {sortedMatches.map((match) => (
                <div
                  key={match.id}
                  className="group flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 cursor-pointer transition-all"
                  onClick={() => onViewMatch(match)}
                >
                  {/* Time */}
                  <div className="w-12 text-center shrink-0">
                    {match.match_time ? (
                      <span className="text-sm font-medium text-foreground">
                        {match.match_time.slice(0, 5)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">--:--</span>
                    )}
                  </div>

                  {/* Indicator */}
                  <div className="w-1 h-10 rounded-full bg-rose-500 shrink-0" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-rose-600 uppercase">Match</span>
                      {match.competition && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {match.competition}
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm truncate mt-0.5">
                      {match.is_home ? "vs" : "@"} {match.opponent}
                    </p>
                    {match.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {match.location}
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
                </div>
              ))}

              {/* Sessions */}
              {sortedSessions.map((session) => (
                <div
                  key={session.id}
                  className="group flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 cursor-pointer transition-all"
                  onClick={() => onViewSession(session)}
                >
                  {/* Time */}
                  <div className="w-12 text-center shrink-0">
                    {session.session_start_time ? (
                      <span className="text-sm font-medium text-foreground">
                        {session.session_start_time.slice(0, 5)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">--:--</span>
                    )}
                  </div>

                  {/* Indicator */}
                  <div className={cn(
                    "w-1 h-10 rounded-full shrink-0",
                    TRAINING_TYPE_COLORS[session.training_type] || "bg-primary"
                  )} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary uppercase">
                      {trainingTypeLabels[session.training_type] || session.training_type}
                    </p>
                    {session.session_start_time && session.session_end_time && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {session.session_start_time.slice(0, 5)} - {session.session_end_time.slice(0, 5)}
                      </p>
                    )}
                    {session.notes && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {session.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {!isViewer && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Popover 
                        open={rescheduleSessionId === session.id} 
                        onOpenChange={(open) => {
                          if (open) {
                            setRescheduleSessionId(session.id);
                          } else {
                            setRescheduleSessionId(null);
                            setRescheduleDate(undefined);
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Décaler">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <div className="p-3 border-b">
                            <p className="text-sm font-medium">Décaler la séance</p>
                          </div>
                          <CalendarPicker
                            mode="single"
                            selected={rescheduleDate}
                            onSelect={setRescheduleDate}
                            locale={fr}
                            className="p-2 pointer-events-auto"
                          />
                          <div className="p-2 border-t flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setRescheduleSessionId(null);
                                setRescheduleDate(undefined);
                              }}
                            >
                              Annuler
                            </Button>
                            <Button 
                              size="sm"
                              disabled={!rescheduleDate}
                              onClick={() => handleReschedule(session.id)}
                            >
                              Confirmer
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7"
                        title="Modifier"
                        onClick={() => onEditSession(session)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  {isViewer && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
                  )}
                </div>
              ))}

              {/* Planning items */}
              {planning.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                >
                  {/* Time */}
                  <div className="w-12 text-center shrink-0">
                    {item.time_slot ? (
                      <span className="text-sm font-medium text-muted-foreground">
                        {item.time_slot}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">--:--</span>
                    )}
                  </div>

                  {/* Indicator */}
                  <div className={cn(
                    "w-1 h-10 rounded-full shrink-0 opacity-50",
                    item.template?.session_type 
                      ? TRAINING_TYPE_COLORS[item.template.session_type] || "bg-muted-foreground"
                      : "bg-muted-foreground"
                  )} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Planifié
                    </p>
                    <p className="text-sm font-medium text-muted-foreground truncate mt-0.5">
                      {item.template?.name || "Séance"}
                    </p>
                    {item.template?.duration_minutes && (
                      <p className="text-xs text-muted-foreground/70">
                        {item.template.duration_minutes} min
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer summary */}
        {totalEvents > 0 && (
          <div className="px-6 py-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              {matches.length > 0 && `${matches.length} match${matches.length > 1 ? "s" : ""}`}
              {matches.length > 0 && sessions.length > 0 && " • "}
              {sessions.length > 0 && `${sessions.length} séance${sessions.length > 1 ? "s" : ""}`}
              {(matches.length > 0 || sessions.length > 0) && planning.length > 0 && " • "}
              {planning.length > 0 && `${planning.length} planifié${planning.length > 1 ? "s" : ""}`}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
