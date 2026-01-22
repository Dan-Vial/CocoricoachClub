import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Activity, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAthleteAccess } from "@/contexts/AthleteAccessContext";
import { format, parseISO, isAfter, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { getTrainingTypeLabel } from "@/lib/constants/trainingTypes";

export function AthleteRpeEntry() {
  const { playerId, categoryId } = useAthleteAccess();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [rpe, setRpe] = useState<number>(5);
  const [duration, setDuration] = useState<string>("");

  // Fetch recent sessions (last 14 days)
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["athlete-sessions", categoryId],
    queryFn: async () => {
      const twoWeeksAgo = subDays(new Date(), 14).toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("category_id", categoryId)
        .gte("session_date", twoWeeksAgo)
        .order("session_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });

  // Fetch existing RPE entries for this player
  const { data: existingRpe } = useQuery({
    queryKey: ["athlete-rpe", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("training_session_id")
        .eq("player_id", playerId);
      
      if (error) throw error;
      return new Set(data.map(r => r.training_session_id));
    },
    enabled: !!playerId,
  });

  // Calculate AWCR
  const calculateAWCR = async (sessionDateStr: string, newLoad: number) => {
    const sevenDaysAgo = new Date(sessionDateStr);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const twentyEightDaysAgo = new Date(sessionDateStr);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    const { data: recentSessions } = await supabase
      .from("awcr_tracking")
      .select("training_load")
      .eq("player_id", playerId)
      .gte("session_date", sevenDaysAgo.toISOString().split("T")[0])
      .lt("session_date", sessionDateStr);

    const { data: chronicSessions } = await supabase
      .from("awcr_tracking")
      .select("training_load")
      .eq("player_id", playerId)
      .gte("session_date", twentyEightDaysAgo.toISOString().split("T")[0])
      .lt("session_date", sessionDateStr);

    const acuteTotal = (recentSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0) + newLoad;
    const chronicTotal = chronicSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0;

    const acuteAvg = acuteTotal / 7;
    const chronicAvg = chronicTotal / 28;

    const awcr = chronicAvg > 0 ? acuteAvg / chronicAvg : 0;

    return { acuteLoad: acuteAvg, chronicLoad: chronicAvg, awcr };
  };

  const submitRpe = useMutation({
    mutationFn: async () => {
      if (!selectedSession || !playerId || !categoryId) {
        throw new Error("Données manquantes");
      }

      const session = sessions?.find(s => s.id === selectedSession);
      if (!session) throw new Error("Séance introuvable");

      const durationMin = parseInt(duration) || 60;
      const trainingLoad = rpe * durationMin;

      const { acuteLoad, chronicLoad, awcr } = await calculateAWCR(
        session.session_date,
        trainingLoad
      );

      const { error } = await supabase.from("awcr_tracking").insert({
        player_id: playerId,
        category_id: categoryId,
        training_session_id: selectedSession,
        session_date: session.session_date,
        rpe,
        duration_minutes: durationMin,
        training_load: trainingLoad,
        acute_load: acuteLoad,
        chronic_load: chronicLoad,
        awcr,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete-rpe", playerId] });
      toast.success("RPE enregistré avec succès !");
      setSelectedSession(null);
      setRpe(5);
      setDuration("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  // Get session default duration
  const getSessionDuration = (session: any) => {
    if (session.session_start_time && session.session_end_time) {
      const start = session.session_start_time.split(":");
      const end = session.session_end_time.split(":");
      const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
      const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
      return Math.max(0, endMinutes - startMinutes);
    }
    return 60;
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSession(sessionId);
    const session = sessions?.find(s => s.id === sessionId);
    if (session) {
      setDuration(getSessionDuration(session).toString());
    }
  };

  const getRpeColor = (value: number) => {
    if (value <= 3) return "text-green-600";
    if (value <= 5) return "text-yellow-600";
    if (value <= 7) return "text-orange-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement des séances...
        </CardContent>
      </Card>
    );
  }

  const pendingSessions = sessions?.filter(s => !existingRpe?.has(s.id)) || [];
  const completedSessions = sessions?.filter(s => existingRpe?.has(s.id)) || [];

  return (
    <div className="space-y-6">
      {/* Pending Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Séances à compléter
          </CardTitle>
          <CardDescription>
            Sélectionnez une séance pour saisir votre ressenti (RPE)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingSessions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucune séance en attente de RPE
            </p>
          ) : (
            <div className="space-y-3">
              {pendingSessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedSession === session.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleSelectSession(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(parseISO(session.session_date), "EEEE d MMMM", { locale: fr })}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {getTrainingTypeLabel(session.training_type)}
                    </Badge>
                  </div>
                  {session.session_start_time && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {session.session_start_time} - {session.session_end_time}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RPE Entry Form */}
      {selectedSession && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Saisir votre RPE</CardTitle>
            <CardDescription>
              RPE = Rate of Perceived Exertion (effort ressenti de 1 à 10)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Effort ressenti (RPE)</Label>
                <span className={`text-2xl font-bold ${getRpeColor(rpe)}`}>
                  {rpe}
                </span>
              </div>
              <Slider
                value={[rpe]}
                onValueChange={([v]) => setRpe(v)}
                min={1}
                max={10}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 - Très facile</span>
                <span>5 - Modéré</span>
                <span>10 - Maximum</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Durée (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Charge d'entraînement :</strong>{" "}
                {rpe * (parseInt(duration) || 0)} UA
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedSession(null)}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={() => submitRpe.mutate()}
                disabled={submitRpe.isPending || !duration}
              >
                {submitRpe.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Sessions */}
      {completedSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Séances complétées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>
                      {format(parseISO(session.session_date), "d MMMM", { locale: fr })}
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {getTrainingTypeLabel(session.training_type)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
