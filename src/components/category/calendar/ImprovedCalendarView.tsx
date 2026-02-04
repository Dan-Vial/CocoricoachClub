import { useState, useMemo, useRef } from "react";
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Plus, Download, Printer, Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay, isSameMonth, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { TRAINING_TYPE_COLORS, getTrainingTypesForSport } from "@/lib/constants/trainingTypes";
import { isIndividualSport } from "@/lib/constants/sportTypes";
import { cn } from "@/lib/utils";
import { CalendarDayCell } from "./CalendarDayCell";
import { SessionVignette } from "./SessionVignette";
import { SessionFeedbackDialog } from "./SessionFeedbackDialog";
import { CreateEventDialog } from "./CreateEventDialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  intensity?: number | null;
}

interface Match {
  id: string;
  match_date: string;
  match_time: string | null;
  opponent: string;
  location: string | null;
  is_home: boolean | null;
}

interface ImprovedCalendarViewProps {
  sessions: Session[];
  matches: Match[];
  sportType: string | undefined;
  trainingTypeLabels: Record<string, string>;
  onDayClick: (date: Date) => void;
  onAddSession: (date?: Date) => void;
  onAddMatch: (date?: Date) => void;
  onPrint: () => void;
  onExportPdf: () => void;
  isViewer: boolean;
  categoryId: string;
  calendarRef?: React.RefObject<HTMLDivElement>;
  onEditSession?: (session: Session) => void;
  onViewSession?: (session: Session) => void;
  onViewMatch?: (match: Match) => void;
  onDeleteSession?: (sessionId: string) => void;
  onRescheduleSession?: (sessionId: string, newDate: Date) => void;
}

