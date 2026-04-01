import { useState, useEffect, useMemo } from "react";
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
import { ProgramBlockSection, type ProgramBlock } from "./ProgramBlockSection";
import { ExerciseLibrarySidebar } from "./ExerciseLibrarySidebar";
import { Plus, Save, AlertTriangle, Layers } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { getTrainingTypesForSport } from "@/lib/constants/trainingTypes";
// Protocols are now fetched from the database (injury_protocols table)
import { Card, CardContent } from "@/components/ui/card";

interface ProgramBuilderDialogProps {
  categoryId: string;
  programId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rehabMode?: boolean;
  rehabPhaseName?: string;
  onProgramSaved?: (programId: string) => void;
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
  block_name?: string;
  block_order?: number;
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
  exercise_category?: string;
  order_index: number;
  method: string;
  sets: number;
  reps: string;
  percentage_1rm?: number;
  weight_kg?: number | null;
  tempo?: string;
  rest_seconds: number;
  group_id?: string;
  group_order?: number;
  notes?: string;
  drop_sets?: DropSet[];
  cluster_sets?: ClusterSet[];
  is_rm_test?: boolean;
  rm_test_type?: string;
  target_velocity?: number;
  target_force_newton?: number | null;
  erg_data?: any;
  running_data?: any;
  bodyweight_data?: any;
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

// Base theme options (terrain sub-options will be dynamic based on sport)
const BASE_THEMES = [
  { value: "musculation", label: "Musculation", subOptions: [
    { value: "force", label: "Force" },
    { value: "hypertrophie", label: "Hypertrophie" },
    { value: "puissance", label: "Puissance" },
    { value: "vitesse", label: "Vitesse" },
    { value: "endurance_force", label: "Endurance de force" },
  ]},
  { value: "course", label: "Course", subOptions: [
    { value: "ef", label: "Endurance Fondamentale" },
    { value: "seuil", label: "Seuil" },
    { value: "vma", label: "VMA" },
    { value: "fractionne", label: "Fractionné" },
    { value: "tempo_run", label: "Tempo Run" },
    { value: "fartlek", label: "Fartlek" },
    { value: "cote", label: "Côtes" },
    { value: "sprint", label: "Sprint" },
    { value: "recup_active", label: "Récupération active" },
  ]},
  { value: "reathletisation", label: "Réathlétisation", subOptions: [
    { value: "phase_1", label: "Phase 1 - Protection / Mobilité" },
    { value: "phase_2", label: "Phase 2 - Renforcement progressif" },
    { value: "phase_3", label: "Phase 3 - Retour terrain" },
    { value: "phase_4", label: "Phase 4 - Retour compétition" },
  ]},
  { value: "terrain", label: "Terrain", subOptions: [] }, // Will be populated dynamically
];

// Common terrain sub-options (fallback)
const COMMON_TERRAIN_OPTIONS = [
  { value: "physique", label: "Physique général" },
  { value: "collectif", label: "Collectif" },
  { value: "bronco", label: "Bronco" },
  { value: "yoyo_test", label: "Yo-Yo Test" },
  { value: "vma", label: "VMA" },
  { value: "intermittent", label: "Intermittent" },
];

export function ProgramBuilderDialog({
  categoryId,
  programId,
  open,
  onOpenChange,
  rehabMode,
  rehabPhaseName,
  onProgramSaved,
}: ProgramBuilderDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("intermediate");
  const [bodyZone, setBodyZone] = useState<string>("");
  const [theme, setTheme] = useState<string>("");
  const [subTheme, setSubTheme] = useState<string>("");
  const [blocks, setBlocks] = useState<ProgramBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeExercise, setActiveExercise] = useState<any>(null);
  const [selectedInjuryId, setSelectedInjuryId] = useState<string>("");
  const [selectedInjuryType, setSelectedInjuryType] = useState<string>("");
  const [rehabPhasesConfig, setRehabPhasesConfig] = useState([
    { key: "phase_1", name: "Phase 1 - Protection / Mobilité", enabled: true, sessions: 3, sessionNames: ["Contrôle douleur", "Mobilité passive", "Contractions isométriques"] },
    { key: "phase_2", name: "Phase 2 - Renforcement progressif", enabled: true, sessions: 3, sessionNames: ["Renforcement concentrique", "Renforcement excentrique", "Proprioception"] },
    { key: "phase_3", name: "Phase 3 - Retour terrain", enabled: true, sessions: 3, sessionNames: ["Course progressive", "Changements de direction", "Gestes sport-spécifiques"] },
    { key: "phase_4", name: "Phase 4 - Retour compétition", enabled: true, sessions: 3, sessionNames: ["Entraînement collectif", "Intensité match", "Tests de validation"] },
  ]);

