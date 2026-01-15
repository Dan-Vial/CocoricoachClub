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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Stopwatch } from "./Stopwatch";
import { PlayerSelection } from "./PlayerSelection";

interface Add40mSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  players: Array<{ id: string; name: string }>;
}

export function Add40mSprintDialog({
  open,
  onOpenChange,
  categoryId,
  players,
}: Add40mSprintDialogProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"all" | "specific">("all");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [playerResults, setPlayerResults] = useState<Record<string, string>>({});
  const [inputMode, setInputMode] = useState<"manual" | "stopwatch">("manual");
  const [currentStopwatchPlayer, setCurrentStopwatchPlayer] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const effectivePlayers = selectionMode === "all" ? players : players.filter(p => selectedPlayers.includes(p.id));

  const addTest = useMutation({
    mutationFn: async () => {
      const inserts = effectivePlayers
        .filter(player => playerResults[player.id])
        .map(player => {
          const time = parseFloat(playerResults[player.id]);
          const speedMs = 40 / time;
          const speedKmh = speedMs * 3.6;

          return {
            player_id: player.id,
            category_id: categoryId,
            test_date: date,
            test_type: "40m_sprint",
            time_40m_seconds: time,
            speed_ms: speedMs,
            speed_kmh: speedKmh,
          };
        });

      if (inserts.length === 0) {
        throw new Error("Aucun résultat saisi");
      }

      const { error } = await supabase.from("speed_tests").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speed_tests", categoryId, "40m_sprint"] });
      toast.success("Tests 40m ajoutés avec succès");
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
    setPlayerResults({});
  };

  const updatePlayerResult = (playerId: string, value: string) => {
    setPlayerResults(prev => ({ ...prev, [playerId]: value }));
  };

  const handleStopwatchRecord = (seconds: number) => {
    if (currentStopwatchPlayer) {
      updatePlayerResult(currentStopwatchPlayer, seconds.toFixed(2));
      toast.success(`Temps enregistré: ${seconds.toFixed(2)}s`);
      
      // Move to next player
      const currentIndex = effectivePlayers.findIndex(p => p.id === currentStopwatchPlayer);
      if (currentIndex < effectivePlayers.length - 1) {
        setCurrentStopwatchPlayer(effectivePlayers[currentIndex + 1].id);
      } else {
        setCurrentStopwatchPlayer(null);
        setInputMode("manual");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTest.mutate();
  };

  const filledResultsCount = effectivePlayers.filter(p => playerResults[p.id]).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Test 40m Sprint</DialogTitle>
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

              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "manual" | "stopwatch")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Saisie manuelle</TabsTrigger>
                  <TabsTrigger value="stopwatch">Chronomètre</TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual" className="space-y-2">
                  {effectivePlayers.length > 0 && (
                    <div className="space-y-2">
                      <Label>Temps (secondes) - {filledResultsCount}/{effectivePlayers.length} saisis</Label>
                      <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/30">
                        {effectivePlayers.map((player) => {
                          const time = playerResults[player.id];
                          const speedKmh = time ? ((40 / parseFloat(time)) * 3.6).toFixed(2) : null;

                          return (
                            <div key={player.id} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm flex-1 truncate">{player.name}</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={time || ""}
                                  onChange={(e) => updatePlayerResult(player.id, e.target.value)}
                                  placeholder="sec"
                                  className="w-20 h-8 text-sm"
                                />
                              </div>
                              {speedKmh && (
                                <p className="text-xs text-muted-foreground pl-1">
                                  {speedKmh} km/h
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="stopwatch" className="space-y-4">
                  {effectivePlayers.length > 0 && (
                    <>
                      <div className="space-y-2">
                        <Label>Joueur en cours</Label>
                        <div className="flex flex-wrap gap-2">
                          {effectivePlayers.map((player) => (
                            <Button
                              key={player.id}
                              type="button"
                              variant={currentStopwatchPlayer === player.id ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentStopwatchPlayer(player.id)}
                              className={playerResults[player.id] ? "border-green-500" : ""}
                            >
                              {player.name}
                              {playerResults[player.id] && ` (${playerResults[player.id]}s)`}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {currentStopwatchPlayer && (
                        <Stopwatch 
                          onTimeRecorded={handleStopwatchRecord}
                          title={`Chronomètre - ${effectivePlayers.find(p => p.id === currentStopwatchPlayer)?.name}`}
                        />
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={filledResultsCount === 0 || addTest.isPending}
            >
              {addTest.isPending ? "Ajout..." : `Ajouter ${filledResultsCount} test${filledResultsCount > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
