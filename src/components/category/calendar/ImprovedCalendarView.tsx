import { useState, useMemo, useRef, useEffect } from "react";
import { getDisplayNotes } from "@/lib/utils/sessionNotes";
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Plus, Download, Printer, Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay, isSameMonth, addWeeks, subWeeks, addDays, subDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { TRAINING_TYPE_COLORS, getTrainingTypesForSport, getTrainingTypeLabel } from "@/lib/constants/trainingTypes";
import { isIndividualSport } from "@/lib/constants/sportTypes";
import { cn } from "@/lib/utils";
import { CalendarDayCell } from "./CalendarDayCell";
import { SessionVignette } from "./SessionVignette";
import { SessionFeedbackDialog } from "./SessionFeedbackDialog";
import { SessionNotifyDialog } from "./SessionNotifyDialog";
import { MatchNotifyDialog } from "./MatchNotifyDialog";
import { CreateEventDialog } from "./CreateEventDialog";
import { DailyCalendarView } from "./DailyCalendarView";
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
  created_by_player_id?: string | null;
}

interface Match {
  id: string;
  match_date: string;
  match_time: string | null;
  opponent: string;
  location: string | null;
  is_home: boolean | null;
  end_date?: string | null;
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
  onStatsMatch?: (match: Match) => void;
  onDeleteSession?: (sessionId: string) => void;
  onRescheduleSession?: (sessionId: string, newDate: Date) => void;
  onDeleteMatch?: (matchId: string) => void;
  onLineupMatch?: (matchId: string) => void;
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
  onStatsMatch,
  onDeleteSession,
  onRescheduleSession,
  onDeleteMatch,
  onLineupMatch,
}: ImprovedCalendarViewProps) {
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [feedbackSession, setFeedbackSession] = useState<Session | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [addEventDate, setAddEventDate] = useState<Date | null>(null);
  const [pendingExternalType, setPendingExternalType] = useState<"session" | "match" | null>(null);
  const addEventDateRef = useRef<Date | null>(null);
  const [notifySession, setNotifySession] = useState<Session | null>(null);
  const [notifyMatch, setNotifyMatch] = useState<Match | null>(null);
  
  // Filter states
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Fetch periodization cycles for this category
  const { data: periodizationCycles } = useQuery({
    queryKey: ["periodization-cycles-calendar", categoryId],
    queryFn: async () => {
      const { data: categories, error: catError } = await supabase
        .from("periodization_categories")
        .select("id, name, color")
        .eq("category_id", categoryId);
      if (catError) throw catError;
      if (!categories || categories.length === 0) return [];

      const { data: cycles, error: cycleError } = await supabase
        .from("periodization_cycles")
        .select("id, periodization_category_id, name, color, start_date, end_date, cycle_type")
        .in("periodization_category_id", categories.map(c => c.id));
      if (cycleError) throw cycleError;

      return (cycles || []).map(cycle => {
        const cat = categories.find(c => c.id === cycle.periodization_category_id);
        return {
          ...cycle,
          categoryName: cat?.name || "",
          displayColor: cycle.color || cat?.color || "#6366f1",
        };
      });
    },
  });

  // Fetch players for filter and notifications
  const { data: players } = useQuery({
    queryKey: ["players-calendar-filter", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name, email, phone")
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

  // Build player names map for athlete-created sessions
  const playerNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (players) {
      players.forEach(p => { map[p.id] = p.first_name ? `${p.first_name} ${p.name}` : p.name; });
    }
    return map;
  }, [players]);

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

  // Get cycles visible in the current calendar view
  const visibleCycles = useMemo(() => {
    if (!periodizationCycles || calendarDays.length === 0) return [];
    const viewStart = calendarDays[0];
    const viewEnd = calendarDays[calendarDays.length - 1];
    
    return periodizationCycles.filter(cycle => {
      const cycleStart = parseISO(cycle.start_date);
      const cycleEnd = parseISO(cycle.end_date);
      return cycleStart <= viewEnd && cycleEnd >= viewStart;
    });
  }, [periodizationCycles, calendarDays]);

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
    return filteredMatches.filter((match) => {
      const matchStart = new Date(match.match_date);
      // If multi-day tournament, show on all days in range
      if (match.end_date && match.end_date !== match.match_date) {
        const matchEnd = new Date(match.end_date);
        const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const startOnly = new Date(matchStart.getFullYear(), matchStart.getMonth(), matchStart.getDate());
        const endOnly = new Date(matchEnd.getFullYear(), matchEnd.getMonth(), matchEnd.getDate());
        return dayOnly >= startOnly && dayOnly <= endOnly;
      }
      return isSameDay(matchStart, day);
    });
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

  // Handle deferred dialog transition: when CreateEventDialog closes and there's a pending type
  useEffect(() => {
    if (pendingExternalType && !addEventDate) {
      const dateToUse = addEventDateRef.current;
      addEventDateRef.current = null;
      const type = pendingExternalType;
      setPendingExternalType(null);
      if (dateToUse) {
        if (type === "session") onAddSession(dateToUse);
        else if (type === "match") onAddMatch(dateToUse);
      }
    }
  }, [pendingExternalType, addEventDate, onAddSession, onAddMatch]);

  const handleDayClickWithAdd = (day: Date) => {
    if (!isViewer) {
      addEventDateRef.current = day;
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
          <div className="flex flex-col gap-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <span className="hidden sm:inline">
                {isIndividualSport(sportType || "") 
                  ? "Calendrier des entraînements et compétitions" 
                  : "Calendrier des entraînements et matchs"}
              </span>
              <span className="sm:hidden">Calendrier</span>
            </CardTitle>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap" data-no-print>
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
                              <span className="text-sm">{player.first_name ? `${player.first_name} ${player.name}` : player.name}</span>
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
                <SelectTrigger className="w-[100px] sm:w-[130px] h-9 text-xs sm:text-sm">
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
              data-no-print
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
              data-no-print
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
              <div className="border rounded-xl overflow-x-auto shadow-sm">
                <div className="min-w-[640px]">
                {/* Header row */}
                <div className="grid grid-cols-7 bg-muted/70">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="p-1.5 sm:p-3 text-center text-xs sm:text-sm font-semibold text-muted-foreground border-b"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Periodization cycle bars */}
                {visibleCycles.length > 0 && (
                  <div className="border-b bg-muted/30 px-0.5 py-1 space-y-0.5">
                    {visibleCycles.map(cycle => {
                      const totalDays = calendarDays.length;
                      const viewStart = calendarDays[0];
                      const viewEnd = calendarDays[totalDays - 1];
                      const cycleStart = parseISO(cycle.start_date);
                      const cycleEnd = parseISO(cycle.end_date);
                      
                      const clampedStart = cycleStart < viewStart ? viewStart : cycleStart;
                      const clampedEnd = cycleEnd > viewEnd ? viewEnd : cycleEnd;
                      
                      // Calculate position as percentage of total grid
                      const startIndex = calendarDays.findIndex(d => 
                        d.getFullYear() === clampedStart.getFullYear() && 
                        d.getMonth() === clampedStart.getMonth() && 
                        d.getDate() === clampedStart.getDate()
                      );
                      const endIndex = calendarDays.findIndex(d => 
                        d.getFullYear() === clampedEnd.getFullYear() && 
                        d.getMonth() === clampedEnd.getMonth() && 
                        d.getDate() === clampedEnd.getDate()
                      );
                      
                      if (startIndex === -1 || endIndex === -1) return null;
                      
                      const leftPercent = (startIndex / totalDays) * 100;
                      const widthPercent = ((endIndex - startIndex + 1) / totalDays) * 100;
                      
                      return (
                        <div key={cycle.id} className="relative h-5">
                          <div
                            className="absolute top-0 h-full rounded-sm flex items-center px-1.5 overflow-hidden"
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              backgroundColor: cycle.displayColor,
                              opacity: 0.85,
                            }}
                          >
                            <span className="text-[10px] font-medium text-white truncate drop-shadow-sm">
                              {cycle.categoryName}: {cycle.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

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
                      onShowAllEvents={onDayClick}
                      onPreviewSession={(session) => onViewSession?.(session)}
                      onEditSession={(session) => onEditSession?.(session)}
                      onFeedbackSession={(session) => setFeedbackSession(session)}
                      onDeleteSession={(sessionId) => setDeleteSessionId(sessionId)}
                      onNotifySession={(session) => setNotifySession(session)}
                      onNotifyMatch={(match) => setNotifyMatch(match)}
                      onViewMatch={(match) => onViewMatch?.(match)}
                      onStatsMatch={(match) => onStatsMatch?.(match)}
                      onDeleteMatch={(matchId) => onDeleteMatch?.(matchId)}
                      playerNamesMap={playerNamesMap}
                    />
                  ))}
              </div>
              </div>
              </div>
            ) : viewMode === "week" ? (
              // Weekly View - Enhanced design
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
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
                                {session.created_by_player_id && playerNamesMap[session.created_by_player_id]
                                  ? `${playerNamesMap[session.created_by_player_id]} · `
                                  : ""}
                                {trainingTypeLabels[session.training_type] || session.training_type}
                              </p>
                              {session.notes && getDisplayNotes(session.notes) && (
                                <p className="text-[10px] opacity-80 mt-0.5 line-clamp-1">{getDisplayNotes(session.notes)}</p>
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
              // Daily View - Use the new DailyCalendarView component
              calendarDays.map((day) => (
                <DailyCalendarView
                  key={day.toISOString()}
                  day={day}
                  sessions={getSessionsForDay(day)}
                  matches={getMatchesForDay(day)}
                  sportType={sportType}
                  trainingTypeLabels={trainingTypeLabels}
                  isViewer={isViewer}
                  onViewSession={onViewSession}
                  onViewMatch={onViewMatch}
                  onAddEvent={handleDayClickWithAdd}
                  onDeleteMatch={onDeleteMatch}
                  onLineupMatch={onLineupMatch}
                />
              ))
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

      {/* Add Event Dialog - Always mounted to avoid portal removal issues */}
      <CreateEventDialog
        open={!!addEventDate}
        onOpenChange={(open) => !open && setAddEventDate(null)}
        date={addEventDate || new Date()}
        categoryId={categoryId}
        onAddSession={() => {
          const dateToUse = addEventDateRef.current;
          addEventDateRef.current = null;
          if (dateToUse) {
            onAddSession(dateToUse);
          }
        }}
        onAddMatch={() => {
          const dateToUse = addEventDateRef.current;
          addEventDateRef.current = null;
          if (dateToUse) {
            onAddMatch(dateToUse);
          }
        }}
        onSelectExternalType={(type) => {
          setPendingExternalType(type);
          setAddEventDate(null);
        }}
      />

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

      {/* Session Notify Dialog */}
      {notifySession && (
        <SessionNotifyDialog
          open={!!notifySession}
          onOpenChange={(open) => !open && setNotifySession(null)}
          session={notifySession}
          categoryId={categoryId}
        />
      )}

      {/* Match Notify Dialog */}
      {notifyMatch && (
        <MatchNotifyDialog
          open={!!notifyMatch}
          onOpenChange={(open) => !open && setNotifyMatch(null)}
          match={notifyMatch}
          categoryId={categoryId}
          sportType={sportType}
        />
      )}
    </>
  );
}
