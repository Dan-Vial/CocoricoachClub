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
import { getStatsForSport, getStatCategories, getAggregatedStatsForSport, getAthletismeStatsForDiscipline, ATHLETISME_PHASES, ATHLETISME_GENERAL_STATS, type StatField } from "@/lib/constants/sportStats";
import { groupStatsByTheme } from "@/lib/statSubGroups";
import { useStatPreferences } from "@/hooks/use-stat-preferences";
import { BowlingOilPatternSection } from "./BowlingOilPatternSection";
import { BowlingScoreSheet, FrameData, BowlingStats } from "@/components/athlete-portal/BowlingScoreSheet";
import { isAthletismeCategory } from "@/lib/constants/sportTypes";
import { syncAthleticsRecordsFromRounds } from "@/lib/athletics/syncRecordsFromCompetition";
import { BowlingBlockManager, type BowlingBlock, type Round as BowlingRound, BOWLING_COMPETITION_CATEGORIES, BOWLING_PHASES } from "@/components/bowling/BowlingBlockManager";
import { BowlingCompetitionSummary } from "@/components/bowling/BowlingCompetitionSummary";

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
  phase: string;
  lane?: number;
  wind_conditions?: string;
  wind_direction?: string;
  current_conditions?: string;
  temperature_celsius?: number;
  final_time_seconds?: number;
  ranking?: number;
  gap_to_first?: string;
  is_personal_record?: boolean;
  bowlingCategory?: string;
  isLocked?: boolean;
  bowlingFrames?: FrameData[];
  roundDate?: string;
  blockId?: string;
  ballData?: { mode: string; ballId?: string | null; frameBalls?: (string | null)[] };
}

interface PlayerRounds {
  /** Unique key for this lineup entry (player + discipline + specialty). */
  entryKey: string;
  playerId: string;
  playerName: string;
  discipline?: string;
  specialty?: string;
  rounds: Round[];
  // Aviron crew info
  boat_type?: string;
  crew_role?: string;
  seat_position?: number;
}

const buildEntryKey = (
  playerId: string,
  discipline?: string | null,
  specialty?: string | null,
) => `${playerId}|${discipline ?? ""}|${specialty ?? ""}`;

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

