import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Activity,
  Plus,
  Swords,
  Dumbbell,
  CheckCircle2,
  Clock,
  User,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { NAV_COLORS } from "@/components/ui/colored-nav-tabs";
import { cn } from "@/lib/utils";
import { getTrainingTypeLabel, getTrainingTypesForSport } from "@/lib/constants/trainingTypes";
import { GroupedExerciseList } from "@/components/category/GroupedExerciseList";

interface Props {
  playerId: string;
  categoryId: string;
  sportType?: string;
}

const ATHLETE_SESSION_COLOR = "#8B5CF6"; // violet-500

export function AthleteSpaceCalendar({ playerId, categoryId, sportType }: Props) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionType, setNewSessionType] = useState("individuelle");
  const [newSessionStartTime, setNewSessionStartTime] = useState("");
  const [newSessionEndTime, setNewSessionEndTime] = useState("");
  const [newSessionNotes, setNewSessionNotes] = useState("");

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

  const completedSessionIds = new Set(submittedRpes.map(r => r.training_session_id));

  const trainingTypes = getTrainingTypesForSport(sportType);

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

  // Fetch exercises for day sessions
  const daySessionIds = daySessions.map(s => s.id);
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

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!newSessionDate) throw new Error("Date requise");
      if (!newSessionType) throw new Error("Type de séance requis");

      const { error } = await supabase.from("training_sessions").insert({
        category_id: categoryId,
        session_date: newSessionDate,
        training_type: newSessionType,
        session_start_time: newSessionStartTime || null,
        session_end_time: newSessionEndTime || null,
        notes: newSessionNotes ? `[Séance athlète] ${newSessionNotes}` : "[Séance athlète]",
        created_by_player_id: playerId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Séance créée ! Elle apparaîtra dans le planning du staff.");
      queryClient.invalidateQueries({ queryKey: ["athlete-calendar-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["athlete-space-sessions"] });
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (error: any) => toast.error(error.message || "Erreur lors de la création"),
  });

  const resetForm = () => {
    setNewSessionType("individuelle");
    setNewSessionStartTime("");
    setNewSessionEndTime("");
    setNewSessionNotes("");
  };

  const openCreateDialog = (date?: Date) => {
    const d = date || selectedDate || new Date();
    setNewSessionDate(format(d, "yyyy-MM-dd"));
    resetForm();
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
                        onClick={() => openCreateDialog(selectedDate)}
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

                        return (
                          <div
                            key={session.id}
                            className={cn(
                              "p-3 rounded-lg border transition-colors",
                              isAthleteSession
                                ? "border-l-4"
                                : "border-border"
                            )}
                            style={isAthleteSession ? { borderLeftColor: ATHLETE_SESSION_COLOR, backgroundColor: `${ATHLETE_SESSION_COLOR}08` } : {}}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm">
                                      {getTrainingTypeLabel(session.training_type)}
                                    </p>
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
                              {isCompleted && (
                                <CheckCircle2 className="h-4 w-4 text-status-optimal" />
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Add button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCreateDialog(selectedDate)}
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

      {/* Create Session Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" style={{ color: ATHLETE_SESSION_COLOR }} />
              Ajouter une séance
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Date</Label>
              <Input
                type="date"
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm">Type de séance</Label>
              <Select value={newSessionType} onValueChange={setNewSessionType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trainingTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Heure début</Label>
                <Input
                  type="time"
                  value={newSessionStartTime}
                  onChange={(e) => setNewSessionStartTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Heure fin</Label>
                <Input
                  type="time"
                  value={newSessionEndTime}
                  onChange={(e) => setNewSessionEndTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm">Notes</Label>
              <Textarea
                value={newSessionNotes}
                onChange={(e) => setNewSessionNotes(e.target.value)}
                placeholder="Ex: Rattrapage séance du mardi..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5 inline mr-1" style={{ color: ATHLETE_SESSION_COLOR }} />
              Cette séance sera visible par le staff dans le planning avec une couleur distincte.
              Tu pourras renseigner ton RPE une fois la séance terminée.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => createSessionMutation.mutate()}
              disabled={!newSessionDate || createSessionMutation.isPending}
              style={{ backgroundColor: ATHLETE_SESSION_COLOR }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Créer la séance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
