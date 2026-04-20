import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Target, Calculator, Trophy, Clock, AlertTriangle, Medal, History, Plus, Trash2, MapPin, CalendarDays, Globe } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { calculateTotalPoints, getBestResults, simulatePoints, determineScale, DISCIPLINE_F_VALUES } from "@/lib/fis/fisPointsEngine";
import { calculateWsplPoints, calculateWsplRanking, WSPL_EVENT_CATEGORIES } from "@/lib/fis/wsplPointsEngine";
import { Progress } from "@/components/ui/progress";
import { AddHistoricalFisResultsDialog } from "./AddHistoricalFisResultsDialog";
import { ImportFisUrlDialog } from "./ImportFisUrlDialog";
import { toast } from "sonner";
import { getDisciplineLabel, getDisciplinesForClubSport } from "@/lib/constants/skiDisciplines";

interface FisRankingTabProps {
  categoryId: string;
}

// Short labels for snowboard freestyle disciplines
const DISCIPLINE_SHORT: Record<string, string> = {
  big_air: "BA",
  slopestyle: "SS",
  halfpipe: "HP",
  rail_event: "RE",
};

function getDisciplineShort(disc: string): string {
  return DISCIPLINE_SHORT[disc] || disc.substring(0, 2).toUpperCase();
}

// Penalty presets by competition level (approximate averages)
const LEVEL_PENALTY_PRESETS: Record<string, { topAvg: number; label: string }> = {
  world_cup: { topAvg: 900, label: "Coupe du Monde" },
  continental_cup: { topAvg: 600, label: "Coupe d'Europe" },
  fis: { topAvg: 300, label: "FIS Race" },
  national: { topAvg: 150, label: "Nationale" },
};

