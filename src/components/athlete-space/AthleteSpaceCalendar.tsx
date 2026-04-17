import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Plus,
  Swords,
  Dumbbell,
  CheckCircle2,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  HeartPulse,
  Play,
} from "lucide-react";
import { format, isWithinInterval, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { NAV_COLORS } from "@/components/ui/colored-nav-tabs";
import { cn } from "@/lib/utils";
import { getTrainingTypeLabel } from "@/lib/constants/trainingTypes";
import { GroupedExerciseList } from "@/components/category/GroupedExerciseList";
import { SessionFormDialog } from "@/components/category/sessions/SessionFormDialog";

interface Props {
  playerId: string;
  categoryId: string;
  sportType?: string;
}

const ATHLETE_SESSION_COLOR = "#8B5CF6";
const PROPHYLAXIS_COLOR = "#10b981";
const REHAB_COLOR = "#f59e0b";

export function AthleteSpaceCalendar({ playerId, categoryId, sportType }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ["athlete-calendar-sessions", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, session_date, training_type, session_start_time, session_end_time, notes, created_by_player_id")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["athlete-calendar-matches", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, match_date, match_time, opponent, location, is_home")
        .eq("category_id", categoryId)
        .order("match_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: submittedRpes = [] } = useQuery({
    queryKey: ["athlete-calendar-rpes", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("training_session_id, session_date")
        .eq("player_id", playerId);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch prophylaxis programs assigned to this player
  const { data: prophylaxisPrograms = [] } = useQuery({
    queryKey: ["athlete-prophylaxis", playerId, categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prophylaxis_assignments")
        .select(`
          id, is_active, start_date, end_date,
          prophylaxis_programs(
            id, name, body_zone, frequency, description, is_active,
            prophylaxis_exercises(*)
          )
        `)
        .eq("player_id", playerId)
        .eq("category_id", categoryId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch rehab protocols for this player
  const { data: rehabProtocols = [] } = useQuery({
    queryKey: ["athlete-calendar-rehab", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_rehab_protocols")
        .select(`
          *,
          injury_protocols(id, name, injury_category),
          player_rehab_exercises(*)
        `)
        .eq("player_id", playerId)
        .eq("status", "in_progress")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const completedSessionIds = new Set(submittedRpes.map(r => r.training_session_id));

  const sessionDates = sessions.map(s => new Date(s.session_date));
  const matchDates = matches.map(m => new Date(m.match_date));
  const athleteSessionDates = sessions
    .filter(s => s.created_by_player_id === playerId)
    .map(s => new Date(s.session_date));

  // Compute prophylaxis dates for calendar modifiers
  const prophylaxisDates = useMemo(() => {
    const dates: Date[] = [];
    const rangeStart = subMonths(new Date(), 2);
    const rangeEnd = addMonths(new Date(), 2);
    
    prophylaxisPrograms.forEach((assignment: any) => {
      const prog = assignment.prophylaxis_programs;
      if (!prog || !prog.is_active) return;
      const start = assignment.start_date ? parseISO(assignment.start_date) : rangeStart;
      const end = assignment.end_date ? parseISO(assignment.end_date) : rangeEnd;
      const freq = prog.frequency || "quotidien";
      
      try {
        const days = eachDayOfInterval({
          start: start < rangeStart ? rangeStart : start,
          end: end > rangeEnd ? rangeEnd : end,
        });
        
        days.forEach((d, i) => {
          if (freq === "quotidien" || freq === "daily") {
            dates.push(d);
          } else if (freq === "3x/semaine" || freq === "3x") {
            if (i % 2 === 0) dates.push(d); // every other day ~3x/week
          } else if (freq === "2x/semaine" || freq === "2x") {
            if (i % 3 === 0) dates.push(d);
          } else if (freq === "hebdomadaire" || freq === "weekly") {
            if (d.getDay() === 1) dates.push(d); // Mondays
          } else {
            dates.push(d); // default: daily
          }
        });
      } catch { /* ignore invalid intervals */ }
    });
    return dates;
  }, [prophylaxisPrograms]);

  // Rehab dates: every day while protocol is in_progress
  const rehabDates = useMemo(() => {
    const dates: Date[] = [];
    const rangeStart = subMonths(new Date(), 2);
    const rangeEnd = addMonths(new Date(), 2);
    
    rehabProtocols.forEach((protocol: any) => {
      const start = protocol.started_at ? parseISO(protocol.started_at) : parseISO(protocol.created_at);
      try {
        const days = eachDayOfInterval({
          start: start < rangeStart ? rangeStart : start,
          end: rangeEnd,
        });
        dates.push(...days);
      } catch { /* ignore */ }
    });
    return dates;
  }, [rehabProtocols]);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const daySessions = sessions.filter(s => s.session_date === selectedDateStr);
  const dayMatches = matches.filter(m => m.match_date === selectedDateStr);

  // Check if prophylaxis programs apply to selected date
  const dayProphylaxis = useMemo(() => {
    if (!selectedDate) return [];
    return prophylaxisPrograms.filter((assignment: any) => {
      const prog = assignment.prophylaxis_programs;
      if (!prog || !prog.is_active) return false;
      const start = assignment.start_date ? parseISO(assignment.start_date) : new Date(0);
      const end = assignment.end_date ? parseISO(assignment.end_date) : new Date(2100, 0);
      return isWithinInterval(selectedDate, { start, end });
    });
  }, [selectedDate, prophylaxisPrograms]);

  // Check if rehab protocols apply to selected date
  const dayRehab = useMemo(() => {
    if (!selectedDate) return [];
    return rehabProtocols.filter((protocol: any) => {
      const start = protocol.started_at ? parseISO(protocol.started_at) : parseISO(protocol.created_at);
      return selectedDate >= start && protocol.status === "in_progress";
    });
  }, [selectedDate, rehabProtocols]);

  // Fetch blocks for day sessions
  const daySessionIds = daySessions.map(s => s.id);
  const { data: sessionBlocks = [] } = useQuery({
    queryKey: ["athlete-calendar-blocks", daySessionIds],
    queryFn: async () => {
      if (daySessionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("training_session_blocks")
        .select("training_session_id, training_type, block_order")
        .in("training_session_id", daySessionIds)
        .order("block_order");
      if (error) throw error;
      return data || [];
    },
    enabled: daySessionIds.length > 0,
  });

  const blocksBySession = useMemo(() => {
    return sessionBlocks.reduce((acc, block) => {
      if (!acc[block.training_session_id]) acc[block.training_session_id] = [];
      if (!acc[block.training_session_id].some((b: { training_type: string }) => b.training_type === block.training_type)) {
        acc[block.training_session_id].push(block);
      }
      return acc;
    }, {} as Record<string, typeof sessionBlocks>);
  }, [sessionBlocks]);

  const { data: sessionExercises = [] } = useQuery({
    queryKey: ["athlete-calendar-exercises", daySessionIds],
    queryFn: async () => {
      if (daySessionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("gym_session_exercises")
        .select("*")
        .in("training_session_id", daySessionIds)
        .order("order_index");
      if (error) throw error;
      return data || [];
    },
    enabled: daySessionIds.length > 0,
  });

  const exercisesBySession = useMemo(() => {
    return sessionExercises.reduce((acc, ex) => {
      if (!acc[ex.training_session_id]) acc[ex.training_session_id] = [];
      acc[ex.training_session_id].push(ex);
      return acc;
    }, {} as Record<string, typeof sessionExercises>);
  }, [sessionExercises]);

  const hasDayEvents = daySessions.length > 0 || dayMatches.length > 0 || dayProphylaxis.length > 0 || dayRehab.length > 0;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" style={{ color: NAV_COLORS.planification.base }} />
              Mon calendrier
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="gap-1.5"
              style={{ backgroundColor: ATHLETE_SESSION_COLOR }}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter une séance
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  session: sessionDates,
                  match: matchDates,
                  athleteSession: athleteSessionDates,
                  prophylaxis: prophylaxisDates,
                  rehab: rehabDates,
                }}
                modifiersStyles={{
                  session: { fontWeight: "bold", textDecoration: "underline" },
                  match: { backgroundColor: "hsl(346, 77%, 50%, 0.2)", borderRadius: "4px", fontWeight: "bold" },
                  athleteSession: { backgroundColor: `${ATHLETE_SESSION_COLOR}30`, borderRadius: "4px", border: `2px solid ${ATHLETE_SESSION_COLOR}` },
                  prophylaxis: { boxShadow: `inset 0 -3px 0 0 ${PROPHYLAXIS_COLOR}` },
                  rehab: { boxShadow: `inset 3px 0 0 0 ${REHAB_COLOR}` },
                }}
                className="rounded-md border pointer-events-auto"
              />
            </div>

            {/* Day details */}
            <div className="space-y-3">
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
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm border-2" style={{ borderColor: ATHLETE_SESSION_COLOR, backgroundColor: `${ATHLETE_SESSION_COLOR}30` }} />
                  <span>Mes séances</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1 rounded-full" style={{ backgroundColor: PROPHYLAXIS_COLOR }} />
                  <span>Prophylaxie</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-3 rounded-full" style={{ backgroundColor: REHAB_COLOR }} />
                  <span>Réhab</span>
                </div>
              </div>

              {selectedDate ? (
                <div>
                  <h3 className="font-semibold text-sm mb-2">
                    {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
                  </h3>

                  {!hasDayEvents ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground mb-3">Aucun événement</p>
                      <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter une séance
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {/* Matches */}
                      {dayMatches.map(match => (
                        <div key={match.id} className="p-3 rounded-lg border-l-4 border-rose-500 bg-rose-50 dark:bg-rose-950/20">
                          <div className="flex items-center gap-2">
                            <Swords className="h-4 w-4 text-rose-500" />
                            <div>
                              <p className="font-medium text-sm">vs {match.opponent}</p>
                              {match.match_time && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />{match.match_time.slice(0, 5)}
                                </p>
                              )}
                              {match.location && <p className="text-xs text-muted-foreground">{match.location}</p>}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Sessions */}
                      {daySessions.map(session => {
                        const isAthleteSession = session.created_by_player_id === playerId;
                        const isCompleted = completedSessionIds.has(session.id);
                        const exercises = exercisesBySession[session.id] || [];
                        const blocks = blocksBySession[session.id] || [];
                        const isExpanded = expandedItemId === `session-${session.id}`;

                        return (
                          <div
                            key={session.id}
                            className={cn("rounded-lg border transition-colors", isAthleteSession ? "border-l-4" : "border-border")}
                            style={isAthleteSession ? { borderLeftColor: ATHLETE_SESSION_COLOR, backgroundColor: `${ATHLETE_SESSION_COLOR}08` } : {}}
                          >
                            <button
                              className="w-full text-left p-3"
                              onClick={() => setExpandedItemId(isExpanded ? null : `session-${session.id}`)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Activity className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-medium text-sm">{getTrainingTypeLabel(session.training_type)}</p>
                                      {blocks.length > 0 && blocks.some(b => b.training_type !== session.training_type) && (
                                        <div className="flex gap-1 flex-wrap">
                                          {blocks.filter(b => b.training_type !== session.training_type).map((b, i) => (
                                            <Badge key={i} variant="outline" className="text-[10px] h-4 px-1.5">
                                              {getTrainingTypeLabel(b.training_type)}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                      {isAthleteSession && (
                                        <Badge className="text-[10px] h-4 px-1.5 border" style={{ backgroundColor: `${ATHLETE_SESSION_COLOR}15`, color: ATHLETE_SESSION_COLOR, borderColor: `${ATHLETE_SESSION_COLOR}40` }}>
                                          <User className="h-2.5 w-2.5 mr-0.5" />Ma séance
                                        </Badge>
                                      )}
                                    </div>
                                    {session.session_start_time && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {session.session_start_time.slice(0, 5)}
                                        {session.session_end_time && ` - ${session.session_end_time.slice(0, 5)}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {exercises.length > 0 && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                      <Dumbbell className="h-2.5 w-2.5 mr-0.5" />{exercises.length}
                                    </Badge>
                                  )}
                                  {isCompleted && <CheckCircle2 className="h-4 w-4 text-status-optimal" />}
                                  {exercises.length > 0 && (isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />)}
                                </div>
                              </div>
                            </button>
                            {isExpanded && exercises.length > 0 && (
                              <div className="px-3 pb-3 border-t border-border/50 pt-2">
                                <GroupedExerciseList exercises={exercises} maxHeight="500px" />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Prophylaxis routines for this day */}
                      {dayProphylaxis.map((assignment: any) => {
                        const prog = assignment.prophylaxis_programs;
                        if (!prog) return null;
                        const exercises = (prog.prophylaxis_exercises || []).sort((a: any, b: any) => a.order_index - b.order_index);
                        const isExpanded = expandedItemId === `prophy-${assignment.id}`;

                        return (
                          <div key={`prophy-${assignment.id}`} className="rounded-lg border-l-4 border transition-colors" style={{ borderLeftColor: PROPHYLAXIS_COLOR, backgroundColor: `${PROPHYLAXIS_COLOR}08` }}>
                            <button className="w-full text-left p-3" onClick={() => setExpandedItemId(isExpanded ? null : `prophy-${assignment.id}`)}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="h-4 w-4" style={{ color: PROPHYLAXIS_COLOR }} />
                                  <div>
                                    <p className="font-medium text-sm">{prog.name}</p>
                                    <p className="text-xs text-muted-foreground">🎯 {prog.body_zone} • 📅 {prog.frequency || "quotidien"}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5" style={{ borderColor: `${PROPHYLAXIS_COLOR}40`, color: PROPHYLAXIS_COLOR }}>
                                    <Dumbbell className="h-2.5 w-2.5 mr-0.5" />{exercises.length}
                                  </Badge>
                                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                </div>
                              </div>
                            </button>
                            {isExpanded && exercises.length > 0 && (
                              <div className="px-3 pb-3 border-t border-border/50 pt-2 space-y-1.5">
                                {prog.description && <p className="text-xs text-muted-foreground italic mb-2">{prog.description}</p>}
                                {exercises.map((ex: any, i: number) => (
                                  <div key={ex.id} className="flex items-start gap-2 text-xs p-2 bg-background/60 rounded-md">
                                    <span className="font-semibold text-muted-foreground min-w-[18px]">{i + 1}.</span>
                                    <div className="flex-1">
                                      <p className="font-medium">{ex.exercise_name}</p>
                                      <p className="text-muted-foreground">
                                        {ex.sets && `${ex.sets} séries`}
                                        {ex.reps && ` × ${ex.reps}`}
                                        {ex.duration_seconds ? ` • ${ex.duration_seconds}s` : ""}
                                        {ex.rest_seconds ? ` • Repos: ${ex.rest_seconds}s` : ""}
                                      </p>
                                      {ex.notes && <p className="text-muted-foreground italic mt-0.5">{ex.notes}</p>}
                                    </div>
                                    {ex.video_url && (
                                      <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                        <Play className="h-3.5 w-3.5 text-primary" />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Rehab protocols for this day */}
                      {dayRehab.map((protocol: any) => {
                        const protocolName = protocol.injury_protocols?.name || "Réhabilitation";
                        const currentPhase = protocol.current_phase || 1;
                        const exercises = (protocol.player_rehab_exercises || [])
                          .filter((ex: any) => ex.phase_number <= currentPhase)
                          .sort((a: any, b: any) => a.phase_number - b.phase_number || a.exercise_order - b.exercise_order);
                        const isExpanded = expandedItemId === `rehab-${protocol.id}`;

                        return (
                          <div key={`rehab-${protocol.id}`} className="rounded-lg border-l-4 border transition-colors" style={{ borderLeftColor: REHAB_COLOR, backgroundColor: `${REHAB_COLOR}08` }}>
                            <button className="w-full text-left p-3" onClick={() => setExpandedItemId(isExpanded ? null : `rehab-${protocol.id}`)}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <HeartPulse className="h-4 w-4" style={{ color: REHAB_COLOR }} />
                                  <div>
                                    <p className="font-medium text-sm">{protocolName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Phase {currentPhase} • {protocol.injury_protocols?.injury_category || ""}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5" style={{ borderColor: `${REHAB_COLOR}40`, color: REHAB_COLOR }}>
                                    <Dumbbell className="h-2.5 w-2.5 mr-0.5" />{exercises.length}
                                  </Badge>
                                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                </div>
                              </div>
                            </button>
                            {isExpanded && exercises.length > 0 && (
                              <div className="px-3 pb-3 border-t border-border/50 pt-2 space-y-1.5">
                                {protocol.notes && <p className="text-xs text-muted-foreground italic mb-2">{protocol.notes}</p>}
                                {exercises.map((ex: any, i: number) => (
                                  <div key={ex.id} className="flex items-start gap-2 text-xs p-2 bg-background/60 rounded-md">
                                    <span className="font-semibold text-muted-foreground min-w-[18px]">{i + 1}.</span>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <p className="font-medium">{ex.name}</p>
                                        <Badge variant="outline" className="text-[9px] h-3.5 px-1">P{ex.phase_number}</Badge>
                                      </div>
                                      <p className="text-muted-foreground">
                                        {ex.sets && `${ex.sets} séries`}
                                        {ex.reps && ` × ${ex.reps}`}
                                        {ex.duration && ` • ${ex.duration}`}
                                        {ex.frequency && ` • ${ex.frequency}`}
                                      </p>
                                      {ex.description && <p className="text-muted-foreground italic mt-0.5">{ex.description}</p>}
                                      {ex.notes && <p className="text-muted-foreground italic mt-0.5">💡 {ex.notes}</p>}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      {ex.video_url && (
                                        <a href={ex.video_url} target="_blank" rel="noopener noreferrer">
                                          <Play className="h-3.5 w-3.5 text-primary" />
                                        </a>
                                      )}
                                      {ex.is_completed && <CheckCircle2 className="h-3.5 w-3.5 text-status-optimal" />}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(true)} className="w-full gap-1.5 text-muted-foreground">
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter une séance
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    Sélectionne une date pour voir les événements
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <SessionFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        categoryId={categoryId}
        athletePlayerId={playerId}
      />
    </div>
  );
}
