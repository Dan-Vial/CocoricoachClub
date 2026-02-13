import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { getTrainingTypeLabel } from "@/lib/constants/trainingTypes";
import { getTestLabel } from "@/lib/constants/testCategories";

interface Props {
  playerId: string;
  categoryId: string;
}

export function AthleteSpaceRpe({ playerId, categoryId }: Props) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  // Fetch today's sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ["athlete-space-sessions", categoryId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, session_date, training_type, session_start_time, session_end_time, notes")
        .eq("category_id", categoryId)
        .eq("session_date", today)
        .order("session_start_time");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch test results for today (to show which tests were done)
  const testSessionIds = sessions.filter(s => s.training_type === "test").map(s => s.id);
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

  // Map test results to sessions via notes containing "Session ID: xxx"
  const getTestResultsForSession = (sessionId: string) => {
    return testResults.filter(t => t.notes?.includes(`Session ID: ${sessionId}`));
  };

  // Extract tests from session notes
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

  const pendingSessions = sessions.filter(s => !completedSessionIds.has(s.id));
  const doneSessions = sessions.filter(s => completedSessionIds.has(s.id));

  return (
    <div className="space-y-6">
      {/* Pending sessions */}
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
                  onClick={() => setSelectedSession(session.id === selectedSession ? null : session.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedSession === session.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{getTrainingTypeLabel(session.training_type)}</p>
                      {session.training_type === "test" && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {getTestNamesForSession(session.notes as any).map((testName, idx) => (
                            <div key={idx}>📋 {testName}</div>
                          ))}
                          {getTestResultsForSession(session.id).map((result, idx) => (
                            <div key={`r-${idx}`}>✅ {result.test_type}: {result.result_value} {result.result_unit || ""}</div>
                          ))}
                          {getTestNamesForSession(session.notes as any).length === 0 && getTestResultsForSession(session.id).length === 0 && (
                            <div className="italic">Test prévu</div>
                          )}
                        </div>
                      )}
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
                      <Input
                        type="number"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                        placeholder="Ex: 90"
                        className="mt-1"
                      />
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
              {sessions.length === 0
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
                      {s.training_type === "test" && (
                        <div className="text-xs text-muted-foreground">
                          {getTestNamesForSession(s.notes as any).map((testName, idx) => (
                            <div key={idx}>📋 {testName}</div>
                          ))}
                          {getTestResultsForSession(s.id).map((result, idx) => (
                            <div key={`r-${idx}`}>✅ {result.test_type}: {result.result_value} {result.result_unit || ""}</div>
                          ))}
                        </div>
                      )}
                   </div>
                   <CheckCircle2 className="h-4 w-4 text-status-optimal" />
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
