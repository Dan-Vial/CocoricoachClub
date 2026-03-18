import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Activity, Calendar, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { getTrainingTypeLabel } from "@/lib/constants/trainingTypes";
import { athletePortalHeaders, buildAthletePortalFunctionUrl } from "@/lib/athletePortalClient";
import { AthleteSpareExerciseForm } from "./AthleteSpareExerciseForm";
import { BowlingScoreSheet, BowlingStats } from "./BowlingScoreSheet";

interface AthleteRpeEntryProps {
  token?: string;
  playerId: string;
  categoryId: string;
  sportType?: string;
  onRefreshStats?: () => void;
}

interface Session {
  id: string;
  session_date: string;
  training_type: string;
  session_start_time: string | null;
  session_end_time: string | null;
}

export function AthleteRpeEntry({ token, playerId, categoryId, sportType, onRefreshStats }: AthleteRpeEntryProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [completedSessionIds, setCompletedSessionIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [rpe, setRpe] = useState<number>(5);
  const [duration, setDuration] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingSpare, setIsSubmittingSpare] = useState(false);
  const [showScoreSheet, setShowScoreSheet] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isBowling = sportType?.toLowerCase().startsWith("bowling");

  useEffect(() => {
    fetchSessions();
  }, [token, refreshKey]);

  const fetchSessions = () => {
    setIsLoading(true);
    fetch(buildAthletePortalFunctionUrl("sessions", token), {
      headers: athletePortalHeaders(),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSessions(data.sessions || []);
          setCompletedSessionIds(new Set(data.completedSessionIds || []));
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        toast.error("Erreur lors du chargement des séances");
      });
  };

  const refresh = () => setRefreshKey(k => k + 1);

  const getSessionDuration = (session: Session) => {
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
    setShowScoreSheet(false);
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setDuration(getSessionDuration(session).toString());
    }
  };

  const selectedSessionData = sessions.find(s => s.id === selectedSession);
  const isPrecision = selectedSessionData?.training_type === "bowling_spare";
  const isSimulation = selectedSessionData?.training_type === "bowling_game" || selectedSessionData?.training_type === "bowling_practice";

  const handleSubmit = async () => {
    if (!selectedSession || !duration) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(buildAthletePortalFunctionUrl("submit-rpe", token), {
        method: "POST",
        headers: athletePortalHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          session_id: selectedSession,
          rpe,
          duration: parseInt(duration),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("RPE enregistré !");
        setCompletedSessionIds(prev => new Set([...prev, selectedSession]));
        setSelectedSession(null);
        setRpe(5);
        setDuration("");
        onRefreshStats?.();
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSpare = async (exercises: Array<{ exercise_type: string; attempts: number; successes: number }>) => {
    if (!selectedSession) return;
    setIsSubmittingSpare(true);
    try {
      const res = await fetch(buildAthletePortalFunctionUrl("submit-spare-stats", token), {
        method: "POST",
        headers: athletePortalHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ session_id: selectedSession, exercises }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Stats de précision enregistrées !");
        onRefreshStats?.();
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setIsSubmittingSpare(false);
    }
  };

  const handleSaveScoreSheet = async (stats: BowlingStats) => {
    if (!selectedSession) return;
    try {
      const res = await fetch(buildAthletePortalFunctionUrl("submit-training-scores", token), {
        method: "POST",
        headers: athletePortalHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          session_id: selectedSession,
          games: [{
            gameNumber: 1,
            score: stats.totalScore,
            strikes: stats.strikes,
            spares: stats.spares,
            splitCount: stats.splitCount,
            splitConverted: stats.splitConverted,
            splitOnLastThrow: stats.splitOnLastThrow,
            singlePinCount: stats.singlePinCount,
            singlePinConverted: stats.singlePinConverted,
            pocketCount: stats.pocketCount,
            strikePercentage: stats.strikePercentage,
            sparePercentage: stats.sparePercentage,
            splitPercentage: stats.splitPercentage,
            singlePinConversionRate: stats.singlePinConversionRate,
            pocketPercentage: stats.pocketPercentage,
            openFrames: stats.openFrames,
          }],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Feuille de score enregistrée !");
        onRefreshStats?.();
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
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
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const pendingSessions = sessions.filter(s => !completedSessionIds.has(s.id));
  const completedSessions = sessions.filter(s => completedSessionIds.has(s.id));

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
            {isBowling && " et vos statistiques bowling"}
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
        <>
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
                  onClick={handleSubmit}
                  disabled={isSubmitting || !duration}
                >
                  {isSubmitting ? "Enregistrement..." : "Enregistrer RPE"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bowling Precision Stats */}
          {isBowling && isPrecision && (
            <AthleteSpareExerciseForm
              onSubmit={handleSubmitSpare}
              isSubmitting={isSubmittingSpare}
            />
          )}

          {/* Bowling Score Sheet */}
          {isBowling && isSimulation && (
            <Card className="border-blue-300 dark:border-blue-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Feuille de score</CardTitle>
                <CardDescription>Remplissez votre feuille de score bowling</CardDescription>
              </CardHeader>
              <CardContent>
                {!showScoreSheet ? (
                  <Button variant="outline" className="w-full" onClick={() => setShowScoreSheet(true)}>
                    Ajouter une feuille de score
                  </Button>
                ) : (
                  <BowlingScoreSheet
                    onSave={(stats) => handleSaveScoreSheet(stats)}
                    onCancel={() => setShowScoreSheet(false)}
                    playerId={playerId}
                    categoryId={categoryId}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </>
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
