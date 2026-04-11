import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Target, Trash2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface PrecisionFieldTrackerProps {
  categoryId: string;
}

export function PrecisionFieldTracker({ categoryId }: PrecisionFieldTrackerProps) {
  const queryClient = useQueryClient();
  const { isViewer } = useViewerModeContext();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [exerciseType, setExerciseType] = useState<string>("Coup de pied");
  const [kickingSide, setKickingSide] = useState<"left" | "right">("right");
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attempts, setAttempts] = useState<string>("1");
  const [successes, setSuccesses] = useState<string>("0");

  const { data: players = [] } = useQuery({
    queryKey: ["players-precision-field", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["precision-field-entries", categoryId, selectedPlayerId],
    queryFn: async () => {
      let query = supabase
        .from("precision_training")
        .select("*, players(name, first_name)")
        .eq("category_id", categoryId)
        .not("zone_x", "is", null)
        .order("created_at", { ascending: false });
      if (selectedPlayerId) query = query.eq("player_id", selectedPlayerId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const addEntry = useMutation({
    mutationFn: async (data: { x: number; y: number }) => {
      if (!selectedPlayerId) throw new Error("Sélectionnez un joueur");
      const att = parseInt(attempts) || 0;
      const suc = parseInt(successes) || 0;
      if (att <= 0) throw new Error("Le nombre de tentatives doit être > 0");
      if (suc > att) throw new Error("Les réussites ne peuvent pas dépasser les tentatives");

      const yPct = data.y;
      let distLabel = "";
      if (yPct < 20) distLabel = "10m";
      else if (yPct < 40) distLabel = "22m";
      else if (yPct < 65) distLabel = "40m";
      else distLabel = "50m";

      const xPct = data.x;
      let sideLabel = "";
      if (xPct < 35) sideLabel = "Gauche";
      else if (xPct > 65) sideLabel = "Droite";
      else sideLabel = "Centre";

      const { error } = await supabase.from("precision_training").insert({
        player_id: selectedPlayerId,
        category_id: categoryId,
        exercise_label: `${exerciseType} - ${sideLabel} ${distLabel}`,
        attempts: att,
        successes: suc,
        session_date: format(new Date(), "yyyy-MM-dd"),
        zone_x: data.x,
        zone_y: data.y,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["precision-field-entries"] });
      queryClient.invalidateQueries({ queryKey: ["precision-training-stats"] });
      setDialogOpen(false);
      setClickPos(null);
      setAttempts("1");
      setSuccesses("0");
      toast.success("Exercice enregistré !");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("precision_training").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["precision-field-entries"] });
      queryClient.invalidateQueries({ queryKey: ["precision-training-stats"] });
      toast.success("Entrée supprimée");
    },
  });

  // Zone-based stats aggregation
  const zoneStats = useMemo(() => {
    const map = new Map<string, { attempts: number; successes: number; x: number; y: number }>();
    entries.forEach((e: any) => {
      if (e.zone_x == null || e.zone_y == null) return;
      // Round to nearest zone (group by ~15% increments)
      const zoneKey = `${Math.round(e.zone_x / 15) * 15}-${Math.round(e.zone_y / 15) * 15}`;
      const prev = map.get(zoneKey) || { attempts: 0, successes: 0, x: Math.round(e.zone_x / 15) * 15, y: Math.round(e.zone_y / 15) * 15 };
      prev.attempts += e.attempts || 0;
      prev.successes += e.successes || 0;
      map.set(zoneKey, prev);
    });
    return Array.from(map.values());
  }, [entries]);

  const totalAttempts = entries.reduce((s: number, e: any) => s + (e.attempts || 0), 0);
  const totalSuccesses = entries.reduce((s: number, e: any) => s + (e.successes || 0), 0);
  const globalRate = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0;

  const handleFieldClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isViewer || !selectedPlayerId) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setClickPos({ x, y });
    setAttempts("1");
    setSuccesses("0");
    setDialogOpen(true);
  };

  const goalsOnRight = kickingSide === "right";

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Joueur</Label>
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Sélectionner un joueur" /></SelectTrigger>
            <SelectContent>
              {players.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {[p.first_name, p.name].filter(Boolean).join(" ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type d'exercice</Label>
          <Select value={exerciseType} onValueChange={setExerciseType}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Coup de pied">Coup de pied</SelectItem>
              <SelectItem value="Passe au pied">Passe au pied</SelectItem>
              <SelectItem value="Chandelle">Chandelle</SelectItem>
              <SelectItem value="Jeu au pied rasant">Jeu au pied rasant</SelectItem>
              <SelectItem value="Touche">Touche</SelectItem>
              <SelectItem value="Drop">Drop</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Côté</Label>
          <div className="flex gap-2">
            <Button
              variant={kickingSide === "left" ? "default" : "outline"}
              size="sm"
              onClick={() => setKickingSide("left")}
              className="text-xs"
            >
              ← Gauche
            </Button>
            <Button
              variant={kickingSide === "right" ? "default" : "outline"}
              size="sm"
              onClick={() => setKickingSide("right")}
              className="text-xs"
            >
              Droite →
            </Button>
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{globalRate}%</p>
            <p className="text-sm text-muted-foreground">Réussite globale</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{totalSuccesses}/{totalAttempts}</p>
            <p className="text-sm text-muted-foreground">Réussites / Tentatives</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{entries.length}</p>
            <p className="text-sm text-muted-foreground">Exercices enregistrés</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive rugby field */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Terrain — Cliquez sur une zone pour enregistrer un exercice
          </CardTitle>
          {!selectedPlayerId && !isViewer && (
            <p className="text-xs text-muted-foreground">Sélectionnez un joueur pour commencer</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="relative w-full max-w-3xl mx-auto">
            <svg
              viewBox="0 0 600 400"
              className="w-full border-2 border-primary/20 rounded-lg cursor-crosshair bg-emerald-700/90 dark:bg-emerald-900/80"
              onClick={handleFieldClick}
            >
              {/* Field outline */}
              <rect x="20" y="10" width="560" height="380" fill="none" stroke="white" strokeWidth="2" opacity={0.6} />

              {goalsOnRight ? (
                <>
                  <line x1="580" y1="170" x2="580" y2="230" stroke="white" strokeWidth="5" opacity={0.9} />
                  <rect x="565" y="170" width="15" height="60" fill="none" stroke="white" strokeWidth="2" opacity={0.5} />
                  <line x1="540" y1="10" x2="540" y2="390" stroke="white" strokeWidth="2" opacity={0.6} />
                  <text x="540" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>En-but</text>
                  <line x1="440" y1="10" x2="440" y2="390" stroke="white" strokeWidth="1.5" opacity={0.5} />
                  <text x="440" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>22m</text>
                  <line x1="340" y1="10" x2="340" y2="390" stroke="white" strokeWidth="1" strokeDasharray="5 5" opacity={0.4} />
                  <text x="340" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>40m</text>
                  <line x1="240" y1="10" x2="240" y2="390" stroke="white" strokeWidth="2" opacity={0.6} />
                  <text x="240" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>50m</text>
                  <polygon points="570,200 555,190 555,210" fill="white" opacity={0.3} />
                </>
              ) : (
                <>
                  <line x1="20" y1="170" x2="20" y2="230" stroke="white" strokeWidth="5" opacity={0.9} />
                  <rect x="20" y="170" width="15" height="60" fill="none" stroke="white" strokeWidth="2" opacity={0.5} />
                  <line x1="60" y1="10" x2="60" y2="390" stroke="white" strokeWidth="2" opacity={0.6} />
                  <text x="60" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>En-but</text>
                  <line x1="160" y1="10" x2="160" y2="390" stroke="white" strokeWidth="1.5" opacity={0.5} />
                  <text x="160" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>22m</text>
                  <line x1="260" y1="10" x2="260" y2="390" stroke="white" strokeWidth="1" strokeDasharray="5 5" opacity={0.4} />
                  <text x="260" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>40m</text>
                  <line x1="360" y1="10" x2="360" y2="390" stroke="white" strokeWidth="2" opacity={0.6} />
                  <text x="360" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>50m</text>
                  <polygon points="30,200 45,190 45,210" fill="white" opacity={0.3} />
                </>
              )}

              <circle cx="300" cy="200" r="25" fill="none" stroke="white" strokeWidth="1" opacity={0.3} />

              {/* Zone stat bubbles */}
              {zoneStats.map((zone, i) => {
                const cx = (zone.x / 100) * 600;
                const cy = (zone.y / 100) * 400;
                const rate = zone.attempts > 0 ? Math.round((zone.successes / zone.attempts) * 100) : 0;
                const color = rate >= 75 ? "#22c55e" : rate >= 50 ? "#f59e0b" : "#ef4444";
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r={18} fill={color} opacity={0.7} stroke="white" strokeWidth="2" />
                    <text x={cx} y={cy - 2} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                      {rate}%
                    </text>
                    <text x={cx} y={cy + 10} textAnchor="middle" fill="white" fontSize="7" opacity={0.9}>
                      {zone.successes}/{zone.attempts}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Recent entries list */}
      {entries.length > 0 && (
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Historique ({entries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {entries.slice(0, 50).map((e: any) => {
                const player = e.players as { name: string; first_name?: string } | null;
                const rate = e.attempts > 0 ? Math.round((e.successes / e.attempts) * 100) : 0;
                const rateColor = rate >= 75 ? "text-green-600" : rate >= 50 ? "text-yellow-600" : "text-red-600";
                return (
                  <div key={e.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <div className={`text-sm font-bold ${rateColor}`}>{rate}%</div>
                      <div>
                        <p className="text-sm font-medium">{e.exercise_label}</p>
                        <p className="text-xs text-muted-foreground">
                          {player ? [player.first_name, player.name].filter(Boolean).join(" ") : ""}
                          {` • ${e.successes}/${e.attempts}`}
                          {` • ${format(new Date(e.session_date), "dd/MM/yy", { locale: fr })}`}
                        </p>
                      </div>
                    </div>
                    {!isViewer && (
                      <Button variant="ghost" size="sm" onClick={() => deleteEntry.mutate(e.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog: enter attempts & successes */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Enregistrer un exercice de précision</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Exercice: <strong>{exerciseType}</strong>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tentatives</Label>
                <Input
                  type="number"
                  min="1"
                  value={attempts}
                  onChange={e => setAttempts(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Réussites</Label>
                <Input
                  type="number"
                  min="0"
                  max={attempts}
                  value={successes}
                  onChange={e => setSuccesses(e.target.value)}
                />
              </div>
            </div>
            {parseInt(attempts) > 0 && (
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">
                  {Math.round(((parseInt(successes) || 0) / (parseInt(attempts) || 1)) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">Taux de réussite</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={() => clickPos && addEntry.mutate(clickPos)}
              disabled={addEntry.isPending}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
