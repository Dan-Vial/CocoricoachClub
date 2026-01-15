import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ProgramWeekSection } from "./ProgramWeekSection";
import { ExerciseLibrarySidebar } from "./ExerciseLibrarySidebar";
import { Plus, Save } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";

interface ProgramBuilderDialogProps {
  categoryId: string;
  programId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DropSet {
  reps: string;
  percentage: number;
}

interface ClusterSet {
  reps: number;
  rest_seconds: number;
}

interface ProgramWeek {
  id: string;
  week_number: number;
  name?: string;
  sessions: ProgramSession[];
}

interface ProgramSession {
  id: string;
  session_number: number;
  name: string;
  day_of_week?: number;
  scheduled_day?: number;
  exercises: ProgramExercise[];
}

interface ProgramExercise {
  id: string;
  exercise_name: string;
  library_exercise_id?: string;
  order_index: number;
  method: string;
  sets: number;
  reps: string;
  percentage_1rm?: number;
  tempo?: string;
  rest_seconds: number;
  group_id?: string;
  group_order?: number;
  notes?: string;
  drop_sets?: DropSet[];
  cluster_sets?: ClusterSet[];
  is_rm_test?: boolean;
  rm_test_type?: string;
}

// Zone du corps options
const BODY_ZONES = [
  { value: "full_body", label: "Full Body" },
  { value: "upper_body", label: "Haut du corps" },
  { value: "lower_body", label: "Bas du corps" },
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "shoulders", label: "Épaules" },
  { value: "chest", label: "Pectoraux" },
  { value: "back", label: "Dos" },
  { value: "legs", label: "Jambes" },
  { value: "arms", label: "Bras" },
  { value: "core", label: "Core / Gainage" },
];

// Theme options
const THEMES = [
  { value: "musculation", label: "Musculation", subOptions: [
    { value: "force", label: "Force" },
    { value: "hypertrophie", label: "Hypertrophie" },
    { value: "puissance", label: "Puissance" },
    { value: "vitesse", label: "Vitesse" },
    { value: "endurance_force", label: "Endurance de force" },
  ]},
  { value: "reathletisation", label: "Réathlétisation", subOptions: [
    { value: "phase_1", label: "Phase 1 - Contrôle moteur" },
    { value: "phase_2", label: "Phase 2 - Force" },
    { value: "phase_3", label: "Phase 3 - Puissance" },
    { value: "phase_4", label: "Phase 4 - Sport spécifique" },
  ]},
  { value: "terrain", label: "Terrain", subOptions: [
    { value: "physique", label: "Physique général" },
    { value: "collectif", label: "Collectif" },
    { value: "bronco", label: "Bronco" },
    { value: "yoyo_test", label: "Yo-Yo Test" },
    { value: "vma", label: "VMA" },
    { value: "intermittent", label: "Intermittent" },
  ]},
];

