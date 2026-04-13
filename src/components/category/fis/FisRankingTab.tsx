import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Target, Calculator, Trophy, Clock, AlertTriangle, Medal, Flag, History } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { calculateTotalPoints, getBestResults, simulatePoints, calculateRacePenalty, DISCIPLINE_F_VALUES } from "@/lib/fis/fisPointsEngine";
import { Progress } from "@/components/ui/progress";
import { AddHistoricalFisResultsDialog } from "./AddHistoricalFisResultsDialog";

interface FisRankingTabProps {
  categoryId: string;
}

/** Well-known qualification thresholds */
const QUALIFICATION_TARGETS = [
  { label: "Jeux Olympiques (JO)", icon: "🏅", pointsRequired: 500, description: "Top 24 mondial requis" },
  { label: "Championnats du Monde", icon: "🌍", pointsRequired: 300, description: "Top 30 mondial requis" },
  { label: "Coupe du Monde", icon: "🏆", pointsRequired: 150, description: "Quota national + classement FIS" },
  { label: "Coupe d'Europe", icon: "🇪🇺", pointsRequired: 50, description: "Classement FIS continental" },
];

export function FisRankingTab({ categoryId }: FisRankingTabProps) {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [simPosition, setSimPosition] = useState("");
  const [simFValue, setSimFValue] = useState("500");
  const [simTopAvg, setSimTopAvg] = useState("800");
  const [historicalOpen, setHistoricalOpen] = useState(false);

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
  const simFVal = Number(simFValue) || 500;
  const simPenalty = (() => {
    const avg = Number(simTopAvg) || 800;
    return calculateRacePenalty({
      topRiderPoints: [avg, avg, avg, avg, avg],
      topClassifiedPoints: [avg, avg, avg, avg, avg],
      fValue: simFVal,
    });
  })();
  const simPoints = simPosition ? simulatePoints(Number(simPosition), simPenalty) : null;

  // Objective calculation
  const objective = player?.fis_objective;
  const objectiveDate = player?.fis_objective_date;
  const objectivePoints = objective ? Number(objective.match(/\d+/)?.[0]) : null;
  const pointsNeeded = objectivePoints ? Math.max(0, objectivePoints - totalPoints) : null;

  // New total if simulation is applied
  const simNewTotal = simPoints !== null ? totalPoints + simPoints : null;

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
                  {pointsNeeded != null && objectivePoints != null && (
                    <>
                      <Progress value={Math.min(100, (totalPoints / objectivePoints) * 100)} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {totalPoints.toFixed(0)} / {objectivePoints} pts ({Math.min(100, (totalPoints / objectivePoints) * 100).toFixed(0)}%)
                      </p>
                    </>
                  )}
                  {pointsNeeded != null && pointsNeeded > 0 && (
                    <div className="bg-muted/50 rounded-md p-3 space-y-1">
                      <p className="text-sm font-semibold text-primary">
                        Il manque {pointsNeeded.toFixed(0)} points
                      </p>
                      {objectiveDate && (
                        <p className="text-xs text-muted-foreground">
                          avant le {format(new Date(objectiveDate), "d MMMM yyyy", { locale: fr })}
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
          {/* Qualification tracker */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Medal className="h-4 w-4 text-primary" />
                Seuils de qualification estimés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Estimation basée sur les seuils FIS habituels (peuvent varier selon la saison et la fédération nationale)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUALIFICATION_TARGETS.map((target) => {
                  const reached = totalPoints >= target.pointsRequired;
                  const pct = Math.min(100, (totalPoints / target.pointsRequired) * 100);
                  const missing = Math.max(0, target.pointsRequired - totalPoints);
                  return (
                    <div key={target.label} className={`border rounded-lg p-3 space-y-2 ${reached ? "border-primary/30 bg-primary/5" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{target.icon} {target.label}</span>
                        {reached ? (
                          <Badge variant="default" className="text-xs">✅ Qualifié</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-mono">-{missing.toFixed(0)} pts</Badge>
                        )}
                      </div>
                      <Progress value={pct} className="h-1.5" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{totalPoints.toFixed(0)} / {target.pointsRequired} pts</span>
                        <span>{target.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

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
                Formule réelle : Points = Race Points (table) − Race Penalty • P = (A + B − C) / 10 + F
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Position visée</Label>
                  <Input type="number" min="1" value={simPosition} onChange={(e) => setSimPosition(e.target.value)} placeholder="Ex: 3" />
                </div>
                <div>
                  <Label className="text-xs">Moy. pts top 5</Label>
                  <Input type="number" value={simTopAvg} onChange={(e) => setSimTopAvg(e.target.value)} placeholder="800" />
                </div>
                <div>
                  <Label className="text-xs">F-value discipline</Label>
                  <Input type="number" value={simFValue} onChange={(e) => setSimFValue(e.target.value)} placeholder="500" />
                </div>
              </div>

              {simPoints !== null && Number(simPosition) > 0 && (
                <div className="mt-4 bg-primary/5 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">
                        En finissant <span className="font-bold">{simPosition}e</span> :
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Race Penalty: {simPenalty.toFixed(2)} (F={simFVal})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{simPoints.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">points FIS gagnés</p>
                    </div>
                  </div>

                  {/* Impact on qualification targets */}
                  {simNewTotal !== null && (
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Nouveau total projeté : <span className="font-bold">{simNewTotal.toFixed(0)} pts</span>
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {QUALIFICATION_TARGETS.map((target) => {
                          const wasReached = totalPoints >= target.pointsRequired;
                          const wouldReach = simNewTotal >= target.pointsRequired;
                          const newlyReached = !wasReached && wouldReach;
                          return (
                            <div key={target.label} className="flex items-center justify-between text-xs">
                              <span>{target.icon} {target.label.split(" (")[0]}</span>
                              {newlyReached ? (
                                <Badge variant="default" className="text-[10px]">🎉 Qualifié !</Badge>
                              ) : wouldReach ? (
                                <Badge variant="outline" className="text-[10px] text-primary">✅</Badge>
                              ) : (
                                <span className="text-muted-foreground font-mono">
                                  -{(target.pointsRequired - simNewTotal).toFixed(0)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {pointsNeeded != null && pointsNeeded > 0 && (
                    <div className="border-t pt-2">
                      {simPoints >= pointsNeeded ? (
                        <p className="text-xs text-primary font-medium">✅ Objectif personnel atteint !</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Reste {(pointsNeeded - simPoints).toFixed(0)} pts pour l'objectif personnel
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
