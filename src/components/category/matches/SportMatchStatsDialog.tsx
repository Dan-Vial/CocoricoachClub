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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BarChart3, Check, UserCircle } from "lucide-react";
import { getStatsForSport, getStatCategories, type StatField } from "@/lib/constants/sportStats";
import { getSportFieldConfig } from "@/lib/constants/sportPositions";
import { isIndividualSport } from "@/lib/constants/sportTypes";
import { Badge } from "@/components/ui/badge";

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
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [effectivePlayTime, setEffectivePlayTime] = useState<number>(0);
  const [longestPlaySequence, setLongestPlaySequence] = useState<number>(0);
  const [averagePlaySequence, setAveragePlaySequence] = useState<number>(0);
  const queryClient = useQueryClient();

  const sportStats = getStatsForSport(sportType);
  const statCategories = getStatCategories(sportType);
  const fieldConfig = getSportFieldConfig(sportType);
  const isIndividual = isIndividualSport(sportType);

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
        
        const playerStats: PlayerStats = {
          playerId: l.player_id,
          playerName: player?.name || "Athlète",
        };

        // Get sport_data from existing stats if available
        const existingSportData = (existing as { sport_data?: Record<string, number> })?.sport_data || {};

        sportStats.forEach(stat => {
          const snakeKey = stat.key.replace(/([A-Z])/g, '_$1').toLowerCase();
          // First check sport_data, then legacy columns
          const value = existingSportData[stat.key] ?? 
                       existing?.[stat.key as keyof typeof existing] ?? 
                       existing?.[snakeKey as keyof typeof existing] ?? 
                       0;
          playerStats[stat.key] = typeof value === 'number' ? value : 0;
        });

        return playerStats;
      });
      setStatsData(stats);
      
      // Auto-select first player if none selected
      if (!selectedPlayerId && stats.length > 0) {
        setSelectedPlayerId(stats[0].playerId);
      }
    }
  }, [lineup, existingStats, sportStats, selectedPlayerId]);

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

      // Insert new stats for all sports
      if (statsData.length > 0) {
        // Build sport-specific data object for each player
        const statsToInsert = statsData.map((s) => {
          // Build sport_data JSON with all sport-specific stats
          const sportData: Record<string, number> = {};
          sportStats.forEach(stat => {
            sportData[stat.key] = Number(s[stat.key]) || 0;
          });

          return {
            match_id: matchId,
            player_id: s.playerId,
            // Keep rugby stats for backwards compatibility
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
            // Store all sport-specific stats in the JSONB column
            sport_data: sportData,
          };
        });

        const { error } = await supabase.from("player_match_stats").insert(statsToInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_match_stats", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      toast.success("Statistiques enregistrées");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving stats:", error);
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  const updateStat = (playerId: string, stat: string, value: number) => {
    setStatsData((prev) =>
      prev.map((p) => (p.playerId === playerId ? { ...p, [stat]: value } : p))
    );
  };

  const hasLineup = lineup && lineup.length > 0;
  const selectedPlayer = statsData.find(p => p.playerId === selectedPlayerId);

  // Check if a player has any stats entered
  const playerHasStats = (player: PlayerStats) => {
    return sportStats.some(stat => (player[stat.key] as number) > 0);
  };

  if (!hasLineup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Statistiques - {fieldConfig.label}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-center py-8">
            {isIndividual 
              ? "Ajoutez d'abord des participants pour saisir leurs statistiques."
              : "Ajoutez d'abord des athlètes à la composition pour saisir leurs statistiques."
            }
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

        {/* Player selector dropdown */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            {isIndividual ? "Sélectionner un participant" : "Sélectionner un athlète"}
          </Label>
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isIndividual ? "Choisir un participant..." : "Choisir un athlète..."} />
            </SelectTrigger>
            <SelectContent>
              {statsData.map((player) => (
                <SelectItem key={player.playerId} value={player.playerId}>
                  <div className="flex items-center gap-2">
                    <span>{player.playerName}</span>
                    {playerHasStats(player) && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        <Check className="h-3 w-3 mr-1" />
                        Stats
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPlayer && (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className={`grid w-full ${statCategories.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {statCategories.map(cat => (
                <TabsTrigger key={cat.key} value={cat.key}>{cat.label}</TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="h-[350px] mt-4">
              {statCategories.map(cat => (
                <TabsContent key={cat.key} value={cat.key} className="space-y-4 mt-0">
                  {cat.key === "general" && !isIndividual && (
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
                  )}
                  
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-semibold mb-3 text-base text-primary">
                      {selectedPlayer.playerName} - {cat.label}
                    </h4>
                    <div className={`grid ${cat.key === "scoring" ? "grid-cols-4" : "grid-cols-3"} gap-3`}>
                      {sportStats.filter(s => s.category === cat.key).map(stat => renderStatInput(selectedPlayer, stat))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        )}

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
