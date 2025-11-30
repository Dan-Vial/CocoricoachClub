import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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

export function AddMobilityTestDialog({ open, onOpenChange, categoryId, players }: AddMobilityTestDialogProps) {
  const [playerId, setPlayerId] = useState("");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [testType, setTestType] = useState("");
  const [score, setScore] = useState("");
  const [leftScore, setLeftScore] = useState("");
  const [rightScore, setRightScore] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mobility_tests").insert({
        player_id: playerId,
        category_id: categoryId,
        test_date: testDate,
        test_type: testType,
        score: score ? parseInt(score) : null,
        left_score: leftScore ? parseInt(leftScore) : null,
        right_score: rightScore ? parseInt(rightScore) : null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobility_tests", categoryId] });
      toast.success("Test ajouté");
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout");
    },
  });

  const resetForm = () => {
    setPlayerId("");
    setTestType("");
    setScore("");
    setLeftScore("");
    setRightScore("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId || !testType) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un test de mobilité</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Joueur *</Label>
            <Select value={playerId} onValueChange={setPlayerId}>
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

          {testType === "fms" && (
            <div className="space-y-2">
              <Label>Score total (0-21)</Label>
              <Input
                type="number"
                min="0"
                max="21"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Score FMS"
              />
            </div>
          )}

          {testType !== "fms" && testType && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Score Gauche (0-3)</Label>
                <Input
                  type="number"
                  min="0"
                  max="3"
                  value={leftScore}
                  onChange={(e) => setLeftScore(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Score Droit (0-3)</Label>
                <Input
                  type="number"
                  min="0"
                  max="3"
                  value={rightScore}
                  onChange={(e) => setRightScore(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes optionnelles" />
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
