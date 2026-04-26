import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Timer, Trophy, BarChart3, Activity, Wind } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  SPRINT_EXERCISE_TYPES,
  START_TYPES,
  LOAD_TYPES,
  SPRINT_DISTANCES,
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

interface SprintAttempt {
  id: string;
  training_session_id: string;
  block_id: string | null;
  player_id: string;
  category_id: string;
  session_date: string;
  exercise_type: string;
  attempt_number: number;
  distance_m: number;
  time_seconds: number | null;
  start_type: string | null;
  load_type: string | null;
  load_kg: number | null;
  wind_ms: number | null;
  vmax_ms: number | null;
  is_valid: boolean;
  notes: string | null;
  players?: { id: string; name: string; first_name: string | null } | null;
}

const exerciseLabel = (v: string) =>
  SPRINT_EXERCISE_TYPES.find((e) => e.value === v)?.label || v;
const startLabel = (v?: string | null) =>
  v ? START_TYPES.find((s) => s.value === v)?.label || v : "—";
const loadLabel = (v?: string | null) =>
  v ? LOAD_TYPES.find((s) => s.value === v)?.label || v : "—";

const formatTime = (sec?: number | null) => {
  if (sec == null) return "—";
  if (sec < 60) return `${Number(sec).toFixed(2)}"`;
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(2);
  return `${m}'${s.padStart(5, "0")}"`;
};