const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_OF_WEEK_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function ImprovedCalendarView({
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
  onViewMatch,
  onDeleteSession,
  onRescheduleSession,
}: ImprovedCalendarViewProps) {
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [feedbackSession, setFeedbackSession] = useState<Session | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [addEventDate, setAddEventDate] = useState<Date | null>(null);
  
  // Filter states
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Fetch players for filter
  const { data: players } = useQuery({
    queryKey: ["players-calendar-filter", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch session participants to filter by player
  const { data: sessionParticipants } = useQuery({
    queryKey: ["session-participants", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("training_session_id, player_id")
        .eq("category_id", categoryId)
        .not("training_session_id", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: selectedPlayerIds.length > 0,
  });

  // Get training types for event type filter
  const trainingTypes = useMemo(() => getTrainingTypesForSport(sportType), [sportType]);

  // Event types for filter (includes match)
  const eventTypeOptions = useMemo(() => {
    const types = trainingTypes.map(t => ({ value: t.value, label: t.label }));
    types.push({ value: "match", label: isIndividualSport(sportType || "") ? "Compétition" : "Match" });
    return types;
  }, [trainingTypes, sportType]);

  // Calculate week number
  const weekNumber = useMemo(() => {
    const yearStart = new Date(currentDate.getFullYear(), 0, 1);
    return Math.ceil(((currentDate.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
  }, [currentDate]);

  // Get days based on view mode
  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      // Daily view - just the current day
      return [currentDate];
    }
  }, [currentDate, viewMode]);

  // Filter sessions based on selected filters
  const filteredSessions = useMemo(() => {
    let result = sessions;
    
    // Filter by event type
    if (selectedEventTypes.length > 0 && !selectedEventTypes.includes("match")) {
      result = result.filter(s => selectedEventTypes.includes(s.training_type));
    } else if (selectedEventTypes.length > 0 && !selectedEventTypes.some(t => t !== "match")) {
      // Only match selected, hide all sessions
      result = [];
    }
    
    // Filter by player
    if (selectedPlayerIds.length > 0 && sessionParticipants) {
      const sessionsWithSelectedPlayers = new Set(
        sessionParticipants
          .filter(sp => selectedPlayerIds.includes(sp.player_id))
          .map(sp => sp.training_session_id)
      );
      result = result.filter(s => sessionsWithSelectedPlayers.has(s.id));
    }
    
    return result;
  }, [sessions, selectedEventTypes, selectedPlayerIds, sessionParticipants]);

  // Filter matches based on selected filters
  const filteredMatches = useMemo(() => {
    if (selectedEventTypes.length > 0 && !selectedEventTypes.includes("match")) {
      return [];
    }
    return matches;
  }, [matches, selectedEventTypes]);

  const getSessionsForDay = (day: Date) => {
    return filteredSessions.filter((session) => 
      isSameDay(new Date(session.session_date), day)
    );
  };

  const getMatchesForDay = (day: Date) => {
    return filteredMatches.filter((match) => 
      isSameDay(new Date(match.match_date), day)
    );
  };

  // Toggle event type filter
  const toggleEventType = (type: string) => {
    setSelectedEventTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Toggle player filter
  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedEventTypes([]);
    setSelectedPlayerIds([]);
  };

  const hasActiveFilters = selectedEventTypes.length > 0 || selectedPlayerIds.length > 0;

  const handleNavigate = (direction: "prev" | "next") => {
    if (viewMode === "month") {
      setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSession(null);
    
    if (!over || !onRescheduleSession) return;
    
    const sessionId = active.id as string;
    const targetDateStr = over.id as string;
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) return;
    
    const targetDate = new Date(targetDateStr);
    
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

  const handleDayClickWithAdd = (day: Date) => {
    if (!isViewer) {
      setAddEventDate(day);
    } else {
      onDayClick(day);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.substring(0, 5);
  };

  return (
    <>
      <Card className="bg-gradient-card shadow-lg border-0" ref={calendarRef}>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {isIndividualSport(sportType || "") 
                ? "Calendrier des entraînements et compétitions" 
                : "Calendrier des entraînements et matchs"}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filters */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-9 gap-2", hasActiveFilters && "border-primary text-primary")}>
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filtres</span>
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {selectedEventTypes.length + selectedPlayerIds.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filtres</h4>
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
                          <X className="h-3 w-3 mr-1" />
                          Effacer
                        </Button>
                      )}
                    </div>
                    
                    {/* Event Type Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Type d'événement</label>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {eventTypeOptions.map(type => (
                            <label key={type.value} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                              <Checkbox 
                                checked={selectedEventTypes.includes(type.value)}
                                onCheckedChange={() => toggleEventType(type.value)}
                              />
                              <span className="text-sm">{type.label}</span>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    {/* Player Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Joueur</label>
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {players?.map(player => (
                            <label key={player.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                              <Checkbox 
                                checked={selectedPlayerIds.includes(player.id)}
                                onCheckedChange={() => togglePlayer(player.id)}
                              />
                              <span className="text-sm">{player.name}</span>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* View Mode Selector */}
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as "month" | "week" | "day")}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Journalier</SelectItem>
                  <SelectItem value="week">Hebdomadaire</SelectItem>
                  <SelectItem value="month">Mensuel</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={onPrint} title="Imprimer">
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={onExportPdf} title="Exporter PDF">
                <Download className="h-4 w-4" />
              </Button>
              {!isViewer && (
                <Button onClick={() => onAddSession()} className="gap-2 h-9">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Ajouter</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Navigation */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => handleNavigate("prev")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <h3 className="text-lg font-semibold capitalize">
                {viewMode === "month" 
                  ? format(currentDate, "MMMM yyyy", { locale: fr })
                  : viewMode === "week"
                    ? `Semaine ${weekNumber}`
                    : format(currentDate, "EEEE d MMMM yyyy", { locale: fr })
                }
              </h3>
              {viewMode === "week" && (
                <p className="text-sm text-muted-foreground">
                  {format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d", { locale: fr })} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: fr })}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => handleNavigate("next")}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <DndContext
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            collisionDetection={pointerWithin}
          >
            {viewMode === "month" ? (
              // Monthly View
              <div className="border rounded-xl overflow-hidden shadow-sm">
                {/* Header row */}
                <div className="grid grid-cols-7 bg-muted/70">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="p-3 text-center text-sm font-semibold text-muted-foreground border-b"
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
                      currentMonth={currentDate}
                      sessions={getSessionsForDay(day)}
                      matches={getMatchesForDay(day)}
                      sportType={sportType}
                      isViewer={isViewer}
                      onDayClick={handleDayClickWithAdd}
                      onPreviewSession={(session) => onViewSession?.(session)}
                      onEditSession={(session) => onEditSession?.(session)}
                      onFeedbackSession={(session) => setFeedbackSession(session)}
                      onDeleteSession={(sessionId) => setDeleteSessionId(sessionId)}
                    />
                  ))}
                </div>
              </div>
            ) : viewMode === "week" ? (
              // Weekly View - Enhanced design
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                  const daySessions = getSessionsForDay(day);
                  const dayMatches = getMatchesForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const hasEvents = daySessions.length > 0 || dayMatches.length > 0;

                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-[200px] p-3 rounded-xl border-2 transition-all cursor-pointer",
                        isToday ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/30",
                        !hasEvents && "bg-muted/20"
                      )}
                      onClick={() => handleDayClickWithAdd(day)}
                    >
                      {/* Day header */}
                      <div className="text-center mb-3 pb-2 border-b border-border/50">
                        <p className={cn(
                          "text-xs font-medium uppercase tracking-wide",
                          isToday ? "text-primary" : "text-muted-foreground"
                        )}>
                          {DAYS_OF_WEEK_FULL[index]}
                        </p>
                        <p className={cn(
                          "text-2xl font-bold mt-1",
                          isToday ? "text-primary" : "text-foreground"
                        )}>
                          {format(day, "d")}
                        </p>
                      </div>

                      {/* Events */}
                      <div className="space-y-2">
                        {/* Matches */}
                        {dayMatches.map((match) => (
                          <div
                            key={match.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewMatch?.(match);
                            }}
                            className="p-2.5 rounded-lg bg-destructive text-destructive-foreground cursor-pointer hover:bg-destructive/90 transition-colors shadow-sm"
                          >
                            <div className="flex items-center gap-2 text-xs font-medium">
                              <span className="opacity-80">{match.match_time ? formatTime(match.match_time) : ""}</span>
                            </div>
                            <p className="font-semibold text-sm mt-0.5 truncate">
                              {isIndividualSport(sportType || "") ? "Compétition" : `vs ${match.opponent}`}
                            </p>
                            {match.location && (
                              <p className="text-[10px] opacity-80 mt-0.5 truncate">{match.location}</p>
                            )}
                          </div>
                        ))}

                        {/* Sessions */}
                        {daySessions.map((session) => {
                          const bgColor = TRAINING_TYPE_COLORS[session.training_type] || "bg-primary";
                          return (
                            <div
                              key={session.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewSession?.(session);
                              }}
                              className={cn(
                                "p-2.5 rounded-lg cursor-pointer transition-all hover:shadow-md",
                                bgColor,
                                "text-white"
                              )}
                            >
                              <div className="flex items-center gap-2 text-xs opacity-90">
                                {session.session_start_time && (
                                  <span>{formatTime(session.session_start_time)}</span>
                                )}
                                {session.session_end_time && (
                                  <span>→ {formatTime(session.session_end_time)}</span>
                                )}
                              </div>
                              <p className="font-semibold text-sm mt-0.5 truncate">
                                {trainingTypeLabels[session.training_type] || session.training_type}
                              </p>
                              {session.notes && (
                                <p className="text-[10px] opacity-80 mt-0.5 line-clamp-1">{session.notes}</p>
                              )}
                            </div>
                          );
                        })}

                        {!hasEvents && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            Aucun événement
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Daily View - Detailed single day view
              <div className="space-y-4">
                {calendarDays.map((day) => {
                  const daySessions = getSessionsForDay(day);
                  const dayMatches = getMatchesForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const hasEvents = daySessions.length > 0 || dayMatches.length > 0;

                  // Sort events by time
                  const allEvents = [
                    ...daySessions.map(s => ({ 
                      type: 'session' as const, 
                      data: s, 
                      time: s.session_start_time || '00:00' 
                    })),
                    ...dayMatches.map(m => ({ 
                      type: 'match' as const, 
                      data: m, 
                      time: m.match_time || '00:00' 
                    }))
                  ].sort((a, b) => a.time.localeCompare(b.time));

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "rounded-xl border-2 overflow-hidden",
                        isToday ? "border-primary shadow-lg" : "border-border"
                      )}
                    >
                      {/* Day header */}
                      <div 
                        className={cn(
                          "p-4 cursor-pointer",
                          isToday ? "bg-primary/10" : "bg-muted/50"
                        )}
                        onClick={() => handleDayClickWithAdd(day)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={cn(
                              "text-sm font-medium uppercase tracking-wide",
                              isToday ? "text-primary" : "text-muted-foreground"
                            )}>
                              {format(day, "EEEE", { locale: fr })}
                            </p>
                            <p className={cn(
                              "text-3xl font-bold",
                              isToday ? "text-primary" : "text-foreground"
                            )}>
                              {format(day, "d MMMM yyyy", { locale: fr })}
                            </p>
                          </div>
                          {!isViewer && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDayClickWithAdd(day);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Ajouter
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Events list */}
                      <div className="p-4 space-y-3">
                        {hasEvents ? (
                          allEvents.map((event, idx) => {
                            if (event.type === 'match') {
                              const match = event.data as Match;
                              return (
                                <div
                                  key={`match-${match.id}`}
                                  onClick={() => onViewMatch?.(match)}
                                  className="flex items-start gap-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/20 transition-colors"
                                >
                                  <div className="flex-shrink-0 w-16 text-center">
                                    <p className="text-lg font-bold text-destructive">
                                      {match.match_time ? formatTime(match.match_time) : "—"}
                                    </p>
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-semibold text-foreground">
                                      {isIndividualSport(sportType || "") ? "Compétition" : `vs ${match.opponent}`}
                                    </p>
                                    {match.location && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        📍 {match.location}
                                      </p>
                                    )}
                                    <Badge variant="destructive" className="mt-2">
                                      {match.is_home ? "Domicile" : "Extérieur"}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            } else {
                              const session = event.data as Session;
                              const bgColor = TRAINING_TYPE_COLORS[session.training_type] || "bg-primary";
                              return (
                                <div
                                  key={`session-${session.id}`}
                                  onClick={() => onViewSession?.(session)}
                                  className={cn(
                                    "flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-colors",
                                    bgColor.replace('bg-', 'bg-') + "/10",
                                    "border hover:shadow-md"
                                  )}
                                  style={{ borderColor: `hsl(var(--${bgColor.replace('bg-', '')}))` }}
                                >
                                  <div className="flex-shrink-0 w-16 text-center">
                                    <p className="text-lg font-bold text-foreground">
                                      {session.session_start_time ? formatTime(session.session_start_time) : "—"}
                                    </p>
                                    {session.session_end_time && (
                                      <p className="text-xs text-muted-foreground">
                                        → {formatTime(session.session_end_time)}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-semibold text-foreground">
                                      {trainingTypeLabels[session.training_type] || session.training_type}
                                    </p>
                                    {session.notes && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {session.notes}
                                      </p>
                                    )}
                                    {session.intensity && (
                                      <Badge variant="outline" className="mt-2">
                                        Intensité: {session.intensity}/10
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          })
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Aucun événement prévu</p>
                            {!isViewer && (
                              <Button 
                                variant="link" 
                                onClick={() => handleDayClickWithAdd(day)}
                                className="mt-2"
                              >
                                Ajouter un événement
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

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

      {/* Add Event Dialog */}
      {addEventDate && (
        <CreateEventDialog
          open={!!addEventDate}
          onOpenChange={(open) => !open && setAddEventDate(null)}
          date={addEventDate}
          categoryId={categoryId}
          onAddSession={() => {
            onAddSession(addEventDate);
            setAddEventDate(null);
          }}
          onAddMatch={() => {
            onAddMatch(addEventDate);
            setAddEventDate(null);
          }}
        />
      )}

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
