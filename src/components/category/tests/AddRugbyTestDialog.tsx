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

interface AddRugbyTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

const TEST_TYPES = [
  { value: "yo_yo_ir1", label: "Yo-Yo IR1 (Intermittent Recovery Level 1)" },
  { value: "yo_yo_ir2", label: "Yo-Yo IR2 (Intermittent Recovery Level 2)" },
  { value: "bronco", label: "Bronco (1200m shuttle)" },
  { value: "5_10_5", label: "5-10-5 Shuttle (Pro Agility)" },
  { value: "t_test", label: "T-Test Agility" },
];

const YO_YO_LEVELS = [
  "5.1", "9.1", "11.1", "12.1", "13.1", "14.1", "15.1", "16.1", "17.1", "18.1", "19.1", "20.1", "21.1", "22.1", "23.1"
];

interface PlayerRugbyResult {
  yo_yo_level?: string;
  yo_yo_distance_m?: string;
  bronco_time_seconds?: string;
  agility_time_seconds?: string;
}

export function AddRugbyTestDialog({ open, onOpenChange, categoryId }: AddRugbyTestDialogProps) {
  const queryClient = useQueryClient();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"all" | "specific">("all");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [testType, setTestType] = useState("");
  const [playerResults, setPlayerResults] = useState<Record<string, PlayerRugbyResult>>({});
  const [notes, setNotes] = useState("");

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
  const isAgilityTest = testType === "5_10_5" || testType === "t_test";

  const mutation = useMutation({
    mutationFn: async () => {
      const inserts = effectivePlayers
        .filter(player => {
          const result = playerResults[player.id];
          if (!result) return false;
          if (isYoYoTest) return result.yo_yo_level || result.yo_yo_distance_m;
          if (isBroncoTest) return result.bronco_time_seconds;
          if (isAgilityTest) return result.agility_time_seconds;
          return false;
        })
        .map(player => {
          const result = playerResults[player.id];
          return {
            player_id: player.id,
            category_id: categoryId,
            test_date: testDate,
            test_type: testType,
            yo_yo_level: result.yo_yo_level || null,
            yo_yo_distance_m: result.yo_yo_distance_m ? parseInt(result.yo_yo_distance_m) : null,
            bronco_time_seconds: result.bronco_time_seconds ? parseFloat(result.bronco_time_seconds) : null,
            agility_time_seconds: result.agility_time_seconds ? parseFloat(result.agility_time_seconds) : null,
            notes: notes || null,
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

  const updatePlayerResult = (playerId: string, field: keyof PlayerRugbyResult, value: string) => {
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
    if (isAgilityTest) return result.agility_time_seconds;
    return false;
  }).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajouter un test spécifique rugby</DialogTitle>
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
                    {TEST_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results per player */}
            {effectivePlayers.length > 0 && testType && (
              <div className="space-y-2">
                <Label>Résultats - {filledResultsCount}/{effectivePlayers.length} saisis</Label>
                <div className="grid grid-cols-1 gap-2 p-3 border rounded-md bg-muted/30">
                  {effectivePlayers.map((player) => {
                    const result = playerResults[player.id] || {};

                    return (
                      <div key={player.id} className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm w-32 truncate">{player.name}</span>

                        {isYoYoTest && (
                          <>
                            <Select 
                              value={result.yo_yo_level || ""} 
                              onValueChange={(v) => updatePlayerResult(player.id, "yo_yo_level", v)}
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
                              onChange={(e) => updatePlayerResult(player.id, "yo_yo_distance_m", e.target.value)}
                              placeholder="Distance (m)"
                              className="w-28 h-8 text-sm"
                            />
                          </>
                        )}

                        {isBroncoTest && (
                          <Input
                            type="number"
                            step="0.01"
                            value={result.bronco_time_seconds || ""}
                            onChange={(e) => updatePlayerResult(player.id, "bronco_time_seconds", e.target.value)}
                            placeholder="Temps (sec)"
                            className="w-28 h-8 text-sm"
                          />
                        )}

                        {isAgilityTest && (
                          <Input
                            type="number"
                            step="0.01"
                            value={result.agility_time_seconds || ""}
                            onChange={(e) => updatePlayerResult(player.id, "agility_time_seconds", e.target.value)}
                            placeholder="Temps (sec)"
                            className="w-28 h-8 text-sm"
                          />
                        )}
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
