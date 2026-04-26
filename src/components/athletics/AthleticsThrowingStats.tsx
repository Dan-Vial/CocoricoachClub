import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Target, Trophy, BarChart3, Activity } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IMPLEMENT_LABELS,
  ImplementType,
  isThrowingBlock,
  getWeightOptions,
} from "@/lib/constants/athleticsImplements";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface Props {
  categoryId: string;
}

interface ThrowingAttempt {
  id: string;
  training_session_id: string;
  block_id: string | null;
  player_id: string;
  category_id: string;
  session_date: string;
  implement: string;
  implement_weight_g: number | null;
  attempt_number: number;
  distance_m: number | null;
  is_valid: boolean;
  notes: string | null;
  players?: { id: string; name: string; first_name: string | null } | null;
}

const formatWeight = (g: number | null) => {
  if (g == null) return "—";
  if (g >= 1000) return `${(g / 1000).toString().replace(/\.0$/, "")} kg`;
  return `${g} g`;
};

export function AthleticsThrowingStats({ categoryId }: Props) {
  const qc = useQueryClient();
  const [filterPlayer, setFilterPlayer] = useState<string>("all");
  const [filterImplement, setFilterImplement] = useState<string>("all");
  const [filterWeight, setFilterWeight] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all throwing attempts
  const { data: attempts = [] } = useQuery({
    queryKey: ["throwing-attempts", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletics_throwing_attempts")
        .select("*, players(id, name, first_name)")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false })
        .order("attempt_number", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ThrowingAttempt[];
    },
  });

  // Fetch players in this category
  const { data: players = [] } = useQuery({
    queryKey: ["category-players-throwing", categoryId],
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

  // Fetch throwing-related blocks (sessions with implement set)
  const { data: throwingBlocks = [] } = useQuery({
    queryKey: ["throwing-blocks", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_session_blocks")
        .select(
          "id, training_type, throwing_implement, implement_weight_g, training_session_id, training_sessions!inner(id, session_date, name, category_id)"
        )
        .eq("training_sessions.category_id", categoryId)
        .not("throwing_implement", "is", null)
        .order("training_sessions(session_date)", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Filter
  const filtered = useMemo(() => {
    return attempts.filter((a) => {
      if (filterPlayer !== "all" && a.player_id !== filterPlayer) return false;
      if (filterImplement !== "all" && a.implement !== filterImplement) return false;
      if (filterWeight !== "all" && String(a.implement_weight_g) !== filterWeight) return false;
      return true;
    });
  }, [attempts, filterPlayer, filterImplement, filterWeight]);

  // KPI: best throw, average, total attempts
  const kpis = useMemo(() => {
    const valid = filtered.filter((a) => a.is_valid && a.distance_m != null);
    const best = valid.reduce((m, a) => Math.max(m, Number(a.distance_m) || 0), 0);
    const avg =
      valid.length > 0
        ? valid.reduce((s, a) => s + Number(a.distance_m || 0), 0) / valid.length
        : 0;
    return {
      total: filtered.length,
      validCount: valid.length,
      best,
      avg,
    };
  }, [filtered]);

  // Evolution chart: best per session_date per player
  const evolutionData = useMemo(() => {
    const byDate: Record<string, Record<string, number>> = {};
    filtered.forEach((a) => {
      if (!a.is_valid || a.distance_m == null) return;
      const d = a.session_date;
      const playerName = a.players
        ? [a.players.first_name, a.players.name].filter(Boolean).join(" ")
        : "?";
      if (!byDate[d]) byDate[d] = {};
      byDate[d][playerName] = Math.max(
        byDate[d][playerName] || 0,
        Number(a.distance_m)
      );
    });
    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, vals]) => ({
        date: format(new Date(date), "dd/MM/yy", { locale: fr }),
        ...vals,
      }));
  }, [filtered]);

  const playerNames = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((a) => {
      if (a.players) set.add([a.players.first_name, a.players.name].filter(Boolean).join(" "));
    });
    return Array.from(set);
  }, [filtered]);

  // Comparison by implement: best per athlete per implement
  const comparisonData = useMemo(() => {
    const map: Record<string, { player: string; [key: string]: any }> = {};
    filtered.forEach((a) => {
      if (!a.is_valid || a.distance_m == null) return;
      const playerName = a.players
        ? [a.players.first_name, a.players.name].filter(Boolean).join(" ")
        : "?";
      const key = `${a.implement}-${a.implement_weight_g}`;
      const label = `${IMPLEMENT_LABELS[a.implement as ImplementType] || a.implement} ${formatWeight(a.implement_weight_g)}`;
      if (!map[playerName]) map[playerName] = { player: playerName };
      map[playerName][label] = Math.max(
        Number(map[playerName][label] || 0),
        Number(a.distance_m)
      );
    });
    return Object.values(map);
  }, [filtered]);

  const implementKeys = useMemo(() => {
    const s = new Set<string>();
    comparisonData.forEach((row: any) =>
      Object.keys(row)
        .filter((k) => k !== "player")
        .forEach((k) => s.add(k))
    );
    return Array.from(s);
  }, [comparisonData]);

  // Available weights for filter
  const availableWeights = useMemo(() => {
    const s = new Set<number>();
    attempts.forEach((a) => {
      if (a.implement_weight_g != null) s.add(a.implement_weight_g);
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [attempts]);

  // Delete
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("athletics_throwing_attempts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["throwing-attempts", categoryId] });
      toast.success("Essai supprimé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Stats entraînement — Lancers</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Saisir des essais
            </Button>
          </DialogTrigger>
          <ThrowingAttemptDialog
            categoryId={categoryId}
            players={players}
            blocks={throwingBlocks as any[]}
            onClose={() => setDialogOpen(false)}
          />
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Athlète</Label>
            <Select value={filterPlayer} onValueChange={setFilterPlayer}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {players.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {[p.first_name, p.name].filter(Boolean).join(" ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Engin</Label>
            <Select value={filterImplement} onValueChange={setFilterImplement}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(IMPLEMENT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Poids</Label>
            <Select value={filterWeight} onValueChange={setFilterWeight}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {availableWeights.map((w) => (
                  <SelectItem key={w} value={String(w)}>{formatWeight(w)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Activity className="h-4 w-4" />} label="Essais" value={String(kpis.total)} />
        <KpiCard icon={<Target className="h-4 w-4" />} label="Essais valides" value={String(kpis.validCount)} />
        <KpiCard icon={<Trophy className="h-4 w-4 text-yellow-500" />} label="Meilleur lancer" value={kpis.best > 0 ? `${kpis.best.toFixed(2)} m` : "—"} />
        <KpiCard icon={<BarChart3 className="h-4 w-4" />} label="Moyenne" value={kpis.avg > 0 ? `${kpis.avg.toFixed(2)} m` : "—"} />
      </div>

      {/* Evolution chart */}
      {evolutionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution du meilleur lancer par séance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: "Distance (m)", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                {playerNames.map((p, i) => (
                  <Line key={p} type="monotone" dataKey={p} stroke={COLORS[i % COLORS.length]} strokeWidth={2} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Comparison by implement */}
      {comparisonData.length > 0 && implementKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparaison par engin / poids (meilleur lancer)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="player" />
                <YAxis label={{ value: "Distance (m)", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                {implementKeys.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table of attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail des essais</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun essai enregistré. Cliquez sur « Saisir des essais » pour commencer.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Athlète</TableHead>
                    <TableHead>Engin</TableHead>
                    <TableHead>Poids</TableHead>
                    <TableHead>N° essai</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{format(new Date(a.session_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        {a.players ? [a.players.first_name, a.players.name].filter(Boolean).join(" ") : "—"}
                      </TableCell>
                      <TableCell>{IMPLEMENT_LABELS[a.implement as ImplementType] || a.implement}</TableCell>
                      <TableCell>{formatWeight(a.implement_weight_g)}</TableCell>
                      <TableCell>#{a.attempt_number}</TableCell>
                      <TableCell className="font-semibold">
                        {a.distance_m != null ? `${Number(a.distance_m).toFixed(2)} m` : "—"}
                      </TableCell>
                      <TableCell>
                        {a.is_valid ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">Valide</Badge>
                        ) : (
                          <Badge variant="destructive">Mordu/Nul</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Supprimer cet essai ?")) deleteMut.mutate(a.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

// ============= Dialog de saisie =============
interface DialogProps {
  categoryId: string;
  players: any[];
  blocks: any[];
  onClose: () => void;
}

function ThrowingAttemptDialog({ categoryId, players, blocks, onClose }: DialogProps) {
  const qc = useQueryClient();
  const [playerId, setPlayerId] = useState("");
  const [blockId, setBlockId] = useState<string>("");
  const [implement, setImplement] = useState<ImplementType | "">("");
  const [weightG, setWeightG] = useState<string>("");
  const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [attempts, setAttempts] = useState<{ distance: string; valid: boolean }[]>([
    { distance: "", valid: true },
  ]);

  // When user picks a block from existing throwing sessions, auto-fill
  const onSelectBlock = (id: string) => {
    setBlockId(id);
    if (id === "new") return;
    const b = blocks.find((x) => x.id === id);
    if (b) {
      setImplement((b.throwing_implement as ImplementType) || "");
      setWeightG(b.implement_weight_g ? String(b.implement_weight_g) : "");
      if (b.training_sessions?.session_date) {
        setSessionDate(b.training_sessions.session_date);
      }
    }
  };

  const weightOptions = useMemo(() => {
    if (!implement) return [];
    const all = getWeightOptions(implement as ImplementType, null, "ALL");
    const grouped: Record<number, string[]> = {};
    all.forEach((w) => {
      if (!grouped[w.weight_g]) grouped[w.weight_g] = [];
      grouped[w.weight_g].push(`${w.age} ${w.gender}`);
    });
    return Object.entries(grouped).map(([g, cats]) => ({
      weight_g: Number(g),
      label: `${formatWeight(Number(g))} — ${cats.join(", ")}`,
    }));
  }, [implement]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!playerId || !implement) throw new Error("Athlète et engin requis");
      const validAttempts = attempts.filter((a) => a.distance.trim() !== "" || !a.valid);
      if (validAttempts.length === 0) throw new Error("Au moins un essai requis");

      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) throw new Error("Vous devez être connecté");

      // Resolve session + block
      let resolvedSessionId: string | null = null;
      let resolvedBlockId: string | null = null;

      if (blockId && blockId !== "new") {
        const b = blocks.find((x) => x.id === blockId);
        resolvedSessionId = b?.training_session_id || null;
        resolvedBlockId = blockId;
      }

      // If no block selected, create a quick "lancers" session + block on the fly
      if (!resolvedSessionId) {
        const { data: newSession, error: sessErr } = await supabase
          .from("training_sessions")
          .insert({
            category_id: categoryId,
            session_date: sessionDate,
            training_type: "athle_lancers_technique" as any,
            notes: "[Séance lancers — saisie staff]",
          })
          .select("id")
          .single();
        if (sessErr) throw sessErr;
        resolvedSessionId = newSession.id;

        const { data: newBlock, error: blockErr } = await supabase
          .from("training_session_blocks")
          .insert({
            training_session_id: resolvedSessionId,
            block_order: 0,
            training_type: "athle_lancers_technique" as any,
            throwing_implement: implement,
            implement_weight_g: weightG ? Number(weightG) : null,
          })
          .select("id")
          .single();
        if (blockErr) throw blockErr;
        resolvedBlockId = newBlock.id;
      }

      const rows = validAttempts.map((a, idx) => ({
        category_id: categoryId,
        player_id: playerId,
        training_session_id: resolvedSessionId!,
        block_id: resolvedBlockId,
        session_date: sessionDate,
        implement,
        implement_weight_g: weightG ? Number(weightG) : null,
        attempt_number: idx + 1,
        distance_m: a.distance ? Number(a.distance) : null,
        is_valid: a.valid,
        created_by: userId,
      }));

      const { error } = await supabase.from("athletics_throwing_attempts").insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["throwing-attempts", categoryId] });
      qc.invalidateQueries({ queryKey: ["throwing-blocks", categoryId] });
      toast.success("Essais enregistrés");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Saisir des essais de lancer</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Athlète *</Label>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {players.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {[p.first_name, p.name].filter(Boolean).join(" ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Séance / bloc de lancers</Label>
            <Select value={blockId || "new"} onValueChange={onSelectBlock}>
              <SelectTrigger>
                <SelectValue placeholder="Nouvelle séance rapide" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  ➕ Nouvelle séance de lancers (rapide)
                </SelectItem>
                {blocks.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {format(new Date(b.training_sessions?.session_date), "dd/MM/yy")} —{" "}
                    {IMPLEMENT_LABELS[b.throwing_implement as ImplementType] || b.throwing_implement} {formatWeight(b.implement_weight_g)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Laissez sur "Nouvelle séance" pour créer une session rapide à la date choisie.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
          </div>
          <div>
            <Label>Engin *</Label>
            <Select value={implement} onValueChange={(v) => { setImplement(v as ImplementType); setWeightG(""); }}>
              <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(IMPLEMENT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Poids du matériel</Label>
            <Select value={weightG} onValueChange={setWeightG} disabled={!implement}>
              <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
              <SelectContent>
                {weightOptions.map((w) => (
                  <SelectItem key={w.weight_g} value={String(w.weight_g)}>{w.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Essais</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAttempts([...attempts, { distance: "", valid: true }])}
            >
              <Plus className="h-3 w-3 mr-1" /> Ajouter un essai
            </Button>
          </div>
          <div className="space-y-2">
            {attempts.map((a, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs w-12 text-muted-foreground">Essai {idx + 1}</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Distance (m)"
                  value={a.distance}
                  onChange={(e) => {
                    const c = [...attempts];
                    c[idx].distance = e.target.value;
                    setAttempts(c);
                  }}
                  className="flex-1"
                />
                <Select
                  value={a.valid ? "valid" : "nul"}
                  onValueChange={(v) => {
                    const c = [...attempts];
                    c[idx].valid = v === "valid";
                    setAttempts(c);
                  }}
                >
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="valid">Valide</SelectItem>
                    <SelectItem value="nul">Mordu/Nul</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setAttempts(attempts.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
