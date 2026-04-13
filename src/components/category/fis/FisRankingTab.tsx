import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Target, Calculator, Trophy, Clock, AlertTriangle } from "lucide-react";
import { format, addWeeks, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { calculateTotalPoints, getBestResults, simulatePoints, calculateRacePenalty } from "@/lib/fis/fisPointsEngine";

interface FisRankingTabProps {
  categoryId: string;
}

export function FisRankingTab({ categoryId }: FisRankingTabProps) {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [simPosition, setSimPosition] = useState("");
  const [simLevel, setSimLevel] = useState("fis");
  const [simParticipants, setSimParticipants] = useState("30");
  const [simTopAvg, setSimTopAvg] = useState("800");

  const { data: players } = useQuery({
    queryKey: ["players-fis-ranking", categoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("players")
        .select("id, name, first_name, fis_points, fis_ranking, fis_objective, fis_objective_date")
        .eq("category_id", categoryId)
        .order("name");
      return data || [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["fis-settings", categoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fis_ranking_settings")
        .select("*")
        .eq("category_id", categoryId)
        .maybeSingle();
      return data;
    },
  });

  const topN = settings?.max_counting_results ?? 5;

  const { data: results } = useQuery({
    queryKey: ["fis-results-player", categoryId, selectedPlayer],
    queryFn: async () => {
      if (!selectedPlayer) return [];
      const { data } = await supabase
        .from("fis_results")
        .select("*, fis_competitions!fis_results_competition_id_fkey(name, competition_date, discipline, level, location)")
        .eq("category_id", categoryId)
        .eq("player_id", selectedPlayer)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedPlayer,
  });

  const player = players?.find((p) => p.id === selectedPlayer);
  const now = new Date();

  const validResults = (results || []).filter((r) => !r.expires_at || new Date(r.expires_at) > now);
  const expiredResults = (results || []).filter((r) => r.expires_at && new Date(r.expires_at) <= now);
  const bestResults = getBestResults(validResults as { fis_points: number; calculated_points?: number | null; expires_at?: string | null }[], topN);
  const totalPoints = calculateTotalPoints(validResults as { fis_points: number; calculated_points?: number | null; expires_at?: string | null }[], topN);

  // Expiring soon (next 8 weeks)
  const expiringSoon = validResults.filter((r) => {
    if (!r.expires_at) return false;
    const exp = new Date(r.expires_at);
    return exp > now && differenceInDays(exp, now) <= 56;
  });

  // Simulation
  const simPenalty = simulateRacePenalty();
  const simPoints = simPosition ? simulatePoints(Number(simPosition), simPenalty) : null;

  function simulateRacePenalty() {
    const avg = Number(simTopAvg) || 800;
    const fVal = 500; // Default F-value for freestyle
    return calculateRacePenalty({
      topRiderPoints: [avg, avg, avg, avg, avg],
      topClassifiedPoints: [avg, avg, avg, avg, avg],
      fValue: fVal,
    });
  }

  // Objective calculation
  const objective = player?.fis_objective;
  const objectiveDate = player?.fis_objective_date;
  const objectivePoints = objective ? Number(objective.match(/\d+/)?.[0]) : null;
  const pointsNeeded = objectivePoints ? Math.max(0, objectivePoints - totalPoints) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Athlète</Label>
        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Sélectionner un athlète" />
          </SelectTrigger>
          <SelectContent>
            {players?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.first_name} {p.name}
                {p.fis_points ? ` (${p.fis_points} pts)` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedPlayer ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Sélectionnez un athlète pour voir son classement FIS</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Current situation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Situation actuelle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Points totaux</span>
                <span className="text-2xl font-bold">{totalPoints.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Classement FIS</span>
                <span className="text-lg font-semibold">{player?.fis_ranking || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Résultats comptés</span>
                <span className="font-mono">{bestResults.length}/{topN}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total résultats</span>
                <span className="font-mono">{validResults.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Objective */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Objectif
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {objective ? (
                <>
                  <p className="text-sm font-medium">{objective}</p>
                  {objectiveDate && (
                    <p className="text-xs text-muted-foreground">
                      Échéance : {format(new Date(objectiveDate), "d MMMM yyyy", { locale: fr })}
                    </p>
                  )}
                  {pointsNeeded != null && pointsNeeded > 0 && (
                    <div className="bg-muted/50 rounded-md p-3 space-y-1">
                      <p className="text-sm font-semibold text-primary">
                        Il manque {pointsNeeded.toFixed(0)} points
                      </p>
                      {objectiveDate && (
                        <p className="text-xs text-muted-foreground">
                          avant le {format(new Date(objectiveDate), "d MMMM", { locale: fr })}
                        </p>
                      )}
                    </div>
                  )}
                  {pointsNeeded != null && pointsNeeded <= 0 && (
                    <Badge className="bg-primary/10 text-primary">✅ Objectif atteint !</Badge>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun objectif défini. Éditez la fiche athlète pour en ajouter un.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Expiring points */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-destructive" />
                Points expirants
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiringSoon.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun point n'expire dans les 8 prochaines semaines</p>
              ) : (
                <div className="space-y-2">
                  {expiringSoon.map((r) => {
                    const rAny = r as Record<string, unknown>;
                    const comp = rAny.fis_competitions as { name: string; competition_date: string } | null;
                    const calcPts = rAny.calculated_points as number | null;
                    return (
                      <div key={r.id} className="flex justify-between items-center text-sm">
                        <div className="min-w-0">
                          <p className="truncate text-xs">{comp?.name || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Expire le {r.expires_at ? format(new Date(r.expires_at), "d MMM yyyy", { locale: fr }) : "—"}
                          </p>
                        </div>
                        <Badge variant="destructive" className="font-mono text-xs shrink-0">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          -{(calcPts ?? r.fis_points).toFixed(0)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {selectedPlayer && (
        <>
          {/* Results history */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Historique des résultats (52 semaines)</CardTitle>
            </CardHeader>
            <CardContent>
              {validResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun résultat dans la fenêtre de 52 semaines</p>
              ) : (
                <div className="border rounded-md divide-y text-sm max-h-[300px] overflow-y-auto">
                  {validResults
                    .sort((a, b) => {
                      const aComp = (a as Record<string, unknown>).fis_competitions as { competition_date: string } | null;
                      const bComp = (b as Record<string, unknown>).fis_competitions as { competition_date: string } | null;
                      return (bComp?.competition_date || "").localeCompare(aComp?.competition_date || "");
                    })
                    .map((r) => {
                      const rAny = r as Record<string, unknown>;
                      const comp = rAny.fis_competitions as { name: string; competition_date: string; discipline: string; level: string; location: string | null } | null;
                      const calcPts = rAny.calculated_points as number | null;
                      const isCounting = bestResults.some((br) => (br as { id?: string }).id === r.id);
                      return (
                        <div key={r.id} className={`flex items-center justify-between px-3 py-2 ${isCounting ? "bg-primary/5" : ""}`}>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="font-mono text-xs w-8 text-center font-bold shrink-0">
                              {r.ranking ? `${r.ranking}e` : "-"}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium">{comp?.name || "—"}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {comp?.competition_date ? format(new Date(comp.competition_date), "d MMM yyyy", { locale: fr }) : ""}
                                {comp?.location ? ` • ${comp.location}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isCounting && (
                              <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                                Compté
                              </Badge>
                            )}
                            <Badge variant="secondary" className="font-mono">
                              {(calcPts ?? r.fis_points).toFixed(0)} pts
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
              {expiredResults.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {expiredResults.length} résultat(s) expiré(s) (non comptés)
                </p>
              )}
            </CardContent>
          </Card>

          {/* Simulation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Simulation compétition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                "Si mon athlète fait Xe → combien de points ?"
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Position</Label>
                  <Input type="number" min="1" value={simPosition} onChange={(e) => setSimPosition(e.target.value)} placeholder="Ex: 3" />
                </div>
                <div>
                  <Label className="text-xs">Niveau</Label>
                  <Select value={simLevel} onValueChange={setSimLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="world_cup">Coupe du Monde</SelectItem>
                      <SelectItem value="continental_cup">Coupe Continentale</SelectItem>
                      <SelectItem value="fis">FIS Race</SelectItem>
                      <SelectItem value="national">National</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Participants</Label>
                  <Input type="number" value={simParticipants} onChange={(e) => setSimParticipants(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Moy. top 5 (pts)</Label>
                  <Input type="number" value={simTopAvg} onChange={(e) => setSimTopAvg(e.target.value)} />
                </div>
              </div>

              {simPoints !== null && Number(simPosition) > 0 && (
                <div className="mt-4 bg-primary/5 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm">
                      En finissant <span className="font-bold">{simPosition}e</span> :
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Race Penalty: {simPenalty.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{simPoints.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">points FIS gagnés</p>
                    {pointsNeeded != null && pointsNeeded > 0 && (
                      <p className="text-xs mt-1">
                        {simPoints >= pointsNeeded ? (
                          <span className="text-primary font-medium">✅ Objectif atteint !</span>
                        ) : (
                          <span className="text-muted-foreground">
                            Reste {(pointsNeeded - simPoints).toFixed(0)} pts après
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
