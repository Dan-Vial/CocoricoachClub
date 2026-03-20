import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { CustomTrainingTypeSelect } from "@/components/category/sessions/CustomTrainingTypeSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Users, UserCheck, AlertTriangle, Plus, Trash2, Dumbbell, ChevronDown, ChevronUp, Library, Copy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EXERCISE_CATEGORIES, getCategoryLabel, getCategoriesForSport, isCategoryForSport } from "@/lib/constants/exerciseCategories";
import { getTrainingTypesForSport, trainingTypeHasExercises } from "@/lib/constants/trainingTypes";
import { QuickAddExerciseDialog } from "@/components/library/QuickAddExerciseDialog";
import { SessionGpsImport, type GpsPlayerData } from "@/components/category/gps/SessionGpsImport";
import { SessionBlocksManager, type SessionBlock } from "@/components/category/sessions/SessionBlocksManager";
import { useSessionNotifications } from "@/lib/hooks/useSessionNotifications";

interface AddSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  /** When set, the dialog runs in "athlete mode": player is pre-selected & locked, session is tagged as athlete-created */
  athletePlayerId?: string;
}

interface Exercise {
  exercise_name: string;
  exercise_category: string;
  sets: number;
  reps: number | null;
  weight_kg: number | null;
  rest_seconds: number | null;
  notes: string;
  order_index: number;
  library_exercise_id: string | null;
}

const emptyExercise = (index: number): Exercise => ({
  exercise_name: "",
  exercise_category: "upper_push",
  sets: 3,
  reps: 10,
  weight_kg: null,
  rest_seconds: 90,
  notes: "",
  order_index: index,
  library_exercise_id: null,
});

