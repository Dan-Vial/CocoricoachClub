import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Medal, User, Calendar } from "lucide-react";
import { ATHLETISME_DISCIPLINES, ATHLETISME_SPECIALTIES } from "@/lib/constants/sportTypes";
import { getDefaultUnitForDiscipline, type AthleticsRecord } from "@/lib/athletics/recordsHelpers";
import { toast } from "sonner";

interface Props {
  categoryId: string;
  /** Restrict view to a single player (used in player profile / athlete portal). */
  playerId?: string;
  /** When true, hide the per-athlete selector and show only the given player's records. */
  singlePlayer?: boolean;
  /** When true, allow editing — defaults to !singlePlayer (i.e., coaches by default). */
  canEdit?: boolean;
}

const NONE_SPECIALTY = "__none__";

interface Player {
  id: string;
  name: string;
  first_name: string | null;
  discipline: string | null;
  specialty: string | null;
  disciplines: string[] | null;
  specialties: string[] | null;
}

export function AthleticsRecordsManager({ categoryId, playerId, singlePlayer = false, canEdit }: Props) {
  const queryClient = useQueryClient();
  const allowEdit = canEdit ?? !singlePlayer;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AthleticsRecord | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(playerId || "");
  const [discipline, setDiscipline] = useState("");
  const [specialty, setSpecialty] = useState<string>(NONE_SPECIALTY);
  const [unit, setUnit] = useState("sec");
  const [lowerIsBetter, setLowerIsBetter] = useState(true);
  const [personalBest, setPersonalBest] = useState("");
  const [pbDate, setPbDate] = useState("");
  const [pbLocation, setPbLocation] = useState("");
  const [seasonBest, setSeasonBest] = useState("");
  const [sbDate, setSbDate] = useState("");
  const [sbLocation, setSbLocation] = useState("");
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [notes, setNotes] = useState("");

  // Fetch players (always — we also need the current athlete's disciplines in singlePlayer mode)
  const { data: players = [] } = useQuery({
    queryKey: ["category_players_minimal_athletics", categoryId, playerId || "all"],
    queryFn: async () => {
      let q = supabase
        .from("players")
        .select("id, name, first_name, discipline, specialty, disciplines, specialties")
        .eq("category_id", categoryId);
      if (singlePlayer && playerId) q = q.eq("id", playerId);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return (data || []) as unknown as Player[];
    },
  });

  /**
   * Returns the list of (discipline, specialty) pairs the given player practices.
   * Falls back to the legacy single discipline if the new arrays are empty.
   */
  const getAthletePairs = (
    p: Player | undefined,
  ): Array<{ discipline: string; specialty: string | null }> => {
    if (!p) return [];
    if (p.disciplines && p.disciplines.length > 0) {
      return p.disciplines.map((d, i) => ({
        discipline: d,
        specialty: p.specialties?.[i] || null,
      }));
    }
    if (p.discipline) return [{ discipline: p.discipline, specialty: p.specialty || null }];
    return [];
  };

  // Fetch records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["athletics_records", categoryId, playerId],
    queryFn: async () => {
      let q = supabase.from("athletics_records" as any).select("*").eq("category_id", categoryId);
      if (playerId) q = q.eq("player_id", playerId);
      const { data, error } = await q.order("discipline");
      if (error) throw error;
      return (data || []) as unknown as AthleticsRecord[];
    },
  });

  const playerMap = new Map(players.map((p) => [p.id, p]));

  const resetForm = () => {
    setEditing(null);
    setSelectedPlayerId(playerId || "");
    setDiscipline("");
    setSpecialty(NONE_SPECIALTY);
    setUnit("sec");
    setLowerIsBetter(true);
    setPersonalBest("");
    setPbDate("");
    setPbLocation("");
    setSeasonBest("");
    setSbDate("");
    setSbLocation("");
    setSeasonYear(new Date().getFullYear());
    setNotes("");
  };

  const openCreate = (forPlayerId?: string, autoDiscipline?: string, autoSpecialty?: string | null) => {
    resetForm();
    const targetPlayerId = forPlayerId || playerId || "";
    if (targetPlayerId) setSelectedPlayerId(targetPlayerId);

    // Auto-prefill discipline & specialty from the athlete's profile when not given explicitly.
    let disc = autoDiscipline;
    let spec: string | null | undefined = autoSpecialty;
    if (!disc && targetPlayerId) {
      const pairs = getAthletePairs(playerMap.get(targetPlayerId));
      if (pairs.length > 0) {
        disc = pairs[0].discipline;
        spec = pairs[0].specialty;
      }
    }

    if (disc) {
      setDiscipline(disc);
      const defaults = getDefaultUnitForDiscipline(disc, spec ?? undefined);
      setUnit(defaults.unit);
      setLowerIsBetter(defaults.lowerIsBetter);
    }
    if (spec) setSpecialty(spec);
    setIsDialogOpen(true);
  };

  // When the user selects a different athlete inside the dialog, refresh the
  // discipline/specialty defaults from that athlete's profile.
  const handlePlayerChange = (newPlayerId: string) => {
    setSelectedPlayerId(newPlayerId);
    const pairs = getAthletePairs(playerMap.get(newPlayerId));
    if (pairs.length > 0) {
      const first = pairs[0];
      setDiscipline(first.discipline);
      setSpecialty(first.specialty || NONE_SPECIALTY);
      const defaults = getDefaultUnitForDiscipline(first.discipline, first.specialty ?? undefined);
      setUnit(defaults.unit);
      setLowerIsBetter(defaults.lowerIsBetter);
    }
  };

  const openEdit = (r: AthleticsRecord) => {
    setEditing(r);
    setSelectedPlayerId(r.player_id);
    setDiscipline(r.discipline);
    setSpecialty(r.specialty || NONE_SPECIALTY);
    setUnit(r.unit);
    setLowerIsBetter(r.lower_is_better);
    setPersonalBest(r.personal_best != null ? String(r.personal_best) : "");
    setPbDate(r.personal_best_date || "");
    setPbLocation(r.personal_best_location || "");
    setSeasonBest(r.season_best != null ? String(r.season_best) : "");
    setSbDate(r.season_best_date || "");
    setSbLocation(r.season_best_location || "");
    setSeasonYear(r.season_year);
    setNotes(r.notes || "");
    setIsDialogOpen(true);
  };

  const handleDisciplineChange = (value: string) => {
    setDiscipline(value);
    setSpecialty(NONE_SPECIALTY);
    const defaults = getDefaultUnitForDiscipline(value);
    setUnit(defaults.unit);
    setLowerIsBetter(defaults.lowerIsBetter);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlayerId || !discipline) {
        throw new Error("Athlète et discipline obligatoires");
      }
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const payload = {
        player_id: selectedPlayerId,
        category_id: categoryId,
        discipline,
        specialty: specialty === NONE_SPECIALTY ? null : specialty,
        personal_best: personalBest ? parseFloat(personalBest) : null,
        personal_best_date: pbDate || null,
        personal_best_location: pbLocation || null,
        season_best: seasonBest ? parseFloat(seasonBest) : null,
        season_best_date: sbDate || null,
        season_best_location: sbLocation || null,
        season_year: seasonYear,
        unit,
        lower_is_better: lowerIsBetter,
        notes: notes || null,
        created_by: userId,
      };
      if (editing) {
        const { error } = await supabase
          .from("athletics_records" as any)
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("athletics_records" as any).upsert(payload, {
          onConflict: "player_id,discipline,specialty,season_year",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athletics_records"] });
      toast.success(editing ? "Record mis à jour" : "Record enregistré");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  // Group records by player (for category view) or by discipline (for player view)
  const groupedByPlayer = !singlePlayer
    ? records.reduce((acc, r) => {
        const p = playerMap.get(r.player_id);
        const name = p ? [p.first_name, p.name].filter(Boolean).join(" ") : "Athlète";
        if (!acc[r.player_id]) acc[r.player_id] = { name, records: [] };
        acc[r.player_id].records.push(r);
        return acc;
      }, {} as Record<string, { name: string; records: AthleticsRecord[] }>)
    : null;

  const availableSpecialties = discipline ? ATHLETISME_SPECIALTIES[discipline] || [] : [];

  // ── Auto-filter: restrict the discipline dropdown to those the selected athlete actually practices.
  const selectedAthletePairs = getAthletePairs(playerMap.get(selectedPlayerId));
  const athleteDisciplineValues = Array.from(
    new Set(selectedAthletePairs.map((p) => p.discipline)),
  );
  // If athlete has 0 declared disciplines (legacy/empty), fall back to the full list so we don't block them.
  const filteredDisciplines =
    athleteDisciplineValues.length > 0
      ? ATHLETISME_DISCIPLINES.filter((d) => athleteDisciplineValues.includes(d.value))
      : ATHLETISME_DISCIPLINES;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Medal className="h-5 w-5 text-primary" />
            Records personnels & Saison
          </CardTitle>
          <CardDescription>
            {singlePlayer
              ? "Records personnels et meilleures performances de la saison."
              : "Records par athlète et par discipline."}
          </CardDescription>
        </div>
        {allowEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openCreate()} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Nouveau record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Modifier le record" : "Nouveau record"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {!singlePlayer && (
                  <div>
                    <Label className="text-xs">Athlète *</Label>
                    <Select value={selectedPlayerId} onValueChange={handlePlayerChange} disabled={!!editing}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        {players.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {[p.first_name, p.name].filter(Boolean).join(" ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Discipline *</Label>
                    <Select value={discipline} onValueChange={handleDisciplineChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        {filteredDisciplines.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPlayerId && athleteDisciplineValues.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Disciplines pratiquées par cet athlète uniquement
                      </p>
                    )}
                  </div>
                  {availableSpecialties.length > 0 && (
                    <div>
                      <Label className="text-xs">Spécialité</Label>
                      <Select value={specialty} onValueChange={setSpecialty}>
                        <SelectTrigger>
                          <SelectValue placeholder="Toutes" />
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                          <SelectItem value={NONE_SPECIALTY}>Toutes</SelectItem>
                          {availableSpecialties.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Unité</Label>
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        <SelectItem value="sec">sec</SelectItem>
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="pts">pts</SelectItem>
                        <SelectItem value="min">min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Année saison</Label>
                    <Input
                      type="number"
                      value={seasonYear}
                      onChange={(e) => setSeasonYear(parseInt(e.target.value) || new Date().getFullYear())}
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs font-semibold uppercase tracking-wide">Record personnel (PB)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Performance</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={personalBest}
                        onChange={(e) => setPersonalBest(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={pbDate} onChange={(e) => setPbDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Lieu</Label>
                    <Input value={pbLocation} onChange={(e) => setPbLocation(e.target.value)} placeholder="Ex: Paris" />
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    Meilleure perf saison ({seasonYear})
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Performance</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={seasonBest}
                        onChange={(e) => setSeasonBest(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={sbDate} onChange={(e) => setSbDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Lieu</Label>
                    <Input value={sbLocation} onChange={(e) => setSbLocation(e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Medal className="h-10 w-10 mx-auto mb-2 opacity-30" />
            Aucun record enregistré.
          </div>
        ) : singlePlayer ? (
          <RecordsList records={records} onEdit={allowEdit ? openEdit : undefined} />
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByPlayer || {}).map(([pid, { name, records: rs }]) => (
              <div key={pid} className="space-y-1.5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  {name}
                </p>
                <RecordsList records={rs} onEdit={allowEdit ? openEdit : undefined} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecordsList({
  records,
  onEdit,
}: {
  records: AthleticsRecord[];
  onEdit?: (r: AthleticsRecord) => void;
}) {
  return (
    <div className="space-y-1.5">
      {records.map((r) => {
        const discLabel =
          ATHLETISME_DISCIPLINES.find((d) => d.value === r.discipline)?.label || r.discipline;
        return (
          <div key={r.id} className="rounded-md border bg-card p-2.5 text-sm">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {discLabel}
                </Badge>
                {r.specialty && (
                  <Badge variant="secondary" className="text-xs">
                    {r.specialty}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Saison {r.season_year}
                </span>
              </div>
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded p-2 bg-amber-100 dark:bg-amber-900/20">
                <p className="font-semibold text-amber-700 dark:text-amber-400">PB</p>
                {r.personal_best != null ? (
                  <>
                    <p className="font-mono text-base font-bold">
                      {r.personal_best} {r.unit}
                    </p>
                    {r.personal_best_date && (
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(r.personal_best_date).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                    {r.personal_best_location && (
                      <p className="text-muted-foreground truncate">{r.personal_best_location}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground italic">—</p>
                )}
              </div>
              <div className="rounded p-2 bg-blue-100 dark:bg-blue-900/20">
                <p className="font-semibold text-blue-700 dark:text-blue-400">SB {r.season_year}</p>
                {r.season_best != null ? (
                  <>
                    <p className="font-mono text-base font-bold">
                      {r.season_best} {r.unit}
                    </p>
                    {r.season_best_date && (
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(r.season_best_date).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                    {r.season_best_location && (
                      <p className="text-muted-foreground truncate">{r.season_best_location}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground italic">—</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
