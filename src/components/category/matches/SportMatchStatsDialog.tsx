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
import { getStatsForSport, getStatCategories, type StatField } from "@/lib/constants/sportStats";
import { getSportFieldConfig } from "@/lib/constants/sportPositions";

interface SportMatchStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  categoryId: string;
  sportType: string;
}

interface PlayerStats {
  playerId: string;
  playerName: string;
  [key: string]: string | number;
}

export function SportMatchStatsDialog({
  open,
  onOpenChange,
  matchId,
  categoryId,
  sportType,
}: SportMatchStatsDialogProps) {
  const [statsData, setStatsData] = useState<PlayerStats[]>([]);
  const [effectivePlayTime, setEffectivePlayTime] = useState<number>(0);
  const [longestPlaySequence, setLongestPlaySequence] = useState<number>(0);
  const [averagePlaySequence, setAveragePlaySequence] = useState<number>(0);
  const queryClient = useQueryClient();

  const sportStats = getStatsForSport(sportType);
  const statCategories = getStatCategories(sportType);
  const fieldConfig = getSportFieldConfig(sportType);

  // Get match data
  const { data: matchData } = useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  useEffect(() => {
    if (matchData) {
      setEffectivePlayTime(matchData.effective_play_time ?? 0);
      setLongestPlaySequence(matchData.longest_play_sequence ?? 0);
      setAveragePlaySequence(matchData.average_play_sequence ?? 0);
    }
  }, [matchData]);

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
        
        // Initialize all sport stats to 0
        const playerStats: PlayerStats = {
          playerId: l.player_id,
          playerName: player?.name || "Joueur",
        };

        // Map existing stats or initialize to 0
        sportStats.forEach(stat => {
          // Try to get from existing stats with various key formats
          const snakeKey = stat.key.replace(/([A-Z])/g, '_$1').toLowerCase();
          const value = existing?.[stat.key as keyof typeof existing] ?? 
                       existing?.[snakeKey as keyof typeof existing] ?? 
                       0;
          playerStats[stat.key] = typeof value === 'number' ? value : 0;
        });

        return playerStats;
      });
      setStatsData(stats);
    }
  }, [lineup, existingStats, sportStats]);

  const saveStats = useMutation({
    mutationFn: async () => {
      // Update match general stats
      await supabase
        .from("matches")
        .update({ 
          effective_play_time: effectivePlayTime,
          longest_play_sequence: longestPlaySequence,
          average_play_sequence: averagePlaySequence
        })
        .eq("id", matchId);

      // Delete existing stats
      await supabase.from("player_match_stats").delete().eq("match_id", matchId);

      // Insert new stats (only for rugby-compatible fields for now)
      if (statsData.length > 0) {
        const isRugby = ["XV", "7", "academie", "national_team"].includes(sportType);
        
        if (isRugby) {
          const { error } = await supabase.from("player_match_stats").insert(
            statsData.map((s) => ({
              match_id: matchId,
              player_id: s.playerId,
              tries: Number(s.tries) || 0,
              conversions: Number(s.conversions) || 0,
              penalties_scored: Number(s.penaltiesScored) || 0,
              drop_goals: Number(s.dropGoals) || 0,
              tackles: Number(s.tackles) || 0,
              tackles_missed: Number(s.tacklesMissed) || 0,
              defensive_recoveries: Number(s.defensiveRecoveries) || 0,
              carries: Number(s.carries) || 0,
              meters_gained: Number(s.metersGained) || 0,
              offloads: Number(s.offloads) || 0,
              turnovers_won: Number(s.turnoversWon) || 0,
              breakthroughs: Number(s.breakthroughs) || 0,
              total_contacts: Number(s.totalContacts) || 0,
              yellow_cards: Number(s.yellowCards) || 0,
              red_cards: Number(s.redCards) || 0,
            }))
          );
          if (error) throw error;
        }
        // For other sports, we would need additional columns in the database
        // For now, we just save the basic match info
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_match_stats", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      toast.success("Statistiques enregistrées");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  const updateStat = (playerId: string, stat: string, value: number) => {
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
            <DialogTitle>Statistiques - {fieldConfig.label}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-center py-8">
            Ajoutez d'abord des joueurs à la composition pour saisir leurs statistiques.
          </p>
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogContent>
      </Dialog>
    );
  }

  const renderStatInput = (player: PlayerStats, stat: StatField) => (
    <div key={stat.key}>
      <Label className="text-xs">{stat.shortLabel}</Label>
      <Input
        type="number"
        value={(player[stat.key] as number) || 0}
        onChange={(e) => updateStat(player.playerId, stat.key, parseFloat(e.target.value) || 0)}
        min={stat.min ?? 0}
        max={stat.max}
        className="h-8"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiques - {fieldConfig.label}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {statCategories.map(cat => (
              <TabsTrigger key={cat.key} value={cat.key}>{cat.label}</TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold mb-3 text-base text-primary">
                  Informations du match
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">Temps de jeu effectif (min)</Label>
                    <Input
                      type="number"
                      value={effectivePlayTime}
                      onChange={(e) => setEffectivePlayTime(parseInt(e.target.value) || 0)}
                      min={0}
                      max={120}
                      className="h-9 mt-1"
                      placeholder="Ex: 80"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Séquence la plus longue (sec)</Label>
                    <Input
                      type="number"
                      value={longestPlaySequence}
                      onChange={(e) => setLongestPlaySequence(parseInt(e.target.value) || 0)}
                      min={0}
                      className="h-9 mt-1"
                      placeholder="Ex: 180"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Séquence moyenne (sec)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={averagePlaySequence}
                      onChange={(e) => setAveragePlaySequence(parseFloat(e.target.value) || 0)}
                      min={0}
                      className="h-9 mt-1"
                      placeholder="Ex: 45.5"
                    />
                  </div>
                </div>
              </div>
              
              {/* General stats for each player */}
              {statsData.map((player) => {
                const generalStats = sportStats.filter(s => s.category === "general");
                if (generalStats.length === 0) return null;
                
                return (
                  <div key={player.playerId} className="p-3 rounded-lg border bg-card">
                    <h4 className="font-semibold mb-3 text-base text-primary">
                      {player.playerName}
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {generalStats.map(stat => renderStatInput(player, stat))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="scoring" className="space-y-4 mt-0">
              {statsData.map((player) => {
                const scoringStats = sportStats.filter(s => s.category === "scoring");
                
                return (
                  <div key={player.playerId} className="p-3 rounded-lg border bg-card">
                    <h4 className="font-semibold mb-3 text-base text-primary">
                      {player.playerName}
                    </h4>
                    <div className="grid grid-cols-4 gap-3">
                      {scoringStats.map(stat => renderStatInput(player, stat))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="attack" className="space-y-4 mt-0">
              {statsData.map((player) => {
                const attackStats = sportStats.filter(s => s.category === "attack");
                
                return (
                  <div key={player.playerId} className="p-3 rounded-lg border bg-card">
                    <h4 className="font-semibold mb-3 text-base text-primary">
                      {player.playerName}
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {attackStats.map(stat => renderStatInput(player, stat))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="defense" className="space-y-4 mt-0">
              {statsData.map((player) => {
                const defenseStats = sportStats.filter(s => s.category === "defense");
                
                return (
                  <div key={player.playerId} className="p-3 rounded-lg border bg-card">
                    <h4 className="font-semibold mb-3 text-base text-primary">
                      {player.playerName}
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {defenseStats.map(stat => renderStatInput(player, stat))}
                    </div>
                  </div>
                );
              })}
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