export function AddSessionDialog({
  open,
  onOpenChange,
  categoryId,
  athletePlayerId,
}: AddSessionDialogProps) {
  const isAthleteMode = !!athletePlayerId;
  const { user } = useAuth();
  const { notify } = useSessionNotifications();
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [type, setType] = useState("");
  const [intensity, setIntensity] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [playerSelectionMode, setPlayerSelectionMode] = useState<"all" | "specific">("all");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExercises, setShowExercises] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLibraryFor, setShowLibraryFor] = useState<number | null>(null);
  const [showAddExerciseDialog, setShowAddExerciseDialog] = useState(false);
  const [gpsData, setGpsData] = useState<GpsPlayerData[]>([]);
  const [sessionBlocks, setSessionBlocks] = useState<SessionBlock[]>([]);
  const queryClient = useQueryClient();
  const exercisesSectionRef = useRef<HTMLDivElement | null>(null);

  // Fetch category to get sport type
  const { data: category } = useQuery({
    queryKey: ["category-sport-type", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const sportType = category?.rugby_type;
  const trainingTypes = getTrainingTypesForSport(sportType);
  
  const showExerciseSection = trainingTypeHasExercises(type);
  const hasValidBlocks = sessionBlocks.some((block) => !!block.training_type);

  // When a training type with exercises is selected, ensure UI is ready
  useEffect(() => {
    if (!open || !showExerciseSection) return;
    setShowExercises(true);
    setExercises((prev) => (prev.length === 0 ? [emptyExercise(0)] : prev));
  }, [open, showExerciseSection]);
...
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (endTime && !startTime) {
      toast.error("Veuillez indiquer une heure de début si vous spécifiez une heure de fin");
      return;
    }
    
    if (startTime && endTime && endTime <= startTime) {
      toast.error("L'heure de fin doit être après l'heure de début");
      return;
    }
    
    // Validate: must have at least one block with a thematic type
    if (date && hasValidBlocks) {
      addSession.mutate();
    } else if (!hasValidBlocks) {
      toast.error("Veuillez ajouter au moins un bloc thématique");
    }
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const selectAllInjured = () => {
    setSelectedPlayers(injuredPlayers.map(p => p.id));
    setPlayerSelectionMode("specific");
  };

  const selectAllHealthy = () => {
    setSelectedPlayers(healthyPlayers.map(p => p.id));
    setPlayerSelectionMode("specific");
  };

  const selectAll = () => {
    setSelectedPlayers(players?.map(p => p.id) || []);
    setPlayerSelectionMode("specific");
  };

  const clearSelection = () => {
    setSelectedPlayers([]);
  };

  // Exercise management
  const addExercise = () => {
    setExercises([...exercises, emptyExercise(exercises.length)]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const duplicateExercise = (index: number) => {
    const exercise = { ...exercises[index], order_index: exercises.length };
    setExercises([...exercises, exercise]);
  };

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const selectFromLibrary = (index: number, libExercise: any) => {
    updateExercise(index, "exercise_name", libExercise.name);
    updateExercise(index, "exercise_category", libExercise.category);
    updateExercise(index, "library_exercise_id", libExercise.id);
    setShowLibraryFor(null);
    setSearchQuery("");
  };

  // getCategoryLabel is now imported from constants

  // Handle type change to auto-add empty exercise
  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (trainingTypeHasExercises(newType) && exercises.length === 0) {
      setExercises([emptyExercise(0)]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isAthleteMode ? "Ajouter ma séance" : "Ajouter une séance d'entraînement"}</DialogTitle>
          {isAthleteMode && (
            <p className="text-sm text-muted-foreground">
              Cette séance sera visible par le staff dans le planning.
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-4 py-4">
              {/* Date and time */}
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Heure de début</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Heure de fin</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Session Blocks Manager - for multi-theme sessions */}
              <SessionBlocksManager
                blocks={sessionBlocks}
                onBlocksChange={setSessionBlocks}
                sportType={sportType}
                categoryId={categoryId}
                sessionStartTime={startTime}
                sessionEndTime={endTime}
              />

              {/* Intensity - only shown if no blocks (blocks have their own RPE) */}
              {sessionBlocks.length === 0 && (
                <div className="space-y-2">
                  <Label htmlFor="intensity">Intensité (1-10)</Label>
                  <Input
                    id="intensity"
                    type="number"
                    min="1"
                    max="10"
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    placeholder="De 1 à 10"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Remarques ou détails supplémentaires..."
                  rows={2}
                />
              </div>

              {/* GPS Import Section - staff only */}
              {!isAthleteMode && (
                <SessionGpsImport
                  players={players?.map(p => ({ id: p.id, name: p.name, position: p.position })) || []}
                  gpsData={gpsData}
                  onGpsDataChange={setGpsData}
                />
              )}

              {/* Exercises Section - Only shown for certain training types */}
              {showExerciseSection && (
                <Collapsible open={showExercises} onOpenChange={setShowExercises}>
                  <div ref={exercisesSectionRef} className="border rounded-lg p-4 bg-muted/30">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer">
                        <Label className="flex items-center gap-2 text-base font-medium cursor-pointer">
                          <Dumbbell className="h-4 w-4" />
                          Exercices de la séance
                          {exercises.filter((e) => e.exercise_name.trim()).length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {exercises.filter((e) => e.exercise_name.trim()).length}
                            </Badge>
                          )}
                        </Label>
                        <Button type="button" variant="ghost" size="sm">
                          {showExercises ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-3 mt-4 max-h-[50vh] overflow-y-auto pr-2">
                      {exercises.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground mb-2">Aucun exercice ajouté</p>
                          <div className="flex items-center justify-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                              <Plus className="h-4 w-4 mr-1" />
                              Ajouter un exercice
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setShowAddExerciseDialog(true)}
                            >
                              <Library className="h-4 w-4 mr-1" />
                              Créer dans la bibliothèque
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {exercises.map((exercise, index) => (
                            <div key={index} className="p-3 border rounded-lg bg-card space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                                <div className="flex-1 relative">
                                  <Popover
                                    open={showLibraryFor === index}
                                    onOpenChange={(isOpen) => {
                                      setShowLibraryFor(isOpen ? index : null);
                                      if (isOpen) setSearchQuery(exercise.exercise_name);
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <div className="relative">
                                        <Input
                                          placeholder="Nom de l'exercice..."
                                          value={exercise.exercise_name}
                                          onChange={(e) => {
                                            updateExercise(index, "exercise_name", e.target.value);
                                            setSearchQuery(e.target.value);
                                            setShowLibraryFor(index);
                                          }}
                                        />
                                        {exercise.library_exercise_id && (
                                          <Library className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                        )}
                                      </div>
                                    </PopoverTrigger>

                                    <PopoverContent
                                      align="start"
                                      className="p-1 w-[--radix-popover-trigger-width] max-h-64 overflow-y-auto"
                                      onOpenAutoFocus={(e) => e.preventDefault()}
                                    >
                                      {filteredLibrary.length === 0 ? (
                                        <div className="px-2 py-2 text-xs text-muted-foreground">Aucun exercice trouvé</div>
                                      ) : (
                                        filteredLibrary.slice(0, 12).map((libEx) => (
                                          <button
                                            key={libEx.id}
                                            type="button"
                                            className="w-full text-left px-2 py-2 hover:bg-muted rounded-sm text-sm flex justify-between items-center"
                                            onClick={() => selectFromLibrary(index, libEx)}
                                          >
                                            <span className="truncate pr-2">{libEx.name}</span>
                                            <Badge variant="outline" className="text-xs shrink-0">
                                              {getCategoryLabel(libEx.category)}
                                            </Badge>
                                          </button>
                                        ))
                                      )}
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => duplicateExercise(index)}
                                  title="Dupliquer"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeExercise(index)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Catégorie</Label>
                                  <Select
                                    value={exercise.exercise_category}
                                    onValueChange={(v) => updateExercise(index, "exercise_category", v)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableCategories.map((c) => (
                                        <SelectItem key={c.value} value={c.value}>
                                          {c.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Séries</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    className="h-8 text-xs"
                                    value={exercise.sets}
                                    onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value) || 1)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Reps</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    className="h-8 text-xs"
                                    value={exercise.reps || ""}
                                    onChange={(e) =>
                                      updateExercise(index, "reps", e.target.value ? parseInt(e.target.value) : null)
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Poids (kg)</Label>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    className="h-8 text-xs"
                                    value={exercise.weight_kg || ""}
                                    onChange={(e) =>
                                      updateExercise(index, "weight_kg", e.target.value ? parseFloat(e.target.value) : null)
                                    }
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Repos (sec)</Label>
                                  <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    value={exercise.rest_seconds || ""}
                                    onChange={(e) =>
                                      updateExercise(
                                        index,
                                        "rest_seconds",
                                        e.target.value ? parseInt(e.target.value) : null
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Notes</Label>
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder="Notes..."
                                    value={exercise.notes}
                                    onChange={(e) => updateExercise(index, "notes", e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          <Button type="button" variant="outline" size="sm" onClick={addExercise} className="w-full">
                            <Plus className="h-4 w-4 mr-1" />
                            Ajouter un exercice
                          </Button>
                        </>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* Player Selection Section */}
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <Label className="flex items-center gap-2 text-base font-medium">
                  <Users className="h-4 w-4" />
                  Joueurs concernés
                </Label>

                {isAthleteMode ? (
                  <div className="space-y-2">
                    {(() => {
                      const athletePlayer = players?.find(p => p.id === athletePlayerId);
                      return athletePlayer ? (
                        <div className="flex items-center gap-2 p-2 rounded-md border border-primary bg-primary/10">
                          <Checkbox checked={true} className="pointer-events-none" />
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={athletePlayer.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{(athletePlayer.first_name || athletePlayer.name).slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate flex-1">
                            {athletePlayer.first_name ? `${athletePlayer.first_name} ${athletePlayer.name}` : athletePlayer.name}
                          </span>
                          {athletePlayer.position && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {athletePlayer.position}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Chargement...</p>
                      );
                    })()}
                    <p className="text-xs text-muted-foreground">
                      Cette séance sera créée uniquement pour toi.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-end">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={playerSelectionMode === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setPlayerSelectionMode("all");
                            setSelectedPlayers([]);
                          }}
                        >
                          Tous
                        </Button>
                        <Button
                          type="button"
                          variant={playerSelectionMode === "specific" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPlayerSelectionMode("specific")}
                        >
                          Spécifiques
                        </Button>
                      </div>
                    </div>

                    {playerSelectionMode === "specific" && (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={selectAll} className="text-xs">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Tous ({players?.length || 0})
                          </Button>
                          {injuredPlayers.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={selectAllInjured}
                              className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Blessés ({injuredPlayers.length})
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={selectAllHealthy}
                            className="text-xs border-green-300 text-green-700 hover:bg-green-50"
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Aptes ({healthyPlayers.length})
                          </Button>
                          {selectedPlayers.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={clearSelection}
                              className="text-xs text-muted-foreground"
                            >
                              Effacer
                            </Button>
                          )}
                        </div>

                        {selectedPlayers.length > 0 && (
                          <Badge variant="secondary" className="w-fit">
                            {selectedPlayers.length} joueur(s) sélectionné(s)
                          </Badge>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {players?.map((player) => (
                            <div
                              key={player.id}
                              onClick={() => togglePlayer(player.id)}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors select-none",
                                selectedPlayers.includes(player.id)
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:bg-muted/50",
                                player.isInjured && "border-amber-300 bg-amber-50/50"
                              )}
                            >
                              <Checkbox
                                checked={selectedPlayers.includes(player.id)}
                                className="pointer-events-none"
                              />
                              <Avatar className="h-6 w-6 pointer-events-none">
                                <AvatarImage src={player.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">{(player.first_name || player.name).slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate flex-1 pointer-events-none">{player.first_name ? `${player.first_name} ${player.name}` : player.name}</span>
                              {player.isInjured && <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0 pointer-events-none" />}
                              {player.position && (
                                <Badge variant="outline" className="text-xs flex-shrink-0 pointer-events-none">
                                  {player.position}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {playerSelectionMode === "all" && (
                      <p className="text-sm text-muted-foreground">
                        Tous les joueurs de la catégorie seront concernés par cette séance.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!date || !hasValidBlocks || addSession.isPending}>
              {addSession.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      <QuickAddExerciseDialog
        open={showAddExerciseDialog}
        onOpenChange={setShowAddExerciseDialog}
        sportType={sportType}
        onSuccess={(newExercise) => {
          // Add the new exercise to the session
          const newEx = emptyExercise(exercises.length);
          newEx.exercise_name = newExercise.name;
          newEx.exercise_category = newExercise.category;
          newEx.library_exercise_id = newExercise.id;
          setExercises([...exercises, newEx]);
        }}
      />
    </Dialog>
  );
}
