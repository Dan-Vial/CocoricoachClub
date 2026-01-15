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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { PlayerSelection } from "./PlayerSelection";

interface Player {
  id: string;
  name: string;
}

interface AddRunningTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  players: Player[];
}

const TEST_TYPES = [
  { value: "10m_sprint", label: "Sprint 10m", distance: 10 },
  { value: "20m_sprint", label: "Sprint 20m", distance: 20 },
  { value: "30m_sprint", label: "Sprint 30m", distance: 30 },
  { value: "60m_sprint", label: "Sprint 60m", distance: 60 },
  { value: "100m_sprint", label: "Sprint 100m", distance: 100 },
  { value: "cooper_test", label: "Test de Cooper (12 min)", distance: null },
  { value: "beep_test", label: "Test Navette (Beep Test)", distance: null },
  { value: "yo_yo_test", label: "Yo-Yo Test", distance: null },
];

export function AddRunningTestDialog({
  open,
  onOpenChange,
  categoryId,
  players,
}: AddRunningTestDialogProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"all" | "specific">("all");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [testType, setTestType] = useState("");
  const [playerResults, setPlayerResults] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const effectivePlayers = selectionMode === "all" ? players : players.filter(p => selectedPlayers.includes(p.id));

  const selectedTest = TEST_TYPES.find((t) => t.value === testType);
  const isSprintTest = testType.includes("sprint");
  const isCooperTest = testType === "cooper_test";
  const isLevelTest = testType === "beep_test" || testType === "yo_yo_test";

  const addTest = useMutation({
    mutationFn: async () => {
      const inserts = effectivePlayers
        .filter(player => playerResults[player.id])
        .map(player => {
          let speedMs = null;
          let speedKmh = null;
          let vmaKmh = null;

          const value = parseFloat(playerResults[player.id]);

          if (isSprintTest && selectedTest?.distance) {
            speedMs = selectedTest.distance / value;
            speedKmh = speedMs * 3.6;
          }

          if (isCooperTest) {
            vmaKmh = (value / 1000 / 12) * 60;
          }

          return {
            player_id: player.id,
            category_id: categoryId,
            test_date: date,
            test_type: testType,
            time_40m_seconds: isSprintTest ? value : null,
            speed_ms: speedMs,
            speed_kmh: speedKmh,
            vma_kmh: vmaKmh,
          };
        });

      if (inserts.length === 0) {
        throw new Error("Aucun résultat saisi");
      }

      const { error } = await supabase.from("speed_tests").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speed_tests", categoryId] });
      toast.success("Tests ajoutés avec succès");
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
    setTestType("");
    setPlayerResults({});
  };

  const updatePlayerResult = (playerId: string, value: string) => {
    setPlayerResults(prev => ({ ...prev, [playerId]: value }));
  };

  const getPlaceholder = () => {
    if (isSprintTest) return "sec";
    if (isCooperTest) return "m";
    if (isLevelTest) return "palier";
    return "";
  };

  const getLabel = () => {
    if (isSprintTest) return "Temps (secondes)";
    if (isCooperTest) return "Distance (mètres)";
    if (isLevelTest) return "Palier atteint";
    return "Résultat";
  };

  const filledResultsCount = effectivePlayers.filter(p => playerResults[p.id]).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajouter un test de course</DialogTitle>
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

              <div className="space-y-2">
                <Label>Date du test *</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {effectivePlayers.length > 0 && testType && (
              <div className="space-y-2">
                <Label>{getLabel()} - {filledResultsCount}/{effectivePlayers.length} saisis</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/30">
                  {effectivePlayers.map((player) => {
                    const value = playerResults[player.id];
                    let extraInfo = null;

                    if (value && isSprintTest && selectedTest?.distance) {
                      const speedKmh = ((selectedTest.distance / parseFloat(value)) * 3.6).toFixed(2);
                      extraInfo = `${speedKmh} km/h`;
                    }
                    if (value && isCooperTest) {
                      const vma = ((parseFloat(value) / 1000 / 12) * 60).toFixed(1);
                      extraInfo = `VMA: ${vma} km/h`;
                    }

                    return (
                      <div key={player.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm flex-1 truncate">{player.name}</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={value || ""}
                            onChange={(e) => updatePlayerResult(player.id, e.target.value)}
                            placeholder={getPlaceholder()}
                            className="w-20 h-8 text-sm"
                          />
                        </div>
                        {extraInfo && (
                          <p className="text-xs text-muted-foreground pl-1">{extraInfo}</p>
                        )}
                      </div>
                    );
                  })}
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
            onClick={() => addTest.mutate()}
            disabled={!testType || !date || filledResultsCount === 0 || addTest.isPending}
          >
            {addTest.isPending ? "Ajout..." : `Ajouter ${filledResultsCount} test${filledResultsCount > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
