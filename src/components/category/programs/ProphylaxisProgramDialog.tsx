import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, GripVertical, Library, Users } from "lucide-react";
import { toast } from "sonner";
import { PAIN_ZONES } from "@/lib/constants/pain-locations";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";

interface ProphylaxisProgramDialogProps {
  categoryId: string;
  programId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExerciseRow {
  id?: string;
  exercise_name: string;
  library_exercise_id?: string | null;
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

export function ProphylaxisProgramDialog({ categoryId, programId, open, onOpenChange }: ProphylaxisProgramDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bodyZone, setBodyZone] = useState("");
  const [frequency, setFrequency] = useState("quotidien");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [showLibraryFor, setShowLibraryFor] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Fetch exercise library
  const { data: libraryExercises } = useQuery({
    queryKey: ["exercise-library-prophylaxis", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("exercise_library")
        .select("*")
        .or(`user_id.eq.${user.id},is_system.eq.true`)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredLibrary = useMemo(() => {
    return libraryExercises?.filter((ex) =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.category.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];
  }, [libraryExercises, searchQuery]);

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

  // Fetch existing assignments for edit mode
  const { data: existingAssignments } = useQuery({
    queryKey: ["prophylaxis-assignments-edit", programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data, error } = await supabase
        .from("prophylaxis_assignments")
        .select("player_id")
        .eq("program_id", programId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });

  useEffect(() => {
    if (existingProgram) {
      setName(existingProgram.name);
      setDescription(existingProgram.description || "");
      setBodyZone(existingProgram.body_zone);
      setFrequency(existingProgram.frequency || "quotidien");
      setIsActive(existingProgram.is_active ?? true);
      const exs = (existingProgram.prophylaxis_exercises || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((e: any) => ({
          id: e.id,
          exercise_name: e.exercise_name,
          library_exercise_id: e.library_exercise_id || null,
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

  useEffect(() => {
    if (existingAssignments && existingAssignments.length > 0) {
      setSelectedPlayerIds(existingAssignments.map(a => a.player_id));
    } else if (existingProgram?.player_id) {
      setSelectedPlayerIds([existingProgram.player_id]);
    }
  }, [existingAssignments, existingProgram]);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const selectAllPlayers = () => {
    if (selectedPlayerIds.length === (players?.length || 0)) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(players?.map(p => p.id) || []);
    }
  };

  const addExercise = () => {
    setExercises(prev => [...prev, {
      exercise_name: "",
      library_exercise_id: null,
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

  const selectFromLibrary = (index: number, libExercise: any) => {
    setExercises(prev => prev.map((e, i) =>
      i === index
        ? { ...e, exercise_name: libExercise.name, library_exercise_id: libExercise.id }
        : e
    ));
    setShowLibraryFor(null);
    setSearchQuery("");
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
        player_id: selectedPlayerIds.length === 1 ? selectedPlayerIds[0] : null,
        is_active: isActive,
      };

      if (programId) {
        const { error } = await supabase
          .from("prophylaxis_programs")
          .update(programData)
          .eq("id", programId);
        if (error) throw error;

        await supabase.from("prophylaxis_exercises").delete().eq("program_id", programId);
        // Delete old assignments and re-create
        await supabase.from("prophylaxis_assignments").delete().eq("program_id", programId);
      } else {
        const { data, error } = await supabase
          .from("prophylaxis_programs")
          .insert(programData)
          .select()
          .single();
        if (error) throw error;
        progId = data.id;
      }

      // Insert exercises
      if (exercises.length > 0 && progId) {
        const toInsert = exercises
          .filter(e => e.exercise_name.trim())
          .map((e, i) => ({
            program_id: progId!,
            exercise_name: e.exercise_name.trim(),
            library_exercise_id: e.library_exercise_id || null,
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

      // Insert assignments for selected players
      if (selectedPlayerIds.length > 0 && progId) {
        const assignments = selectedPlayerIds.map(pid => ({
          program_id: progId!,
          player_id: pid,
          category_id: categoryId,
          is_active: true,
        }));
        const { error } = await supabase.from("prophylaxis_assignments").insert(assignments);
        if (error) throw error;
      }

      toast.success(programId ? "Programme mis à jour" : "Programme créé");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      upper_body: "Haut du corps",
      lower_body: "Bas du corps",
      full_body: "Full body",
      cardio: "Cardio",
      mobility: "Mobilité",
      core: "Gainage",
      plyometrics: "Pliométrie",
      olympic: "Haltérophilie",
      machine: "Machine",
      autre: "Autre",
    };
    return labels[cat] || cat;
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
            <div className="flex items-end gap-2 pb-1">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Programme actif</Label>
            </div>
          </div>

          {/* Multi-player assignment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Assigner aux athlètes
              </Label>
              <Button variant="ghost" size="sm" className="text-xs h-6" onClick={selectAllPlayers}>
                {selectedPlayerIds.length === (players?.length || 0) ? "Tout désélectionner" : "Tout sélectionner"}
              </Button>
            </div>
            <div className="border rounded-lg p-2 max-h-32 overflow-y-auto grid grid-cols-2 gap-1">
              {players?.map(p => (
                <label key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                  <Checkbox
                    checked={selectedPlayerIds.includes(p.id)}
                    onCheckedChange={() => togglePlayer(p.id)}
                  />
                  <span className="truncate">{p.first_name} {p.name}</span>
                </label>
              ))}
              {!players?.length && (
                <p className="text-xs text-muted-foreground col-span-2 py-2 text-center">Aucun athlète</p>
              )}
            </div>
            {selectedPlayerIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedPlayerIds.length} athlète{selectedPlayerIds.length > 1 ? "s" : ""} sélectionné{selectedPlayerIds.length > 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Objectif du programme, contexte de la blessure..." rows={2} />
          </div>

          {/* Exercises section with library autocomplete */}
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
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-muted-foreground w-6 shrink-0">{i + 1}.</span>
                  <div className="flex-1 relative">
                    <Popover
                      open={showLibraryFor === i}
                      onOpenChange={(isOpen) => {
                        setShowLibraryFor(isOpen ? i : null);
                        if (isOpen) setSearchQuery(ex.exercise_name || "");
                      }}
                    >
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <Input
                            placeholder="Nom de l'exercice (taper pour chercher)"
                            value={ex.exercise_name}
                            onChange={e => {
                              updateExercise(i, "exercise_name", e.target.value);
                              updateExercise(i, "library_exercise_id", null);
                              setSearchQuery(e.target.value);
                              setShowLibraryFor(i);
                            }}
                          />
                          {ex.library_exercise_id && (
                            <Library className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="p-1 w-[--radix-popover-trigger-width] max-h-64 overflow-y-auto z-[9999]"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        {filteredLibrary.length === 0 ? (
                          <div className="px-2 py-2 text-xs text-muted-foreground">
                            Aucun exercice trouvé
                          </div>
                        ) : (() => {
                          const grouped: Record<string, typeof filteredLibrary> = {};
                          filteredLibrary.slice(0, 30).forEach((libEx) => {
                            const cat = libEx.category || "autre";
                            if (!grouped[cat]) grouped[cat] = [];
                            grouped[cat].push(libEx);
                          });
                          return Object.entries(grouped).map(([cat, exs]) => (
                            <div key={cat}>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-popover border-b">
                                {getCategoryLabel(cat)}
                              </div>
                              {exs.map((libEx) => (
                                <button
                                  key={libEx.id}
                                  type="button"
                                  className="w-full text-left px-2 py-2 hover:bg-muted rounded-sm text-sm flex items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectFromLibrary(i, libEx);
                                  }}
                                >
                                  <span className="break-words min-w-0 flex-1">{libEx.name}</span>
                                  {libEx.subcategory && (
                                    <Badge variant="outline" className="text-[10px] shrink-0">
                                      {libEx.subcategory}
                                    </Badge>
                                  )}
                                </button>
                              ))}
                            </div>
                          ));
                        })()}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeExercise(i)}>
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