export function ProgramBuilderDialog({
  categoryId,
  programId,
  open,
  onOpenChange,
}: ProgramBuilderDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("intermediate");
  const [bodyZone, setBodyZone] = useState<string>("");
  const [theme, setTheme] = useState<string>("");
  const [subTheme, setSubTheme] = useState<string>("");
  const [weeks, setWeeks] = useState<ProgramWeek[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeExercise, setActiveExercise] = useState<any>(null);

  // Get sub-options for selected theme
  const selectedThemeOptions = THEMES.find(t => t.value === theme)?.subOptions || [];

  // Load existing program if editing
  const { data: existingProgram } = useQuery({
    queryKey: ["program-details", programId],
    queryFn: async () => {
      if (!programId) return null;

      const { data: program, error: programError } = await supabase
        .from("training_programs")
        .select("*")
        .eq("id", programId)
        .single();

      if (programError) throw programError;

      const { data: weeksData, error: weeksError } = await supabase
        .from("program_weeks")
        .select(`
          *,
          program_sessions(
            *,
            program_exercises(*)
          )
        `)
        .eq("program_id", programId)
        .order("week_number");

      if (weeksError) throw weeksError;

      return { ...program, weeks: weeksData };
    },
    enabled: !!programId,
  });

  useEffect(() => {
    if (existingProgram) {
      setName(existingProgram.name);
      setDescription(existingProgram.description || "");
      setLevel(existingProgram.level || "intermediate");
      setBodyZone(existingProgram.body_zone || "");
      setTheme(existingProgram.theme || "");
      setSubTheme(existingProgram.reathletisation_phase || "");

      const loadedWeeks: ProgramWeek[] = existingProgram.weeks?.map((w: any) => ({
        id: w.id,
        week_number: w.week_number,
        name: w.name,
        sessions: w.program_sessions?.map((s: any) => ({
          id: s.id,
          session_number: s.session_number,
          name: s.name || `Séance ${s.session_number}`,
          day_of_week: s.day_of_week,
          scheduled_day: s.scheduled_day,
          exercises: s.program_exercises?.map((e: any) => ({
            id: e.id,
            exercise_name: e.exercise_name,
            library_exercise_id: e.library_exercise_id,
            order_index: e.order_index,
            method: e.method || "normal",
            sets: e.sets || 3,
            reps: e.reps || "10",
            percentage_1rm: e.percentage_1rm,
            tempo: e.tempo,
            rest_seconds: e.rest_seconds || 90,
            group_id: e.group_id,
            group_order: e.group_order,
            notes: e.notes,
            drop_sets: e.drop_sets,
            cluster_sets: e.cluster_sets,
            is_rm_test: e.is_rm_test,
            rm_test_type: e.rm_test_type,
          })).sort((a: any, b: any) => a.order_index - b.order_index) || [],
        })).sort((a: any, b: any) => a.session_number - b.session_number) || [],
      })) || [];

      setWeeks(loadedWeeks.length > 0 ? loadedWeeks : [createEmptyWeek(1)]);
    } else if (!programId) {
      setWeeks([createEmptyWeek(1)]);
    }
  }, [existingProgram, programId]);

  const createEmptyWeek = (weekNumber: number): ProgramWeek => ({
    id: crypto.randomUUID(),
    week_number: weekNumber,
    sessions: [createEmptySession(1)],
  });

  const createEmptySession = (sessionNumber: number): ProgramSession => ({
    id: crypto.randomUUID(),
    session_number: sessionNumber,
    name: `Séance ${sessionNumber}`,
    exercises: [],
  });

  const addWeek = () => {
    setWeeks([...weeks, createEmptyWeek(weeks.length + 1)]);
  };

  const duplicateWeek = (weekIndex: number) => {
    const weekToDupe = weeks[weekIndex];
    const newWeek: ProgramWeek = {
      ...weekToDupe,
      id: crypto.randomUUID(),
      week_number: weeks.length + 1,
      sessions: weekToDupe.sessions.map((s) => ({
        ...s,
        id: crypto.randomUUID(),
        exercises: s.exercises.map((e) => ({
          ...e,
          id: crypto.randomUUID(),
          group_id: e.group_id ? crypto.randomUUID() : undefined,
        })),
      })),
    };
    setWeeks([...weeks, newWeek]);
  };

  const deleteWeek = (weekIndex: number) => {
    if (weeks.length === 1) {
      toast.error("Le programme doit avoir au moins une semaine");
      return;
    }
    const newWeeks = weeks.filter((_, i) => i !== weekIndex);
    setWeeks(newWeeks.map((w, i) => ({ ...w, week_number: i + 1 })));
  };

  const updateWeek = (weekIndex: number, updatedWeek: ProgramWeek) => {
    const newWeeks = [...weeks];
    newWeeks[weekIndex] = updatedWeek;
    setWeeks(newWeeks);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveExercise(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveExercise(null);
    const { active, over } = event;

    if (!over) return;

    const droppedExercise = active.data.current;
    const targetSessionId = over.id as string;

    // Find the session and add the exercise
    const newWeeks = weeks.map((week) => ({
      ...week,
      sessions: week.sessions.map((session) => {
        if (session.id === targetSessionId) {
          const newExercise: ProgramExercise = {
            id: crypto.randomUUID(),
            exercise_name: droppedExercise.name,
            library_exercise_id: droppedExercise.id,
            order_index: session.exercises.length,
            method: "normal",
            sets: 3,
            reps: "10",
            rest_seconds: 90,
          };
          return {
            ...session,
            exercises: [...session.exercises, newExercise],
          };
        }
        return session;
      }),
    }));

    setWeeks(newWeeks);
    toast.success(`${droppedExercise.name} ajouté`);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Le nom du programme est requis");
      return;
    }

    setSaving(true);

    try {
      let programIdToUse = programId;

      if (programId) {
        // Update existing program
        const { error } = await supabase
          .from("training_programs")
          .update({ 
            name, 
            description, 
            level,
            body_zone: bodyZone || null,
            theme: theme || null,
            reathletisation_phase: subTheme || null,
          })
          .eq("id", programId);

        if (error) throw error;

        // Delete existing weeks (cascade will delete sessions and exercises)
        await supabase.from("program_weeks").delete().eq("program_id", programId);
      } else {
        // Create new program
        const { data: newProgram, error } = await supabase
          .from("training_programs")
          .insert({ 
            category_id: categoryId, 
            name, 
            description, 
            level,
            body_zone: bodyZone || null,
            theme: theme || null,
            reathletisation_phase: subTheme || null,
          })
          .select()
          .single();

        if (error) throw error;
        programIdToUse = newProgram.id;
      }

      // Insert weeks, sessions, and exercises
      for (const week of weeks) {
        const { data: weekData, error: weekError } = await supabase
          .from("program_weeks")
          .insert({
            program_id: programIdToUse,
            week_number: week.week_number,
            name: week.name,
          })
          .select()
          .single();

        if (weekError) throw weekError;

        for (const session of week.sessions) {
          const { data: sessionData, error: sessionError } = await supabase
            .from("program_sessions")
            .insert({
              week_id: weekData.id,
              session_number: session.session_number,
              name: session.name,
              day_of_week: session.day_of_week,
              scheduled_day: session.scheduled_day,
            })
            .select()
            .single();

          if (sessionError) throw sessionError;

          if (session.exercises.length > 0) {
            const exercisesToInsert = session.exercises.map((ex, idx) => ({
              session_id: sessionData.id,
              exercise_name: ex.exercise_name,
              library_exercise_id: ex.library_exercise_id || null,
              order_index: idx,
              method: ex.method,
              sets: ex.sets,
              reps: ex.reps,
              percentage_1rm: ex.percentage_1rm || null,
              tempo: ex.tempo || null,
              rest_seconds: ex.rest_seconds,
              group_id: ex.group_id || null,
              group_order: ex.group_order || null,
              notes: ex.notes || null,
              drop_sets: ex.drop_sets ? JSON.stringify(ex.drop_sets) : null,
              cluster_sets: ex.cluster_sets ? JSON.stringify(ex.cluster_sets) : null,
              is_rm_test: ex.is_rm_test || false,
              rm_test_type: ex.rm_test_type || null,
            }));

            const { error: exError } = await supabase
              .from("program_exercises")
              .insert(exercisesToInsert);

            if (exError) throw exError;
          }
        }
      }

      toast.success(programId ? "Programme mis à jour" : "Programme créé");
      queryClient.invalidateQueries({ queryKey: ["training-programs"] });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Erreur lors de la sauvegarde: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>
            {programId ? "Modifier le programme" : "Créer un programme"}
          </DialogTitle>
        </DialogHeader>

        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex flex-1 overflow-hidden">
            {/* Left side: Program builder */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 p-4">
                {/* Program info */}
                <div className="space-y-4 mb-6">
                  <h3 className="font-semibold">Informations du programme</h3>
                  
                  {/* Row 1: Name and Level */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom *</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Mon programme"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Niveau</Label>
                      <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Débutant</SelectItem>
                          <SelectItem value="intermediate">Intermédiaire</SelectItem>
                          <SelectItem value="advanced">Avancé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 2: Body Zone and Theme */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Zone du corps</Label>
                      <Select value={bodyZone} onValueChange={setBodyZone}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {BODY_ZONES.map((zone) => (
                            <SelectItem key={zone.value} value={zone.value}>
                              {zone.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Thème général</Label>
                      <Select 
                        value={theme} 
                        onValueChange={(v) => {
                          setTheme(v);
                          setSubTheme(""); // Reset sub-theme when theme changes
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {THEMES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedThemeOptions.length > 0 && (
                      <div className="space-y-2">
                        <Label>
                          {theme === "musculation" && "Objectif"}
                          {theme === "reathletisation" && "Phase"}
                          {theme === "terrain" && "Type"}
                        </Label>
                        <Select value={subTheme} onValueChange={setSubTheme}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedThemeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Display selected tags */}
                  {(bodyZone || theme || subTheme) && (
                    <div className="flex flex-wrap gap-2">
                      {bodyZone && (
                        <Badge variant="secondary">
                          {BODY_ZONES.find(z => z.value === bodyZone)?.label}
                        </Badge>
                      )}
                      {theme && (
                        <Badge variant="outline" className="bg-primary/10">
                          {THEMES.find(t => t.value === theme)?.label}
                        </Badge>
                      )}
                      {subTheme && (
                        <Badge className="bg-primary text-primary-foreground">
                          {selectedThemeOptions.find(o => o.value === subTheme)?.label}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Décrivez votre programme..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Weeks structure */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Structure du programme</h3>
                    <Button variant="outline" onClick={addWeek}>
                      <Plus className="h-4 w-4 mr-2" />
                      Semaine
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {weeks.map((week, weekIndex) => (
                      <ProgramWeekSection
                        key={week.id}
                        week={week}
                        weekIndex={weekIndex}
                        onUpdate={(updated) => updateWeek(weekIndex, updated)}
                        onDuplicate={() => duplicateWeek(weekIndex)}
                        onDelete={() => deleteWeek(weekIndex)}
                      />
                    ))}
                  </div>
                </div>
              </ScrollArea>

              {/* Save button */}
              <div className="p-4 border-t bg-background">
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Enregistrement..." : "Enregistrer le programme"}
                </Button>
              </div>
            </div>

            {/* Right side: Exercise library */}
            <ExerciseLibrarySidebar />
          </div>

          <DragOverlay>
            {activeExercise ? (
              <div className="bg-primary text-primary-foreground px-3 py-2 rounded-md shadow-lg">
                {activeExercise.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </DialogContent>
    </Dialog>
  );
}
