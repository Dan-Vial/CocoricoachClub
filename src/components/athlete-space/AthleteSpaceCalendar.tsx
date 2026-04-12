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
} from "lucide-react";
import { format } from "date-fns";
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

const ATHLETE_SESSION_COLOR = "#8B5CF6"; // violet-500

export function AthleteSpaceCalendar({ playerId, categoryId, sportType }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Fetch sessions for this category
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

  // Fetch matches
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

  // Fetch submitted RPEs to show completion status
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

  const completedSessionIds = new Set(submittedRpes.map(r => r.training_session_id));

  // trainingTypes not needed anymore - handled by AddSessionDialog

  // Calendar date modifiers
  const sessionDates = sessions.map(s => new Date(s.session_date));
  const matchDates = matches.map(m => new Date(m.match_date));
  const athleteSessionDates = sessions
    .filter(s => s.created_by_player_id === playerId)
    .map(s => new Date(s.session_date));

  // Events for selected date
  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const daySessions = sessions.filter(s => s.session_date === selectedDateStr);
  const dayMatches = matches.filter(m => m.match_date === selectedDateStr);

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

  // Fetch exercises for day sessions
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

  const openCreateDialog = () => {
    setIsCreateOpen(true);
  };

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
              onClick={() => openCreateDialog()}
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
                onSelect={(d) => {
                  setSelectedDate(d);
                }}
                modifiers={{
                  session: sessionDates,
                  match: matchDates,
                  athleteSession: athleteSessionDates,
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
                  athleteSession: {
                    backgroundColor: `${ATHLETE_SESSION_COLOR}30`,
                    borderRadius: "4px",
                    border: `2px solid ${ATHLETE_SESSION_COLOR}`,
                  },
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
              </div>

              {selectedDate ? (
                <div>
                  <h3 className="font-semibold text-sm mb-2">
                    {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
                  </h3>

                  {daySessions.length === 0 && dayMatches.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground mb-3">Aucun événement</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCreateDialog()}
                        className="gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter une séance
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      {/* Matches */}
                      {dayMatches.map(match => (
                        <div
                          key={match.id}
                          className="p-3 rounded-lg border-l-4 border-rose-500 bg-rose-50 dark:bg-rose-950/20"
                        >
                          <div className="flex items-center gap-2">
                            <Swords className="h-4 w-4 text-rose-500" />
                            <div>
                              <p className="font-medium text-sm">vs {match.opponent}</p>
                              {match.match_time && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {match.match_time.slice(0, 5)}
                                </p>
                              )}
                              {match.location && (
                                <p className="text-xs text-muted-foreground">{match.location}</p>
                              )}
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
                        const isExpanded = expandedSessionId === session.id;

                        return (
                          <div
                            key={session.id}
                            className={cn(
                              "rounded-lg border transition-colors",
                              isAthleteSession
                                ? "border-l-4"
                                : "border-border"
                            )}
                            style={isAthleteSession ? { borderLeftColor: ATHLETE_SESSION_COLOR, backgroundColor: `${ATHLETE_SESSION_COLOR}08` } : {}}
                          >
                            <button
                              className="w-full text-left p-3"
                              onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Activity className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-medium text-sm">
                                        {getTrainingTypeLabel(session.training_type)}
                                      </p>
                                      {blocks.length > 0 && blocks.some(b => b.training_type !== session.training_type) && (
                                        <div className="flex gap-1 flex-wrap">
                                          {blocks
                                            .filter(b => b.training_type !== session.training_type)
                                            .map((b, i) => (
                                              <Badge key={i} variant="outline" className="text-[10px] h-4 px-1.5">
                                                {getTrainingTypeLabel(b.training_type)}
                                              </Badge>
                                            ))}
                                        </div>
                                      )}
                                      {isAthleteSession && (
                                        <Badge
                                          className="text-[10px] h-4 px-1.5 border"
                                          style={{
                                            backgroundColor: `${ATHLETE_SESSION_COLOR}15`,
                                            color: ATHLETE_SESSION_COLOR,
                                            borderColor: `${ATHLETE_SESSION_COLOR}40`,
                                          }}
                                        >
                                          <User className="h-2.5 w-2.5 mr-0.5" />
                                          Ma séance
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
                                      <Dumbbell className="h-2.5 w-2.5 mr-0.5" />
                                      {exercises.length}
                                    </Badge>
                                  )}
                                  {isCompleted && (
                                    <CheckCircle2 className="h-4 w-4 text-status-optimal" />
                                  )}
                                  {exercises.length > 0 && (
                                    isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* Expanded exercises with video buttons */}
                            {isExpanded && exercises.length > 0 && (
                              <div className="px-3 pb-3 border-t border-border/50 pt-2">
                                <GroupedExerciseList
                                  exercises={exercises}
                                  compact
                                  maxHeight="300px"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCreateDialog()}
                        className="w-full gap-1.5 text-muted-foreground"
                      >
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

      {/* Prophylaxis programs section */}
      {prophylaxisPrograms.length > 0 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Mes routines de prophylaxie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {prophylaxisPrograms.map((assignment: any) => {
                const prog = assignment.prophylaxis_programs;
                if (!prog || !prog.is_active) return null;
                const exercises = prog.prophylaxis_exercises || [];
                return (
                  <div key={assignment.id} className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium text-sm">{prog.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>🎯 {prog.body_zone}</p>
                      <p>📅 {prog.frequency || "quotidien"}</p>
                      {prog.description && <p className="italic">{prog.description}</p>}
                    </div>
                    {exercises.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {exercises
                          .sort((a: any, b: any) => a.order_index - b.order_index)
                          .map((ex: any, i: number) => (
                            <div key={ex.id} className="text-xs p-1.5 bg-background/60 rounded">
                              <span className="font-medium">{i + 1}. {ex.exercise_name}</span>
                              <span className="text-muted-foreground ml-1">
                                {ex.sets && `${ex.sets}×`}{ex.reps || ""}{ex.duration_seconds ? ` ${ex.duration_seconds}s` : ""}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <SessionFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        categoryId={categoryId}
        athletePlayerId={playerId}
      />
    </div>
  );
}
