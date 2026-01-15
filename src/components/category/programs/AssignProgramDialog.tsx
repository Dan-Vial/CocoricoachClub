import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Users, Calendar, Search } from "lucide-react";
import { format } from "date-fns";

interface AssignProgramDialogProps {
  categoryId: string;
  programId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignProgramDialog({
  categoryId,
  programId,
  open,
  onOpenChange,
}: AssignProgramDialogProps) {
  const queryClient = useQueryClient();
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position")
        .eq("category_id", categoryId)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch existing assignments
  const { data: existingAssignments } = useQuery({
    queryKey: ["program-assignments", programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_assignments")
        .select("player_id, is_active")
        .eq("program_id", programId);

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existingAssignments) {
      const activePlayerIds = existingAssignments
        .filter((a) => a.is_active)
        .map((a) => a.player_id);
      setSelectedPlayers(new Set(activePlayerIds));
    }
  }, [existingAssignments]);

  const filteredPlayers = players?.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePlayer = (playerId: string) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  const selectAll = () => {
    if (filteredPlayers) {
      setSelectedPlayers(new Set(filteredPlayers.map((p) => p.id)));
    }
  };

  const selectNone = () => {
    setSelectedPlayers(new Set());
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Remove existing assignments
      await supabase
        .from("program_assignments")
        .delete()
        .eq("program_id", programId);

      // Add new assignments
      if (selectedPlayers.size > 0) {
        const assignments = Array.from(selectedPlayers).map((playerId) => ({
          program_id: programId,
          player_id: playerId,
          start_date: startDate,
          is_active: true,
        }));

        const { error } = await supabase
          .from("program_assignments")
          .insert(assignments);

        if (error) throw error;
      }

      // TODO: Add to calendar - this would create training_sessions for each player
      // based on the program structure

      toast.success(
        selectedPlayers.size > 0
          ? `Programme assigné à ${selectedPlayers.size} joueur(s)`
          : "Assignations supprimées"
      );

      queryClient.invalidateQueries({ queryKey: ["training-programs"] });
      queryClient.invalidateQueries({ queryKey: ["program-assignments"] });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Erreur lors de l'assignation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assigner le programme
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Start date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date de début
            </Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Player selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Joueurs ({selectedPlayers.size} sélectionnés)</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Tous
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNone}>
                  Aucun
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un joueur..."
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-60 border rounded-md">
              <div className="p-2 space-y-1">
                {filteredPlayers?.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                    onClick={() => togglePlayer(player.id)}
                  >
                    <Checkbox
                      checked={selectedPlayers.has(player.id)}
                      onCheckedChange={() => togglePlayer(player.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{player.name}</p>
                      {player.position && (
                        <p className="text-xs text-muted-foreground">{player.position}</p>
                      )}
                    </div>
                  </div>
                ))}

                {filteredPlayers?.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Aucun joueur trouvé
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement..." : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
