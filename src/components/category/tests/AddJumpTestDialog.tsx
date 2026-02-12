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

interface AddJumpTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  players: { id: string; name: string }[];
}

const TEST_TYPES = [
  { value: "vertical_jump", label: "Saut Vertical (CMJ)", unit: "cm" },
  { value: "horizontal_jump", label: "Saut Horizontal", unit: "cm" },
  { value: "force_platform_right", label: "Plateforme de force - Pied Droit", unit: "N" },
  { value: "force_platform_left", label: "Plateforme de force - Pied Gauche", unit: "N" },
  { value: "force_platform_both", label: "Plateforme de force - 2 Pieds", unit: "N" },
];

const getUnitForTestType = (type: string) => {
  return TEST_TYPES.find(t => t.value === type)?.unit || "cm";
};

export function AddJumpTestDialog({ open, onOpenChange, categoryId, players }: AddJumpTestDialogProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"all" | "specific">("all");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [testType, setTestType] = useState("");
  const [playerResults, setPlayerResults] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const effectivePlayers = selectionMode === "all" ? players : players.filter(p => selectedPlayers.includes(p.id));

  const mutation = useMutation({
    mutationFn: async () => {
      const inserts = effectivePlayers
        .filter(player => playerResults[player.id])
        .map(player => ({
          player_id: player.id,
          category_id: categoryId,
          test_date: testDate,
          test_type: testType,
          result_cm: parseFloat(playerResults[player.id]),
          notes: notes || null,
        }));

      if (inserts.length === 0) {
        throw new Error("Aucun résultat saisi");
      }

      const { error } = await supabase.from("jump_tests").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jump_tests", categoryId] });
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

  const updatePlayerResult = (playerId: string, value: string) => {
    setPlayerResults(prev => ({ ...prev, [playerId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testType) {
      toast.error("Veuillez sélectionner un type de test");
      return;
    }
    if (effectivePlayers.length === 0) {
      toast.error("Veuillez sélectionner au moins un joueur");
      return;
    }
    mutation.mutate();
  };

  const filledResultsCount = effectivePlayers.filter(p => playerResults[p.id]).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajouter un test de détente</DialogTitle>
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
              {effectivePlayers.length > 0 && (
                <div className="space-y-2">
                  <Label>Résultats ({getUnitForTestType(testType)}) - {filledResultsCount}/{effectivePlayers.length} saisis</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/30">
                    {effectivePlayers.map((player) => (
                      <div key={player.id} className="flex items-center gap-2">
                        <span className="text-sm flex-1 truncate">{player.name}</span>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={playerResults[player.id] || ""}
                          onChange={(e) => updatePlayerResult(player.id, e.target.value)}
                          placeholder={getUnitForTestType(testType)}
                          className="w-20 h-8 text-sm"
                        />
                      </div>
                    ))}
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
