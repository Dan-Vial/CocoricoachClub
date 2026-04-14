import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { calculateFisPoints, determineScale, DISCIPLINE_F_VALUES } from "@/lib/fis/fisPointsEngine";
import { calculateWsplPoints, WSPL_EVENT_CATEGORIES } from "@/lib/fis/wsplPointsEngine";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, History, Calculator } from "lucide-react";
import { getDisciplinesForClubSport } from "@/lib/constants/skiDisciplines";

interface HistoricalEntry {
  id: string;
  compName: string;
  compDate: string;
  location: string;
  discipline: string;
  level: string;
  ranking: string;
  racePenalty: string;
  fValue: string;
  totalRiders: string;
  wsplStars: string;
  wsplPL: string;
}

const LEVELS = [
  { value: "world_cup", label: "Coupe du Monde" },
  { value: "continental_cup", label: "Coupe Continentale" },
  { value: "fis", label: "FIS Race" },
  { value: "national", label: "National" },
];

function createEntry(discipline: string): HistoricalEntry {
  return {
    id: crypto.randomUUID(),
    compName: "",
    compDate: "",
    location: "",
    discipline,
    level: "fis",
    ranking: "",
    racePenalty: "",
    fValue: String(DISCIPLINE_F_VALUES[discipline] ?? 500),
    totalRiders: "50",
    wsplStars: "3",
    wsplPL: "600",
  };
}

interface AddHistoricalFisResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  playerId: string;
  playerName: string;
}

