import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PlayerSelection } from "./PlayerSelection";
import { TEST_CATEGORIES, TestCategory, TestOption, getTestCategoriesForSport } from "@/lib/constants/testCategories";

interface UnifiedTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sportType?: string;
}

export function UnifiedTestDialog({
  open,
  onOpenChange,
  categoryId,
  sportType,
}: UnifiedTestDialogProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"all" | "specific">("all");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTest, setSelectedTest] = useState("");
  const [playerResults, setPlayerResults] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [customTestName, setCustomTestName] = useState("");
  const [customTestUnit, setCustomTestUnit] = useState("");
  const queryClient = useQueryClient();

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
        .from("players")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const effectivePlayers = selectionMode === "all" 
    ? (players || []) 
    : (players || []).filter(p => selectedPlayers.includes(p.id));

  const filteredTestCategories = getTestCategoriesForSport(sportType || "");
  
  const isCustom = selectedCategory === "custom";
  const currentCategory = filteredTestCategories.find(c => c.value === selectedCategory);
  const currentTest = isCustom 
    ? (customTestName && customTestUnit ? { value: `custom_${customTestName.toLowerCase().replace(/\s+/g, '_')}`, label: customTestName, unit: customTestUnit, isTime: ["s", "min.s"].includes(customTestUnit) } as TestOption : null)
    : currentCategory?.tests.find(t => t.value === selectedTest);

  const addTests = useMutation({
    mutationFn: async () => {
      const testLabel = isCustom ? customTestName : currentTest?.label || "";
      const categoryLabel = isCustom ? "Personnalisé" : currentCategory?.label || "";
      const testCategory = isCustom ? "custom" : selectedCategory;
      const testType = isCustom ? `custom_${customTestName.toLowerCase().replace(/\s+/g, '_')}` : selectedTest;

      const { data: sessionData, error: sessionError } = await supabase
        .from("training_sessions")
        .insert({
          category_id: categoryId,
          session_date: date,
          training_type: "test",
          notes: `Test: ${categoryLabel} - ${testLabel}`,
        })
        .select("id")
        .single();

      if (sessionError) throw sessionError;

      const sessionId = sessionData.id;

      const inserts = effectivePlayers
        .filter(player => playerResults[player.id])
        .map(player => ({
          player_id: player.id,
          category_id: categoryId,
          test_date: date,
          test_category: testCategory,
          test_type: testType,
          result_value: parseFloat(playerResults[player.id]),
          result_unit: currentTest?.unit || customTestUnit || "",
          notes: `Session ID: ${sessionId}` + (notes ? `\n${notes}` : ""),
        }));

      if (inserts.length === 0) {
        throw new Error("Aucun résultat saisi");
      }

      const { error } = await supabase.from("generic_tests").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generic_tests", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_session_tests"] });
      toast.success("Tests ajoutés avec succès");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'ajout des tests");
    },
  });

  const resetForm = () => {
    setSelectedPlayers([]);
    setSelectionMode("all");
    setSelectedCategory("");
    setSelectedTest("");
    setPlayerResults({});
    setNotes("");
    setCustomTestName("");
    setCustomTestUnit("");
  };

  const updatePlayerResult = (playerId: string, value: string) => {
    setPlayerResults(prev => ({ ...prev, [playerId]: value }));
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSelectedTest("");
    setPlayerResults({});
    setCustomTestName("");
    setCustomTestUnit("");
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
              categoryId={categoryId}
              selectedPlayers={selectedPlayers}
              onSelectionChange={setSelectedPlayers}
              selectionMode={selectionMode}
              onSelectionModeChange={setSelectionMode}
              players={players || []}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catégorie de test *</Label>
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] max-h-[300px]">
                    <SelectItem value="custom" className="font-semibold text-primary">
                      ✨ Test personnalisé
                    </SelectItem>
                    {filteredTestCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date du test *</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Custom test fields */}
            {isCustom && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom du test *</Label>
                  <Input
                    value={customTestName}
                    onChange={(e) => setCustomTestName(e.target.value)}
                    placeholder="Ex: Test de Cooper modifié"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unité de mesure *</Label>
                  <Select value={customTestUnit} onValueChange={setCustomTestUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir l'unité" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] max-h-[300px]">
                      {AVAILABLE_UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Standard test selection */}
            {selectedCategory && !isCustom && (
              <div className="space-y-2">
                <Label>Type de test *</Label>
                <Select value={selectedTest} onValueChange={setSelectedTest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un test" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] max-h-[300px]">
                    <SelectGroup>
                      <SelectLabel>{currentCategory?.label}</SelectLabel>
                      {currentCategory?.tests.map((test) => (
                        <SelectItem key={test.value} value={test.value}>
                          {test.label} {test.unit && `(${test.unit})`}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {effectivePlayers.length > 0 && ((isCustom && customTestName && customTestUnit) || selectedTest) && currentTest && (
              <div className="space-y-2">
                <Label>
                  Résultats {currentTest.unit && `(${currentTest.unit})`} - {filledResultsCount}/{effectivePlayers.length} saisis
                </Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/30">
                  {effectivePlayers.map((player) => (
                    <div key={player.id} className="flex items-center gap-2">
                      <span className="text-sm flex-1 truncate">{player.name}</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={playerResults[player.id] || ""}
                        onChange={(e) => updatePlayerResult(player.id, e.target.value)}
                        placeholder={currentTest.unit || "valeur"}
                        className="w-24 h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Conditions du test, remarques..."
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
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