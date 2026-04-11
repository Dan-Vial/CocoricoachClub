import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Trash2, Plus, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface KickingTrackerProps {
  categoryId: string;
  sportType?: string;
}

// Rugby field zones with approximate positions
const FIELD_ZONES = [
  { id: "left-22", label: "Gauche 22m", x: 15, y: 25 },
  { id: "left-40", label: "Gauche 40m", x: 15, y: 50 },
  { id: "left-halfway", label: "Gauche 50m", x: 15, y: 75 },
  { id: "center-22", label: "Centre 22m", x: 50, y: 25 },
  { id: "center-40", label: "Centre 40m", x: 50, y: 50 },
  { id: "center-halfway", label: "Centre 50m", x: 50, y: 75 },
  { id: "right-22", label: "Droite 22m", x: 85, y: 25 },
  { id: "right-40", label: "Droite 40m", x: 85, y: 50 },
  { id: "right-halfway", label: "Droite 50m", x: 85, y: 75 },
  { id: "center-10", label: "Centre 10m", x: 50, y: 12 },
  { id: "left-10", label: "Gauche 10m", x: 20, y: 12 },
  { id: "right-10", label: "Droite 10m", x: 80, y: 12 },
];

export function KickingTracker({ categoryId, sportType }: KickingTrackerProps) {
  const queryClient = useQueryClient();
  const { isViewer } = useViewerModeContext();
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [kickType, setKickType] = useState<string>("penalty");
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [minute, setMinute] = useState<string>("");
  const [half, setHalf] = useState<string>("1");

  // Fetch matches
  const { data: matches = [] } = useQuery({
    queryKey: ["matches-kicking", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, opponent, match_date, is_home")
        .eq("category_id", categoryId)
        .is("parent_match_id", null)
        .order("match_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch players
  const { data: players = [] } = useQuery({
    queryKey: ["players-kicking", categoryId],
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

  // Fetch kicking attempts
  const { data: attempts = [] } = useQuery({
    queryKey: ["kicking-attempts", categoryId, selectedMatchId, selectedPlayerId],
    queryFn: async () => {
      let query = supabase
        .from("kicking_attempts")
        .select("*, players(name, first_name), matches(opponent, match_date)")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });

      if (selectedMatchId) query = query.eq("match_id", selectedMatchId);
      if (selectedPlayerId) query = query.eq("player_id", selectedPlayerId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const addAttempt = useMutation({
    mutationFn: async (data: { x: number; y: number; success: boolean }) => {
      if (!selectedMatchId || !selectedPlayerId) throw new Error("Sélectionnez un match et un joueur");
      const zone = FIELD_ZONES.reduce((closest, z) => {
        const dist = Math.sqrt((z.x - data.x) ** 2 + (z.y - data.y) ** 2);
        const closestDist = Math.sqrt((closest.x - data.x) ** 2 + (closest.y - data.y) ** 2);
        return dist < closestDist ? z : closest;
      }, FIELD_ZONES[0]);

      const { error } = await supabase.from("kicking_attempts").insert({
        match_id: selectedMatchId,
        player_id: selectedPlayerId,
        category_id: categoryId,
        kick_type: kickType,
        zone_x: data.x,
        zone_y: data.y,
        zone_label: zone.label,
        success: data.success,
        half: parseInt(half) || 1,
        minute: minute ? parseInt(minute) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kicking-attempts"] });
      setDialogOpen(false);
      setClickPos(null);
      setMinute("");
      toast.success("Tir enregistré !");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAttempt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kicking_attempts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kicking-attempts"] });
      toast.success("Tir supprimé");
    },
  });

  // Stats
  const kickStats = useMemo(() => {
    const total = attempts.length;
    const success = attempts.filter(a => a.success).length;
    const byType: Record<string, { total: number; success: number }> = {};
    attempts.forEach(a => {
      if (!byType[a.kick_type]) byType[a.kick_type] = { total: 0, success: 0 };
      byType[a.kick_type].total++;
      if (a.success) byType[a.kick_type].success++;
    });
    return { total, success, rate: total > 0 ? Math.round((success / total) * 100) : 0, byType };
  }, [attempts]);

  const handleFieldClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isViewer || !selectedMatchId || !selectedPlayerId) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setClickPos({ x, y });
    setDialogOpen(true);
  };

  const typeLabels: Record<string, string> = {
    penalty: "Pénalité",
    conversion: "Transformation",
    drop: "Drop",
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Match</Label>
          <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Tous les matchs" /></SelectTrigger>
            <SelectContent>
              {matches.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  vs {m.opponent} — {format(new Date(m.match_date), "dd/MM/yy", { locale: fr })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Buteur</Label>
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tous les joueurs" /></SelectTrigger>
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
          <Label className="text-xs">Type de tir</Label>
          <Select value={kickType} onValueChange={setKickType}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="penalty">Pénalité</SelectItem>
              <SelectItem value="conversion">Transformation</SelectItem>
              <SelectItem value="drop">Drop</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{kickStats.rate}%</p>
            <p className="text-sm text-muted-foreground">Réussite globale</p>
            <p className="text-xs text-muted-foreground">{kickStats.success}/{kickStats.total}</p>
          </CardContent>
        </Card>
        {Object.entries(kickStats.byType).map(([type, data]) => (
          <Card key={type} className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-primary">
                {data.total > 0 ? Math.round((data.success / data.total) * 100) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">{typeLabels[type] || type}</p>
              <p className="text-xs text-muted-foreground">{data.success}/{data.total}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rugby field */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Terrain — Cliquez pour ajouter un tir
          </CardTitle>
          {!selectedMatchId && !isViewer && (
            <p className="text-xs text-muted-foreground">Sélectionnez un match et un buteur pour ajouter des tirs</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="relative w-full max-w-3xl mx-auto">
            <svg
              viewBox="0 0 600 400"
              className="w-full border-2 border-primary/20 rounded-lg cursor-crosshair bg-emerald-700/90 dark:bg-emerald-900/80"
              onClick={handleFieldClick}
            >
              {/* Field markings */}
              {/* Outline */}
              <rect x="20" y="10" width="560" height="380" fill="none" stroke="white" strokeWidth="2" opacity={0.6} />
              {/* Try lines */}
              <line x1="80" y1="10" x2="80" y2="390" stroke="white" strokeWidth="1.5" strokeDasharray="8 4" opacity={0.5} />
              <line x1="520" y1="10" x2="520" y2="390" stroke="white" strokeWidth="1.5" strokeDasharray="8 4" opacity={0.5} />
              {/* 22m lines */}
              <line x1="140" y1="10" x2="140" y2="390" stroke="white" strokeWidth="1.5" opacity={0.5} />
              <line x1="460" y1="10" x2="460" y2="390" stroke="white" strokeWidth="1.5" opacity={0.5} />
              {/* 10m lines */}
              <line x1="240" y1="10" x2="240" y2="390" stroke="white" strokeWidth="1" strokeDasharray="5 5" opacity={0.4} />
              <line x1="360" y1="10" x2="360" y2="390" stroke="white" strokeWidth="1" strokeDasharray="5 5" opacity={0.4} />
              {/* Halfway */}
              <line x1="300" y1="10" x2="300" y2="390" stroke="white" strokeWidth="2" opacity={0.6} />
              {/* Center circle */}
              <circle cx="300" cy="200" r="30" fill="none" stroke="white" strokeWidth="1" opacity={0.4} />
              {/* Goal posts */}
              <line x1="20" y1="175" x2="20" y2="225" stroke="white" strokeWidth="4" opacity={0.8} />
              <line x1="580" y1="175" x2="580" y2="225" stroke="white" strokeWidth="4" opacity={0.8} />
              {/* Labels */}
              <text x="140" y="400" textAnchor="middle" fill="white" fontSize="10" opacity={0.6}>22m</text>
              <text x="460" y="400" textAnchor="middle" fill="white" fontSize="10" opacity={0.6}>22m</text>
              <text x="300" y="400" textAnchor="middle" fill="white" fontSize="10" opacity={0.6}>50m</text>

              {/* Kicking attempts markers */}
              {attempts.map((attempt) => {
                const cx = (attempt.zone_x / 100) * 600;
                const cy = (attempt.zone_y / 100) * 400;
                return (
                  <g key={attempt.id}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={10}
                      fill={attempt.success ? "#22c55e" : "#ef4444"}
                      opacity={0.85}
                      stroke="white"
                      strokeWidth="2"
                    />
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {attempt.success ? "✓" : "✗"}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Recent kicks list */}
      {attempts.length > 0 && (
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Historique des tirs ({attempts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {attempts.slice(0, 50).map((a) => {
                const player = a.players as { name: string; first_name?: string } | null;
                const match = a.matches as { opponent: string; match_date: string } | null;
                return (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${a.success ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-medium">
                          {typeLabels[a.kick_type] || a.kick_type} — {a.zone_label || "Zone inconnue"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {player ? [player.first_name, player.name].filter(Boolean).join(" ") : ""} 
                          {match ? ` • vs ${match.opponent}` : ""}
                          {a.minute ? ` • ${a.minute}'` : ""}
                        </p>
                      </div>
                    </div>
                    {!isViewer && (
                      <Button variant="ghost" size="sm" onClick={() => deleteAttempt.mutate(a.id)}>
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

      {/* Dialog: confirm kick success/failure */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Enregistrer un tir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Mi-temps</Label>
                <Select value={half} onValueChange={setHalf}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1ère MT</SelectItem>
                    <SelectItem value="2">2ème MT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Minute</Label>
                <Input type="number" placeholder="Ex: 23" value={minute} onChange={e => setMinute(e.target.value)} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Type: <strong>{typeLabels[kickType]}</strong> — Position: ({clickPos?.x}, {clickPos?.y})
            </p>
          </div>
          <DialogFooter className="flex gap-3">
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={() => clickPos && addAttempt.mutate({ ...clickPos, success: false })}
              disabled={addAttempt.isPending}
            >
              ✗ Raté
            </Button>
            <Button
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => clickPos && addAttempt.mutate({ ...clickPos, success: true })}
              disabled={addAttempt.isPending}
            >
              ✓ Réussi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