export function AddHistoricalFisResultsDialog({
  open,
  onOpenChange,
  categoryId,
  playerId,
  playerName,
}: AddHistoricalFisResultsDialogProps) {
  const queryClient = useQueryClient();

  const { data: clubSport } = useQuery({
    queryKey: ["club-sport-for-category", categoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("clubs(sport)")
        .eq("id", categoryId)
        .single();
      return (data as Record<string, unknown>)?.clubs as { sport: string } | null;
    },
    enabled: open,
  });

  const disciplines = useMemo(() => getDisciplinesForClubSport(clubSport?.sport), [clubSport?.sport]);
  const defaultDiscipline = disciplines[0]?.value || "slopestyle";

  const [entries, setEntries] = useState<HistoricalEntry[]>([createEntry(defaultDiscipline)]);
  const [saving, setSaving] = useState(false);

  const addEntry = () => setEntries((prev) => [...prev, createEntry(defaultDiscipline)]);

  const removeEntry = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id));

  const updateEntry = (id: string, field: keyof HistoricalEntry, value: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...e, [field]: value };
        // Auto-update fValue when discipline changes
        if (field === "discipline") {
          updated.fValue = String(DISCIPLINE_F_VALUES[value] ?? 500);
        }
        return updated;
      })
    );
  };

  const getCalculatedPoints = (entry: HistoricalEntry) => {
    const rankingNum = Number(entry.ranking);
    if (!rankingNum || rankingNum <= 0) return null;
    const scaleVal = determineScale(entry.level);
    return calculateFisPoints({ ranking: rankingNum, scale: scaleVal });
  };

  const getWsplPoints = (entry: HistoricalEntry) => {
    const rankingNum = Number(entry.ranking);
    const riders = Number(entry.totalRiders);
    const pl = Number(entry.wsplPL);
    if (!rankingNum || rankingNum <= 0 || !riders || riders <= 0 || !pl) return null;
    return calculateWsplPoints({ rank: rankingNum, totalRiders: riders, pointLevel: pl });
  };

  const handleSave = async () => {
    const valid = entries.filter((e) => e.compName && e.compDate && e.ranking);
    if (valid.length === 0) {
      toast.error("Ajoutez au moins une compétition complète (nom, date, classement)");
      return;
    }
    setSaving(true);

    try {
      for (const entry of valid) {
        const scaleVal = determineScale(entry.level);
        const rankingNum = Number(entry.ranking);
        const calculatedPts = calculateFisPoints({ ranking: rankingNum, scale: scaleVal });
        const wsplPts = getWsplPoints(entry);

        // 1. Create competition
        const compInsert = {
          category_id: categoryId,
          name: entry.compName,
          competition_date: entry.compDate,
          discipline: entry.discipline,
          level: entry.level,
          location: entry.location || null,
          race_penalty: scaleVal,
          f_value: Number(entry.fValue) || 500,
          wspl_pl: Number(entry.wsplPL) || null,
          wspl_stars: Number(entry.wsplStars) || null,
        };
        const { data: comp, error: compError } = await (supabase.from("fis_competitions") as any)
          .insert(compInsert)
          .select("id")
          .single();
        if (compError) throw compError;

        // 2. Create result for this player
        const resultInsert = {
          competition_id: comp.id,
          player_id: playerId,
          category_id: categoryId,
          ranking: rankingNum,
          fis_points: calculatedPts,
          base_points: calculatedPts,
          calculated_points: calculatedPts,
          wspl_points: wsplPts ?? null,
          wspl_pl: Number(entry.wsplPL) || null,
          wspl_stars: Number(entry.wsplStars) || null,
          total_riders: Number(entry.totalRiders) || null,
        };
        const { error: resultError } = await (supabase.from("fis_results") as any).insert(resultInsert);
        if (resultError) throw resultError;
      }

      // 3. Update player total FIS points
      const { data: allResults } = await supabase
        .from("fis_results")
        .select("fis_points, calculated_points, expires_at")
        .eq("player_id", playerId)
        .eq("category_id", categoryId);

      if (allResults) {
        const now = new Date();
        const validResults = allResults.filter((r) => !r.expires_at || new Date(r.expires_at) > now);
        const best = validResults
          .map((r) => (r as Record<string, unknown>).calculated_points as number ?? r.fis_points)
          .sort((a, b) => b - a);
        const totalPoints = best.slice(0, 5).reduce((s, p) => s + p, 0);

        await supabase
          .from("players")
          .update({ fis_points: totalPoints } as Record<string, unknown>)
          .eq("id", playerId);
      }

      toast.success(`${valid.length} compétition(s) historique(s) ajoutée(s)`);
      queryClient.invalidateQueries({ queryKey: ["fis-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["fis-results"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setEntries([createEntry(defaultDiscipline)]);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving historical results:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historique compétitions — {playerName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Ajoutez les compétitions des 52 dernières semaines avec le classement obtenu.
            Les points FIS seront calculés automatiquement.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {entries.map((entry, idx) => {
            const pts = getCalculatedPoints(entry);
            return (
              <div key={entry.id} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Compétition {idx + 1}</span>
                  {entries.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeEntry(entry.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Nom *</Label>
                    <Input
                      value={entry.compName}
                      onChange={(e) => updateEntry(entry.id, "compName", e.target.value)}
                      placeholder="Ex: FIS SB World Cup Laax"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date *</Label>
                    <Input
                      type="date"
                      value={entry.compDate}
                      onChange={(e) => updateEntry(entry.id, "compDate", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Discipline</Label>
                    <Select value={entry.discipline} onValueChange={(v) => updateEntry(entry.id, "discipline", v)}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {disciplines.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Niveau</Label>
                    <Select value={entry.level} onValueChange={(v) => updateEntry(entry.id, "level", v)}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Lieu</Label>
                    <Input
                      value={entry.location}
                      onChange={(e) => updateEntry(entry.id, "location", e.target.value)}
                      placeholder="Laax"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">Classement *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={entry.ranking}
                      onChange={(e) => updateEntry(entry.id, "ranking", e.target.value)}
                      placeholder="Ex: 5"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nb riders (F)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={entry.totalRiders}
                      onChange={(e) => updateEntry(entry.id, "totalRiders", e.target.value)}
                      placeholder="50"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cat. WSPL</Label>
                    <Select value={entry.wsplStars} onValueChange={(v) => {
                      updateEntry(entry.id, "wsplStars", v);
                      const cat = WSPL_EVENT_CATEGORIES.find(c => c.stars === Number(v));
                      if (cat) updateEntry(entry.id, "wsplPL", String(cat.maxPL));
                    }}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WSPL_EVENT_CATEGORIES.map((c) => (
                          <SelectItem key={c.stars} value={String(c.stars)}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">PL</Label>
                    <Input
                      type="number"
                      min="50"
                      max="1000"
                      value={entry.wsplPL}
                      onChange={(e) => updateEntry(entry.id, "wsplPL", e.target.value)}
                      placeholder="600"
                      className="text-sm"
                    />
                  </div>
                </div>
                {/* Points preview */}
                <div className="flex items-center justify-end gap-3">
                  {pts !== null && (
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">FIS</p>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {pts.toFixed(2)}
                      </Badge>
                    </div>
                  )}
                  {(() => {
                    const wp = getWsplPoints(entry);
                    return wp !== null ? (
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">WSPL</p>
                        <Badge variant="outline" className="font-mono text-xs">
                          {wp.toFixed(2)}
                        </Badge>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            );
          })}

          <Button variant="outline" onClick={addEntry} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Ajouter une compétition
          </Button>

          {/* Summary */}
          {entries.some((e) => getCalculatedPoints(e) !== null) && (
            <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Calculator className="h-4 w-4 text-primary" />
                <span>Total estimé :</span>
              </div>
              <Badge className="font-mono text-sm">
                {entries
                  .map(getCalculatedPoints)
                  .filter((p): p is number => p !== null)
                  .sort((a, b) => b - a)
                  .slice(0, 5)
                  .reduce((s, p) => s + p, 0)
                  .toFixed(0)}{" "}
                pts (top 5)
              </Badge>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer tout"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
