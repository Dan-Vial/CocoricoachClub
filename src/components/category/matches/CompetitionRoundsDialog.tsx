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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Trophy, Target, BarChart3, Swords, Circle, Ship, Users, Droplet, CheckCircle, Lock } from "lucide-react";
import { getStatsForSport, getStatCategories, getAggregatedStatsForSport, type StatField } from "@/lib/constants/sportStats";
import { useStatPreferences } from "@/hooks/use-stat-preferences";
import { BowlingOilPatternSection } from "./BowlingOilPatternSection";
import { BowlingScoreSheet, FrameData, BowlingStats } from "@/components/athlete-portal/BowlingScoreSheet";

const blurOnWheel = (e: React.WheelEvent<HTMLInputElement>) => {
  // Prevent wheel/trackpad from changing number inputs instead of scrolling the dialog
  e.currentTarget.blur();
};

interface CompetitionRoundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  categoryId: string;
  sportType: string;
}

interface Round {
  id?: string;
  round_number: number;
  opponent_name: string;
  result: string;
  notes: string;
  stats: Record<string, number>;
  // New fields for Aviron/Judo
  phase: string;
  lane?: number;
  wind_conditions?: string;
  current_conditions?: string;
  temperature_celsius?: number;
  final_time_seconds?: number;
  ranking?: number;
  gap_to_first?: string;
  // Bowling specific
  isLocked?: boolean;
  bowlingFrames?: FrameData[];
}

interface PlayerRounds {
  playerId: string;
  playerName: string;
  rounds: Round[];
  // Aviron crew info
  boat_type?: string;
  crew_role?: string;
  seat_position?: number;
}

// Aviron phases
const AVIRON_PHASES = [
  { value: "serie", label: "Série" },
  { value: "repechage", label: "Repêchage" },
  { value: "quart", label: "Quart de finale" },
  { value: "demi", label: "Demi-finale" },
  { value: "petite_finale", label: "Petite finale" },
  { value: "finale", label: "Finale A" },
  { value: "finale_b", label: "Finale B" },
];

// Judo phases
const JUDO_PHASES = [
  { value: "poules", label: "Phase de poules" },
  { value: "repechage", label: "Repêchage" },
  { value: "huitiemes", label: "Huitièmes de finale" },
  { value: "quart", label: "Quart de finale" },
  { value: "demi", label: "Demi-finale" },
  { value: "bronze", label: "Match pour le bronze" },
  { value: "finale", label: "Finale" },
];

// Bowling phases
const BOWLING_PHASES = [
  { value: "qualification", label: "Qualification" },
  { value: "round_robin", label: "Round Robin" },
  { value: "quart", label: "Quart de finale" },
  { value: "demi", label: "Demi-finale" },
  { value: "petite_finale", label: "Petite finale" },
  { value: "finale", label: "Finale" },
];

// Aviron boat types
const AVIRON_BOAT_TYPES = [
  { value: "1x", label: "1x (Skiff)" },
  { value: "2x", label: "2x (Double)" },
  { value: "2-", label: "2- (Deux sans barreur)" },
  { value: "4x", label: "4x (Quatre de couple)" },
  { value: "4-", label: "4- (Quatre sans barreur)" },
  { value: "4+", label: "4+ (Quatre avec barreur)" },
  { value: "8+", label: "8+ (Huit)" },
];

// Crew roles
const CREW_ROLES = [
  { value: "rameur", label: "Rameur" },
  { value: "barreur", label: "Barreur" },
];