export function AthleticsSprintStats({ categoryId }: Props) {
  const qc = useQueryClient();
  const [filterPlayer, setFilterPlayer] = useState<string>("all");
  const [filterExercise, setFilterExercise] = useState<string>("all");
  const [filterDistance, setFilterDistance] = useState<string>("all");
  const [filterLoad, setFilterLoad] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: attempts = [] } = useQuery({
    queryKey: ["sprint-attempts", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletics_sprint_attempts" as any)
        .select("*, players(id, name, first_name)")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false })
        .order("attempt_number", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as SprintAttempt[];
    },
  });

  const { data: players = [] } = useQuery({
    queryKey: ["category-players-sprint", categoryId],
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

  const { data: sprintBlocks = [] } = useQuery({
    queryKey: ["sprint-blocks", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_session_blocks")
        .select(
          "id, training_type, training_session_id, training_sessions!inner(id, session_date, category_id)",
        )
        .eq("training_sessions.category_id", categoryId)
        .in("training_type", [
          "athle_vitesse",
          "athle_departs",
          "athle_acceleration",
          "athle_vitesse_max",
          "athle_endurance_vitesse",
          "athle_haies",
          "athle_rythme_haies",
          "athle_haies_technique",
          "athle_fartlek",
          "athle_fractionne",
          "athle_seuil",
          "athle_vma",
          "athle_cotes",
          "athle_course_elan",
          "athle_tempo_run",
        ] as any)
        .order("training_sessions(session_date)", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return attempts.filter((a) => {
      if (filterPlayer !== "all" && a.player_id !== filterPlayer) return false;
      if (filterExercise !== "all" && a.exercise_type !== filterExercise) return false;
      if (filterDistance !== "all" && String(a.distance_m) !== filterDistance) return false;
      if (filterLoad !== "all" && (a.load_type || "aucun") !== filterLoad) return false;
      return true;
    });
  }, [attempts, filterPlayer, filterExercise, filterDistance, filterLoad]);

  const kpis = useMemo(() => {
    const valid = filtered.filter((a) => a.is_valid && a.time_seconds != null);
    const bestTime = valid.reduce(
      (m, a) => (a.time_seconds! < m ? a.time_seconds! : m),
      Number.POSITIVE_INFINITY,
    );
    const bestVmax = valid.reduce(
      (m, a) => Math.max(m, a.vmax_ms || 0),
      0,
    );
    const avgVmax =
      valid.length > 0
        ? valid.reduce((s, a) => s + (a.vmax_ms || 0), 0) / valid.length
        : 0;
    return {
      total: filtered.length,
      validCount: valid.length,
      bestTime: bestTime === Number.POSITIVE_INFINITY ? null : bestTime,
      bestVmax,
      avgVmax,
    };
  }, [filtered]);

  // Evolution: meilleur temps par séance par athlète (filtré sur distance/exercice si filtré)
  const evolutionData = useMemo(() => {
    const byDate: Record<string, Record<string, number>> = {};
    filtered.forEach((a) => {
      if (!a.is_valid || a.time_seconds == null) return;
      const d = a.session_date;
      const playerName = a.players
        ? [a.players.first_name, a.players.name].filter(Boolean).join(" ")
        : "?";
      if (!byDate[d]) byDate[d] = {};
      const cur = byDate[d][playerName];
      // garder le meilleur (plus petit) temps
      if (cur === undefined || a.time_seconds < cur) {
        byDate[d][playerName] = a.time_seconds;
      }
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

  // Comparaison Vmax par athlète selon lestage
  const vmaxComparison = useMemo(() => {
    const map: Record<string, { player: string; [k: string]: any }> = {};
    filtered.forEach((a) => {
      if (!a.is_valid || a.vmax_ms == null) return;
      const playerName = a.players
        ? [a.players.first_name, a.players.name].filter(Boolean).join(" ")
        : "?";
      const loadKey = loadLabel(a.load_type) + (a.load_kg ? ` (${a.load_kg}kg)` : "");
      if (!map[playerName]) map[playerName] = { player: playerName };
      map[playerName][loadKey] = Math.max(
        Number(map[playerName][loadKey] || 0),
        a.vmax_ms,
      );
    });
    return Object.values(map);
  }, [filtered]);

  const loadKeys = useMemo(() => {
    const s = new Set<string>();
    vmaxComparison.forEach((row: any) =>
      Object.keys(row)
        .filter((k) => k !== "player")
        .forEach((k) => s.add(k)),
    );
    return Array.from(s);
  }, [vmaxComparison]);

  const availableDistances = useMemo(() => {
    const s = new Set<number>();
    attempts.forEach((a) => s.add(a.distance_m));
    return Array.from(s).sort((a, b) => a - b);
  }, [attempts]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("athletics_sprint_attempts" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprint-attempts", categoryId] });
      toast.success("Essai supprimé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--secondary))",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Stats entraînement — Vitesse / Course</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Saisir des temps
            </Button>
          </DialogTrigger>
          <SprintAttemptDialog
            categoryId={categoryId}
            players={players}
            blocks={sprintBlocks as any[]}
            onClose={() => setDialogOpen(false)}
          />
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
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
            <Label className="text-xs">Type</Label>
            <Select value={filterExercise} onValueChange={setFilterExercise}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {SPRINT_EXERCISE_TYPES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Distance</Label>
            <Select value={filterDistance} onValueChange={setFilterDistance}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {availableDistances.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} m</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Lestage</Label>
            <Select value={filterLoad} onValueChange={setFilterLoad}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {LOAD_TYPES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Activity className="h-4 w-4" />} label="Essais" value={String(kpis.total)} />
        <KpiCard
          icon={<Trophy className="h-4 w-4 text-yellow-500" />}
          label="Meilleur temps"
          value={kpis.bestTime != null ? formatTime(kpis.bestTime) : "—"}
        />
        <KpiCard
          icon={<Timer className="h-4 w-4" />}
          label="Vmax"
          value={kpis.bestVmax > 0 ? `${kpis.bestVmax.toFixed(2)} m/s` : "—"}
        />
        <KpiCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Vmax moyenne"
          value={kpis.avgVmax > 0 ? `${kpis.avgVmax.toFixed(2)} m/s` : "—"}
        />
      </div>

      {/* Evolution chart */}
      {evolutionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Évolution du meilleur temps par séance
              {filterDistance !== "all" && ` (${filterDistance} m)`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: "Temps (s)", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                {playerNames.map((p, i) => (
                  <Line
                    key={p}
                    type="monotone"
                    dataKey={p}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Vmax comparison */}
      {vmaxComparison.length > 0 && loadKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vmax (m/s) par lestage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vmaxComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="player" />
                <YAxis label={{ value: "Vmax (m/s)", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                {loadKeys.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail des essais</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun essai enregistré. Cliquez sur « Saisir des temps » pour commencer.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Athlète</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Temps</TableHead>
                    <TableHead>Vmax</TableHead>
                    <TableHead>Départ</TableHead>
                    <TableHead>Lestage</TableHead>
                    <TableHead>Vent</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">
                        {format(new Date(a.session_date), "dd/MM/yy")}
                      </TableCell>
                      <TableCell>
                        {a.players
                          ? [a.players.first_name, a.players.name].filter(Boolean).join(" ")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{exerciseLabel(a.exercise_type)}</TableCell>
                      <TableCell>{a.distance_m} m</TableCell>
                      <TableCell className="font-semibold">{formatTime(a.time_seconds)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {a.vmax_ms != null ? `${a.vmax_ms.toFixed(2)} m/s` : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{startLabel(a.start_type)}</TableCell>
                      <TableCell className="text-xs">
                        {loadLabel(a.load_type)}
                        {a.load_kg ? ` (${a.load_kg}kg)` : ""}
                      </TableCell>
                      <TableCell className="text-xs">
                        {a.wind_ms != null ? (
                          <span className="inline-flex items-center gap-1">
                            <Wind className="h-3 w-3" />
                            {a.wind_ms > 0 ? "+" : ""}
                            {a.wind_ms} m/s
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!a.is_valid && <Badge variant="destructive">Nul</Badge>}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Supprimer cet essai ?")) deleteMut.mutate(a.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

function SprintAttemptDialog({ categoryId, players, blocks, onClose }: DialogProps) {
  const qc = useQueryClient();
  const [playerId, setPlayerId] = useState("");
  const [blockId, setBlockId] = useState<string>("new");
  const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [exerciseType, setExerciseType] = useState<string>("sprint");
  const [distance, setDistance] = useState<string>("60");
  const [startType, setStartType] = useState<string>("blocs");
  const [loadType, setLoadType] = useState<string>("aucun");
  const [loadKg, setLoadKg] = useState<string>("");
  const [windMs, setWindMs] = useState<string>("");
  const [attempts, setAttempts] = useState<{ time: string; valid: boolean }[]>([
    { time: "", valid: true },
  ]);

  const onSelectBlock = (id: string) => {
    setBlockId(id);
    if (id === "new") return;
    const b = blocks.find((x) => x.id === id);
    if (b?.training_sessions?.session_date) {
      setSessionDate(b.training_sessions.session_date);
    }
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!playerId) throw new Error("Athlète requis");
      if (!distance || Number(distance) <= 0) throw new Error("Distance requise");
      const validAttempts = attempts.filter((a) => a.time.trim() !== "" || !a.valid);
      if (validAttempts.length === 0) throw new Error("Au moins un essai requis");

      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) throw new Error("Vous devez être connecté");

      let resolvedSessionId: string | null = null;
      let resolvedBlockId: string | null = null;

      if (blockId && blockId !== "new") {
        const b = blocks.find((x) => x.id === blockId);
        resolvedSessionId = b?.training_session_id || null;
        resolvedBlockId = blockId;
      }

      // Crée séance + bloc à la volée si rien sélectionné
      if (!resolvedSessionId) {
        const { data: newSession, error: sessErr } = await supabase
          .from("training_sessions")
          .insert({
            category_id: categoryId,
            session_date: sessionDate,
            training_type: "athle_vitesse" as any,
            notes: "[Séance vitesse — saisie staff]",
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
            training_type: "athle_vitesse" as any,
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
        exercise_type: exerciseType,
        attempt_number: idx + 1,
        distance_m: Number(distance),
        time_seconds: a.time ? Number(a.time) : null,
        start_type: startType || null,
        load_type: loadType || "aucun",
        load_kg: loadKg ? Number(loadKg) : null,
        wind_ms: windMs ? Number(windMs) : null,
        is_valid: a.valid,
        created_by: userId,
      }));

      const { error } = await supabase
        .from("athletics_sprint_attempts" as any)
        .insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprint-attempts", categoryId] });
      qc.invalidateQueries({ queryKey: ["sprint-blocks", categoryId] });
      toast.success("Essais enregistrés");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Vmax preview
  const vmaxPreview = useMemo(() => {
    const d = Number(distance);
    return attempts
      .filter((a) => a.time && Number(a.time) > 0 && d > 0)
      .map((a) => (d / Number(a.time)).toFixed(2));
  }, [attempts, distance]);

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Saisir des temps de course</DialogTitle>
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
            <Label>Séance / bloc</Label>
            <Select value={blockId} onValueChange={onSelectBlock}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">➕ Nouvelle séance vitesse (rapide)</SelectItem>
                {blocks.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {format(new Date(b.training_sessions?.session_date), "dd/MM/yy")} — {b.training_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
          </div>
          <div>
            <Label>Type d'exercice *</Label>
            <Select value={exerciseType} onValueChange={setExerciseType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPRINT_EXERCISE_TYPES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Distance (m) *</Label>
            <Select value={distance} onValueChange={setDistance}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPRINT_DISTANCES.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} m</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <Label>Départ</Label>
            <Select value={startType} onValueChange={setStartType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {START_TYPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lestage</Label>
            <Select value={loadType} onValueChange={setLoadType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOAD_TYPES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Charge (kg)</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              placeholder="ex: 5"
              value={loadKg}
              onChange={(e) => setLoadKg(e.target.value)}
              disabled={loadType === "aucun"}
            />
          </div>
          <div>
            <Label>Vent (m/s)</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="+1.2"
              value={windMs}
              onChange={(e) => setWindMs(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Essais (temps en secondes)</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAttempts([...attempts, { time: "", valid: true }])}
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
                  placeholder="Temps (s) ex: 10.34"
                  value={a.time}
                  onChange={(e) => {
                    const c = [...attempts];
                    c[idx].time = e.target.value;
                    setAttempts(c);
                  }}
                  className="flex-1"
                />
                {vmaxPreview[idx] && (
                  <Badge variant="outline" className="text-xs">
                    {vmaxPreview[idx]} m/s
                  </Badge>
                )}
                <Select
                  value={a.valid ? "valid" : "nul"}
                  onValueChange={(v) => {
                    const c = [...attempts];
                    c[idx].valid = v === "valid";
                    setAttempts(c);
                  }}
                >
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="valid">Valide</SelectItem>
                    <SelectItem value="nul">Nul</SelectItem>
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
          <p className="text-[11px] text-muted-foreground mt-2">
            La vitesse maximale (Vmax) est calculée automatiquement = distance / temps.
          </p>
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