  // Fetch category to get sport type
  const { data: category } = useQuery({
    queryKey: ["category-sport", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId && open,
  });

  // Fetch active injuries for the category (for rehab programs)
  const { data: activeInjuries } = useQuery({
    queryKey: ["category-active-injuries", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injuries")
        .select(`
          id,
          injury_type,
          severity,
          status,
          player_id,
          players(name)
        `)
        .eq("category_id", categoryId)
        .in("status", ["active", "recovering"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId && open && theme === "reathletisation",
  });

  // Fetch injury protocols (system defaults + category-specific)
  const { data: injuryProtocols } = useQuery({
    queryKey: ["injury-protocols-for-program", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injury_protocols")
        .select(`
          id, name, injury_category, description, typical_duration_days_min, typical_duration_days_max, is_system_default,
          protocol_phases (id, phase_number, name, description)
        `)
        .or(`is_system_default.eq.true,category_id.eq.${categoryId}`)
        .order("injury_category")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId && open && theme === "reathletisation",
  });

  // Build THEMES with dynamic terrain options based on sport
  const THEMES = useMemo(() => {
    const sportType = category?.rugby_type;
    const sportTrainingTypes = getTrainingTypesForSport(sportType);
    
    // Filter only field/terrain related training types (exclude musculation, physique, etc.)
    const terrainOptions = sportTrainingTypes
      .filter(t => {
        // Include sport-specific types and some common terrain types
        const isMusculationRelated = ['musculation', 'physique', 'reathlétisation', 'repos', 'test', 'echauffement', 'recuperation'].includes(t.value);
        return !isMusculationRelated;
      })
      .map(t => ({ value: t.value, label: t.label }));

    // Add common terrain options if not already included
    const existingValues = terrainOptions.map(t => t.value);
    const additionalCommon = COMMON_TERRAIN_OPTIONS.filter(t => !existingValues.includes(t.value));
    
    return BASE_THEMES.map(baseTheme => {
      if (baseTheme.value === "terrain") {
        return {
          ...baseTheme,
          subOptions: [...terrainOptions, ...additionalCommon],
        };
      }
      return baseTheme;
    });
  }, [category?.rugby_type]);

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

  // Helper: convert flat weeks to blocks
  const weeksToBlocks = (weeks: ProgramWeek[]): ProgramBlock[] => {
    const blockMap = new Map<string, ProgramWeek[]>();
    for (const week of weeks) {
      const blockName = week.block_name || "Bloc 1";
      if (!blockMap.has(blockName)) blockMap.set(blockName, []);
      blockMap.get(blockName)!.push(week);
    }
    return Array.from(blockMap.entries()).map(([name, bWeeks], idx) => ({
      id: crypto.randomUUID(),
      name,
      order: bWeeks[0]?.block_order ?? idx,
      weeks: bWeeks,
    })).sort((a, b) => a.order - b.order);
  };

  // Helper: convert blocks to flat weeks
  const blocksToWeeks = (blks: ProgramBlock[]): ProgramWeek[] => {
    let globalWeekNumber = 1;
    return blks.flatMap((block, blockIdx) =>
      block.weeks.map((w) => ({
        ...w,
        week_number: globalWeekNumber++,
        block_name: block.name,
        block_order: blockIdx,
      }))
    );
  };

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
        block_name: w.block_name,
        block_order: w.block_order,
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
            exercise_category: e.exercise_category,
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
            target_velocity: e.target_velocity,
            target_force_newton: e.target_force_newton,
            erg_data: e.erg_data,
            running_data: e.running_data,
            bodyweight_data: e.bodyweight_data,
          })).sort((a: any, b: any) => a.order_index - b.order_index) || [],
        })).sort((a: any, b: any) => a.session_number - b.session_number) || [],
      })) || [];

      const loadedBlocks = weeksToBlocks(loadedWeeks);
      setBlocks(loadedBlocks.length > 0 ? loadedBlocks : [createEmptyBlock(1)]);
    } else if (!programId) {
      // Set defaults for rehab mode
      if (rehabMode && !name) {
        setName(`Programme réathléthisation - ${rehabPhaseName || "Phase"}`);
        setTheme("reathletisation");
      }
      setBlocks([createEmptyBlock(1)]);
    }
  }, [existingProgram, programId]);

  const createEmptyBlock = (order: number): ProgramBlock => ({
    id: crypto.randomUUID(),
    name: `Bloc ${order}`,
    order,
    weeks: [createEmptyWeek(1)],
  });

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

  const addBlock = () => {
    setBlocks([...blocks, createEmptyBlock(blocks.length + 1)]);
  };

  const duplicateBlock = (blockIndex: number) => {
    const blockToDupe = blocks[blockIndex];
    const newBlock: ProgramBlock = {
      ...blockToDupe,
      id: crypto.randomUUID(),
      name: `${blockToDupe.name} (copie)`,
      order: blocks.length + 1,
      weeks: blockToDupe.weeks.map((w) => ({
        ...w,
        id: crypto.randomUUID(),
        sessions: w.sessions.map((s) => ({
          ...s,
          id: crypto.randomUUID(),
          exercises: s.exercises.map((e) => ({
            ...e,
            id: crypto.randomUUID(),
            group_id: e.group_id ? crypto.randomUUID() : undefined,
          })),
        })),
      })),
    };
    setBlocks([...blocks, newBlock]);
  };

  const deleteBlock = (blockIndex: number) => {
    if (blocks.length === 1) {
      toast.error("Le programme doit avoir au moins un bloc");
      return;
    }
    const newBlocks = blocks.filter((_, i) => i !== blockIndex);
    setBlocks(newBlocks.map((b, i) => ({ ...b, order: i + 1 })));
  };

  const updateBlock = (blockIndex: number, updatedBlock: ProgramBlock) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = updatedBlock;
    setBlocks(newBlocks);
  };

  const handleDragStart = (event: any) => {
    setActiveExercise(event.active.data.current);
  };

  const handleDragEnd = (event: any) => {
    setActiveExercise(null);
    const { active, over } = event;

    if (!over) return;

    const droppedExercise = active.data.current;
    const targetSessionId = over.id as string;

    // Find the session across all blocks and add the exercise
    const newBlocks = blocks.map((block) => ({
      ...block,
      weeks: block.weeks.map((week) => ({
        ...week,
        sessions: week.sessions.map((session) => {
          if (session.id === targetSessionId) {
            const newExercise: ProgramExercise = {
              id: crypto.randomUUID(),
              exercise_name: droppedExercise.name,
              library_exercise_id: droppedExercise.id,
              exercise_category: droppedExercise.category,
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
      })),
    }));

    setBlocks(newBlocks);
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
      const allWeeks = blocksToWeeks(blocks);
      for (const week of allWeeks) {
        const { data: weekData, error: weekError } = await supabase
          .from("program_weeks")
          .insert({
            program_id: programIdToUse,
            week_number: week.week_number,
            name: week.name,
            block_name: week.block_name || null,
            block_order: week.block_order ?? 0,
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
              exercise_category: ex.exercise_category || null,
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
              target_velocity: ex.target_velocity || null,
              target_force_newton: ex.target_force_newton || null,
              erg_data: ex.erg_data ? JSON.stringify(ex.erg_data) : null,
              running_data: ex.running_data ? JSON.stringify(ex.running_data) : null,
              bodyweight_data: ex.bodyweight_data ? JSON.stringify(ex.bodyweight_data) : null,
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
      queryClient.invalidateQueries({ queryKey: ["linked-program"] });
      if (onProgramSaved && programIdToUse) {
        onProgramSaved(programIdToUse);
      } else {
        onOpenChange(false);
      }
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

                  {/* Injury selector for rehab programs */}
                  {theme === "reathletisation" && (
                    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                      <CardContent className="pt-4 space-y-4">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="h-5 w-5" />
                          <span className="font-semibold">Programme de réathlétisation</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Select from active injuries */}
                          <div className="space-y-2">
                            <Label>Blessure active (joueur)</Label>
                            <Select 
                              value={selectedInjuryId} 
                              onValueChange={(v) => {
                                setSelectedInjuryId(v);
                                if (v) {
                                  const injury = activeInjuries?.find(i => i.id === v);
                                  if (injury) {
                                    setSelectedInjuryType(injury.injury_type || "");
                                    // Auto-set program name based on injury
                                    if (!name) {
                                      const playerName = (injury.players as any)?.name || "Joueur";
                                      setName(`Réathlétisation ${injury.injury_type} - ${playerName}`);
                                    }
                                  }
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une blessure..." />
                              </SelectTrigger>
                              <SelectContent>
                                {activeInjuries && activeInjuries.length > 0 ? (
                                  activeInjuries.map((injury) => (
                                    <SelectItem key={injury.id} value={injury.id}>
                                      <div className="flex flex-col">
                                        <span className="font-medium">{(injury.players as any)?.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {injury.injury_type} ({injury.severity})
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="__none__" disabled>
                                    Aucune blessure active
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Or select from injury protocols */}
                          <div className="space-y-2">
                            <Label>Ou protocole de réathlétisation</Label>
                            <Select 
                              value={selectedInjuryType} 
                              onValueChange={(v) => {
                                setSelectedInjuryType(v);
                                setSelectedInjuryId("");
                                const protocol = injuryProtocols?.find(p => p.id === v);
                                if (protocol) {
                                  if (!name) {
                                    setName(`Réathlétisation - ${protocol.name}`);
                                  }
                                  // Update phases config from protocol phases
                                  const protocolPhases = (protocol as any).protocol_phases;
                                  if (protocolPhases && protocolPhases.length > 0) {
                                    const sorted = [...protocolPhases].sort((a: any, b: any) => a.phase_number - b.phase_number);
                                    setRehabPhasesConfig(sorted.map((p: any) => ({
                                      key: `phase_${p.phase_number}`,
                                      name: `Phase ${p.phase_number} - ${p.name}`,
                                      enabled: true,
                                      sessions: 3,
                                      sessionNames: [p.description || `Séance 1`, `Séance 2`, `Séance 3`],
                                    })));
                                  }
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choisir un protocole..." />
                              </SelectTrigger>
                              <SelectContent className="z-[9999]">
                                {injuryProtocols && injuryProtocols.length > 0 ? (
                                  (() => {
                                    const grouped = injuryProtocols.reduce((acc, p) => {
                                      const cat = p.injury_category || "Autre";
                                      if (!acc[cat]) acc[cat] = [];
                                      acc[cat].push(p);
                                      return acc;
                                    }, {} as Record<string, typeof injuryProtocols>);
                                    return Object.entries(grouped).map(([category, protocols]) => (
                                      <div key={category}>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{category}</div>
                                        {protocols.map((protocol) => (
                                          <SelectItem key={protocol.id} value={protocol.id}>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className="text-xs shrink-0">
                                                {protocol.injury_category}
                                              </Badge>
                                              <span className="truncate">{protocol.name}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </div>
                                    ));
                                  })()
                                ) : (
                                  <SelectItem value="__none__" disabled>
                                    Aucun protocole disponible
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Show protocol details if selected */}
                        {selectedInjuryType && injuryProtocols && (
                          <div className="bg-white dark:bg-background rounded-lg p-3 border">
                            {(() => {
                              const protocol = injuryProtocols.find(p => p.id === selectedInjuryType);
                              if (!protocol) return null;
                              return (
                                <>
                                  <p className="text-sm font-medium mb-1">{protocol.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {protocol.description || "Protocole de réathlétisation"}
                                    <br />
                                    <span className="font-medium">
                                      Durée estimée: {protocol.typical_duration_days_min || "?"} - {protocol.typical_duration_days_max || "?"} jours
                                    </span>
                                  </p>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* Configurable rehab phases */}
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            Configurer les phases (à la carte)
                          </p>
                          {rehabPhasesConfig.map((phase, idx) => (
                            <div key={phase.key} className="flex items-center gap-3 rounded-md border p-2">
                              <input
                                type="checkbox"
                                checked={phase.enabled}
                                onChange={(e) => {
                                  const updated = [...rehabPhasesConfig];
                                  updated[idx] = { ...updated[idx], enabled: e.target.checked };
                                  setRehabPhasesConfig(updated);
                                }}
                                className="h-4 w-4 rounded accent-primary"
                              />
                              <span className={`text-sm flex-1 ${!phase.enabled ? "text-muted-foreground line-through" : "font-medium"}`}>
                                {phase.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">Séances:</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={7}
                                  value={phase.sessions}
                                  disabled={!phase.enabled}
                                  onChange={(e) => {
                                    const val = Math.max(1, Math.min(7, parseInt(e.target.value) || 1));
                                    const updated = [...rehabPhasesConfig];
                                    updated[idx] = { ...updated[idx], sessions: val };
                                    setRehabPhasesConfig(updated);
                                  }}
                                  className="w-16 h-8 text-xs text-center"
                                />
                              </div>
                            </div>
                          ))}

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30"
                            onClick={() => {
                              const enabledPhases = rehabPhasesConfig.filter(p => p.enabled);
                              if (enabledPhases.length === 0) {
                                toast.error("Sélectionnez au moins une phase");
                                return;
                              }
                              // Each phase becomes a block, each block has 1 week with N sessions
                              const newBlocks: ProgramBlock[] = enabledPhases.map((phase, index) => ({
                                id: crypto.randomUUID(),
                                name: phase.name,
                                order: index,
                                weeks: [{
                                  id: crypto.randomUUID(),
                                  week_number: 1,
                                  name: `Semaine 1`,
                                  block_name: phase.name,
                                  block_order: index,
                                  sessions: Array.from({ length: phase.sessions }, (_, sIndex) => ({
                                    id: crypto.randomUUID(),
                                    session_number: sIndex + 1,
                                    name: phase.sessionNames[sIndex] || `Séance ${sIndex + 1}`,
                                    exercises: [],
                                  })),
                                }],
                              }));
                              setBlocks(newBlocks);
                              toast.success(`${enabledPhases.length} bloc(s) de phase générés`);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Générer le programme
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

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

                {/* Block structure */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Structure du programme</h3>
                    <Button variant="outline" onClick={addBlock}>
                      <Layers className="h-4 w-4 mr-2" />
                      Ajouter un bloc
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {blocks.map((block, blockIndex) => (
                      <ProgramBlockSection
                        key={block.id}
                        block={block}
                        blockIndex={blockIndex}
                        onUpdate={(updated) => updateBlock(blockIndex, updated)}
                        onDuplicate={() => duplicateBlock(blockIndex)}
                        onDelete={() => deleteBlock(blockIndex)}
                        canDelete={blocks.length > 1}
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
            <ExerciseLibrarySidebar sportType={category?.rugby_type} />
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