export function CompetitionRoundsDialog({
  open,
  onOpenChange,
  matchId,
  categoryId,
  sportType,
}: CompetitionRoundsDialogProps) {
  const [playerRoundsData, setPlayerRoundsData] = useState<PlayerRounds[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const queryClient = useQueryClient();

  const { stats: filteredSportStats, hasCustomPreferences } = useStatPreferences({ categoryId, sportType });
  const sportStats = hasCustomPreferences ? filteredSportStats : (filteredSportStats.length > 0 ? filteredSportStats : getStatsForSport(sportType));
  const allStatCategories = getStatCategories(sportType);
  const statCategories = allStatCategories.filter(cat => sportStats.some(s => s.category === cat.key));
  const aggregatedStats = getAggregatedStatsForSport(sportType);
  const isJudo = sportType.toLowerCase().includes("judo");
  const isBowling = sportType.toLowerCase().includes("bowling");
  const isAviron = sportType.toLowerCase().includes("aviron");
  
  // Set default active tab based on sport type
  const getDefaultTab = () => {
    if (isAviron) return "crew";
    if (isBowling) return "oil";
    return "rounds";
  };
  const [activeTab, setActiveTab] = useState<string>(getDefaultTab());

  // Reset initialization flag when dialog opens/closes to allow fresh data load
  useEffect(() => {
    if (open) {
      setIsDataInitialized(false);
      setPlayerRoundsData([]);
      setSelectedPlayerId("");
    }
  }, [open]);
  
  const phases = isAviron ? AVIRON_PHASES : isJudo ? JUDO_PHASES : isBowling ? BOWLING_PHASES : [];
  const roundLabel = isJudo ? "Combat" : isAviron ? "Course" : isBowling ? "Partie" : "Round";
  const roundLabelPlural = isJudo ? "Combats" : isAviron ? "Courses" : isBowling ? "Parties" : "Rounds";

  // Lock a bowling round after validation
  const lockBowlingRound = (playerId: string, roundNumber: number) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.playerId === playerId) {
        return {
          ...p,
          rounds: p.rounds.map(r => 
            r.round_number === roundNumber ? { ...r, isLocked: true } : r
          ),
        };
      }
      return p;
    }));
    toast.success(`Partie ${roundNumber} validée et verrouillée`);
  };

  // Handle bowling score sheet save with frames
  const handleBowlingScoreSheetSave = (
    playerId: string, 
    roundNumber: number, 
    sheetStats: BowlingStats, 
    frames: FrameData[]
  ) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.playerId === playerId) {
        return {
          ...p,
          rounds: p.rounds.map(r => {
            if (r.round_number === roundNumber) {
              return {
                ...r,
                bowlingFrames: frames,
                isLocked: true,
                stats: {
                  ...r.stats,
                  gameScore: sheetStats.totalScore,
                  strikes: sheetStats.strikes,
                  strikePercentage: sheetStats.strikePercentage,
                  spares: sheetStats.spares,
                  sparePercentage: sheetStats.sparePercentage,
                  openFrames: sheetStats.openFrames,
                  splitCount: sheetStats.splitCount,
                  splitConverted: sheetStats.splitConverted,
                  splitOnLastThrow: sheetStats.splitOnLastThrow,
                  splitConversionRate: sheetStats.splitPercentage,
                  spareOpportunities: Math.max(0, 10 - sheetStats.strikes),
                  pocketCount: sheetStats.pocketCount,
                  pocketPercentage: sheetStats.pocketPercentage,
                  singlePinCount: sheetStats.singlePinCount,
                  singlePinConverted: sheetStats.singlePinConverted,
                  singlePinConversionRate: sheetStats.singlePinConversionRate,
                },
              };
            }
            return r;
          }),
        };
      }
      return p;
    }));
    toast.success(`Partie ${roundNumber} enregistrée et verrouillée`);
  };

  // Get match data for date
  const { data: matchData } = useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const { data, error } = await supabase.from("matches").select("match_date").eq("id", matchId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  // Get players in the lineup for this match
  const { data: lineup } = useQuery({
    queryKey: ["match_lineup", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_lineups")
        .select("player_id, boat_type, crew_role, seat_position, players(id, name, first_name)")
        .eq("match_id", matchId);
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  // Get existing rounds
  const { data: existingRounds } = useQuery({
    queryKey: ["competition_rounds", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_rounds")
        .select("*, competition_round_stats(*)")
        .eq("match_id", matchId)
        .order("round_number");
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  // Initialize data only once when lineup and existingRounds are loaded
  useEffect(() => {
    // Only initialize once to prevent overwriting local state (new rounds added by user)
    if (isDataInitialized) return;
    
    if (lineup && lineup.length > 0) {
      const playersData = lineup.map((l) => {
        const player = l.players as { id: string; name: string; first_name?: string } | null;
        const playerRounds = existingRounds?.filter(r => r.player_id === l.player_id) || [];
        
        return {
          playerId: l.player_id,
          playerName: [player?.first_name, player?.name].filter(Boolean).join(" ") || "Athlète",
          boat_type: l.boat_type || undefined,
          crew_role: l.crew_role || undefined,
          seat_position: l.seat_position || undefined,
          rounds: playerRounds.map(r => {
            const statData = r.competition_round_stats?.[0]?.stat_data as Record<string, any> || {};
            // Extract bowling frames if stored in stat_data
            const bowlingFrames = statData.bowlingFrames as FrameData[] | undefined;
            // Remove bowlingFrames from stats object for display
            const { bowlingFrames: _, ...cleanStats } = statData;
            
            return {
              id: r.id,
              round_number: r.round_number,
              opponent_name: r.opponent_name || "",
              result: r.result || "",
              notes: r.notes || "",
              stats: cleanStats as Record<string, number>,
              phase: r.phase || "",
              lane: r.lane || undefined,
              wind_conditions: r.wind_conditions || undefined,
              current_conditions: r.current_conditions || undefined,
              temperature_celsius: r.temperature_celsius || undefined,
              final_time_seconds: r.final_time_seconds || undefined,
              ranking: r.ranking || undefined,
              gap_to_first: r.gap_to_first || undefined,
              // For bowling: mark as locked if it has an id (already saved), restore frames
              isLocked: !!r.id,
              bowlingFrames: bowlingFrames,
            };
          }),
        };
      });
      setPlayerRoundsData(playersData);
      setIsDataInitialized(true);
      
      // Only set the default selected player if not already set
      if (!selectedPlayerId && playersData.length > 0) {
        setSelectedPlayerId(playersData[0].playerId);
      }
    }
  }, [lineup, existingRounds, isDataInitialized, selectedPlayerId]);

  // Update crew info for a player
  const updatePlayerCrewInfo = (playerId: string, field: string, value: any) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.playerId === playerId) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const saveRounds = useMutation({
    mutationFn: async () => {
      // For each player, save their crew info and rounds
      for (const playerData of playerRoundsData) {
        // Update crew info in match_lineups if Aviron
        if (isAviron) {
          await supabase
            .from("match_lineups")
            .update({
              boat_type: playerData.boat_type || null,
              crew_role: playerData.crew_role || null,
              seat_position: playerData.seat_position || null,
            })
            .eq("match_id", matchId)
            .eq("player_id", playerData.playerId);
        }

        // Delete existing rounds for this player in this match
        await supabase
          .from("competition_rounds")
          .delete()
          .eq("match_id", matchId)
          .eq("player_id", playerData.playerId);

        // Insert new rounds
        for (const round of playerData.rounds) {
          const { data: roundData, error: roundError } = await supabase
            .from("competition_rounds")
            .insert({
              match_id: matchId,
              player_id: playerData.playerId,
              round_number: round.round_number,
              opponent_name: round.opponent_name || null,
              result: round.result || null,
              notes: round.notes || null,
              phase: round.phase || null,
              lane: round.lane || null,
              wind_conditions: round.wind_conditions || null,
              current_conditions: round.current_conditions || null,
              temperature_celsius: round.temperature_celsius || null,
              final_time_seconds: round.final_time_seconds || null,
              ranking: round.ranking || null,
              gap_to_first: round.gap_to_first || null,
            })
            .select()
            .single();

          if (roundError) throw roundError;

          // Insert stats for this round (include bowling frames if present)
          const statDataToSave = round.bowlingFrames 
            ? { ...round.stats, bowlingFrames: round.bowlingFrames }
            : round.stats;
          
          if (Object.keys(statDataToSave).length > 0) {
            const insertData = {
              round_id: roundData.id,
              stat_data: JSON.parse(JSON.stringify(statDataToSave)),
            };
            const { error: statsError } = await supabase
              .from("competition_round_stats")
              .insert(insertData);
            if (statsError) throw statsError;
          }
        }
      }

      // Auto-inject RPE 10/10 for each participant based on total competition time
      if (matchData && playerRoundsData.length > 0) {
        const matchDate = matchData.match_date?.split("T")[0] || new Date().toISOString().split("T")[0];
        
        const playerIds = playerRoundsData.map(p => p.playerId);
        for (const playerId of playerIds) {
          await supabase
            .from("awcr_tracking")
            .delete()
            .eq("player_id", playerId)
            .eq("category_id", categoryId)
            .eq("session_date", matchDate)
            .is("training_session_id", null)
            .gte("rpe", 10);
        }

        const rpeEntries = playerRoundsData.map(p => {
          // Estimate duration from rounds (sum of combat durations or default 60min for competition)
          const totalDuration = p.rounds.reduce((sum, r) => {
            const combatTime = r.stats?.combatDuration || r.stats?.final_time_seconds || 0;
            return sum + (combatTime > 0 ? Math.ceil(combatTime / 60) : 5); // 5 min per round default
          }, 0) || 60;
          
          return {
            player_id: p.playerId,
            category_id: categoryId,
            session_date: matchDate,
            rpe: 10,
            duration_minutes: Math.max(totalDuration, 1),
            training_load: 10 * Math.max(totalDuration, 1),
          };
        });

        if (rpeEntries.length > 0) {
          await supabase.from("awcr_tracking").insert(rpeEntries);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competition_rounds", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match_lineup", matchId] });
      queryClient.invalidateQueries({ queryKey: ["awcr_tracking"] });
      toast.success("Données et charge match enregistrées");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving rounds:", error);
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  const addRound = (playerId: string) => {
    const player = playerRoundsData.find((p) => p.playerId === playerId);
    const newRoundNumber = player && player.rounds.length > 0
      ? Math.max(...player.rounds.map((r) => r.round_number)) + 1
      : 1;

    setPlayerRoundsData((prev) =>
      prev.map((p) => {
        if (p.playerId === playerId) {
          return {
            ...p,
            rounds: [
              ...p.rounds,
              {
                round_number: newRoundNumber,
                opponent_name: "",
                result: "",
                notes: "",
                stats: {},
                phase: "",
                isLocked: false,
                bowlingFrames: undefined,
              },
            ],
          };
        }
        return p;
      }),
    );
  };

  const removeRound = (playerId: string, roundNumber: number) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.playerId === playerId) {
        return {
          ...p,
          rounds: p.rounds.filter(r => r.round_number !== roundNumber),
        };
      }
      return p;
    }));
  };

  const updateRound = (playerId: string, roundNumber: number, updates: Partial<Round>) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.playerId === playerId) {
        return {
          ...p,
          rounds: p.rounds.map(r => 
            r.round_number === roundNumber ? { ...r, ...updates } : r
          ),
        };
      }
      return p;
    }));
  };

  const updateRoundStat = (playerId: string, roundNumber: number, statKey: string, value: number) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.playerId === playerId) {
        return {
          ...p,
          rounds: p.rounds.map(r => 
            r.round_number === roundNumber 
              ? { ...r, stats: { ...r.stats, [statKey]: value } } 
              : r
          ),
        };
      }
      return p;
    }));
  };

  // Format time from seconds to MM:SS.ms
  const formatTime = (seconds: number | undefined): string => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  // Parse time from MM:SS.ms to seconds
  const parseTime = (timeStr: string): number | undefined => {
    if (!timeStr) return undefined;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0;
      const secs = parseFloat(parts[1]) || 0;
      return mins * 60 + secs;
    }
    return parseFloat(timeStr) || undefined;
  };

  const hasLineup = lineup && lineup.length > 0;
  const selectedPlayer = playerRoundsData.find(p => p.playerId === selectedPlayerId);

  // Calculate aggregated stats for a player
  const calculateAggregatedStats = (rounds: Round[]) => {
    const aggregated: Record<string, number> = {};
    const counts: Record<string, number> = {};
    
    rounds.forEach(round => {
      Object.entries(round.stats).forEach(([key, value]) => {
        if (aggregated[key] === undefined) {
          aggregated[key] = 0;
          counts[key] = 0;
        }
        aggregated[key] += value;
        counts[key]++;
      });
    });

    // Calculate wins/losses for result tracking
    const wins = rounds.filter(r => r.result === "win").length;
    const losses = rounds.filter(r => r.result === "loss").length;
    const draws = rounds.filter(r => r.result === "draw").length;
    
    // Aviron: best time and average ranking
    const timesWithValues = rounds.filter(r => r.final_time_seconds);
    const bestTime = timesWithValues.length > 0 
      ? Math.min(...timesWithValues.map(r => r.final_time_seconds!)) 
      : undefined;
    const rankingsWithValues = rounds.filter(r => r.ranking);
    const avgRanking = rankingsWithValues.length > 0
      ? rankingsWithValues.reduce((sum, r) => sum + r.ranking!, 0) / rankingsWithValues.length
      : undefined;

    return { aggregated, counts, wins, losses, draws, total: rounds.length, bestTime, avgRanking };
  };

  if (!hasLineup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAviron ? <Ship className="h-5 w-5" /> : isJudo ? <Swords className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
            {roundLabelPlural}
          </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-center py-8">
            Ajoutez d'abord des participants à la composition pour gérer leurs {roundLabelPlural.toLowerCase()}.
          </p>
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden relative">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {isAviron ? <Ship className="h-5 w-5" /> : isJudo ? <Swords className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
            Gestion des {roundLabelPlural}
          </DialogTitle>
          {/* Debug hint to quickly validate sport detection in production */}
          {sportType && (
            <p className="text-xs text-muted-foreground">
              Debug: sportType="{sportType}" • bowling={String(isBowling)}
            </p>
          )}
        </DialogHeader>

        {/* Player selector */}
        <div className="space-y-2 flex-shrink-0">
          <Label className="text-sm font-medium">Sélectionner un athlète</Label>
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir un athlète..." />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              {playerRoundsData.map((player) => (
                <SelectItem 
                  key={player.playerId} 
                  value={player.playerId}
                  textValue={player.playerName}
                >
                  <div className="flex items-center gap-2">
                    <span>{player.playerName}</span>
                    {isAviron && player.boat_type && (
                      <Badge variant="outline" className="text-xs">{player.boat_type}</Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {player.rounds.length} {player.rounds.length === 1 ? roundLabel.toLowerCase() : roundLabelPlural.toLowerCase()}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPlayer && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
            <TabsList className={`grid w-full flex-shrink-0 ${isAviron ? 'grid-cols-3' : isBowling ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {isAviron && (
                <TabsTrigger value="crew" className="gap-2">
                  <Users className="h-4 w-4" />
                  Équipage
                </TabsTrigger>
              )}
              {isBowling && (
                <TabsTrigger value="oil" className="gap-2">
                  <Droplet className="h-4 w-4" />
                  Huilage
                </TabsTrigger>
              )}
              <TabsTrigger value="rounds" className="gap-2">
                <Target className="h-4 w-4" />
                {roundLabelPlural}
              </TabsTrigger>
              <TabsTrigger value="summary" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Résumé
              </TabsTrigger>
            </TabsList>

            {/* Crew Tab (Aviron only) */}
            {isAviron && (
              <TabsContent value="crew">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Ship className="h-4 w-4" />
                      Bateau / Équipage - {selectedPlayer.playerName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Type de bateau</Label>
                        <Select 
                          value={selectedPlayer.boat_type || ""} 
                          onValueChange={(v) => updatePlayerCrewInfo(selectedPlayer.playerId, "boat_type", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent className="z-[200]">
                            {AVIRON_BOAT_TYPES.map((boat) => (
                              <SelectItem key={boat.value} value={boat.value}>
                                {boat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Rôle</Label>
                        <Select 
                          value={selectedPlayer.crew_role || ""} 
                          onValueChange={(v) => updatePlayerCrewInfo(selectedPlayer.playerId, "crew_role", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent className="z-[200]">
                            {CREW_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Position (siège)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={8}
                          value={selectedPlayer.seat_position || ""}
                          onChange={(e) => updatePlayerCrewInfo(selectedPlayer.playerId, "seat_position", parseInt(e.target.value) || undefined)}
                          placeholder="Ex: 3"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Oil Pattern Tab (Bowling only) */}
            {isBowling && (
              <TabsContent value="oil" className="mt-0 overflow-hidden">
                <ScrollArea className="h-[calc(90vh-300px)]">
                  <div className="pr-4 pb-4">
                    <BowlingOilPatternSection
                      matchId={matchId}
                      categoryId={categoryId}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            )}

            <TabsContent value="rounds" className="flex-1 min-h-0 mt-0 overflow-hidden">
              <ScrollArea className="h-[calc(90vh-280px)] pr-4">
                <div className="space-y-4 pb-4">
                  {/* Add round button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addRound(selectedPlayer.playerId)}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter {isAviron ? "une course" : isJudo ? "un combat" : isBowling ? "une partie" : `un ${roundLabel.toLowerCase()}`}
                  </Button>

                  {selectedPlayer.rounds.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground space-y-2">
                      <p>Aucun {roundLabel.toLowerCase()} enregistré</p>
                      <p className="text-sm">
                        {isBowling
                          ? "Cliquez sur “Ajouter une partie (feuille de score)” pour saisir X / / 0-9."
                          : `Cliquez sur le bouton ci-dessus pour ajouter ${isAviron ? "une course" : isJudo ? "un combat" : `un ${roundLabel.toLowerCase()}`}.`}
                      </p>
                    </div>
                  ) : (
                    selectedPlayer.rounds.map((round) => (
                      <Card key={round.round_number} className={`relative ${round.isLocked ? "opacity-80" : ""}`}>
                        {/* Locked indicator */}
                        {round.isLocked && (
                          <div className="absolute top-2 right-2 z-10">
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Validée
                            </Badge>
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              {isAviron ? <Ship className="h-4 w-4" /> : isJudo ? <Swords className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                              {roundLabel} {round.round_number}
                              {round.phase && (
                                <Badge variant="outline" className="ml-2">
                                  {phases.find(p => p.value === round.phase)?.label || round.phase}
                                </Badge>
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-1">
                              {!round.isLocked && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => removeRound(selectedPlayer.playerId, round.round_number)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Phase selection */}
                          {phases.length > 0 && !isBowling && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Phase</Label>
                                <Select
                                  value={round.phase}
                                  onValueChange={(value) => updateRound(selectedPlayer.playerId, round.round_number, { phase: value })}
                                  disabled={round.isLocked}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Sélectionner..." />
                                  </SelectTrigger>
                                  <SelectContent className="z-[200]">
                                    {phases.map((phase) => (
                                      <SelectItem key={phase.value} value={phase.value}>
                                        {phase.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {isAviron && (
                                <div>
                                  <Label className="text-xs">Couloir</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={9}
                                     onWheel={blurOnWheel}
                                    value={round.lane || ""}
                                    onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { lane: parseInt(e.target.value) || undefined })}
                                    placeholder="1-9"
                                    className="h-8"
                                    disabled={round.isLocked}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Aviron: Conditions */}
                          {isAviron && (
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs">Vent</Label>
                                <Input
                                  value={round.wind_conditions || ""}
                                  onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { wind_conditions: e.target.value })}
                                  placeholder="Ex: Vent de face 10km/h"
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Courant</Label>
                                <Input
                                  value={round.current_conditions || ""}
                                  onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { current_conditions: e.target.value })}
                                  placeholder="Ex: Faible"
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Température (°C)</Label>
                                <Input
                                  type="number"
                                  onWheel={blurOnWheel}
                                  value={round.temperature_celsius || ""}
                                  onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { temperature_celsius: parseFloat(e.target.value) || undefined })}
                                  placeholder="20"
                                  className="h-8"
                                />
                              </div>
                            </div>
                          )}

                          {/* Aviron: Results */}
                          {isAviron && (
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs">Temps final (MM:SS.ms)</Label>
                                <Input
                                  value={round.final_time_seconds ? formatTime(round.final_time_seconds) : ""}
                                  onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { final_time_seconds: parseTime(e.target.value) })}
                                  placeholder="6:45.23"
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Classement</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  onWheel={blurOnWheel}
                                  value={round.ranking || ""}
                                  onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { ranking: parseInt(e.target.value) || undefined })}
                                  placeholder="1"
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Écart au 1er</Label>
                                <Input
                                  value={round.gap_to_first || ""}
                                  onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { gap_to_first: e.target.value })}
                                  placeholder="+2.5s ou +3%"
                                  className="h-8"
                                />
                              </div>
                            </div>
                          )}

                          {/* Basic round info for non-Aviron, non-Bowling */}
                          {!isAviron && !isBowling && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Adversaire</Label>
                                <Input
                                  value={round.opponent_name}
                                  onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { opponent_name: e.target.value })}
                                  placeholder="Nom de l'adversaire"
                                  className="h-8"
                                  disabled={round.isLocked}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Résultat</Label>
                                <Select
                                  value={round.result}
                                  onValueChange={(value) => updateRound(selectedPlayer.playerId, round.round_number, { result: value })}
                                  disabled={round.isLocked}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Résultat" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[200]">
                                    <SelectItem value="win">
                                      <span className="flex items-center gap-2">
                                        <Trophy className="h-3 w-3 text-green-500" />
                                        Victoire
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="loss">
                                      <span className="text-destructive">Défaite</span>
                                    </SelectItem>
                                    <SelectItem value="draw">
                                      <span className="text-muted-foreground">Égalité</span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {/* Bowling: Phase, Adversaire, then score sheet */}
                          {isBowling && (
                            <div className={`space-y-4 ${round.isLocked ? "opacity-80" : ""}`}>
                              {/* Phase and opponent info - always visible */}
                              <div className={`grid grid-cols-2 gap-3 ${round.isLocked ? "pointer-events-none" : ""}`}>
                                <div>
                                  <Label className="text-xs">Phase</Label>
                                  <Select
                                    value={round.phase}
                                    onValueChange={(value) => updateRound(selectedPlayer.playerId, round.round_number, { phase: value })}
                                    disabled={round.isLocked}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Sélectionner..." />
                                    </SelectTrigger>
                                    <SelectContent className="z-[200]">
                                      {BOWLING_PHASES.map((phase) => (
                                        <SelectItem key={phase.value} value={phase.value}>
                                          {phase.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Adversaire</Label>
                                  <Input
                                    value={round.opponent_name}
                                    onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { opponent_name: e.target.value })}
                                    placeholder="Nom de l'adversaire"
                                    className="h-8"
                                    disabled={round.isLocked}
                                  />
                                </div>
                              </div>

                              {/* Locked state indicator */}
                              {round.isLocked && (
                                <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted border border-border">
                                  <Lock className="h-5 w-5 text-primary" />
                                  <span className="text-sm font-medium text-foreground">
                                    Partie validée - Consultation uniquement
                                  </span>
                                </div>
                              )}

                              {/* Embedded Bowling Score Sheet */}
                              <div className={round.isLocked ? "pointer-events-none" : ""}>
                                <BowlingScoreSheet
                                  key={`bowling-${round.round_number}-${round.isLocked}`}
                                  initialFrames={round.bowlingFrames}
                                  onSave={(stats, frames) => {
                                    handleBowlingScoreSheetSave(
                                      selectedPlayer.playerId,
                                      round.round_number,
                                      stats,
                                      frames
                                    );
                                  }}
                                  onCancel={() => {
                                    // Remove the round if cancelled (new game not saved)
                                    if (!round.isLocked) {
                                      removeRound(selectedPlayer.playerId, round.round_number);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Stats for this round - organized by category (non-bowling, non-aviron) */}
                          {!isAviron && !isBowling && (
                            <div className="space-y-3">
                              {statCategories.map(cat => {
                                const categoryStats = sportStats.filter(s => s.category === cat.key);
                                if (categoryStats.length === 0) return null;
                                return (
                                  <div key={cat.key}>
                                    <Label className="text-xs font-medium text-primary">{cat.label}</Label>
                                    <div className="grid grid-cols-3 gap-2 mt-1">
                                      {categoryStats.map(stat => (
                                        <div key={stat.key}>
                                          <Label className="text-[10px] text-muted-foreground">{stat.shortLabel}</Label>
                                          <Input
                                            type="number"
                                            value={round.stats[stat.key] || 0}
                                            onChange={(e) => updateRoundStat(selectedPlayer.playerId, round.round_number, stat.key, parseFloat(e.target.value) || 0)}
                                            min={stat.min ?? 0}
                                            max={stat.max}
                                            className="h-7 text-sm"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Notes */}
                          <div>
                            <Label className="text-xs">Notes</Label>
                            <Input
                              value={round.notes}
                              onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { notes: e.target.value })}
                              placeholder={`Notes sur ${isAviron ? 'cette course' : isJudo ? 'ce combat' : 'ce round'}`}
                              className="h-8"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="summary" className="flex-1 min-h-0 mt-0 overflow-hidden">
              <ScrollArea className="h-[calc(90vh-280px)]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Résumé de la compétition - {selectedPlayer.playerName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPlayer.rounds.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Aucun {roundLabel.toLowerCase()} enregistré
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Results summary */}
                      {(() => {
                        const { wins, losses, draws, total, aggregated, bestTime, avgRanking } = calculateAggregatedStats(selectedPlayer.rounds);
                        return (
                          <>
                            {isAviron ? (
                              <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 rounded-lg bg-muted">
                                  <p className="text-2xl font-bold">{total}</p>
                                  <p className="text-xs text-muted-foreground">{roundLabelPlural}</p>
                                </div>
                                {bestTime && (
                                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                                    <p className="text-2xl font-bold text-green-600">{formatTime(bestTime)}</p>
                                    <p className="text-xs text-muted-foreground">Meilleur temps</p>
                                  </div>
                                )}
                                {avgRanking && (
                                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                                    <p className="text-2xl font-bold text-blue-600">{avgRanking.toFixed(1)}</p>
                                    <p className="text-xs text-muted-foreground">Classement moyen</p>
                                  </div>
                                )}
                              </div>
                            ) : isBowling ? (
                              // Bowling-specific summary with global stats
                              <>
                                {/* Main metrics */}
                                <div className="grid grid-cols-4 gap-3 text-center">
                                  <div className="p-3 rounded-lg bg-muted">
                                    <p className="text-2xl font-bold">{total}</p>
                                    <p className="text-xs text-muted-foreground">Parties</p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-primary/10">
                                    <p className="text-2xl font-bold text-primary">
                                      {Math.max(...selectedPlayer.rounds.map(r => r.stats["gameScore"] || 0))}
                                    </p>
                                    <p className="text-xs text-muted-foreground">High Game</p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-secondary/50">
                                    <p className="text-2xl font-bold">
                                      {(selectedPlayer.rounds.reduce((sum, r) => sum + (r.stats["gameScore"] || 0), 0) / total || 0).toFixed(1)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Moyenne</p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted">
                                    <p className="text-2xl font-bold">
                                      {selectedPlayer.rounds.reduce((sum, r) => sum + (r.stats["gameScore"] || 0), 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Total Pins</p>
                                  </div>
                                </div>

                                {/* Strikes and Spares totals */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 rounded-lg border bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-3xl font-bold text-amber-600">
                                          {selectedPlayer.rounds.reduce((sum, r) => sum + (r.stats["strikes"] || 0), 0)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Strikes totaux</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-lg font-semibold">
                                          {((selectedPlayer.rounds.reduce((sum, r) => sum + (r.stats["strikePercentage"] || 0), 0) / total) || 0).toFixed(1)}%
                                        </p>
                                        <p className="text-xs text-muted-foreground">Moy. % strikes</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-3xl font-bold text-blue-600">
                                          {selectedPlayer.rounds.reduce((sum, r) => sum + (r.stats["spares"] || 0), 0)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Spares (hors splits)</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-lg font-semibold">
                                          {((selectedPlayer.rounds.reduce((sum, r) => sum + (r.stats["sparePercentage"] || 0), 0) / total) || 0).toFixed(1)}%
                                        </p>
                                        <p className="text-xs text-muted-foreground">Moy. % spares</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Split stats */}
                                <div className="p-3 rounded-lg border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10">
                                  <div className="flex items-center justify-between">
                                    <div className="flex gap-6">
                                      <div>
                                        <p className="text-2xl font-bold text-orange-600">
                                          {selectedPlayer.rounds.reduce((sum, r) => sum + (r.stats["splitCount"] || 0), 0)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Splits total</p>
                                      </div>
                                      <div>
                                        <p className="text-2xl font-bold text-green-600">
                                          {selectedPlayer.rounds.reduce((sum, r) => sum + (r.stats["splitConverted"] || 0), 0)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Splits convertis</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-lg font-semibold">
                                        {(() => {
                                          const totalSplits = selectedPlayer.rounds.reduce((sum, r) => sum + (r.stats["splitCount"] || 0), 0);
                                          const totalConverted = selectedPlayer.rounds.reduce((sum, r) => sum + (r.stats["splitConverted"] || 0), 0);
                                          return totalSplits > 0 ? ((totalConverted / totalSplits) * 100).toFixed(1) : 0;
                                        })()}%
                                      </p>
                                      <p className="text-xs text-muted-foreground">% Conv. Splits</p>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                                    Splits sur 11e/12e lancer exclus: {selectedPlayer.rounds.reduce((sum, r) => sum + (r.stats["splitOnLastThrow"] || 0), 0)}
                                  </p>
                                </div>

                                {/* Other stats */}
                                <div className="grid grid-cols-2 gap-3 text-center">
                                  <div className="p-2 rounded border">
                                    <p className="text-lg font-bold">{selectedPlayer.rounds.reduce((sum, r) => sum + (r.stats["openFrames"] || 0), 0)}</p>
                                    <p className="text-xs text-muted-foreground">Open Frames</p>
                                  </div>
                                  <div className="p-2 rounded border">
                                    <p className="text-lg font-bold">{wins}/{losses}</p>
                                    <p className="text-xs text-muted-foreground">V/D</p>
                                  </div>
                                </div>

                                {/* Games list */}
                                <div className="space-y-2">
                                  <h4 className="font-medium">Détail des parties</h4>
                                  <div className="space-y-1">
                                    {selectedPlayer.rounds.map(round => (
                                      <div key={round.round_number} className="flex items-center justify-between p-2 rounded border text-sm">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline">
                                            {phases.find(p => p.value === round.phase)?.label || `Partie ${round.round_number}`}
                                          </Badge>
                                          {round.opponent_name && (
                                            <span className="text-muted-foreground">vs {round.opponent_name}</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="font-mono font-bold">{round.stats["gameScore"] || 0}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {round.stats["strikes"] || 0}X / {round.stats["spares"] || 0}/
                                          </span>
                                          {round.result && (
                                            <Badge variant={round.result === "win" ? "default" : round.result === "loss" ? "destructive" : "secondary"}>
                                              {round.result === "win" ? "V" : round.result === "loss" ? "D" : "N"}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="grid grid-cols-4 gap-3 text-center">
                                <div className="p-3 rounded-lg bg-muted">
                                  <p className="text-2xl font-bold">{total}</p>
                                  <p className="text-xs text-muted-foreground">{roundLabelPlural}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                                  <p className="text-2xl font-bold text-green-600">{wins}</p>
                                  <p className="text-xs text-muted-foreground">Victoires</p>
                                </div>
                                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/20">
                                  <p className="text-2xl font-bold text-destructive">{losses}</p>
                                  <p className="text-xs text-muted-foreground">Défaites</p>
                                </div>
                                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900/20">
                                  <p className="text-2xl font-bold text-muted-foreground">{draws}</p>
                                  <p className="text-xs text-muted-foreground">Égalités</p>
                                </div>
                              </div>
                            )}

                            {/* Aggregated stats by category (non-Aviron, non-Bowling) */}
                            {!isAviron && !isBowling && Object.keys(aggregated).length > 0 && (
                              <div className="space-y-3">
                                <h4 className="font-medium">Statistiques cumulées</h4>
                                {statCategories.map(cat => {
                                  const categoryStats = sportStats.filter(s => s.category === cat.key && aggregated[s.key] !== undefined);
                                  if (categoryStats.length === 0) return null;
                                  return (
                                    <div key={cat.key}>
                                      <p className="text-sm font-medium text-primary mb-2">{cat.label}</p>
                                      <div className="grid grid-cols-3 gap-2">
                                        {categoryStats.map(stat => (
                                          <div key={stat.key} className="p-2 rounded border text-center">
                                            <p className="text-lg font-bold">{aggregated[stat.key]}</p>
                                            <p className="text-xs text-muted-foreground">{stat.shortLabel}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Aviron: Courses recap */}
                            {isAviron && selectedPlayer.rounds.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-medium">Détail des courses</h4>
                                <div className="space-y-1">
                                  {selectedPlayer.rounds.map(round => (
                                    <div key={round.round_number} className="flex items-center justify-between p-2 rounded border text-sm">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline">{phases.find(p => p.value === round.phase)?.label || `Course ${round.round_number}`}</Badge>
                                        {round.lane && <span className="text-muted-foreground">Couloir {round.lane}</span>}
                                      </div>
                                      <div className="flex items-center gap-4">
                                        {round.final_time_seconds && (
                                          <span className="font-mono">{formatTime(round.final_time_seconds)}</span>
                                        )}
                                        {round.ranking && (
                                          <Badge variant={round.ranking === 1 ? "default" : "secondary"}>
                                            {round.ranking === 1 ? "🥇" : round.ranking === 2 ? "🥈" : round.ranking === 3 ? "🥉" : `${round.ranking}e`}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => saveRounds.mutate()} disabled={saveRounds.isPending}>
            {saveRounds.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
