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
import { Plus, Trash2, Pencil, Target, Trophy } from "lucide-react";
import { ATHLETISME_DISCIPLINES, ATHLETISME_SPECIALTIES } from "@/lib/constants/sportTypes";
import { getDefaultUnitForDiscipline } from "@/lib/athletics/recordsHelpers";
import { MINIMA_LEVELS, getMinimaLevel } from "@/lib/athletics/minimaLevels";
import { toast } from "sonner";

interface Props {
  categoryId: string;
}

interface Minima {
  id: string;
  discipline: string;
  specialty: string | null;
  label: string;
  level: string;
  target_value: number;
  unit: string;
  lower_is_better: boolean;
  notes: string | null;
}

const NONE_SPECIALTY = "__none__";

export function AthleticsMinimasManager({ categoryId }: Props) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMinima, setEditingMinima] = useState<Minima | null>(null);
  const [discipline, setDiscipline] = useState("");
  const [specialty, setSpecialty] = useState<string>(NONE_SPECIALTY);
  const [label, setLabel] = useState("Minima fédéral");
  const [level, setLevel] = useState("national");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("sec");
  const [lowerIsBetter, setLowerIsBetter] = useState(true);
  const [notes, setNotes] = useState("");

  const { data: minimas = [], isLoading } = useQuery({
    queryKey: ["athletics_minimas", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletics_minimas" as any)
        .select("*")
        .eq("category_id", categoryId)
        .order("discipline")
        .order("specialty");
      if (error) throw error;
      return (data || []) as unknown as Minima[];
    },
  });

  const resetForm = () => {
    setEditingMinima(null);
    setDiscipline("");
    setSpecialty(NONE_SPECIALTY);
    setLabel("Minima fédéral");
    setLevel("national");
    setTargetValue("");
    setUnit("sec");
    setLowerIsBetter(true);
    setNotes("");
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEdit = (m: Minima) => {
    setEditingMinima(m);
    setDiscipline(m.discipline);
    setSpecialty(m.specialty || NONE_SPECIALTY);
    setLabel(m.label);
    setLevel(m.level || "national");
    setTargetValue(String(m.target_value));
    setUnit(m.unit);
    setLowerIsBetter(m.lower_is_better);
    setNotes(m.notes || "");
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
      if (!discipline || !targetValue) {
        throw new Error("Discipline et valeur cible obligatoires");
      }
      const target = parseFloat(targetValue);
      if (isNaN(target)) throw new Error("Valeur cible invalide");

      const userId = (await supabase.auth.getUser()).data.user?.id;
      const payload = {
        category_id: categoryId,
        discipline,
        specialty: specialty === NONE_SPECIALTY ? null : specialty,
        label: label || "Minima fédéral",
        level,
        target_value: target,
        unit,
        lower_is_better: lowerIsBetter,
        notes: notes || null,
        created_by: userId,
      };

      if (editingMinima) {
        const { error } = await supabase
          .from("athletics_minimas" as any)
          .update(payload)
          .eq("id", editingMinima.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("athletics_minimas" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athletics_minimas", categoryId] });
      toast.success(editingMinima ? "Minima mis à jour" : "Minima créé");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("athletics_minimas" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athletics_minimas", categoryId] });
      toast.success("Minima supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  // Group by discipline
  const grouped = minimas.reduce((acc, m) => {
    const disc = ATHLETISME_DISCIPLINES.find((d) => d.value === m.discipline)?.label || m.discipline;
    if (!acc[disc]) acc[disc] = [];
    acc[disc].push(m);
    return acc;
  }, {} as Record<string, Minima[]>);

  const availableSpecialties = discipline ? ATHLETISME_SPECIALTIES[discipline] || [] : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Minimas fédéraux
          </CardTitle>
          <CardDescription>
            Définis les seuils de qualification par discipline pour cette catégorie.
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau minima
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMinima ? "Modifier le minima" : "Nouveau minima"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Discipline *</Label>
                <Select value={discipline} onValueChange={handleDisciplineChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {ATHLETISME_DISCIPLINES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {availableSpecialties.length > 0 && (
                <div>
                  <Label className="text-xs">Spécialité (optionnel)</Label>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value={NONE_SPECIALTY}>Toutes spécialités</SelectItem>
                      {availableSpecialties.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs">Libellé</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Minima France élite"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Valeur cible *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder={lowerIsBetter ? "10.50" : "18.50"}
                  />
                </div>
                <div>
                  <Label className="text-xs">Unité</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value="sec">sec (temps)</SelectItem>
                      <SelectItem value="m">m (distance)</SelectItem>
                      <SelectItem value="cm">cm</SelectItem>
                      <SelectItem value="pts">pts</SelectItem>
                      <SelectItem value="min">min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Sens de progression</Label>
                <Select
                  value={lowerIsBetter ? "lower" : "higher"}
                  onValueChange={(v) => setLowerIsBetter(v === "lower")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="lower">Plus c'est bas, mieux c'est (course)</SelectItem>
                    <SelectItem value="higher">Plus c'est haut, mieux c'est (lancer/saut)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {editingMinima ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : minimas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
            Aucun minima défini. Ajoute les seuils fédéraux pour suivre les qualifications.
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([disc, items]) => (
              <div key={disc} className="space-y-1.5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">{disc}</p>
                <div className="space-y-1.5">
                  {items.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded-md border bg-card p-2.5 text-sm"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {m.specialty && (
                          <Badge variant="outline" className="text-xs">
                            {m.specialty}
                          </Badge>
                        )}
                        <span className="font-medium truncate">{m.label}</span>
                        <Badge variant="secondary" className="font-mono">
                          {m.target_value} {m.unit}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteMutation.mutate(m.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
