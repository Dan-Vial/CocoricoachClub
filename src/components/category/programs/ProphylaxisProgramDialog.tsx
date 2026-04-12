import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { PAIN_ZONES } from "@/lib/constants/pain-locations";
import { Switch } from "@/components/ui/switch";

interface ProphylaxisProgramDialogProps {
  categoryId: string;
  programId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExerciseRow {
  id?: string;
  exercise_name: string;
  sets: number | null;
  reps: string;
  duration_seconds: number | null;
  rest_seconds: number | null;
  notes: string;
  order_index: number;
}

const FREQUENCIES = [
  { value: "quotidien", label: "Quotidien" },
  { value: "2x/jour", label: "2× par jour" },
  { value: "3x/semaine", label: "3× par semaine" },
  { value: "2x/semaine", label: "2× par semaine" },
  { value: "1x/semaine", label: "1× par semaine" },
  { value: "avant_entrainement", label: "Avant entraînement" },
  { value: "apres_entrainement", label: "Après entraînement" },
];

const ALL_BODY_ZONES = PAIN_ZONES.flatMap(z => z.locations as unknown as string[]);

export function ProphylaxisProgramDialog({ categoryId, programId, open, onOpenChange }: ProphylaxisProgramDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bodyZone, setBodyZone] = useState("");
  const [frequency, setFrequency] = useState("quotidien");
  const [playerId, setPlayerId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: players } = useQuery({
    queryKey: ["players-prophylaxis", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: existingProgram } = useQuery({
    queryKey: ["prophylaxis-program-edit", programId],
    queryFn: async () => {
      if (!programId) return null;
      const { data, error } = await supabase
        .from("prophylaxis_programs")
        .select("*, prophylaxis_exercises(*)")
        .eq("id", programId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  useEffect(() => {
    if (existingProgram) {
      setName(existingProgram.name);
      setDescription(existingProgram.description || "");
      setBodyZone(existingProgram.body_zone);
      setFrequency(existingProgram.frequency || "quotidien");
      setPlayerId(existingProgram.player_id || "");
      setIsActive(existingProgram.is_active ?? true);
      const exs = (existingProgram.prophylaxis_exercises || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((e: any) => ({
          id: e.id,
          exercise_name: e.exercise_name,
          sets: e.sets,
          reps: e.reps || "",
          duration_seconds: e.duration_seconds,
          rest_seconds: e.rest_seconds,
          notes: e.notes || "",
          order_index: e.order_index,
        }));
      setExercises(exs);
    }
  }, [existingProgram]);

  const addExercise = () => {
    setExercises(prev => [...prev, {
      exercise_name: "",
      sets: 3,
      reps: "10",
      duration_seconds: null,
      rest_seconds: 30,
      notes: "",
      order_index: prev.length,
    }]);
  };

  const updateExercise = (index: number, field: keyof ExerciseRow, value: any) => {
    setExercises(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const removeExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index).map((e, i) => ({ ...e, order_index: i })));
  };

  const handleSave = async () => {
    if (!name.trim() || !bodyZone) {
      toast.error("Nom et zone du corps requis");
      return;
    }
    setSaving(true);

    try {
      let progId = programId;

      const programData = {
        category_id: categoryId,
        name: name.trim(),
        description: description.trim() || null,
        body_zone: bodyZone,
        frequency,
        player_id: playerId || null,
        is_active: isActive,
      };

      if (programId) {
        const { error } = await supabase
          .from("prophylaxis_programs")
          .update(programData)
          .eq("id", programId);
        if (error) throw error;

        // Delete old exercises and re-insert
        await supabase.from("prophylaxis_exercises").delete().eq("program_id", programId);
      } else {
        const { data, error } = await supabase
          .from("prophylaxis_programs")
          .insert(programData)
          .select()
          .single();
        if (error) throw error;
        progId = data.id;
      }

      if (exercises.length > 0 && progId) {
        const toInsert = exercises
          .filter(e => e.exercise_name.trim())
          .map((e, i) => ({
            program_id: progId!,
            exercise_name: e.exercise_name.trim(),
            order_index: i,
            sets: e.sets,
            reps: e.reps || null,
            duration_seconds: e.duration_seconds,
            rest_seconds: e.rest_seconds,
            notes: e.notes || null,
          }));

        if (toInsert.length > 0) {
          const { error } = await supabase.from("prophylaxis_exercises").insert(toInsert);
          if (error) throw error;
        }
      }

      toast.success(programId ? "Programme mis à jour" : "Programme créé");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{programId ? "Modifier" : "Nouveau"} programme de prophylaxie</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom du programme *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Routine genou gauche" />
            </div>
            <div className="space-y-2">
              <Label>Zone du corps ciblée *</Label>
              <Select value={bodyZone} onValueChange={setBodyZone}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {PAIN_ZONES.map(zone => (
                    <div key={zone.zone}>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{zone.zone}</div>
                      {zone.locations.map(loc => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Athlète assigné</Label>
              <Select value={playerId || "__all__"} onValueChange={(v) => setPlayerId(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous (général)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous (programme général)</SelectItem>
                  {players?.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fréquence</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Objectif du programme, contexte de la blessure..." rows={2} />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Programme actif</Label>
          </div>

          {/* Exercises section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Exercices</Label>
              <Button variant="outline" size="sm" onClick={addExercise}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
              </Button>
            </div>

            {exercises.map((ex, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground w-6">{i + 1}.</span>
                  <Input
                    className="flex-1"
                    placeholder="Nom de l'exercice"
                    value={ex.exercise_name}
                    onChange={e => updateExercise(i, "exercise_name", e.target.value)}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeExercise(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2 pl-10">
                  <div>
                    <Label className="text-xs">Séries</Label>
                    <Input type="number" value={ex.sets || ""} onChange={e => updateExercise(i, "sets", e.target.value ? Number(e.target.value) : null)} />
                  </div>
                  <div>
                    <Label className="text-xs">Reps</Label>
                    <Input value={ex.reps} onChange={e => updateExercise(i, "reps", e.target.value)} placeholder="10" />
                  </div>
                  <div>
                    <Label className="text-xs">Durée (s)</Label>
                    <Input type="number" value={ex.duration_seconds || ""} onChange={e => updateExercise(i, "duration_seconds", e.target.value ? Number(e.target.value) : null)} />
                  </div>
                  <div>
                    <Label className="text-xs">Repos (s)</Label>
                    <Input type="number" value={ex.rest_seconds || ""} onChange={e => updateExercise(i, "rest_seconds", e.target.value ? Number(e.target.value) : null)} />
                  </div>
                </div>
                <div className="pl-10">
                  <Input placeholder="Notes (optionnel)" value={ex.notes} onChange={e => updateExercise(i, "notes", e.target.value)} />
                </div>
              </div>
            ))}

            {exercises.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Ajoutez des exercices à la routine
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : programId ? "Mettre à jour" : "Créer le programme"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