// Bowling categories and phases are imported from BowlingBlockManager

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
  const [bowlingBlocks, setBowlingBlocks] = useState<Record<string, BowlingBlock[]>>({});
  const queryClient = useQueryClient();

  const { stats: filteredSportStats, hasCustomPreferences } = useStatPreferences({ categoryId, sportType });
  const sportStats = hasCustomPreferences ? filteredSportStats : (filteredSportStats.length > 0 ? filteredSportStats : getStatsForSport(sportType));
  const allStatCategories = getStatCategories(sportType);
  const statCategories = allStatCategories.filter(cat => sportStats.some(s => s.category === cat.key));
  const aggregatedStats = getAggregatedStatsForSport(sportType);
  const isJudo = sportType.toLowerCase().includes("judo");
  const isBowling = sportType.toLowerCase().includes("bowling");
  const isAviron = sportType.toLowerCase().includes("aviron");
  const isAthletics = isAthletismeCategory(sportType);

  // Get discipline-specific stats for a player (athletics: each athlete may have different stats)
  const getPlayerStats = (player: PlayerRounds): StatField[] => {
    if (isAthletics) {
      // Try specialty first (e.g. "100mH", "200m", "poids"), then discipline (e.g. "athletisme_haies")
      const specStats = getAthletismeStatsForDiscipline(player.specialty);
      if (player.specialty && specStats !== ATHLETISME_GENERAL_STATS) {
        return specStats;
      }
      // Fallback to discipline field
      const discStats = getAthletismeStatsForDiscipline(player.discipline);
      if (player.discipline && discStats !== ATHLETISME_GENERAL_STATS) {
        return discStats;
      }
      // Last resort: try discipline without prefix (athletisme_haies -> haies)
      if (player.discipline) {
        const stripped = player.discipline.replace(/^athletisme_/, '');
        const strippedStats = getAthletismeStatsForDiscipline(stripped);
        if (strippedStats !== ATHLETISME_GENERAL_STATS) {
          return strippedStats;
        }
      }
      return specStats; // Falls back to general
    }
    return sportStats;
  };

  // For athletics, derive categories from the actual stats (scoring/general/attack/defense)
  // rather than the discipline-based keys (ath_sprint etc.) used in preferences
  const getPlayerStatCategories = (player: PlayerRounds) => {
    const pStats = getPlayerStats(player);
    if (isAthletics) {
      const uniqueCats = [...new Set(pStats.map(s => s.category))];
      const catLabels: Record<string, string> = {
        general: "Général",
        scoring: "Performance",
        attack: "Classement",
        defense: "Détails",
      };
      return uniqueCats.map(key => ({ key, label: catLabels[key] || key }));
    }
    return allStatCategories.filter(cat => pStats.some(s => s.category === cat.key));
  };
  
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
  
  const phases = isAviron ? AVIRON_PHASES : isJudo ? JUDO_PHASES : isBowling ? BOWLING_PHASES : isAthletics ? ATHLETISME_PHASES : [];
  const roundLabel = isJudo ? "Combat" : isAviron ? "Course" : isBowling ? "Partie" : isAthletics ? "Épreuve" : "Round";
  const roundLabelPlural = isJudo ? "Combats" : isAviron ? "Courses" : isBowling ? "Parties" : isAthletics ? "Épreuves" : "Rounds";

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

  // Unlock a bowling round for re-editing
  const unlockBowlingRound = (playerId: string, roundNumber: number) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.playerId === playerId) {
        return {
          ...p,
          rounds: p.rounds.map(r => 
            r.round_number === roundNumber ? { ...r, isLocked: false } : r
          ),
        };
      }
      return p;
    }));
    toast.info(`Partie ${roundNumber} déverrouillée pour modification`);
  };

  // Handle bowling score sheet save with frames
  const handleBowlingScoreSheetSave = (
    playerId: string, 
    roundNumber: number, 
    sheetStats: BowlingStats, 
    frames: FrameData[],
    ballData?: any
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
                ballData: ballData || r.ballData,
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

  // Get match data for date / location (location is reused to stamp records "lieu")
  const { data: matchData } = useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("match_date, location, opponent, competition")
        .eq("id", matchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  // Get players in the lineup for this match
  const { data: lineup } = useQuery({
    queryKey: ["competition_match_lineup", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_lineups")
        .select("id, player_id, boat_type, crew_role, seat_position, discipline, specialty, start_order, players(id, name, first_name, discipline, specialty)")
        .eq("match_id", matchId);
      if (error) throw error;
      // Sort by athlete name then by start_order so events appear in starting order
      return (data || []).sort((a: any, b: any) => {
        const nameA = [a.players?.first_name, a.players?.name].filter(Boolean).join(" ");
        const nameB = [b.players?.first_name, b.players?.name].filter(Boolean).join(" ");
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.start_order ?? 999) - (b.start_order ?? 999);
      });
    },
    enabled: open && !!matchId,
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
    if (isDataInitialized) return;
    
    if (lineup && lineup.length > 0) {
      const newBowlingBlocks: Record<string, BowlingBlock[]> = {};
      
      const playersData = lineup.map((l: any) => {
        const player = l.players as { id: string; name: string; first_name?: string; discipline?: string; specialty?: string } | null;
        // Prefer the lineup's discipline/specialty (per-event inscription).
        // Fallback to the player's primary discipline/specialty for backward compat.
        const effectiveDiscipline = l.discipline || player?.discipline || undefined;
        const effectiveSpecialty = l.specialty || player?.specialty || undefined;
        const playerRounds = existingRounds?.filter(r => r.player_id === l.player_id) || [];
        
        // For bowling: reconstruct blocks from existing rounds
        if (isBowling && playerRounds.length > 0) {
          const blockMap = new Map<string, BowlingBlock>();
          const roundsWithBlocks = playerRounds.map(r => {
            const statData = r.competition_round_stats?.[0]?.stat_data as Record<string, any> || {};
            const bowlingFrames = statData.bowlingFrames as FrameData[] | undefined;
            const bowlingCategory = statData.bowlingCategory as string | undefined;
            const roundDate = statData.roundDate as string | undefined;
            const blockId = statData.blockId as string | undefined;
            const ballData = statData.ballData as any | undefined;
            const { bowlingFrames: _, bowlingCategory: _bc, roundDate: _rd, blockId: _bi, ballData: _bd, ...cleanStats } = statData;
            
            const effectiveBlockId = blockId || `legacy_${roundDate || "nodate"}_${bowlingCategory || "nocat"}_${r.phase || "nophase"}`;
            if (!blockMap.has(effectiveBlockId)) {
              blockMap.set(effectiveBlockId, {
                id: effectiveBlockId,
                roundDate: roundDate || matchData?.match_date?.split("T")[0] || "",
                bowlingCategory: bowlingCategory || "",
                phase: r.phase || "",
                opponent_name: r.opponent_name || "",
                notes: "",
                debriefing: (statData.blockDebriefing as string) || "",
                isCollapsed: false,
                trackPockets: statData.trackPockets !== false,
              });
            }
            
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
              wind_direction: (r as any).wind_direction || undefined,
              current_conditions: r.current_conditions || undefined,
              temperature_celsius: r.temperature_celsius || undefined,
              final_time_seconds: r.final_time_seconds || undefined,
              ranking: r.ranking || undefined,
              gap_to_first: r.gap_to_first || undefined,
              is_personal_record: !!(r as any).is_personal_record,
              isLocked: !!r.id,
              bowlingFrames: bowlingFrames,
              bowlingCategory: bowlingCategory,
              roundDate: roundDate,
              blockId: effectiveBlockId,
              ballData: ballData,
            };
          });
          
          newBowlingBlocks[l.player_id] = Array.from(blockMap.values());
          
          return {
            entryKey: buildEntryKey(l.player_id, effectiveDiscipline, effectiveSpecialty),
            playerId: l.player_id,
            playerName: [player?.first_name, player?.name].filter(Boolean).join(" ") || "Athlète",
            discipline: effectiveDiscipline,
            specialty: effectiveSpecialty,
            boat_type: l.boat_type || undefined,
            crew_role: l.crew_role || undefined,
            seat_position: l.seat_position || undefined,
            rounds: roundsWithBlocks,
          };
        }
        
        // Non-bowling path
        return {
          entryKey: buildEntryKey(l.player_id, effectiveDiscipline, effectiveSpecialty),
          playerId: l.player_id,
          playerName: [player?.first_name, player?.name].filter(Boolean).join(" ") || "Athlète",
          discipline: effectiveDiscipline,
          specialty: effectiveSpecialty,
          boat_type: l.boat_type || undefined,
          crew_role: l.crew_role || undefined,
          seat_position: l.seat_position || undefined,
          rounds: playerRounds.map(r => {
            const statData = r.competition_round_stats?.[0]?.stat_data as Record<string, any> || {};
            const bowlingFrames = statData.bowlingFrames as FrameData[] | undefined;
            const bowlingCategory = statData.bowlingCategory as string | undefined;
            const roundDate = statData.roundDate as string | undefined;
            const { bowlingFrames: _, bowlingCategory: _bc, roundDate: _rd, ...cleanStats } = statData;
            
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
              wind_direction: (r as any).wind_direction || undefined,
              current_conditions: r.current_conditions || undefined,
              temperature_celsius: r.temperature_celsius || undefined,
              final_time_seconds: r.final_time_seconds || undefined,
              ranking: r.ranking || undefined,
              gap_to_first: r.gap_to_first || undefined,
              is_personal_record: !!(r as any).is_personal_record,
              isLocked: !!r.id,
              bowlingFrames: bowlingFrames,
              bowlingCategory: bowlingCategory,
              roundDate: roundDate,
            };
          }),
        };
      });
      setPlayerRoundsData(playersData);
      if (Object.keys(newBowlingBlocks).length > 0) {
        setBowlingBlocks(newBowlingBlocks);
      }
      setIsDataInitialized(true);
      
      if (!selectedPlayerId && playersData.length > 0) {
        setSelectedPlayerId(playersData[0].entryKey);
      }
    }
  }, [lineup, existingRounds, isDataInitialized, selectedPlayerId, isBowling, matchData]);

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
              wind_direction: round.wind_direction || null,
              current_conditions: round.current_conditions || null,
              temperature_celsius: round.temperature_celsius || null,
              final_time_seconds: round.final_time_seconds || null,
              ranking: round.ranking || null,
              gap_to_first: round.gap_to_first || null,
              is_personal_record: !!round.is_personal_record,
            } as any)
            .select()
            .single();

          if (roundError) throw roundError;

          // Insert stats for this round (include bowling frames, ballData, blockId if present)
          // Find block debriefing for this round
          const playerBlocks = bowlingBlocks[playerData.playerId] || [];
          const roundBlock = playerBlocks.find(b => b.id === round.blockId);
          const statDataToSave = {
            ...round.stats,
            ...(round.bowlingFrames ? { bowlingFrames: round.bowlingFrames } : {}),
            ...(round.bowlingCategory ? { bowlingCategory: round.bowlingCategory } : {}),
            ...(round.roundDate ? { roundDate: round.roundDate } : {}),
            ...(round.blockId ? { blockId: round.blockId } : {}),
            ...(round.ballData ? { ballData: round.ballData } : {}),
            ...(roundBlock?.debriefing ? { blockDebriefing: roundBlock.debriefing } : {}),
            ...(roundBlock ? { trackPockets: roundBlock.trackPockets } : {}),
          };
          
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

      // Athlétisme : propagation automatique des PB / SB dans athletics_records
      if (isAthletics && matchData && playerRoundsData.length > 0) {
        const matchDateStr = matchData.match_date?.split("T")[0] || new Date().toISOString().split("T")[0];
        try {
          const flatRounds = playerRoundsData.flatMap((p) =>
            p.rounds.map((r) => ({
              player_id: p.playerId,
              final_time_seconds: r.final_time_seconds ?? null,
              stats: r.stats ?? null,
            })),
          );
          // Pour le multi-épreuves : on s'appuie strictement sur la discipline/spécialité
          // saisie au niveau de l'inscription (lineup) et plus sur les arrays globaux du joueur.
          // Si rien n'est renseigné côté lineup, on retombe sur la discipline principale.
          const playersForSync = playerRoundsData.map((p) => ({
            id: p.playerId,
            discipline: p.discipline ?? null,
            specialty: p.specialty ?? null,
            // Forcer un seul couple : on n'élargit pas aux autres disciplines de l'athlète
            disciplines: p.discipline ? [p.discipline] : null,
            specialties: p.discipline ? [p.specialty || null] : null,
          }));
          const enriched = playersForSync;

          await syncAthleticsRecordsFromRounds({
            categoryId,
            matchDate: matchDateStr,
            matchLocation:
              (matchData as any)?.location || (matchData as any)?.competition || null,
            rounds: flatRounds,
            players: enriched,
          });
        } catch (err) {
          // Non bloquant : on log mais on ne casse pas la sauvegarde des manches
          console.error("[athletics] sync records failed:", err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competition_rounds", matchId] });
      queryClient.invalidateQueries({ queryKey: ["competition_match_lineup", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match_lineup", matchId] });
      queryClient.invalidateQueries({ queryKey: ["awcr_tracking"] });
      // Refresh des records & matrice minimas pour propagation immédiate
      queryClient.invalidateQueries({ queryKey: ["athletics_records"] });
      queryClient.invalidateQueries({ queryKey: ["athletics_records_matrix", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["athletics_records_dialog", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["athletics_minimas_matrix", categoryId] });
      toast.success("Données et charge match enregistrées");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving rounds:", error);
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  const addRound = (entryKey: string) => {
    const player = playerRoundsData.find((p) => p.entryKey === entryKey);
    const newRoundNumber = player && player.rounds.length > 0
      ? Math.max(...player.rounds.map((r) => r.round_number)) + 1
      : 1;

    setPlayerRoundsData((prev) =>
      prev.map((p) => {
        if (p.entryKey === entryKey) {
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

  const removeRound = (entryKey: string, roundNumber: number) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.entryKey === entryKey) {
        return {
          ...p,
          rounds: p.rounds.filter(r => r.round_number !== roundNumber),
        };
      }
      return p;
    }));
  };

  const updateRound = (entryKey: string, roundNumber: number, updates: Partial<Round>) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.entryKey === entryKey) {
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

  const updateRoundStat = (entryKey: string, roundNumber: number, statKey: string, value: number) => {
    setPlayerRoundsData(prev => prev.map(p => {
      if (p.entryKey === entryKey) {
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
  const selectedPlayer = playerRoundsData.find(p => p.entryKey === selectedPlayerId);

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
          {isAthletics && selectedPlayer?.discipline && (
            <p className="text-xs text-muted-foreground">
              {selectedPlayer.specialty || selectedPlayer.discipline}
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
                  key={player.entryKey} 
                  value={player.entryKey}
                  textValue={`${player.playerName}${player.specialty ? ` ${player.specialty}` : player.discipline ? ` ${player.discipline}` : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{player.playerName}</span>
                    {isAthletics && player.discipline && (
                      <Badge variant="outline" className="text-xs">{player.specialty || player.discipline}</Badge>
                    )}
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
                <ScrollArea className="h-[calc(95vh-200px)]">
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
              <ScrollArea className="h-[calc(95vh-200px)] pr-4">
                {/* Bowling: use block manager */}
                {isBowling ? (
                  <BowlingBlockManager
                    playerId={selectedPlayer.playerId}
                    categoryId={categoryId}
                    matchId={matchId}
                    rounds={selectedPlayer.rounds}
                    blocks={bowlingBlocks[selectedPlayer.playerId] || []}
                    matchDate={matchData?.match_date}
                    onBlocksChange={(newBlocks) => {
                      setBowlingBlocks(prev => ({ ...prev, [selectedPlayer.playerId]: newBlocks }));
                    }}
                    onRoundsChange={(newRounds) => {
                      setPlayerRoundsData(prev => prev.map(p =>
                        p.playerId === selectedPlayer.playerId ? { ...p, rounds: newRounds } : p
                      ));
                    }}
                    onScoreSave={(roundNumber, stats, frames, ballData) => {
                      handleBowlingScoreSheetSave(selectedPlayer.playerId, roundNumber, stats, frames, ballData);
                    }}
                    onLock={(roundNumber) => lockBowlingRound(selectedPlayer.playerId, roundNumber)}
                    onUnlock={(roundNumber) => unlockBowlingRound(selectedPlayer.playerId, roundNumber)}
                  />
                ) : (
                <div className="space-y-4 pb-4">
                  {selectedPlayer.rounds.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground space-y-4">
                      <p>Aucun {roundLabel.toLowerCase()} enregistré</p>
                      <p className="text-sm">
                        Cliquez sur le bouton ci-dessous pour commencer.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => addRound(selectedPlayer.playerId)}
                        className="w-full gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter {isAviron ? "une course" : isJudo ? "un combat" : isAthletics ? "une épreuve" : `un ${roundLabel.toLowerCase()}`}
                      </Button>
                    </div>
                  ) : (
                    selectedPlayer.rounds.map((round, roundIdx) => (
                      <div key={round.round_number} className="space-y-4">
                      <Card className={`relative ${round.isLocked ? "opacity-80" : ""}`}>
                        {/* Locked indicator */}
                        {round.isLocked && (
                          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => unlockBowlingRound(selectedPlayer.playerId, round.round_number)}
                            >
                              <Lock className="h-3 w-3" />
                              Modifier
                            </Button>
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              {isAviron ? <Ship className="h-4 w-4" /> : isJudo ? <Swords className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                              {roundLabel} {round.round_number}
                              {isBowling && round.bowlingCategory && (
                                <Badge variant="secondary" className="ml-1">
                                  {BOWLING_COMPETITION_CATEGORIES.find(c => c.value === round.bowlingCategory)?.label || round.bowlingCategory}
                                </Badge>
                              )}
                              {round.phase && (
                                <Badge variant="outline" className="ml-1">
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

                          {/* Basic round info for non-Aviron, non-Bowling, non-Athletics */}
                          {!isAviron && !isBowling && !isAthletics && (
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

                          {/* Athletics-specific round info */}
                          {isAthletics && (
                            <div className="grid grid-cols-2 gap-3">
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
                                    <SelectValue placeholder="Qualification ?" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[200]">
                                    <SelectItem value="qualified">
                                      <span className="flex items-center gap-2">
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                        Qualifié(e)
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="eliminated">
                                      <span className="text-destructive">Éliminé(e)</span>
                                    </SelectItem>
                                    <SelectItem value="dns">
                                      <span className="text-muted-foreground">DNS</span>
                                    </SelectItem>
                                    <SelectItem value="dnf">
                                      <span className="text-muted-foreground">DNF</span>
                                    </SelectItem>
                                    <SelectItem value="dq">
                                      <span className="text-destructive">DQ</span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {/* Athletics: Conditions (vent, sens du vent, température) */}
                          {isAthletics && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs">Vent (m/s)</Label>
                                <Input
                                  value={round.wind_conditions || ""}
                                  onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { wind_conditions: e.target.value })}
                                  placeholder="+1.2"
                                  className="h-8"
                                  disabled={round.isLocked}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Sens du vent</Label>
                                <Select
                                  value={(round as any).wind_direction || ""}
                                  onValueChange={(value) =>
                                    updateRound(selectedPlayer.playerId, round.round_number, { wind_direction: value } as any)
                                  }
                                  disabled={round.isLocked}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Choisir..." />
                                  </SelectTrigger>
                                  <SelectContent className="z-[200]">
                                    <SelectItem value="face">Vent de face</SelectItem>
                                    <SelectItem value="dos">Vent de dos</SelectItem>
                                    <SelectItem value="lateral_gauche">Latéral gauche</SelectItem>
                                    <SelectItem value="lateral_droit">Latéral droit</SelectItem>
                                    <SelectItem value="nul">Vent nul</SelectItem>
                                    <SelectItem value="variable">Variable</SelectItem>
                                  </SelectContent>
                                </Select>
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
                                  disabled={round.isLocked}
                                />
                              </div>
                              <div className="flex flex-col">
                                <Label className="text-xs">Record personnel</Label>
                                <Button
                                  type="button"
                                  variant={(round as any).is_personal_record ? "default" : "outline"}
                                  size="sm"
                                  className="h-8 gap-1"
                                  onClick={() =>
                                    updateRound(selectedPlayer.playerId, round.round_number, {
                                      is_personal_record: !(round as any).is_personal_record,
                                    } as any)
                                  }
                                  disabled={round.isLocked}
                                  title="Marquer comme record personnel"
                                >
                                  <Trophy className={`h-3.5 w-3.5 ${(round as any).is_personal_record ? "text-amber-300" : "text-amber-500"}`} />
                                  {(round as any).is_personal_record ? "RP ✓" : "RP"}
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Bowling: Category, Phase, Adversaire, then score sheet */}
                          {isBowling && (
                            <div className={`space-y-4 ${round.isLocked ? "opacity-80" : ""}`}>
                              {/* Date, Category, Phase, and opponent info - always visible */}
                              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${round.isLocked ? "pointer-events-none" : ""}`}>
                                <div>
                                  <Label className="text-xs">Jour</Label>
                                  <Input
                                    type="date"
                                    value={round.roundDate || matchData?.match_date?.split("T")[0] || ""}
                                    onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { roundDate: e.target.value })}
                                    className="h-8"
                                    disabled={round.isLocked}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Catégorie</Label>
                                  <Select
                                    value={round.bowlingCategory || ""}
                                    onValueChange={(value) => updateRound(selectedPlayer.playerId, round.round_number, { bowlingCategory: value })}
                                    disabled={round.isLocked}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Sélectionner..." />
                                    </SelectTrigger>
                                    <SelectContent className="z-[200]">
                                      {BOWLING_COMPETITION_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                          {cat.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
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
                                    placeholder="Nom adversaire"
                                    className="h-8"
                                    disabled={round.isLocked}
                                  />
                                </div>
                              </div>

                              {/* Embedded Bowling Score Sheet */}
                              <div>
                                <BowlingScoreSheet
                                  key={`bowling-${round.round_number}-${round.isLocked}`}
                                  initialFrames={round.bowlingFrames}
                                  playerId={selectedPlayer.playerId}
                                  categoryId={categoryId}
                                  readOnly={round.isLocked}
                                  onSave={(stats, frames, ballData) => {
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

                          {/* Show discipline badge for athletics */}
                          {isAthletics && selectedPlayer.discipline && (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {selectedPlayer.specialty || selectedPlayer.discipline}
                              </Badge>
                            </div>
                          )}

                          {/* Stats for this round - organized by category & sub-themes (non-bowling, non-aviron) */}
                          {!isAviron && !isBowling && (() => {
                            const playerStats = getPlayerStats(selectedPlayer);
                            const playerCats = getPlayerStatCategories(selectedPlayer);
                            return (
                            <div className="space-y-3">
                              {playerCats.map(cat => {
                                const categoryStats = playerStats.filter(s => s.category === cat.key);
                                if (categoryStats.length === 0) return null;
                                const subGroups = groupStatsByTheme(cat.key, categoryStats);
                                return (
                                  <div key={cat.key} className="space-y-2">
                                    <Label className="text-xs font-medium text-primary">{cat.label}</Label>
                                    {subGroups.map(group => (
                                      <div
                                        key={group.key}
                                        className={`rounded-md ${group.label ? `border p-2 ${group.color?.ring || "border-border/40"} ${group.color?.soft || ""}` : ""}`}
                                      >
                                        {group.label && (
                                          <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1.5 ${group.color?.accent || "text-muted-foreground"}`}>
                                            {group.label}
                                          </p>
                                        )}
                                        <div className="grid grid-cols-3 gap-2">
                                          {group.items.map(stat => (
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
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                            );
                          })()}

                          {/* Notes */}
                          <div>
                            <Label className="text-xs">Notes</Label>
                            <Input
                              value={round.notes}
                              onChange={(e) => updateRound(selectedPlayer.playerId, round.round_number, { notes: e.target.value })}
                              placeholder={`Notes sur ${isAviron ? 'cette course' : isJudo ? 'ce combat' : isAthletics ? 'cette épreuve' : 'ce round'}`}
                              className="h-8"
                            />
                          </div>
                        </CardContent>
                      </Card>
                      {/* Add game button after each round */}
                      <Button
                        size="sm"
                        onClick={() => addRound(selectedPlayer.playerId)}
                        className="w-full gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter {isAviron ? "une course" : isJudo ? "un combat" : isAthletics ? "une épreuve" : `un ${roundLabel.toLowerCase()}`}
                      </Button>
                      </div>
                    ))
                  )}
                </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="summary" className="flex-1 min-h-0 mt-0 overflow-hidden">
              <ScrollArea className="h-[calc(95vh-200px)]">
              {isBowling ? (
                <BowlingCompetitionSummary
                  rounds={selectedPlayer.rounds}
                  blocks={bowlingBlocks[selectedPlayer.playerId] || []}
                  playerName={selectedPlayer.playerName}
                  getBallName={(ballId) => {
                    // Try to find ball name from arsenals
                    return ballId;
                  }}
                />
              ) : (
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
                            ) : isAthletics ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-3 text-center">
                                  <div className="p-3 rounded-lg bg-muted">
                                    <p className="text-2xl font-bold">{total}</p>
                                    <p className="text-xs text-muted-foreground">{roundLabelPlural}</p>
                                  </div>
                                  {(() => {
                                    const bestRanking = selectedPlayer.rounds.filter(r => r.ranking).map(r => r.ranking!);
                                    return bestRanking.length > 0 ? (
                                      <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                                        <p className="text-2xl font-bold text-green-600">{Math.min(...bestRanking)}e</p>
                                        <p className="text-xs text-muted-foreground">Meilleur classement</p>
                                      </div>
                                    ) : null;
                                  })()}
                                  {(() => {
                                    const qualified = selectedPlayer.rounds.filter(r => r.result === "qualified").length;
                                    return (
                                      <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                                        <p className="text-2xl font-bold text-blue-600">{qualified}/{total}</p>
                                        <p className="text-xs text-muted-foreground">Qualifications</p>
                                      </div>
                                    );
                                  })()}
                                </div>
                                {/* Rounds detail */}
                                <div className="space-y-1">
                                  {selectedPlayer.rounds.map(round => (
                                    <div key={round.round_number} className="flex items-center justify-between p-2 rounded border text-sm">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline">
                                          {phases.find(p => p.value === round.phase)?.label || `Épreuve ${round.round_number}`}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {round.ranking && (
                                          <Badge variant={round.ranking <= 3 ? "default" : "secondary"}>
                                            {round.ranking === 1 ? "🥇" : round.ranking === 2 ? "🥈" : round.ranking === 3 ? "🥉" : `${round.ranking}e`}
                                          </Badge>
                                        )}
                                        {round.result && (
                                          <Badge variant={round.result === "qualified" ? "default" : "destructive"}>
                                            {round.result === "qualified" ? "Q" : round.result === "eliminated" ? "Élim." : round.result.toUpperCase()}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
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
                            {!isAviron && !isBowling && Object.keys(aggregated).length > 0 && (() => {
                              const pStats = getPlayerStats(selectedPlayer);
                              const pCats = getPlayerStatCategories(selectedPlayer);
                              return (
                              <div className="space-y-3">
                                <h4 className="font-medium">Statistiques cumulées</h4>
                                {pCats.map(cat => {
                                  const categoryStats = pStats.filter(s => s.category === cat.key && aggregated[s.key] !== undefined);
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
                              );
                            })()}

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
              )}
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
