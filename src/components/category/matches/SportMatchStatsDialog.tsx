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

import { toast } from "sonner";
import { BarChart3, Check, UserCircle, Satellite } from "lucide-react";
import { getStatsForSport, getStatCategories, hasGoalkeeperStats, type StatField } from "@/lib/constants/sportStats";
import { getSportFieldConfig } from "@/lib/constants/sportPositions";
import { isIndividualSport, isRugbyType } from "@/lib/constants/sportTypes";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useStatPreferences } from "@/hooks/use-stat-preferences";
import { MatchGpsImport } from "./MatchGpsImport";

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
  position: string;
  isGoalkeeper: boolean;
  [key: string]: string | number | boolean;
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
  const [showGpsImport, setShowGpsImport] = useState(false);
  const [selectedStatCategory, setSelectedStatCategory] = useState<string>("");
  const queryClient = useQueryClient();

  const fieldConfig = getSportFieldConfig(sportType);
  const isIndividual = isIndividualSport(sportType);
  const supportsGoalkeeper = hasGoalkeeperStats(sportType);
  const supportsGps = isRugbyType(sportType) || sportType.toLowerCase().includes("football");
  
  // Get the currently selected player
  const selectedPlayer = statsData.find(p => p.playerId === selectedPlayerId);
  
  // Get stats from preferences (filtered based on category settings)
  const { stats: filteredStats, allStats: allSportStats } = useStatPreferences({
    categoryId,
    sportType,
    matchId,
    isGoalkeeper: selectedPlayer?.isGoalkeeper ?? false,
  });
  
  // Use filtered stats if preferences exist, otherwise use all stats
  const sportStats = filteredStats.length > 0 ? filteredStats : getStatsForSport(sportType, selectedPlayer?.isGoalkeeper ?? false);
  const statCategories = getStatCategories(sportType);

  // Set default stat category
  useEffect(() => {
    if (statCategories.length > 0 && !selectedStatCategory) {
      setSelectedStatCategory(statCategories[0].key);
    }
  }, [statCategories, selectedStatCategory]);

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

  // Get players in the lineup for this match with position
  const { data: lineup } = useQuery({
    queryKey: ["match_lineup", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_lineups")
        .select("player_id, position, players(id, name)")
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
      // Determine all stats needed for initialization
      const allStats = [
        ...getStatsForSport(sportType, false),
        ...getStatsForSport(sportType, true)
      ];
      
      const stats = lineup.map((l) => {
        const existing = existingStats?.find((s) => s.player_id === l.player_id);
        const player = l.players as { id: string; name: string } | null;
        const position = l.position || "";
        
        // Check if player is goalkeeper based on position
        const isGk = position === "1" || position === "GK" || position.toLowerCase().includes("gardien");
        
        // Check if existing stats have goalkeeper marker
        const existingSportData = (existing as { sport_data?: Record<string, number | boolean> })?.sport_data || {};
        const wasGoalkeeper = existingSportData.isGoalkeeper === true;
        
        const playerStats: PlayerStats = {
          playerId: l.player_id,
          playerName: player?.name || "Athlète",
          position: position,
          isGoalkeeper: wasGoalkeeper || (supportsGoalkeeper && isGk),
        };

        // Get stats for this player (use all possible stats to not lose data)
        allStats.forEach(stat => {
          const snakeKey = stat.key.replace(/([A-Z])/g, '_$1').toLowerCase();
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
  }, [lineup, existingStats, sportType, selectedPlayerId, supportsGoalkeeper]);

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

  // Toggle goalkeeper status for selected player
  const toggleGoalkeeper = (playerId: string, isGk: boolean) => {
    setStatsData((prev) =>
      prev.map((p) => (p.playerId === playerId ? { ...p, isGoalkeeper: isGk } : p))
    );
  };

  // Check if a player has any stats entered
  const playerHasStats = (player: PlayerStats) => {
    const stats = getStatsForSport(sportType, player.isGoalkeeper);
    return stats.some(stat => (player[stat.key] as number) > 0);
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
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
            <SelectContent className="z-[200] bg-popover">
              {statsData
                .filter((player) => player.playerId && player.playerId.trim() !== "")
                .map((player) => (
                  <SelectItem 
                    key={player.playerId} 
                    value={player.playerId}
                  >
                    {player.playerName}
                    {playerHasStats(player) && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-2">
                        <Check className="h-3 w-3 mr-1" />
                        Stats
                      </Badge>
                    )}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Goalkeeper toggle for sports that support it */}
        {selectedPlayer && supportsGoalkeeper && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <Label htmlFor="goalkeeper-toggle" className="text-sm font-medium">
                Mode Gardien / Goal
              </Label>
            <Badge variant={selectedPlayer.isGoalkeeper ? "default" : "outline"} className="text-xs">
                {selectedPlayer.isGoalkeeper ? "Gardien" : "Athlète de champ"}
              </Badge>
            </div>
            <Switch
              id="goalkeeper-toggle"
              checked={selectedPlayer.isGoalkeeper}
              onCheckedChange={(checked) => toggleGoalkeeper(selectedPlayer.playerId, checked)}
            />
          </div>
        )}

        {selectedPlayer && (
          <div className="flex-1 min-h-0 flex flex-col space-y-4">
            {/* Category dropdown */}
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium whitespace-nowrap">Catégorie :</Label>
              <Select value={selectedStatCategory} onValueChange={setSelectedStatCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent className="z-[200] bg-popover">
                  {statCategories.map(cat => (
                    <SelectItem key={cat.key} value={cat.key}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="flex-1 min-h-[350px] max-h-[55vh] pr-4">
              {statCategories.map(cat => {
                if (cat.key !== selectedStatCategory) return null;
                
                return (
                  <div key={cat.key} className="space-y-4">
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
                      <h4 className="font-semibold mb-3 text-base text-primary flex items-center gap-2">
                        {selectedPlayer.playerName}
                        {selectedPlayer.isGoalkeeper && supportsGoalkeeper && (
                          <Badge variant="secondary" className="text-xs">Gardien</Badge>
                        )}
                        <span className="text-muted-foreground">- {cat.label}</span>
                      </h4>
                      <div className={`grid ${cat.key === "scoring" ? "grid-cols-4" : "grid-cols-3"} gap-3`}>
                        {sportStats.filter(s => s.category === cat.key).map(stat => renderStatInput(selectedPlayer, stat))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </ScrollArea>
          </div>
        )}

        <div className="flex justify-between gap-2 pt-4 border-t flex-shrink-0">
          <div>
            {supportsGps && hasLineup && (
              <Button variant="outline" onClick={() => setShowGpsImport(true)}>
                <Satellite className="h-4 w-4 mr-2" />
                Importer GPS
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={() => saveStats.mutate()} disabled={saveStats.isPending}>
              {saveStats.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>

        {/* GPS Import Dialog */}
        {supportsGps && matchData && (
          <MatchGpsImport
            open={showGpsImport}
            onOpenChange={setShowGpsImport}
            matchId={matchId}
            categoryId={categoryId}
            matchDate={matchData.match_date}
            players={statsData.map(p => ({ id: p.playerId, name: p.playerName, position: p.position }))}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
