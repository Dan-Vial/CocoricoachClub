import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface PlayerRotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  categoryId: string;
}

export function PlayerRotationDialog({
  open,
  onOpenChange,
  matchId,
  categoryId,
}: PlayerRotationDialogProps) {
  const queryClient = useQueryClient();

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: rotations } = useQuery({
    queryKey: ["player-rotations", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_player_rotation")
        .select("*, players(name)")
        .eq("tournament_match_id", matchId);
      if (error) throw error;
      return data;
    },
  });

  const addRotation = useMutation({
    mutationFn: async (data: {
      player_id: string;
      minutes_played: number;
      is_starter: boolean;
    }) => {
      const { error } = await supabase.from("tournament_player_rotation").insert({
        tournament_match_id: matchId,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-rotations", matchId] });
      toast.success("Joueur ajouté");
    },
  });

  const deleteRotation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tournament_player_rotation")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-rotations", matchId] });
      toast.success("Joueur retiré");
    },
  });

  const updateRotation = useMutation({
    mutationFn: async (data: { id: string; minutes_played: number }) => {
      const { error } = await supabase
        .from("tournament_player_rotation")
        .update({ minutes_played: data.minutes_played })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-rotations", matchId] });
    },
  });

  const availablePlayers = players?.filter(
    (player) => !rotations?.some((r) => r.player_id === player.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rotation des joueurs</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Joueurs sélectionnés</h3>
            <ScrollArea className="h-64 border rounded-md p-4">
              {rotations && rotations.length > 0 ? (
                <div className="space-y-2">
                  {rotations.map((rotation) => (
                    <div
                      key={rotation.id}
                      className="flex items-center gap-2 p-2 bg-muted rounded"
                    >
                      <span className="flex-1">{rotation.players?.name}</span>
                      <Input
                        type="number"
                        min="0"
                        max="14"
                        value={rotation.minutes_played}
                        onChange={(e) =>
                          updateRotation.mutate({
                            id: rotation.id,
                            minutes_played: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-20"
                        placeholder="Min"
                      />
                      <span className="text-sm text-muted-foreground">min</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteRotation.mutate(rotation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucun joueur sélectionné
                </p>
              )}
            </ScrollArea>
          </div>

          <div>
            <h3 className="font-medium mb-2">Ajouter un joueur</h3>
            <ScrollArea className="h-32 border rounded-md p-4">
              {availablePlayers && availablePlayers.length > 0 ? (
                <div className="space-y-2">
                  {availablePlayers.map((player) => (
                    <Button
                      key={player.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() =>
                        addRotation.mutate({
                          player_id: player.id,
                          minutes_played: 14,
                          is_starter: false,
                        })
                      }
                    >
                      {player.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Tous les joueurs sont déjà ajoutés
                </p>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
