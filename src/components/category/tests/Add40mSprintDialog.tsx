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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Stopwatch } from "./Stopwatch";

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
  const [playerId, setPlayerId] = useState("");
  const [date, setDate] = useState("");
  const [timeSeconds, setTimeSeconds] = useState("");
  const [inputMode, setInputMode] = useState<"manual" | "stopwatch">("manual");
  const queryClient = useQueryClient();

  const addTest = useMutation({
    mutationFn: async () => {
      const time = parseFloat(timeSeconds);
      const speedMs = 40 / time;
      const speedKmh = speedMs * 3.6;

      const { error } = await supabase.from("speed_tests").insert({
        player_id: playerId,
        category_id: categoryId,
        test_date: date,
        test_type: "40m_sprint",
        time_40m_seconds: time,
        speed_ms: speedMs,
        speed_kmh: speedKmh,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speed_tests", categoryId, "40m_sprint"] });
      toast.success("Test 40m ajouté avec succès");
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout du test");
    },
  });

  const resetForm = () => {
    setPlayerId("");
    setDate("");
    setTimeSeconds("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerId && date && timeSeconds) {
      addTest.mutate();
    }
  };

  const handleStopwatchRecord = (seconds: number) => {
    setTimeSeconds(seconds.toFixed(2));
    setInputMode("manual");
    toast.success(`Temps enregistré: ${seconds.toFixed(2)}s`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Test 40m Sprint</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="player">Joueur *</Label>
              <Select value={playerId} onValueChange={setPlayerId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un joueur" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                <Label htmlFor="time">Temps (secondes) *</Label>
                <Input
                  id="time"
                  type="number"
                  step="0.01"
                  value={timeSeconds}
                  onChange={(e) => setTimeSeconds(e.target.value)}
                  placeholder="Ex: 5.25"
                  required
                />
                {timeSeconds && (
                  <p className="text-sm text-muted-foreground">
                    Vitesse: {(40 / parseFloat(timeSeconds)).toFixed(2)} m/s |{" "}
                    {((40 / parseFloat(timeSeconds)) * 3.6).toFixed(2)} km/h
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="stopwatch">
                <Stopwatch 
                  onTimeRecorded={handleStopwatchRecord}
                  title="Chronomètre 40m"
                />
              </TabsContent>
            </Tabs>
          </div>
          {/* Show what's missing */}
          {(!playerId || !date || !timeSeconds) && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Champs manquants: {[
                !playerId && "Joueur",
                !date && "Date", 
                !timeSeconds && "Temps"
              ].filter(Boolean).join(", ")}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!playerId || !date || !timeSeconds || addTest.isPending}
            >
              {addTest.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
