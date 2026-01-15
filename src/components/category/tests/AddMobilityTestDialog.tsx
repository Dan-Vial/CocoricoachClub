import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { PlayerSelection } from "./PlayerSelection";

interface AddMobilityTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  players: { id: string; name: string }[];
}

const TEST_TYPES = [
  { value: "fms", label: "FMS (Functional Movement Screen)" },
  { value: "hip", label: "Mobilité Hanche" },
  { value: "shoulder", label: "Mobilité Épaule" },
  { value: "ankle", label: "Mobilité Cheville" },
];

interface PlayerMobilityResult {
  score?: string;
  leftScore?: string;
  rightScore?: string;
}

export function AddMobilityTestDialog({ open, onOpenChange, categoryId, players }: AddMobilityTestDialogProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"all" | "specific">("all");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [testType, setTestType] = useState("");
  const [playerResults, setPlayerResults] = useState<Record<string, PlayerMobilityResult>>({});
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const effectivePlayers = selectionMode === "all" ? players : players.filter(p => selectedPlayers.includes(p.id));
  const isFms = testType === "fms";

  const mutation = useMutation({
    mutationFn: async () => {
      const inserts = effectivePlayers
        .filter(player => {
          const result = playerResults[player.id];
          if (!result) return false;
          if (isFms) return !!result.score;
          return result.leftScore || result.rightScore;
        })
        .map(player => {
          const result = playerResults[player.id];
          return {
            player_id: player.id,
            category_id: categoryId,
            test_date: testDate,
            test_type: testType,
            score: result.score ? parseInt(result.score) : null,
            left_score: result.leftScore ? parseInt(result.leftScore) : null,
            right_score: result.rightScore ? parseInt(result.rightScore) : null,
            notes: notes || null,
          };
        });

      if (inserts.length === 0) {
        throw new Error("Aucun résultat saisi");
      }

      const { error } = await supabase.from("mobility_tests").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobility_tests", categoryId] });
      toast.success("Tests ajoutés");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'ajout");
    },
  });

  const resetForm = () => {
    setSelectedPlayers([]);
    setSelectionMode("all");
    setTestType("");
    setPlayerResults({});
    setNotes("");
  };

  const updatePlayerResult = (playerId: string, field: keyof PlayerMobilityResult, value: string) => {
    setPlayerResults(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: value }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testType) {
      toast.error("Veuillez sélectionner un type de test");
      return;
    }
    mutation.mutate();
  };

  const filledResultsCount = effectivePlayers.filter(p => {
    const result = playerResults[p.id];
    if (!result) return false;
    if (isFms) return !!result.score;
    return result.leftScore || result.rightScore;
  }).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajouter un test de mobilité</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
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
                  <Label>Date</Label>
                  <Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Type de test *</Label>
                  <Select value={testType} onValueChange={setTestType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
                    {isFms ? " (Score 0-21)" : " (Score G/D 0-3)"}
                  </Label>
                  <div className="grid grid-cols-1 gap-2 p-3 border rounded-md bg-muted/30">
                    {effectivePlayers.map((player) => {
                      const result = playerResults[player.id] || {};

                      return (
                        <div key={player.id} className="flex items-center gap-2">
                          <span className="text-sm w-32 truncate">{player.name}</span>
                          {isFms ? (
                            <Input
                              type="number"
                              min="0"
                              max="21"
                              value={result.score || ""}
                              onChange={(e) => updatePlayerResult(player.id, "score", e.target.value)}
                              placeholder="Score"
                              className="w-20 h-8 text-sm"
                            />
                          ) : (
                            <>
                              <Input
                                type="number"
                                min="0"
                                max="3"
                                value={result.leftScore || ""}
                                onChange={(e) => updatePlayerResult(player.id, "leftScore", e.target.value)}
                                placeholder="G"
                                className="w-16 h-8 text-sm"
                              />
                              <Input
                                type="number"
                                min="0"
                                max="3"
                                value={result.rightScore || ""}
                                onChange={(e) => updatePlayerResult(player.id, "rightScore", e.target.value)}
                                placeholder="D"
                                className="w-16 h-8 text-sm"
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes optionnelles" />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending || filledResultsCount === 0}>
              {mutation.isPending ? "Ajout..." : `Ajouter ${filledResultsCount} test${filledResultsCount > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
