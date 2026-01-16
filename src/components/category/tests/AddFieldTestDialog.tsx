import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { PlayerSelection } from "./PlayerSelection";
import { getFieldTestsForSport, FieldTest, YO_YO_LEVELS } from "@/lib/constants/fieldTests";

interface AddFieldTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sportType?: string;
}

interface PlayerFieldResult {
  yo_yo_level?: string;
  yo_yo_distance_m?: string;
  bronco_time_seconds?: string;
  agility_time_seconds?: string;
  generic_value?: string;
}

export function AddFieldTestDialog({ open, onOpenChange, categoryId, sportType = "XV" }: AddFieldTestDialogProps) {
  const queryClient = useQueryClient();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"all" | "specific">("all");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [testType, setTestType] = useState("");
  const [playerResults, setPlayerResults] = useState<Record<string, PlayerFieldResult>>({});
  const [notes, setNotes] = useState("");

  const sportConfig = getFieldTestsForSport(sportType);
  const selectedTest = sportConfig.tests.find(t => t.value === testType);

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const effectivePlayers = selectionMode === "all" 
    ? (players || []) 
    : (players || []).filter(p => selectedPlayers.includes(p.id));

  const isYoYoTest = testType?.includes("yo_yo");
  const isBroncoTest = testType === "bronco";
  const isTimeTest = selectedTest?.inputType === "time" && !isBroncoTest;

  const mutation = useMutation({
    mutationFn: async () => {
      const inserts = effectivePlayers
        .filter(player => {
          const result = playerResults[player.id];
          if (!result) return false;
          if (isYoYoTest) return result.yo_yo_level || result.yo_yo_distance_m;
          if (isBroncoTest) return result.bronco_time_seconds;
          if (isTimeTest) return result.agility_time_seconds;
          return result.generic_value;
        })
        .map(player => {
          const result = playerResults[player.id];
          
          // Build notes with generic value for new test types
          let finalNotes = notes || "";
          if (result.generic_value && !isYoYoTest && !isBroncoTest && !isTimeTest) {
            finalNotes = `${selectedTest?.label}: ${result.generic_value} ${selectedTest?.unit}${notes ? ` - ${notes}` : ""}`;
          }

          return {
            player_id: player.id,
            category_id: categoryId,
            test_date: testDate,
            test_type: testType,
            yo_yo_level: result.yo_yo_level || null,
            yo_yo_distance_m: result.yo_yo_distance_m ? parseInt(result.yo_yo_distance_m) : null,
            bronco_time_seconds: result.bronco_time_seconds ? parseFloat(result.bronco_time_seconds) : null,
            agility_time_seconds: result.agility_time_seconds ? parseFloat(result.agility_time_seconds) : null,
            notes: finalNotes || null,
          };
        });

      if (inserts.length === 0) {
        throw new Error("Aucun résultat saisi");
      }

      const { error } = await supabase.from("rugby_specific_tests").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rugby-specific-tests", categoryId] });
      toast.success("Tests ajoutés");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => toast.error(error.message || "Erreur lors de l'ajout"),
  });

  const resetForm = () => {
    setSelectedPlayers([]);
    setSelectionMode("all");
    setTestType("");
    setPlayerResults({});
    setNotes("");
  };

  const updatePlayerResult = (playerId: string, field: keyof PlayerFieldResult, value: string) => {
    setPlayerResults(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: value }
    }));
  };

  const filledResultsCount = effectivePlayers.filter(p => {
    const result = playerResults[p.id];
    if (!result) return false;
    if (isYoYoTest) return result.yo_yo_level || result.yo_yo_distance_m;
    if (isBroncoTest) return result.bronco_time_seconds;
    if (isTimeTest) return result.agility_time_seconds;
    return result.generic_value;
  }).length;

  const renderInputForTestType = (playerId: string, result: PlayerFieldResult) => {
    if (isYoYoTest) {
      return (
        <>
          <Select 
            value={result.yo_yo_level || ""} 
            onValueChange={(v) => updatePlayerResult(playerId, "yo_yo_level", v)}
          >
            <SelectTrigger className="w-24 h-8">
              <SelectValue placeholder="Niveau" />
            </SelectTrigger>
            <SelectContent>
              {YO_YO_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={result.yo_yo_distance_m || ""}
            onChange={(e) => updatePlayerResult(playerId, "yo_yo_distance_m", e.target.value)}
            placeholder="Distance (m)"
            className="w-28 h-8 text-sm"
          />
        </>
      );
    }

    if (isBroncoTest) {
      return (
        <Input
          type="number"
          step="0.01"
          value={result.bronco_time_seconds || ""}
          onChange={(e) => updatePlayerResult(playerId, "bronco_time_seconds", e.target.value)}
          placeholder="Temps (sec)"
          className="w-28 h-8 text-sm"
        />
      );
    }

    if (isTimeTest) {
      return (
        <Input
          type="number"
          step="0.01"
          value={result.agility_time_seconds || ""}
          onChange={(e) => updatePlayerResult(playerId, "agility_time_seconds", e.target.value)}
          placeholder="Temps (sec)"
          className="w-28 h-8 text-sm"
        />
      );
    }

    // Generic input for other test types
    return (
      <Input
        type="number"
        step="0.01"
        value={result.generic_value || ""}
        onChange={(e) => updatePlayerResult(playerId, "generic_value", e.target.value)}
        placeholder={`${selectedTest?.unit || "Valeur"}`}
        className="w-28 h-8 text-sm"
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajouter un test terrain - {sportConfig.sportLabel}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            <PlayerSelection
              categoryId={categoryId}
              selectedPlayers={selectedPlayers}
              onSelectionChange={setSelectedPlayers}
              selectionMode={selectionMode}
              onSelectionModeChange={setSelectionMode}
              players={players}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date du test *</Label>
                <Input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Type de test *</Label>
                <Select value={testType} onValueChange={setTestType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {sportConfig.tests.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                        {t.description && <span className="text-muted-foreground ml-1">({t.description})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results per player */}
            {effectivePlayers.length > 0 && testType && (
              <div className="space-y-2">
                <Label>
                  Résultats - {filledResultsCount}/{effectivePlayers.length} saisis
                  {selectedTest && <span className="text-muted-foreground ml-2">({selectedTest.unit})</span>}
                </Label>
                <div className="grid grid-cols-1 gap-2 p-3 border rounded-md bg-muted/30">
                  {effectivePlayers.map((player) => {
                    const result = playerResults[player.id] || {};

                    return (
                      <div key={player.id} className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm w-32 truncate">{player.name}</span>
                        {renderInputForTestType(player.id, result)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Notes additionnelles..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending || filledResultsCount === 0}
          >
            {mutation.isPending ? "Ajout..." : `Ajouter ${filledResultsCount} test${filledResultsCount > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