export function FisRankingTab({ categoryId }: FisRankingTabProps) {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [simPosition, setSimPosition] = useState("");
  const [simFValue, setSimFValue] = useState("500");
  const [simTopAvg, setSimTopAvg] = useState("800");
  const [simLevel, setSimLevel] = useState("world_cup");
  const [simDiscipline, setSimDiscipline] = useState("big_air");
  const [simTotalRiders, setSimTotalRiders] = useState("50");
  const [simWsplStars, setSimWsplStars] = useState("5");
  const [simWsplPL, setSimWsplPL] = useState("1000");
  const [historicalOpen, setHistoricalOpen] = useState(false);
  const [importUrlOpen, setImportUrlOpen] = useState(false);
  const [objectiveDialogOpen, setObjectiveDialogOpen] = useState(false);
  const [newObj, setNewObj] = useState({ label: "", points_required: "", deadline: "", location: "", discipline: "" });
  const queryClient = useQueryClient();

  const { data: categoryInfo } = useQuery({
    queryKey: ["category-sport-fis", categoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("rugby_type, clubs(sport)")
        .eq("id", categoryId)
        .single();
      return data;
    },
  });

  const clubSport = (categoryInfo as any)?.clubs?.sport as string | undefined;
  const disciplines = useMemo(() => getDisciplinesForClubSport(clubSport), [clubSport]);

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

  // Fetch custom objectives
  const { data: objectives } = useQuery({
    queryKey: ["fis-objectives", categoryId, selectedPlayer],
    queryFn: async () => {
      if (!selectedPlayer) return [];
      const { data } = await (supabase.from("fis_objectives") as any)
        .select("*")
        .eq("category_id", categoryId)
        .eq("player_id", selectedPlayer)
        .eq("is_active", true)
        .order("deadline", { ascending: true });
      return (data || []) as {
        id: string; label: string; points_required: number;
        deadline: string | null; location: string | null; is_active: boolean;
        discipline: string | null;
      }[];
    },
    enabled: !!selectedPlayer,
  });

  const addObjective = useMutation({
    mutationFn: async () => {
      if (!newObj.label || !newObj.points_required) throw new Error("Champs requis");
      const { error } = await (supabase.from("fis_objectives") as any).insert({
        player_id: selectedPlayer,
        category_id: categoryId,
        label: newObj.label,
        points_required: Number(newObj.points_required),
        deadline: newObj.deadline || null,
        location: newObj.location || null,
        discipline: newObj.discipline && newObj.discipline !== "all" ? newObj.discipline : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fis-objectives"] });
      setObjectiveDialogOpen(false);
      setNewObj({ label: "", points_required: "", deadline: "", location: "", discipline: "" });
      toast.success("Objectif ajouté");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const deleteObjective = useMutation({
    mutationFn: async (objId: string) => {
      const { error } = await (supabase.from("fis_objectives") as any).delete().eq("id", objId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fis-objectives"] });
      toast.success("Objectif supprimé");
    },
  });

  const player = players?.find((p) => p.id === selectedPlayer);
  const now = new Date();

  const validResults = (results || []).filter((r) => !r.expires_at || new Date(r.expires_at) > now);
  const expiredResults = (results || []).filter((r) => r.expires_at && new Date(r.expires_at) <= now);
  const bestResults = getBestResults(validResults as any[], topN);
  const totalPoints = calculateTotalPoints(validResults as any[], topN);

  // Group results by discipline
  const resultsByDiscipline = useMemo(() => {
    const map: Record<string, typeof validResults> = {};
    validResults.forEach((r) => {
      const rAny = r as Record<string, unknown>;
      const comp = rAny.fis_competitions as { discipline: string } | null;
      const disc = comp?.discipline || "other";
      if (!map[disc]) map[disc] = [];
      map[disc].push(r);
    });
    return map;
  }, [validResults]);

  // Calculate per-discipline totals
  const disciplineTotals = useMemo(() => {
    const totals: Record<string, { total: number; count: number; best: number }> = {};
    for (const [disc, discResults] of Object.entries(resultsByDiscipline)) {
      const pts = calculateTotalPoints(discResults as any[], topN);
      const bestRes = getBestResults(discResults as any[], topN);
      const bestPt = bestRes.length > 0 ? Math.max(...bestRes.map((r: any) => r.calculated_points ?? r.fis_points ?? 0)) : 0;
      totals[disc] = { total: pts, count: discResults.length, best: bestPt };
    }
    return totals;
  }, [resultsByDiscipline, topN]);

  // Which disciplines have results
  const activeDisciplines = useMemo(() => {
    return disciplines.filter(d => resultsByDiscipline[d.value]?.length > 0);
  }, [disciplines, resultsByDiscipline]);

  // Expiring soon (next 12 weeks warning)
  const expiringSoon = validResults.filter((r) => {
    if (!r.expires_at) return false;
    const exp = new Date(r.expires_at);
    return exp > now && differenceInDays(exp, now) <= 84;
  });

  // Auto-update simulation values when level/discipline changes
  const simScale = determineScale(simLevel, Number(simTopAvg) || undefined);
  const simPoints = simPosition ? simulatePoints(Number(simPosition), simScale, Number(simTotalRiders) || undefined) : null;
  const simNewTotal = simPoints !== null ? totalPoints + simPoints : null;
  
  // WSPL simulation
  const simWsplPoints = simPosition && simTotalRiders && simWsplPL
    ? calculateWsplPoints({
        rank: Number(simPosition),
        totalRiders: Number(simTotalRiders),
        pointLevel: Number(simWsplPL),
      })
    : null;

  // WSPL total from results
  const wsplTotal = useMemo(() => {
    const wsplResults = validResults
      .map((r) => ({ wspl_points: (r as any).wspl_points as number || 0, expires_at: r.expires_at }))
      .filter((r) => r.wspl_points > 0);
    return calculateWsplRanking(wsplResults);
  }, [validResults]);
  
  // Sim new total per discipline
  const simNewDisciplineTotal = simPoints !== null && simDiscipline
    ? (disciplineTotals[simDiscipline]?.total ?? 0) + simPoints
    : null;

  // Helper to get points for a discipline (for objectives)
  const getPointsForDiscipline = (disc: string | null) => {
    if (!disc) return totalPoints;
    return disciplineTotals[disc]?.total ?? 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
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
        {selectedPlayer && player && (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setImportUrlOpen(true)}>
              <Globe className="h-4 w-4 mr-1" />
              Import FIS URL
            </Button>
            <Button variant="outline" size="sm" onClick={() => setHistoricalOpen(true)}>
              <History className="h-4 w-4 mr-1" />
              Saisie manuelle
            </Button>
          </div>
        )}
      </div>

      {!selectedPlayer ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Sélectionnez un athlète pour voir son classement FIS + WSPL</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Per-discipline summary cards */}
          {activeDisciplines.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Global card */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">TOTAL FIS</p>
                  <p className="text-2xl font-bold">{totalPoints.toFixed(2)} pts</p>
                  <p className="text-xs text-muted-foreground">{validResults.length} résultats • Top {topN}</p>
                  {player?.fis_ranking && (
                    <p className="text-xs">Classement: <span className="font-semibold">{player.fis_ranking}e</span></p>
                  )}
                </CardContent>
              </Card>
              {/* WSPL global card */}
              <Card className="border-accent/30 bg-accent/5">
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">TOTAL WSPL</p>
                  <p className="text-2xl font-bold">{wsplTotal.toFixed(2)} pts</p>
                  <p className="text-xs text-muted-foreground">Moy. top 3 résultats</p>
                </CardContent>
              </Card>

              {/* Per discipline */}
              {activeDisciplines.map((disc) => {
                const dt = disciplineTotals[disc.value];
                if (!dt) return null;
                return (
                  <Card key={disc.value}>
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-medium">{disc.label}</p>
                        <Badge variant="outline" className="text-[10px] font-mono">{getDisciplineShort(disc.value)}</Badge>
                      </div>
                      <p className="text-xl font-bold">{dt.total.toFixed(2)} pts</p>
                      <p className="text-xs text-muted-foreground">{dt.count} résultats • Meilleur: {dt.best.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

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
                  <span className="text-2xl font-bold">{totalPoints.toFixed(2)}</span>
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

            {/* Expiring points */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-destructive" />
                  Expirations prochaines (52 sem. glissantes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expiringSoon.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun point n'expire bientôt</p>
                ) : (
                  <div className="space-y-2">
                    {expiringSoon.map((r) => {
                      const rAny = r as Record<string, unknown>;
                      const comp = rAny.fis_competitions as { name: string; discipline: string } | null;
                      const calcPts = rAny.calculated_points as number | null;
                      return (
                        <div key={r.id} className="flex justify-between items-center text-sm">
                          <div className="min-w-0">
                            <p className="truncate text-xs">{comp?.name || "—"}</p>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              {comp?.discipline && (
                                <Badge variant="outline" className="text-[8px] py-0 px-1">{getDisciplineShort(comp.discipline)}</Badge>
                              )}
                              <span>Expire le {r.expires_at ? format(new Date(r.expires_at), "d MMM yyyy", { locale: fr }) : "—"}</span>
                            </div>
                          </div>
                          <Badge variant="destructive" className="font-mono text-xs shrink-0">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            -{(calcPts ?? r.fis_points).toFixed(2)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick simulation */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  Simulation de compétition
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Level & discipline selectors */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Niveau</Label>
                    <Select value={simLevel} onValueChange={(val) => {
                      setSimLevel(val);
                      const preset = LEVEL_PENALTY_PRESETS[val];
                      if (preset) setSimTopAvg(String(preset.topAvg));
                    }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LEVEL_PENALTY_PRESETS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Discipline</Label>
                    <Select value={simDiscipline} onValueChange={(val) => {
                      setSimDiscipline(val);
                      const fVal = DISCIPLINE_F_VALUES[val] ?? 500;
                      setSimFValue(String(fVal));
                    }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplines.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">Position</Label>
                    <Input type="number" min="1" value={simPosition} onChange={(e) => setSimPosition(e.target.value)} placeholder="3" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Moy. top 5 (FIS)</Label>
                    <Input type="number" value={simTopAvg} onChange={(e) => setSimTopAvg(e.target.value)} placeholder="800" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Nb riders (F)</Label>
                    <Input type="number" min="1" value={simTotalRiders} onChange={(e) => setSimTotalRiders(e.target.value)} placeholder="50" className="h-8 text-xs" />
                  </div>
                </div>
                {/* WSPL inputs */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Catégorie WSPL</Label>
                    <Select value={simWsplStars} onValueChange={(val) => {
                      setSimWsplStars(val);
                      const cat = WSPL_EVENT_CATEGORIES.find(c => c.stars === Number(val));
                      if (cat) setSimWsplPL(String(cat.maxPL));
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WSPL_EVENT_CATEGORIES.map((c) => (
                          <SelectItem key={c.stars} value={String(c.stars)}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">PL (WSPL)</Label>
                    <Input type="number" min="50" max="1000" value={simWsplPL} onChange={(e) => setSimWsplPL(e.target.value)} placeholder="1000" className="h-8 text-xs" />
                  </div>
                </div>
                {simScale > 0 && (
                  <div className="bg-muted/50 rounded-md p-2 text-center space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">
                      Échelle FIS: <span className="font-mono font-bold text-foreground">{simScale}</span>
                    </p>
                  </div>
                )}
                {simPoints !== null && Number(simPosition) > 0 && (
                  <div className="bg-primary/5 rounded-md p-2 text-center space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {simPosition}e en {getDisciplineShort(simDiscipline)} → <span className="font-bold text-primary text-sm">{simPoints.toFixed(2)} pts FIS</span>
                    </p>
                    {simWsplPoints !== null && simWsplPoints > 0 && (
                      <p className="text-xs text-muted-foreground">
                        WSPL → <span className="font-bold text-accent-foreground text-sm">{simWsplPoints.toFixed(2)} pts</span>
                        <span className="text-[10px] ml-1">(PL={simWsplPL}, F={simTotalRiders})</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Nouveau total FIS : <span className="font-bold">{simNewTotal?.toFixed(2)} pts</span>
                    </p>
                    {simNewDisciplineTotal !== null && (
                      <p className="text-xs text-muted-foreground">
                        Total {getDisciplineShort(simDiscipline)} : <span className="font-bold">{simNewDisciplineTotal.toFixed(2)} pts</span>
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Objectives section */}
      {selectedPlayer && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Objectifs de qualification
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setObjectiveDialogOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Ajouter objectif
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!objectives?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun objectif défini. Ajoutez un objectif de compétition (ex: Championnats du Monde, JO…)
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {objectives.map((obj) => {
                  const discPoints = getPointsForDiscipline(obj.discipline);
                  const reached = discPoints >= obj.points_required;
                  const pct = Math.min(100, (discPoints / obj.points_required) * 100);
                  const missing = Math.max(0, obj.points_required - discPoints);
                  const daysLeft = obj.deadline ? differenceInDays(new Date(obj.deadline), now) : null;
                  const isUrgent = daysLeft !== null && daysLeft <= 60 && !reached;

                  return (
                    <div
                      key={obj.id}
                      className={`border rounded-lg p-3 space-y-2 transition-colors ${
                        reached
                          ? "border-green-500/40 bg-green-500/5"
                          : isUrgent
                          ? "border-red-500/40 bg-red-500/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold truncate">{obj.label}</p>
                            {obj.discipline && (
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {getDisciplineShort(obj.discipline)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            {obj.location && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5" />
                                {obj.location}
                              </span>
                            )}
                            {obj.deadline && (
                              <span className="flex items-center gap-0.5">
                                <CalendarDays className="h-2.5 w-2.5" />
                                {format(new Date(obj.deadline), "d MMM yyyy", { locale: fr })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {reached ? (
                            <Badge className="bg-green-600 text-white text-[10px]">✅ Qualifié</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-mono text-red-600 border-red-300">
                              -{missing.toFixed(2)} pts
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteObjective.mutate(obj.id)}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      <Progress
                        value={pct}
                        className={`h-2 ${reached ? "[&>div]:bg-green-600" : "[&>div]:bg-red-500"}`}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>
                          {discPoints.toFixed(2)} / {obj.points_required} pts
                          {obj.discipline && ` (${getDisciplineLabel(obj.discipline)})`}
                        </span>
                        {daysLeft !== null && daysLeft > 0 && (
                          <span className={isUrgent ? "text-red-500 font-semibold" : ""}>
                            J-{daysLeft}
                          </span>
                        )}
                      </div>

                      {/* Simulation impact */}
                      {simPoints !== null && !reached && (
                        (() => {
                          // Use discipline-specific total if objective has a matching discipline
                          const simTotal = obj.discipline && obj.discipline === simDiscipline
                            ? simNewDisciplineTotal
                            : !obj.discipline
                            ? simNewTotal
                            : null;
                          if (simTotal === null) return null;
                          return (
                            <div className="border-t pt-1">
                              {simTotal >= obj.points_required ? (
                                <p className="text-[10px] text-green-600 font-medium">
                                  🎉 Qualifié avec simulation !
                                </p>
                              ) : (
                                <p className="text-[10px] text-muted-foreground">
                                  Après simulation : encore {(obj.points_required - simTotal).toFixed(2)} pts manquants
                                </p>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results history grouped by discipline */}
      {selectedPlayer && (
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
                    const comp = rAny.fis_competitions as { name: string; competition_date: string; location: string | null; discipline: string } | null;
                    const calcPts = rAny.calculated_points as number | null;
                    const wsplPts = rAny.wspl_points as number | null;
                    const isCounting = bestResults.some((br) => (br as { id?: string }).id === r.id);
                    return (
                      <div key={r.id} className={`flex items-center justify-between px-3 py-2 ${isCounting ? "bg-primary/5" : ""}`}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="font-mono text-xs w-8 text-center font-bold shrink-0">
                            {r.ranking ? `${r.ranking}e` : "-"}
                          </span>
                          {comp?.discipline && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0">
                              {getDisciplineShort(comp.discipline)}
                            </Badge>
                          )}
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
                            <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Compté</Badge>
                          )}
                          <Badge variant="secondary" className="font-mono">
                            {(calcPts ?? r.fis_points).toFixed(2)} FIS
                          </Badge>
                          {wsplPts != null && wsplPts > 0 && (
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {wsplPts.toFixed(2)} WSPL
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
            {expiredResults.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {expiredResults.length} résultat(s) expiré(s)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add objective dialog */}
      <Dialog open={objectiveDialogOpen} onOpenChange={setObjectiveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Nouvel objectif de qualification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Compétition / Objectif *</Label>
              <Input
                value={newObj.label}
                onChange={(e) => setNewObj({ ...newObj, label: e.target.value })}
                placeholder="Ex: Championnats du Monde 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Points requis *</Label>
                <Input
                  type="number"
                  value={newObj.points_required}
                  onChange={(e) => setNewObj({ ...newObj, points_required: e.target.value })}
                  placeholder="Ex: 2000"
                />
              </div>
              <div>
                <Label>Discipline</Label>
                <Select value={newObj.discipline} onValueChange={(val) => setNewObj({ ...newObj, discipline: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes disciplines</SelectItem>
                    {disciplines.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date limite</Label>
                <Input
                  type="date"
                  value={newObj.deadline}
                  onChange={(e) => setNewObj({ ...newObj, deadline: e.target.value })}
                />
              </div>
              <div>
                <Label>Lieu</Label>
                <Input
                  value={newObj.location}
                  onChange={(e) => setNewObj({ ...newObj, location: e.target.value })}
                  placeholder="Ex: Kreischberg, Autriche"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setObjectiveDialogOpen(false)}>Annuler</Button>
              <Button onClick={() => addObjective.mutate()} disabled={!newObj.label || !newObj.points_required}>
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedPlayer && player && (
        <>
          <AddHistoricalFisResultsDialog
            open={historicalOpen}
            onOpenChange={setHistoricalOpen}
            categoryId={categoryId}
            playerId={selectedPlayer}
            playerName={`${player.first_name || ""} ${player.name}`.trim()}
          />
          <ImportFisUrlDialog
            open={importUrlOpen}
            onOpenChange={setImportUrlOpen}
            categoryId={categoryId}
            playerId={selectedPlayer}
            playerName={`${player.first_name || ""} ${player.name}`.trim()}
          />
        </>
      )}
    </div>
  );
}
