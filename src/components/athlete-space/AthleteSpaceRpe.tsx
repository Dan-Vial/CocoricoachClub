import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, CheckCircle2, Clock, Calendar, Lock, Target } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { getTrainingTypeLabel } from "@/lib/constants/trainingTypes";
import { getTestLabel } from "@/lib/constants/testCategories";
import { getDisplayNotes } from "@/lib/utils/sessionNotes";
import { SPARE_EXERCISE_TYPES } from "@/lib/constants/bowlingBallBrands";

interface Props {
  playerId: string;
  categoryId: string;
}

type SessionRow = {
  id: string;
  session_date: string;
  training_type: string;
  session_start_time: string | null;
  session_end_time: string | null;
  notes: string | null;
  bowling_exercise_type?: string | null;
};

const BLOCK_TO_SPARE_MAP: Record<string, string> = {
  quille_7: "spare_pin_7",
  quille_10: "spare_pin_10",
  spares: "spare_general",
  poche: "spare_poche",
};

const BOWLING_EXERCISE_LABELS: Record<string, string> = {
  quille_7: "Quille 7",
  quille_10: "Quille 10",
  spares: "Spares",
  poche: "Poche",
};

export function AthleteSpaceRpe({ playerId, categoryId }: Props) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const endDate = addDays(new Date(), 14).toISOString().split("T")[0];

  const enrichSessionsWithBowlingExercise = async (sessions: SessionRow[]): Promise<SessionRow[]> => {
    if (sessions.length === 0) return [];

    const sessionIds = sessions.map((s) => s.id);
    const { data: blocks, error } = await supabase
      .from("training_session_blocks")
      .select("training_session_id, training_type, bowling_exercise_type")
      .in("training_session_id", sessionIds);

    if (error) throw error;

    const exerciseBySession = new Map<string, string>();
    for (const block of blocks || []) {
      if (
        block.training_type === "bowling_spare" &&
        block.bowling_exercise_type &&
        !exerciseBySession.has(block.training_session_id)
      ) {
        exerciseBySession.set(block.training_session_id, block.bowling_exercise_type);
      }
    }

    return sessions.map((session) => ({
      ...session,
      bowling_exercise_type: exerciseBySession.get(session.id) ?? null,
    }));
  };

  // Fetch sessions assigned to this player: today + upcoming (next 14 days)
  const { data: allSessions = [] } = useQuery({
    queryKey: ["athlete-space-sessions", categoryId, playerId, today, endDate],
    queryFn: async () => {
      // First get session IDs where this player is assigned
      const { data: attendance, error: attError } = await supabase
        .from("training_attendance")
        .select("training_session_id")
        .eq("player_id", playerId)
        .gte("attendance_date", today)
        .lte("attendance_date", endDate);
      if (attError) throw attError;

      const assignedSessionIds = attendance?.map(a => a.training_session_id).filter(Boolean) as string[];

      if (assignedSessionIds.length === 0) {
        // Fallback: if no attendance records exist at all for this period, 
        // check if sessions have "all" mode (no attendance records for anyone)
        const { data: sessions, error } = await supabase
          .from("training_sessions")
          .select("id, session_date, training_type, session_start_time, session_end_time, notes")
          .eq("category_id", categoryId)
          .gte("session_date", today)
          .lte("session_date", endDate)
          .order("session_date")
          .order("session_start_time");
        if (error) throw error;
        
        // Only return sessions that have NO attendance records (meaning "all players")
        const sessionIds = sessions?.map(s => s.id) || [];
        if (sessionIds.length === 0) return [];
        
        const { data: anyAttendance } = await supabase
          .from("training_attendance")
          .select("training_session_id")
          .in("training_session_id", sessionIds)
          .limit(1000);
        
        const sessionsWithAttendance = new Set(anyAttendance?.map(a => a.training_session_id));
        return (sessions || []).filter(s => !sessionsWithAttendance.has(s.id));
      }

      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, session_date, training_type, session_start_time, session_end_time, notes")
        .in("id", assignedSessionIds)
        .order("session_date")
        .order("session_start_time");
      if (error) throw error;

      // Also include sessions with NO attendance records (all players mode)
      const { data: allCatSessions } = await supabase
        .from("training_sessions")
        .select("id, session_date, training_type, session_start_time, session_end_time, notes")
        .eq("category_id", categoryId)
        .gte("session_date", today)
        .lte("session_date", endDate);
      
      const existingIds = new Set((data || []).map(s => s.id));
      const allCatSessionIds = (allCatSessions || []).map(s => s.id);
      
      if (allCatSessionIds.length > 0) {
        const { data: allAttendance } = await supabase
          .from("training_attendance")
          .select("training_session_id")
          .in("training_session_id", allCatSessionIds)
          .limit(1000);
        
        const sessionsWithAttendance = new Set(allAttendance?.map(a => a.training_session_id));
        const noAttendanceSessions = (allCatSessions || []).filter(s => !sessionsWithAttendance.has(s.id) && !existingIds.has(s.id));
        return [...(data || []), ...noAttendanceSessions].sort((a, b) => a.session_date.localeCompare(b.session_date) || (a.session_start_time || "").localeCompare(b.session_start_time || ""));
      }

      return data || [];
    },
  });

  const todaySessions = allSessions.filter(s => s.session_date === today);
  const upcomingSessions = allSessions.filter(s => s.session_date > today);

  // Fetch test results for today
  const testSessionIds = todaySessions.filter(s => s.training_type === "test").map(s => s.id);
  const { data: testResults = [] } = useQuery({
    queryKey: ["athlete-space-test-results", playerId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generic_tests")
        .select("id, test_type, test_category, result_value, result_unit, notes")
        .eq("player_id", playerId)
        .eq("test_date", today);
      if (error) throw error;
      return data || [];
    },
    enabled: testSessionIds.length > 0,
  });

  const getTestResultsForSession = (sessionId: string) => {
    return testResults.filter(t => t.notes?.includes(`Session ID: ${sessionId}`));
  };

  const getTestNamesForSession = (notes: string | null): string[] => {
    if (!notes) return [];
    const match = notes.match(/<!--TESTS:(.*?)-->/);
    if (!match) return [];
    try {
      const tests = JSON.parse(match[1]);
      return tests.map((t: any) => getTestLabel(t.test_type || t.test_category)).filter(Boolean);
    } catch {
      return [];
    }
  };

  // Fetch already submitted RPEs
  const { data: submittedRpes = [] } = useQuery({
    queryKey: ["athlete-space-rpes", playerId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("training_session_id")
        .eq("player_id", playerId)
        .eq("session_date", today);
      if (error) throw error;
      return data || [];
    },
  });

  const completedSessionIds = new Set(submittedRpes.map(r => r.training_session_id));

  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [rpe, setRpe] = useState(5);
  const [duration, setDuration] = useState("");
  const [durationLocked, setDurationLocked] = useState(false);

  // Calculate duration from session start/end times
  const getSessionDuration = (session: { session_start_time?: string | null; session_end_time?: string | null }) => {
    if (!session.session_start_time || !session.session_end_time) return null;
    const [sh, sm] = session.session_start_time.split(":").map(Number);
    const [eh, em] = session.session_end_time.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : null;
  };

  const handleSelectSession = (sessionId: string) => {
    if (sessionId === selectedSession) {
      setSelectedSession(null);
      return;
    }
    setSelectedSession(sessionId);
    setRpe(5);
    const session = todaySessions.find(s => s.id === sessionId);
    if (session) {
      const calcDuration = getSessionDuration(session);
      if (calcDuration) {
        setDuration(calcDuration.toString());
        setDurationLocked(true);
      } else {
        setDuration("");
        setDurationLocked(false);
      }
    }
  };

  const submitRpe = useMutation({
    mutationFn: async () => {
      if (!selectedSession || !duration) throw new Error("Données manquantes");
      const durationMin = parseInt(duration);
      const { error } = await supabase.from("awcr_tracking").insert({
        player_id: playerId,
        category_id: categoryId,
        session_date: today,
        rpe,
        duration_minutes: durationMin,
        training_session_id: selectedSession,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("RPE enregistré !");
      queryClient.invalidateQueries({ queryKey: ["athlete-space-rpes"] });
      queryClient.invalidateQueries({ queryKey: ["athlete-space-awcr"] });
      setSelectedSession(null);
      setRpe(5);
      setDuration("");
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const getRpeColor = (val: number) => {
    if (val <= 3) return "text-status-optimal";
    if (val <= 5) return "text-accent";
    if (val <= 7) return "text-warning";
    return "text-destructive";
  };

  const getRpeLabel = (val: number) => {
    if (val <= 2) return "Très facile";
    if (val <= 4) return "Facile";
    if (val <= 6) return "Modéré";
    if (val <= 8) return "Difficile";
    return "Maximal";
  };

  const pendingSessions = todaySessions.filter(s => !completedSessionIds.has(s.id));
  const doneSessions = todaySessions.filter(s => completedSessionIds.has(s.id));

  // Group upcoming sessions by date
  const upcomingByDate = upcomingSessions.reduce<Record<string, typeof upcomingSessions>>((acc, s) => {
    if (!acc[s.session_date]) acc[s.session_date] = [];
    acc[s.session_date].push(s);
    return acc;
  }, {});

  const renderTestInfo = (session: typeof todaySessions[0]) => {
    if (session.training_type !== "test") return null;
    const testNames = getTestNamesForSession(session.notes);
    const results = session.session_date === today ? getTestResultsForSession(session.id) : [];
    if (testNames.length === 0 && results.length === 0) {
      return <div className="text-xs text-muted-foreground mt-0.5 italic">Test prévu</div>;
    }
    return (
      <div className="text-xs text-muted-foreground mt-0.5">
        {testNames.map((name, idx) => <div key={idx}>📋 {name}</div>)}
        {results.map((r, idx) => (
          <div key={`r-${idx}`}>✅ {r.test_type}: {r.result_value} {r.result_unit || ""}</div>
        ))}
      </div>
    );
  };

  const renderSessionNotes = (notes: string | null) => {
    const display = getDisplayNotes(notes);
    if (!display) return null;
    return <p className="text-xs text-muted-foreground mt-0.5 italic">{display}</p>;
  };

  return (
    <div className="space-y-6">
      {/* Today: Pending sessions */}
      {pendingSessions.length > 0 ? (
        <Card className="bg-gradient-card shadow-md border-accent/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              Séances du jour à remplir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingSessions.map(session => (
              <div key={session.id}>
                <button
                  onClick={() => handleSelectSession(session.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedSession === session.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{getTrainingTypeLabel(session.training_type)}</p>
                      {renderTestInfo(session)}
                      {renderSessionNotes(session.notes)}
                      {session.session_start_time && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {session.session_start_time?.slice(0, 5)}
                          {session.session_end_time && ` - ${session.session_end_time.slice(0, 5)}`}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">À remplir</Badge>
                  </div>
                </button>

                {selectedSession === session.id && (
                  <div className="mt-3 p-4 rounded-lg bg-muted/30 space-y-4">
                    <div>
                      <Label className="text-sm">Ressenti (RPE)</Label>
                      <div className="mt-2">
                        <Slider
                          value={[rpe]}
                          onValueChange={([v]) => setRpe(v)}
                          min={1}
                          max={10}
                          step={1}
                        />
                        <div className="flex justify-between mt-1">
                          <span className={`text-2xl font-bold ${getRpeColor(rpe)}`}>{rpe}/10</span>
                          <span className="text-sm text-muted-foreground self-end">{getRpeLabel(rpe)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Durée (minutes)</Label>
                      {durationLocked ? (
                        <div className="mt-1 flex items-center gap-2">
                          <Input
                            type="number"
                            value={duration}
                            readOnly
                            className="bg-muted/50 cursor-not-allowed"
                          />
                          <Badge variant="secondary" className="text-xs whitespace-nowrap shrink-0">
                            {duration}'
                          </Badge>
                        </div>
                      ) : (
                        <Input
                          type="number"
                          value={duration}
                          onChange={e => setDuration(e.target.value)}
                          placeholder="Ex: 90"
                          className="mt-1"
                        />
                      )}
                    </div>
                    <Button
                      onClick={() => submitRpe.mutate()}
                      disabled={!duration || submitRpe.isPending}
                      className="w-full"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Valider mon RPE
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-card">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-status-optimal mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {todaySessions.length === 0
                ? "Aucune séance prévue aujourd'hui"
                : "Tous les RPE du jour sont enregistrés 👏"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Completed today */}
      {doneSessions.length > 0 && (
        <Card className="bg-gradient-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Déjà remplis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
               {doneSessions.map(s => (
                 <div key={s.id} className="flex items-center justify-between p-2 rounded bg-status-optimal/10">
                   <div className="flex flex-col gap-0.5">
                     <span className="text-sm font-medium">{getTrainingTypeLabel(s.training_type)}</span>
                      {renderTestInfo(s)}
                   </div>
                   <CheckCircle2 className="h-4 w-4 text-status-optimal" />
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming sessions (read-only) */}
      {Object.keys(upcomingByDate).length > 0 && (
        <Card className="bg-gradient-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Prochaines séances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(upcomingByDate).map(([date, dateSessions]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  📅 {format(parseISO(date), "EEEE d MMMM", { locale: fr })}
                </p>
                <div className="space-y-2">
                  {dateSessions.map(session => (
                    <div
                      key={session.id}
                      className="p-3 rounded-lg border border-border bg-muted/20 opacity-80"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{getTrainingTypeLabel(session.training_type)}</p>
                          {renderTestInfo(session)}
                          {renderSessionNotes(session.notes)}
                          {session.session_start_time && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {session.session_start_time?.slice(0, 5)}
                              {session.session_end_time && ` - ${session.session_end_time.slice(0, 5)}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          <span className="text-xs">Jour J</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
