import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BarChart3 } from "lucide-react";

interface PlayerMatchStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  categoryId: string;
}

interface PlayerStats {
  playerId: string;
  playerName: string;
  tries: number;
  conversions: number;
  penaltiesScored: number;
  dropGoals: number;
  tackles: number;
  tacklesMissed: number;
  carries: number;
  metersGained: number;
  offloads: number;
  turnoversWon: number;
  yellowCards: number;
  redCards: number;
}

const defaultStats = {
  tries: 0,
  conversions: 0,
  penaltiesScored: 0,
  dropGoals: 0,
  tackles: 0,
  tacklesMissed: 0,
  carries: 0,
  metersGained: 0,
  offloads: 0,
  turnoversWon: 0,
  yellowCards: 0,
  redCards: 0,
};

export function PlayerMatchStatsDialog({
  open,
  onOpenChange,
  matchId,
  categoryId,
}: PlayerMatchStatsDialogProps) {
  const [statsData, setStatsData] = useState<PlayerStats[]>([]);
  const queryClient = useQueryClient();

  // Get players in the lineup for this match
  const { data: lineup } = useQuery({
    queryKey: ["match_lineup", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_lineups")
        .select("player_id, players(id, name)")
        .eq("match_id", matchId);
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  const { data: existingStats } = useQuery({
    queryKey: ["player_match_stats", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_match_stats")
        .select("*")
        .eq("match_id", matchId);
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  useEffect(() => {
    if (lineup && lineup.length > 0) {
      const stats = lineup.map((l) => {
        const existing = existingStats?.find((s) => s.player_id === l.player_id);
        const player = l.players as { id: string; name: string } | null;
        return {
          playerId: l.player_id,
          playerName: player?.name || "Joueur",
          tries: existing?.tries ?? 0,
          conversions: existing?.conversions ?? 0,
          penaltiesScored: existing?.penalties_scored ?? 0,
          dropGoals: existing?.drop_goals ?? 0,
          tackles: existing?.tackles ?? 0,
          tacklesMissed: existing?.tackles_missed ?? 0,
          carries: existing?.carries ?? 0,
          metersGained: existing?.meters_gained ?? 0,
          offloads: existing?.offloads ?? 0,
          turnoversWon: existing?.turnovers_won ?? 0,
          yellowCards: existing?.yellow_cards ?? 0,
          redCards: existing?.red_cards ?? 0,
        };
      });
      setStatsData(stats);
    }
  }, [lineup, existingStats]);

  const saveStats = useMutation({
    mutationFn: async () => {
      // Delete existing stats
      await supabase.from("player_match_stats").delete().eq("match_id", matchId);

      // Insert new stats
      if (statsData.length > 0) {
        const { error } = await supabase.from("player_match_stats").insert(
          statsData.map((s) => ({
            match_id: matchId,
            player_id: s.playerId,
            tries: s.tries,
            conversions: s.conversions,
            penalties_scored: s.penaltiesScored,
            drop_goals: s.dropGoals,
            tackles: s.tackles,
            tackles_missed: s.tacklesMissed,
            carries: s.carries,
            meters_gained: s.metersGained,
            offloads: s.offloads,
            turnovers_won: s.turnoversWon,
            yellow_cards: s.yellowCards,
            red_cards: s.redCards,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_match_stats", matchId] });
      toast.success("Statistiques enregistrées");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  const updateStat = (playerId: string, stat: keyof PlayerStats, value: number) => {
    setStatsData((prev) =>
      prev.map((p) => (p.playerId === playerId ? { ...p, [stat]: value } : p))
    );
  };

  const hasLineup = lineup && lineup.length > 0;

  if (!hasLineup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Statistiques des joueurs</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-center py-8">
            Ajoutez d'abord des joueurs à la composition pour saisir leurs statistiques.
          </p>
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiques des joueurs
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="scoring" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scoring">Points</TabsTrigger>
            <TabsTrigger value="attack">Attaque</TabsTrigger>
            <TabsTrigger value="defense">Défense</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="scoring" className="space-y-4 mt-0">
              {statsData.map((player) => (
                <div key={player.playerId} className="p-3 rounded-lg border bg-card">
                  <h4 className="font-semibold mb-3 text-base text-primary">
                    {player.playerName}
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Essais</Label>
                      <Input
                        type="number"
                        value={player.tries}
                        onChange={(e) => updateStat(player.playerId, "tries", parseInt(e.target.value) || 0)}
                        min={0}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Transfo.</Label>
                      <Input
                        type="number"
                        value={player.conversions}
                        onChange={(e) => updateStat(player.playerId, "conversions", parseInt(e.target.value) || 0)}
                        min={0}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Pénalités</Label>
                      <Input
                        type="number"
                        value={player.penaltiesScored}
                        onChange={(e) => updateStat(player.playerId, "penaltiesScored", parseInt(e.target.value) || 0)}
                        min={0}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Drops</Label>
                      <Input
                        type="number"
                        value={player.dropGoals}
                        onChange={(e) => updateStat(player.playerId, "dropGoals", parseInt(e.target.value) || 0)}
                        min={0}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="attack" className="space-y-4 mt-0">
              {statsData.map((player) => (
                <div key={player.playerId} className="p-3 rounded-lg border bg-card">
                  <h4 className="font-semibold mb-3 text-base text-primary">
                    {player.playerName}
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Courses</Label>
                      <Input
                        type="number"
                        value={player.carries}
                        onChange={(e) => updateStat(player.playerId, "carries", parseInt(e.target.value) || 0)}
                        min={0}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Mètres</Label>
                      <Input
                        type="number"
                        value={player.metersGained}
                        onChange={(e) => updateStat(player.playerId, "metersGained", parseInt(e.target.value) || 0)}
                        min={0}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Offloads</Label>
                      <Input
                        type="number"
                        value={player.offloads}
                        onChange={(e) => updateStat(player.playerId, "offloads", parseInt(e.target.value) || 0)}
                        min={0}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Turnovers</Label>
                      <Input
                        type="number"
                        value={player.turnoversWon}
                        onChange={(e) => updateStat(player.playerId, "turnoversWon", parseInt(e.target.value) || 0)}
                        min={0}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="defense" className="space-y-4 mt-0">
              {statsData.map((player) => (
                <div key={player.playerId} className="p-3 rounded-lg border bg-card">
                  <h4 className="font-semibold mb-3 text-base text-primary">
                    {player.playerName}
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Plaquages</Label>
                      <Input
                        type="number"
                        value={player.tackles}
                        onChange={(e) => updateStat(player.playerId, "tackles", parseInt(e.target.value) || 0)}
                        min={0}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ratés</Label>
                      <Input
                        type="number"
                        value={player.tacklesMissed}
                        onChange={(e) => updateStat(player.playerId, "tacklesMissed", parseInt(e.target.value) || 0)}
                        min={0}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Jaunes</Label>
                      <Input
                        type="number"
                        value={player.yellowCards}
                        onChange={(e) => updateStat(player.playerId, "yellowCards", parseInt(e.target.value) || 0)}
                        min={0}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Rouges</Label>
                      <Input
                        type="number"
                        value={player.redCards}
                        onChange={(e) => updateStat(player.playerId, "redCards", parseInt(e.target.value) || 0)}
                        min={0}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => saveStats.mutate()} disabled={saveStats.isPending}>
            {saveStats.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
