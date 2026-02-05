import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, CheckCircle2, MapPin, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { athletePortalHeaders, buildAthletePortalFunctionUrl } from "@/lib/athletePortalClient";
import { BowlingScoreSheet } from "./BowlingScoreSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AthleteMatchStatsProps {
  token?: string;
  playerId: string;
  categoryId: string;
  sportType?: string;
}

interface Match {
  id: string;
  match_date: string;
  opponent: string;
  is_home: boolean;
  location: string | null;
  score_home: number | null;
  score_away: number | null;
}

interface FrameData {
  throws: { value: string; pins: number; isPocket: boolean; isSplit: boolean; isSinglePin: boolean; isSinglePinConverted: boolean; }[];
  score: number | null;
  cumulativeScore: number | null;
}

interface BowlingGame {
  gameNumber: number;
  score: number;
  frames: FrameData[];
  strikePercentage: number;
  sparePercentage: number;
  splitPercentage: number;
  singlePinConversionRate: number;
  pocketPercentage: number;
  openFrames: number;
  // Keep raw counts for calculations
  strikes: number;
  spares: number;
  splitCount: number;
  splitConverted: number;
  singlePinCount: number;
  singlePinConverted: number;
  pocketCount: number;
}

export function AthleteMatchStats({ token, playerId, categoryId, sportType }: AthleteMatchStatsProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [completedMatchIds, setCompletedMatchIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBowlingSheet, setShowBowlingSheet] = useState(false);
  const [editingGameIndex, setEditingGameIndex] = useState<number | null>(null);
  const [bowlingGames, setBowlingGames] = useState<BowlingGame[]>([]);
  const [stats, setStats] = useState({
    minutes_played: "",
    goals: "",
    assists: "",
    yellow_cards: "",
    red_cards: "",
  });

  const isBowling = sportType === "bowling";

  // Fetch matches
  useEffect(() => {
    fetch(buildAthletePortalFunctionUrl("matches", token), {
      headers: athletePortalHeaders(),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMatches(data.matches || []);
          setCompletedMatchIds(new Set(data.completedMatchIds || []));
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        toast.error("Erreur lors du chargement des compétitions");
      });
  }, [token]);

  const handleSubmit = async () => {
    if (!selectedMatch) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(buildAthletePortalFunctionUrl("submit-stats", token), {
        method: "POST",
        headers: athletePortalHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          match_id: selectedMatch,
          minutes_played: parseInt(stats.minutes_played) || 0,
          goals: parseInt(stats.goals) || 0,
          assists: parseInt(stats.assists) || 0,
          yellow_cards: parseInt(stats.yellow_cards) || 0,
          red_cards: parseInt(stats.red_cards) || 0,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Statistiques enregistrées !");
        setCompletedMatchIds(prev => new Set([...prev, selectedMatch]));
        setSelectedMatch(null);
        setStats({
          minutes_played: "",
          goals: "",
          assists: "",
          yellow_cards: "",
          red_cards: "",
        });
      } else {
        toast.error(data.error || "Erreur lors de l'enregistrement");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setIsSubmitting(false);
    }
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

  const pendingMatches = matches.filter(m => !completedMatchIds.has(m.id));
  const completedMatches = matches.filter(m => completedMatchIds.has(m.id));

  return (
    <div className="space-y-6">
      {/* Pending Matches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Compétitions à compléter
          </CardTitle>
          <CardDescription>
            Sélectionnez une compétition pour saisir vos statistiques
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucune compétition récente où vous êtes inscrit
            </p>
          ) : pendingMatches.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Toutes vos compétitions sont complétées !
            </p>
          ) : (
            <div className="space-y-3">
              {pendingMatches.map((match) => (
                <div
                  key={match.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedMatch === match.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedMatch(match.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(parseISO(match.match_date), "EEEE d MMMM", { locale: fr })}
                      </span>
                    </div>
                    {match.is_home ? (
                      <Badge variant="secondary">Domicile</Badge>
                    ) : (
                      <Badge variant="outline">Extérieur</Badge>
                    )}
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">vs {match.opponent}</span>
                    {match.score_home !== null && match.score_away !== null && (
                      <span className="ml-2 text-muted-foreground">
                        ({match.score_home} - {match.score_away})
                      </span>
                    )}
                  </div>
                  {match.location && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {match.location}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bowling: Add Game Button and Games List */}
      {selectedMatch && isBowling && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Parties de bowling</CardTitle>
              <Button onClick={() => setShowBowlingSheet(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une partie
              </Button>
            </div>
            <CardDescription>
              Ajoutez vos parties avec la feuille de score interactive
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bowlingGames.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Aucune partie enregistrée. Cliquez sur "Ajouter une partie" pour commencer.
              </p>
            ) : (
              <div className="space-y-3">
                {bowlingGames.map((game, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setEditingGameIndex(index);
                      setShowBowlingSheet(true);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Partie {game.gameNumber}</Badge>
                        <span className="text-xs text-muted-foreground">(cliquer pour modifier)</span>
                      </div>
                      <span className="text-2xl font-bold text-muted-foreground">{game.score}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs text-muted-foreground">
                      <div>Strikes: {game.strikePercentage}%</div>
                      <div>Spares: {game.sparePercentage}%</div>
                      <div>Splits: {game.splitPercentage}%</div>
                      <div>Poche: {game.pocketPercentage}%</div>
                      <div>QS conv.: {game.singlePinConversionRate}%</div>
                      <div>Open: {game.openFrames}</div>
                    </div>
                  </div>
                ))}

                {/* Summary */}
                {bowlingGames.length > 0 && (
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mt-4">
                    <div className="text-sm font-medium mb-2">Résumé de la compétition</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-xs text-muted-foreground">Parties</div>
                        <div className="text-lg font-bold">{bowlingGames.length}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Meilleur</div>
                        <div className="text-lg font-bold">{Math.max(...bowlingGames.map(g => g.score))}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Moyenne</div>
                        <div className="text-lg font-bold">
                          {Math.round(bowlingGames.reduce((sum, g) => sum + g.score, 0) / bowlingGames.length)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-lg font-bold">
                          {bowlingGames.reduce((sum, g) => sum + g.score, 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedMatch(null);
                      setBowlingGames([]);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleBowlingSubmit}
                    disabled={isSubmitting || bowlingGames.length === 0}
                  >
                    {isSubmitting ? "Enregistrement..." : "Enregistrer la compétition"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bowling Score Sheet Dialog */}
      <Dialog open={showBowlingSheet} onOpenChange={(open) => {
        setShowBowlingSheet(open);
        if (!open) setEditingGameIndex(null);
      }}>
        <DialogContent className="max-w-4xl h-[95vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>
              {editingGameIndex !== null 
                ? `Modifier la partie ${editingGameIndex + 1}` 
                : `Partie ${bowlingGames.length + 1}`}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <BowlingScoreSheet
              key={editingGameIndex !== null ? `edit-${editingGameIndex}` : `new-${bowlingGames.length}`}
              initialFrames={editingGameIndex !== null ? bowlingGames[editingGameIndex]?.frames : undefined}
              onSave={(stats, frames) => {
                const gameData: BowlingGame = {
                  gameNumber: editingGameIndex !== null ? editingGameIndex + 1 : bowlingGames.length + 1,
                  score: stats.totalScore,
                  frames: frames,
                  strikes: stats.strikes,
                  spares: stats.spares,
                  splitCount: stats.splitCount,
                  splitConverted: stats.splitConverted,
                  singlePinCount: stats.singlePinCount,
                  singlePinConverted: stats.singlePinConverted,
                  pocketCount: stats.pocketCount,
                  strikePercentage: stats.strikePercentage,
                  sparePercentage: stats.sparePercentage,
                  splitPercentage: stats.splitPercentage,
                  singlePinConversionRate: stats.singlePinConversionRate,
                  pocketPercentage: stats.pocketPercentage,
                  openFrames: stats.openFrames,
                };
                
                if (editingGameIndex !== null) {
                  setBowlingGames(prev => prev.map((g, i) => i === editingGameIndex ? gameData : g));
                  toast.success(`Partie ${gameData.gameNumber} modifiée: ${gameData.score} points`);
                } else {
                  setBowlingGames(prev => [...prev, gameData]);
                  toast.success(`Partie ${gameData.gameNumber} enregistrée: ${gameData.score} points`);
                }
                setShowBowlingSheet(false);
                setEditingGameIndex(null);
              }}
              onCancel={() => {
                setShowBowlingSheet(false);
                setEditingGameIndex(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Entry Form for non-bowling sports */}
      {selectedMatch && !isBowling && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Vos statistiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minutes">Minutes jouées</Label>
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  value={stats.minutes_played}
                  onChange={(e) => setStats(s => ({ ...s, minutes_played: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goals">Buts / Essais</Label>
                <Input
                  id="goals"
                  type="number"
                  min="0"
                  value={stats.goals}
                  onChange={(e) => setStats(s => ({ ...s, goals: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assists">Passes décisives</Label>
                <Input
                  id="assists"
                  type="number"
                  min="0"
                  value={stats.assists}
                  onChange={(e) => setStats(s => ({ ...s, assists: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yellow">Cartons jaunes</Label>
                <Input
                  id="yellow"
                  type="number"
                  min="0"
                  value={stats.yellow_cards}
                  onChange={(e) => setStats(s => ({ ...s, yellow_cards: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedMatch(null)}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Matches */}
      {completedMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              Compétitions complétées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedMatches.map((match) => (
                <div
                  key={match.id}
                  className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>
                      {format(parseISO(match.match_date), "d MMMM", { locale: fr })} - vs {match.opponent}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  async function handleBowlingSubmit() {
    if (!selectedMatch || bowlingGames.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(buildAthletePortalFunctionUrl("submit-bowling-stats", token), {
        method: "POST",
        headers: athletePortalHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          match_id: selectedMatch,
          games: bowlingGames,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Statistiques bowling enregistrées !");
        setCompletedMatchIds(prev => new Set([...prev, selectedMatch]));
        setSelectedMatch(null);
        setBowlingGames([]);
      } else {
        toast.error(data.error || "Erreur lors de l'enregistrement");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setIsSubmitting(false);
    }
  }
}
