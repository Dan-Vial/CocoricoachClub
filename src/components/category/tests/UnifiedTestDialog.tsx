import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PlayerSelection } from "./PlayerSelection";
import { getTestCategoriesForSport, TestOption } from "@/lib/constants/testCategories";
import { HierarchicalTestSelector, resolveTestCategory, resolveGroupAndZone } from "./HierarchicalTestSelector";
import { Gauge } from "lucide-react";

interface UnifiedTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sportType?: string;
  defaultFilterCategory?: string;
  defaultFilterTestType?: string;
  allowCustomTest?: boolean;
}

export function UnifiedTestDialog({
  open, onOpenChange, categoryId, sportType, defaultFilterCategory, defaultFilterTestType, allowCustomTest = true,
}: UnifiedTestDialogProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"all" | "specific">("all");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedTest, setSelectedTest] = useState("");
  const [playerResults, setPlayerResults] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [customTestName, setCustomTestName] = useState("");
  const [customTestUnit, setCustomTestUnit] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [saveAsGpsVmax, setSaveAsGpsVmax] = useState(false);
  const queryClient = useQueryClient();

  // Map sprint test types to their distances in meters
  const SPRINT_DISTANCE_MAP: Record<string, number> = {
    sprint_10m: 10, sprint_20m: 20, sprint_30m: 30, sprint_40m: 40,
    sprint_50m: 50, sprint_100m: 100,
    rugby_prone_30m: 30,
    basketball_sprint_3_4: 21, // ~3/4 of 28m court
    basketball_sprint_full: 28,
    football_sprint_30m: 30, football_sprint_40m: 40,
  };

  const isSprintTest = !isCustom && selectedTest && (
    selectedTest in SPRINT_DISTANCE_MAP ||
    selectedTest.startsWith("sprint_")
  );

  const sprintDistance = isSprintTest ? (SPRINT_DISTANCE_MAP[selectedTest] || null) : null;

  // Pre-select group/zone/test when dialog opens with a default filter
  useEffect(() => {
    if (open && defaultFilterCategory) {
      const { group, zone } = resolveGroupAndZone(defaultFilterCategory, sportType || "");
      setSelectedGroup(group);
      setSelectedZone(zone);
      if (defaultFilterTestType) {
        setSelectedTest(defaultFilterTestType);
      } else {
        setSelectedTest("");
      }
      setPlayerResults({});
    }
  }, [open, defaultFilterCategory, defaultFilterTestType, sportType]);

  const AVAILABLE_UNITS = [
    { value: "kg", label: "Kilogrammes (kg)" },
    { value: "N", label: "Newton (N)" },
    { value: "cm", label: "Centimètres (cm)" },
    { value: "m", label: "Mètres (m)" },
    { value: "m/s", label: "Mètres/seconde (m/s)" },
    { value: "km/h", label: "Kilomètres/heure (km/h)" },
    { value: "W", label: "Watts (W)" },
    { value: "W/kg", label: "Watts/kg (W/kg)" },
    { value: "cal", label: "Calories (cal)" },
    { value: "s", label: "Secondes (s)" },
    { value: "min.s", label: "Minutes.secondes (min.s)" },
    { value: "reps", label: "Répétitions (reps)" },
    { value: "%", label: "Pourcentage (%)" },
    { value: "palier", label: "Palier" },
    { value: "ml/kg/min", label: "VO2max (ml/kg/min)" },
    { value: "mmol/L", label: "Lactate (mmol/L)" },
    { value: "bpm", label: "Battements/min (bpm)" },
    { value: "score", label: "Score" },
    { value: "°", label: "Degrés (°)" },
  ];

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players").select("*").eq("category_id", categoryId).order("name");
      if (error) throw error;
      return data;
    },
  });

  const effectivePlayers = selectionMode === "all" 
    ? (players || []) 
    : (players || []).filter(p => selectedPlayers.includes(p.id));

  const filteredTestCategories = getTestCategoriesForSport(sportType || "");
  
  const resolvedCategory = resolveTestCategory(selectedGroup, selectedZone, sportType || "");
  const currentCategoryObj = filteredTestCategories.find(c => c.value === resolvedCategory);
  
  const currentTest: TestOption | null = isCustom 
    ? (customTestName && customTestUnit ? { value: `custom_${customTestName.toLowerCase().replace(/\s+/g, '_')}`, label: customTestName, unit: customTestUnit, isTime: ["s", "min.s"].includes(customTestUnit) } as TestOption : null)
    : currentCategoryObj?.tests.find(t => t.value === selectedTest) || null;

  const addTests = useMutation({
    mutationFn: async () => {
      const testLabel = isCustom ? customTestName : currentTest?.label || "";
      const categoryLabel = isCustom ? "Personnalisé" : currentCategoryObj?.label || "";
      const testCategory = isCustom ? "custom" : resolvedCategory;
      const testType = isCustom ? `custom_${customTestName.toLowerCase().replace(/\s+/g, '_')}` : selectedTest;

      const { data: sessionData, error: sessionError } = await supabase
        .from("training_sessions")
        .insert({ category_id: categoryId, session_date: date, training_type: "test", notes: `Test: ${categoryLabel} - ${testLabel}` })
        .select("id").single();
      if (sessionError) throw sessionError;

      const inserts = effectivePlayers
        .filter(player => playerResults[player.id])
        .map(player => ({
          player_id: player.id, category_id: categoryId, test_date: date,
          test_category: testCategory, test_type: testType,
          result_value: parseFloat(playerResults[player.id]),
          result_unit: currentTest?.unit || customTestUnit || "",
          notes: `Session ID: ${sessionData.id}` + (notes ? `\n${notes}` : ""),
        }));

      if (inserts.length === 0) throw new Error("Aucun résultat saisi");
      const { error } = await supabase.from("generic_tests").insert(inserts);
      if (error) throw error;

      // Save Vmax references for GPS if checkbox is checked
      if (saveAsGpsVmax && sprintDistance) {
        const vmaxInserts = inserts
          .filter(i => i.result_value > 0)
          .map(i => {
            const timeSeconds = i.result_value;
            const vmaxMs = sprintDistance / timeSeconds;
            const vmaxKmh = vmaxMs * 3.6;
            return {
              player_id: i.player_id,
              category_id: categoryId,
              test_date: date,
              source_type: "speed_test" as const,
              ref_vmax_ms: Math.round(vmaxMs * 100) / 100,
              ref_vmax_kmh: Math.round(vmaxKmh * 100) / 100,
              ref_sprint_distance_m: sprintDistance,
              ref_time_40m_seconds: sprintDistance === 40 ? timeSeconds : null,
              is_active: true,
              notes: `Auto from ${testLabel} (${timeSeconds}s sur ${sprintDistance}m)`,
            };
          });

        if (vmaxInserts.length > 0) {
          // Deactivate old references
          const playerIds = vmaxInserts.map(v => v.player_id);
          await supabase
            .from("player_performance_references")
            .update({ is_active: false })
            .eq("category_id", categoryId)
            .in("player_id", playerIds)
            .eq("is_active", true);

          const { error: refError } = await supabase
            .from("player_performance_references")
            .insert(vmaxInserts);
          if (refError) console.error("Erreur sauvegarde Vmax GPS:", refError);
          else toast.success(`Vmax GPS mis à jour pour ${vmaxInserts.length} joueur(s)`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generic_tests", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      // Invalidate analytics caches so new tests appear in Evolution/Comparison dropdowns
      queryClient.invalidateQueries({ queryKey: ["generic-tests-evolution", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["generic-tests-multi-comparison", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["speed-tests-evolution", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["speed-tests-multi-comparison", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["strength-tests-evolution", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["strength-tests-multi-comparison", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["jump-tests-evolution", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["jump-tests-multi-comparison", categoryId] });
      if (saveAsGpsVmax) {
        queryClient.invalidateQueries({ queryKey: ["player_performance_references", categoryId] });
        queryClient.invalidateQueries({ queryKey: ["player_active_reference"] });
      }
      toast.success("Tests ajoutés avec succès");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'ajout des tests");
    },
  });

  const resetForm = () => {
    setSelectedPlayers([]); setSelectionMode("all"); setSelectedGroup(""); setSelectedZone("");
    setSelectedTest(""); setPlayerResults({}); setNotes(""); setCustomTestName(""); setCustomTestUnit("");
    setIsCustom(false); setSaveAsGpsVmax(false);
  };

  const updatePlayerResult = (playerId: string, value: string) => {
    setPlayerResults(prev => ({ ...prev, [playerId]: value }));
  };

  const filledResultsCount = effectivePlayers.filter(p => playerResults[p.id]).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajouter un test de performance</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            <PlayerSelection
              categoryId={categoryId} selectedPlayers={selectedPlayers}
              onSelectionChange={setSelectedPlayers} selectionMode={selectionMode}
              onSelectionModeChange={setSelectionMode} players={players || []}
            />

            {allowCustomTest && (
              <div className="flex items-center gap-2">
                <Button
                  type="button" size="sm" variant={isCustom ? "default" : "outline"}
                  onClick={() => { setIsCustom(!isCustom); setSelectedGroup(""); setSelectedZone(""); setSelectedTest(""); setPlayerResults({}); }}
                >
                  ✨ Test personnalisé
                </Button>
              </div>
            )}

            {!isCustom && (
              <HierarchicalTestSelector
                sportType={sportType || ""}
                selectedGroup={selectedGroup}
                selectedZone={selectedZone}
                selectedTest={selectedTest}
                onGroupChange={(g) => { setSelectedGroup(g); setSelectedZone(""); setSelectedTest(""); setPlayerResults({}); }}
                onZoneChange={(z) => { setSelectedZone(z); setSelectedTest(""); setPlayerResults({}); }}
                onTestChange={setSelectedTest}
              />
            )}

            {isCustom && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom du test *</Label>
                  <Input value={customTestName} onChange={(e) => setCustomTestName(e.target.value)} placeholder="Ex: Test de Cooper modifié" />
                </div>
                <div className="space-y-2">
                  <Label>Unité de mesure *</Label>
                  <Select value={customTestUnit} onValueChange={setCustomTestUnit}>
                    <SelectTrigger><SelectValue placeholder="Choisir l'unité" /></SelectTrigger>
                    <SelectContent className="z-[9999] max-h-[300px]">
                      {AVAILABLE_UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Date du test *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            {effectivePlayers.length > 0 && ((isCustom && customTestName && customTestUnit) || selectedTest) && currentTest && (
              <div className="space-y-2">
                <Label>
                  Résultats {currentTest.unit && `(${currentTest.unit})`} - {filledResultsCount}/{effectivePlayers.length} saisis
                </Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/30">
                  {effectivePlayers.map((player) => (
                    <div key={player.id} className="flex items-center gap-2">
                      <span className="text-sm flex-1 truncate">{player.name}</span>
                      <Input type="number" step="0.01" value={playerResults[player.id] || ""} onChange={(e) => updatePlayerResult(player.id, e.target.value)} placeholder={currentTest.unit || "valeur"} className="w-24 h-8 text-sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isSprintTest && sprintDistance && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <Checkbox
                  id="save-gps-vmax"
                  checked={saveAsGpsVmax}
                  onCheckedChange={(checked) => setSaveAsGpsVmax(!!checked)}
                />
                <label htmlFor="save-gps-vmax" className="flex items-center gap-2 text-sm cursor-pointer">
                  <Gauge className="h-4 w-4 text-primary" />
                  <span>
                    <strong>Sauvegarder comme Vmax GPS</strong>
                    <span className="text-muted-foreground ml-1">
                      — Calcul automatique de la vitesse max ({sprintDistance}m) pour la Data GPS
                    </span>
                  </span>
                </label>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Conditions du test, remarques..." rows={2} />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={() => addTests.mutate()}
            disabled={(!selectedTest && !(isCustom && customTestName && customTestUnit)) || !date || filledResultsCount === 0 || addTests.isPending}
          >
            {addTests.isPending ? "Ajout..." : `Ajouter ${filledResultsCount} test${filledResultsCount > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
