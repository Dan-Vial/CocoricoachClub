import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { PlayerSelection } from "./PlayerSelection";

interface AddStrengthTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  players: Array<{ id: string; name: string }>;
}

export function AddStrengthTestDialog({
  open,
  onOpenChange,
  categoryId,
  players,
}: AddStrengthTestDialogProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"all" | "specific">("all");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [testName, setTestName] = useState("");
  const [playerResults, setPlayerResults] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const effectivePlayers = selectionMode === "all" ? players : players.filter(p => selectedPlayers.includes(p.id));

  const addTest = useMutation({
    mutationFn: async () => {
      const inserts = effectivePlayers
        .filter(player => playerResults[player.id])
        .map(player => ({
          player_id: player.id,
          category_id: categoryId,
          test_date: date,
          test_name: testName,
          weight_kg: parseFloat(playerResults[player.id]),
        }));

      if (inserts.length === 0) {
        throw new Error("Aucun résultat saisi");
      }

      const { error } = await supabase.from("strength_tests").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strength_tests", categoryId] });
      toast.success("Tests de musculation ajoutés avec succès");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'ajout du test");
    },
  });

  const resetForm = () => {
    setSelectedPlayers([]);
    setSelectionMode("all");
    setDate(new Date().toISOString().split("T")[0]);
    setTestName("");
    setPlayerResults({});
  };

  const updatePlayerResult = (playerId: string, value: string) => {
    setPlayerResults(prev => ({ ...prev, [playerId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName) {
      toast.error("Veuillez saisir le nom de l'exercice");
      return;
    }
    addTest.mutate();
  };

  const filledResultsCount = effectivePlayers.filter(p => playerResults[p.id]).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Test de Musculation</DialogTitle>
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
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testName">Nom de l'exercice *</Label>
                  <Input
                    id="testName"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Ex: Bench Press, Squat"
                    required
                  />
                </div>
              </div>

              {effectivePlayers.length > 0 && (
                <div className="space-y-2">
                  <Label>Poids (kg) - {filledResultsCount}/{effectivePlayers.length} saisis</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/30">
                    {effectivePlayers.map((player) => (
                      <div key={player.id} className="flex items-center gap-2">
                        <span className="text-sm flex-1 truncate">{player.name}</span>
                        <Input
                          type="number"
                          step="0.5"
                          value={playerResults[player.id] || ""}
                          onChange={(e) => updatePlayerResult(player.id, e.target.value)}
                          placeholder="kg"
                          className="w-20 h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!testName || filledResultsCount === 0 || addTest.isPending}
            >
              {addTest.isPending ? "Ajout..." : `Ajouter ${filledResultsCount} test${filledResultsCount > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
