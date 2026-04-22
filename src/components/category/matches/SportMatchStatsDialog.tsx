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
import { toast } from "sonner";
import { BarChart3, Satellite, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { getStatsForSport, getStatCategories, hasGoalkeeperStats, type StatField } from "@/lib/constants/sportStats";
import { getSportFieldConfig } from "@/lib/constants/sportPositions";
import { isIndividualSport, isRugbyType } from "@/lib/constants/sportTypes";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useStatPreferences } from "@/hooks/use-stat-preferences";
import { MatchGpsImport } from "./MatchGpsImport";
import { PlayerStatsGrid } from "./PlayerStatsGrid";
import { MatchKickingFieldDialog, type KickAttempt } from "./MatchKickingFieldDialog";

// Convert seconds to minutes display format (e.g., 185 => "3'05")
function formatSecondsToMinutes(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins}'${secs.toString().padStart(2, '0')}`;
}

// Parse minutes input. Accepts:
//   "2'45"  → 2 min 45 sec  → 165
//   "2.45"  → 2 min 45 sec  → 165
//   "2,45"  → 2 min 45 sec  → 165
//   "2'5"   → 2 min 50 sec  → 170 (single-digit padded to the right)
//   "2.5"   → 2 min 50 sec  → 170
//   "180"   → 180 sec       → 180 (raw seconds when no separator)
function parseMinutesToSeconds(input: string): number {
  if (!input || input.trim() === "") return 0;
  // Normalise all accepted separators (apostrophe / dot / comma) to a single one
  const normalised = input.trim().replace(/[',.]/g, ":");
  if (normalised.includes(":")) {
    const [minsRaw, secsRaw = ""] = normalised.split(":");
    const mins = parseInt(minsRaw, 10) || 0;
    // Pad single digit to the right so "2.5" reads as 2 min 50 sec (not 2 min 05 sec)
    const secsPadded = secsRaw.length === 1 ? secsRaw + "0" : secsRaw;
    const secs = Math.min(parseInt(secsPadded, 10) || 0, 59);
    return mins * 60 + secs;
  }
  return parseInt(normalised, 10) || 0;
}

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
  const [effectivePlayTime, setEffectivePlayTime] = useState<number>(0);
  const [longestPlaySequence, setLongestPlaySequence] = useState<number>(0);
  const [averagePlaySequence, setAveragePlaySequence] = useState<number>(0);
  const [longestPlaySequenceText, setLongestPlaySequenceText] = useState<string>("");
  const [averagePlaySequenceText, setAveragePlaySequenceText] = useState<string>("");
  const [showGpsImport, setShowGpsImport] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [kickingFieldPlayer, setKickingFieldPlayer] = useState<{ id: string; name: string } | null>(null);
  const [playerKicks, setPlayerKicks] = useState<Record<string, KickAttempt[]>>({});
  const queryClient = useQueryClient();

  const fieldConfig = getSportFieldConfig(sportType);
  const isIndividual = isIndividualSport(sportType);
  const supportsGoalkeeper = hasGoalkeeperStats(sportType);
  const supportsGps = isRugbyType(sportType) || sportType.toLowerCase().includes("football");

  // Get stats from preferences - use a non-goalkeeper default for category-level filtering
  const { stats: filteredStats, customStats: customStatFields, hasCustomPreferences, isLoading: loadingPrefs } = useStatPreferences({
    categoryId,
    sportType,
    matchId,
    isGoalkeeper: false,
  });

  const sportStats = hasCustomPreferences
    ? filteredStats
    : filteredStats.length > 0
    ? filteredStats
    : getStatsForSport(sportType, false);

  const allStatCategories = getStatCategories(sportType);
  const statCategories = allStatCategories.filter((cat) =>
    sportStats.some((s) => s.category === cat.key)
  );

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
      const lps = matchData.longest_play_sequence ?? 0;
      const aps = matchData.average_play_sequence ?? 0;
      setLongestPlaySequence(lps);
      setAveragePlaySequence(aps);
      setLongestPlaySequenceText(lps ? formatSecondsToMinutes(lps) : "");
      setAveragePlaySequenceText(aps ? formatSecondsToMinutes(aps) : "");
    }
  }, [matchData]);

  // Get players in the lineup for this match with position
  const { data: lineup } = useQuery({
    queryKey: ["match_lineup", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_lineups")
        .select("player_id, position, is_starter, players(id, name, first_name)")
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

  // Track if statsData has been initialized to avoid resetting on preference refetch
  const [statsInitialized, setStatsInitialized] = useState(false);
  // Track the number of custom stats at last init to detect new custom stats loading
  const [lastCustomStatsCount, setLastCustomStatsCount] = useState(0);

  useEffect(() => {
    if (!open) {
      setStatsInitialized(false);
      setLastCustomStatsCount(0);
    }
  }, [open]);

  useEffect(() => {
    // Skip if preferences are still loading (wait for custom stats)
    if (loadingPrefs) return;
    
    // Re-initialize if custom stats count changed (custom stats loaded after init)
    const customStatsChanged = statsInitialized && customStatFields.length !== lastCustomStatsCount;
    
    if (statsInitialized && !customStatsChanged) return; // Don't re-initialize unless custom stats changed
    if (lineup && lineup.length > 0) {
      // Use all standard stats + custom stats from preferences
      const standardStats = [
        ...getStatsForSport(sportType, false),
        ...getStatsForSport(sportType, true),
      ];
      // Merge with custom stats from preferences (dedupe by key)
      const allStatKeys = new Set(standardStats.map(s => s.key));
      const allStats = [...standardStats];
      sportStats.forEach(s => {
        if (!allStatKeys.has(s.key)) {
          allStats.push(s);
          allStatKeys.add(s.key);
        }
      });

      if (customStatsChanged && statsInitialized) {
        // Only add missing custom stat keys to existing player data
        setStatsData(prev => prev.map(playerStats => {
          const updated = { ...playerStats };
          allStats.forEach(stat => {
            if (!(stat.key in updated)) {
              updated[stat.key] = 0;
            }
          });
          return updated;
        }));
      } else {
        // Full initialization
        const stats = lineup.map((l) => {
          const existing = existingStats?.find((s) => s.player_id === l.player_id);
          const player = l.players as { id: string; name: string; first_name?: string } | null;
          const position = l.position || "";
          const fullName = [player?.first_name, player?.name].filter(Boolean).join(" ") || "Athlète";

          const isGk =
            position === "1" || position === "GK" || position.toLowerCase().includes("gardien");

          const existingSportData =
            (existing as { sport_data?: Record<string, number | boolean> })?.sport_data || {};
          const wasGoalkeeper = existingSportData.isGoalkeeper === true;

          const playerStats: PlayerStats = {
            playerId: l.player_id,
            playerName: fullName,
            position: position,
            isGoalkeeper: wasGoalkeeper || (supportsGoalkeeper && isGk),
          };

          allStats.forEach((stat) => {
            const snakeKey = stat.key.replace(/([A-Z])/g, "_$1").toLowerCase();
            const value =
              existingSportData[stat.key] ??
              existing?.[stat.key as keyof typeof existing] ??
              existing?.[snakeKey as keyof typeof existing] ??
              0;
            playerStats[stat.key] = typeof value === "number" ? value : 0;
          });

          return playerStats;
        });
        setStatsData(stats);

        // Load existing kick positions from sport_data
        const loadedKicks: Record<string, KickAttempt[]> = {};
        existingStats?.forEach((existing) => {
          const sd = (existing as { sport_data?: Record<string, any> }).sport_data;
          if (sd?.kickAttempts && Array.isArray(sd.kickAttempts)) {
            loadedKicks[existing.player_id] = sd.kickAttempts;
          }
        });
        setPlayerKicks(loadedKicks);
      }
      setStatsInitialized(true);
      setLastCustomStatsCount(customStatFields.length);
    }
  }, [lineup, existingStats, sportType, supportsGoalkeeper, sportStats, statsInitialized, open, loadingPrefs, customStatFields.length, lastCustomStatsCount]);

  // Auto-compute percentages when any stat changes
  const updateStat = (playerId: string, statKey: string, value: number) => {
    setStatsData((prev) =>
      prev.map((p) => {
        if (p.playerId !== playerId) return p;
        const updated = { ...p, [statKey]: value };
        // Re-compute all computed stats
        const allComputedStats = [
          ...getStatsForSport(sportType, p.isGoalkeeper),
        ];
        allComputedStats.forEach((s) => {
          if (s.computedFrom) {
            const { successKey, totalKey, failureKey } = s.computedFrom;
            if (statKey === successKey || statKey === totalKey || statKey === failureKey) {
              const success = Number(updated[successKey]) || 0;
              const total = totalKey
                ? Number(updated[totalKey]) || 0
                : success + (Number(updated[failureKey!]) || 0);
              updated[s.key] = total > 0 ? Math.round((success / total) * 100) : 0;
            }
          }
        });
        return updated;
      })
    );
  };

  const saveStats = useMutation({
    mutationFn: async () => {
      // Update match general stats
      await supabase
        .from("matches")
        .update({
          effective_play_time: effectivePlayTime,
          longest_play_sequence: longestPlaySequence,
          average_play_sequence: averagePlaySequence,
        })
        .eq("id", matchId);

      // Delete existing stats
      await supabase.from("player_match_stats").delete().eq("match_id", matchId);

      // Insert new stats
      if (statsData.length > 0) {
        const statsToInsert = statsData.map((s) => {
          // Merge standard + custom stats for sport_data
          const standardStats = [
            ...getStatsForSport(sportType, false),
            ...getStatsForSport(sportType, true),
          ];
          const allStatKeys = new Set(standardStats.map(st => st.key));
          const mergedStats = [...standardStats];
          sportStats.forEach(st => {
            if (!allStatKeys.has(st.key)) {
              mergedStats.push(st);
              allStatKeys.add(st.key);
            }
          });
          
          const sportData: Record<string, any> = {};
          mergedStats.forEach((stat) => {
            const val = Number(s[stat.key]) || 0;
            if (val !== 0) sportData[stat.key] = val;
          });
          // Include kick attempt positions if available
          const kicks = playerKicks[s.playerId];
          if (kicks && kicks.length > 0) {
            sportData.kickAttempts = kicks.map(k => ({ x: k.x, y: k.y, kickType: k.kickType, success: k.success }));
          }

          return {
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
            sport_data: sportData,
          };
        });

        const { error } = await supabase.from("player_match_stats").insert(statsToInsert);
        if (error) throw error;
      }

      // Auto-inject RPE 10/10
      if (matchData && statsData.length > 0) {
        const matchDate =
          matchData.match_date?.split("T")[0] || new Date().toISOString().split("T")[0];

        const playerIds = statsData.map((s) => s.playerId);
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

        const rpeEntries = statsData.map((s) => {
          const minutes =
            Number(s.minutesPlayed) || Number(s.playingTime) || Number(s.setsPlayed) || 80;
          return {
            player_id: s.playerId,
            category_id: categoryId,
            session_date: matchDate,
            rpe: 10,
            duration_minutes: minutes,
            training_load: 10 * minutes,
          };
        });

        if (rpeEntries.length > 0) {
          const { error: rpeError } = await supabase.from("awcr_tracking").insert(rpeEntries);
          if (rpeError) console.error("Error inserting match RPE:", rpeError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_match_stats", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["awcr_tracking"] });
      queryClient.invalidateQueries({ queryKey: ["today_rpe_decision", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["matches-list-cumulative", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["cumulative_player_stats", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["player_all_match_stats"] });
      toast.success("Statistiques et charge match enregistrées");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving stats:", error);
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  const hasLineup = lineup && lineup.length > 0;

  // Current active category
  const activeCategory = statCategories[activeCategoryIndex];
  const activeCategoryStats = activeCategory
    ? sportStats.filter((s) => s.category === activeCategory.key)
    : [];

  const goNextCategory = () => {
    if (activeCategoryIndex < statCategories.length - 1) {
      setActiveCategoryIndex(activeCategoryIndex + 1);
    }
  };
  const goPrevCategory = () => {
    if (activeCategoryIndex > 0) {
      setActiveCategoryIndex(activeCategoryIndex - 1);
    }
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
              : "Ajoutez d'abord des athlètes à la composition pour saisir leurs statistiques."}
          </p>
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiques - {fieldConfig.label}
          </DialogTitle>
        </DialogHeader>

        {/* Category navigation */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={goPrevCategory}
            disabled={activeCategoryIndex <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 flex gap-1 overflow-x-auto pb-1">
            {statCategories.map((cat, idx) => (
              <Button
                key={cat.key}
                variant={idx === activeCategoryIndex ? "default" : "outline"}
                size="sm"
                className="shrink-0 text-xs h-8 gap-1"
                onClick={() => setActiveCategoryIndex(idx)}
              >
                {cat.label}
                {idx < activeCategoryIndex && (
                  <Check className="h-3 w-3 text-green-400" />
                )}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={goNextCategory}
            disabled={activeCategoryIndex >= statCategories.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground flex items-center justify-between flex-shrink-0">
          <span>
            {activeCategoryIndex + 1}/{statCategories.length} — {activeCategory?.label}
          </span>
          <span>{statsData.length} joueurs</span>
        </div>

        {/* Match-level general stats (only on "general" category) */}
        {activeCategory?.key === "general" && !isIndividual && (
          <div className="p-3 rounded-lg border bg-card flex-shrink-0">
            <h4 className="font-semibold mb-2 text-sm text-primary">Infos match</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Temps effectif (min)</Label>
                <Input
                  type="number"
                  value={effectivePlayTime || ""}
                  onChange={(e) => setEffectivePlayTime(parseInt(e.target.value) || 0)}
                  min={0}
                  max={120}
                  className="h-8 mt-1"
                  placeholder="80"
                />
              </div>
              <div>
                <Label className="text-xs">Séquence max</Label>
                <Input
                  type="text"
                  value={longestPlaySequenceText}
                  onChange={(e) => setLongestPlaySequenceText(e.target.value)}
                  onBlur={() => setLongestPlaySequence(parseMinutesToSeconds(longestPlaySequenceText))}
                  className="h-8 mt-1"
                  placeholder="3'00"
                />
              </div>
              <div>
                <Label className="text-xs">Séquence moyenne</Label>
                <Input
                  type="text"
                  value={averagePlaySequenceText}
                  onChange={(e) => setAveragePlaySequenceText(e.target.value)}
                  onBlur={() => setAveragePlaySequence(parseMinutesToSeconds(averagePlaySequenceText))}
                  className="h-8 mt-1"
                  placeholder="0'45"
                />
              </div>
            </div>
          </div>
        )}

        {/* Goalkeeper toggles if sport supports it */}
        {supportsGoalkeeper && activeCategory?.key === "general" && (
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {statsData
              .filter((p) => p.isGoalkeeper)
              .map((p) => (
                <Badge key={p.playerId} variant="secondary" className="text-xs gap-1">
                  🧤 {p.playerName}
                  <button
                    className="ml-1 text-destructive hover:text-destructive/80"
                    onClick={() =>
                      setStatsData((prev) =>
                        prev.map((pl) =>
                          pl.playerId === p.playerId ? { ...pl, isGoalkeeper: false } : pl
                        )
                      )
                    }
                  >
                    ✕
                  </button>
                </Badge>
              ))}
            {statsData.some((p) => !p.isGoalkeeper) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Marquer comme gardien :</span>
                {statsData
                  .filter((p) => !p.isGoalkeeper)
                  .slice(0, 3)
                  .map((p) => (
                    <button
                      key={p.playerId}
                      className="underline hover:text-foreground"
                      onClick={() =>
                        setStatsData((prev) =>
                          prev.map((pl) =>
                            pl.playerId === p.playerId ? { ...pl, isGoalkeeper: true } : pl
                          )
                        )
                      }
                    >
                      #{p.position || "?"} {p.playerName.split(" ")[0]}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Player stats grid - scrollable area takes all remaining space */}
        <ScrollArea className="flex-1 min-h-0 max-h-full">
          <div className="pr-2 pb-4">
            <PlayerStatsGrid
              players={statsData}
              stats={activeCategoryStats}
              categoryKey={activeCategory?.key}
              onUpdateStat={updateStat}
              supportsGoalkeeper={supportsGoalkeeper}
              isRugby={isRugbyType(sportType)}
              onOpenKickingField={(playerId, playerName) => setKickingFieldPlayer({ id: playerId, name: playerName })}
            />
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-between gap-2 pt-3 border-t flex-shrink-0">
          <div className="flex gap-2">
            {supportsGps && hasLineup && (
              <Button variant="outline" size="sm" onClick={() => setShowGpsImport(true)}>
                <Satellite className="h-4 w-4 mr-1" />
                GPS
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {activeCategoryIndex < statCategories.length - 1 ? (
              <Button onClick={goNextCategory} className="gap-1">
                <Check className="h-4 w-4" />
                Valider → {statCategories[activeCategoryIndex + 1]?.label}
              </Button>
            ) : (
              <Button
                onClick={() => saveStats.mutate()}
                disabled={saveStats.isPending}
                className="gap-1"
              >
                {saveStats.isPending ? "Enregistrement..." : "Enregistrer tout"}
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
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
            players={statsData.map((p) => ({
              id: p.playerId,
              name: p.playerName,
              position: p.position,
            }))}
          />
        )}

        {/* Kicking Field Dialog for Rugby */}
        {isRugbyType(sportType) && kickingFieldPlayer && (
          <MatchKickingFieldDialog
            open={!!kickingFieldPlayer}
            onOpenChange={(open) => { if (!open) setKickingFieldPlayer(null); }}
            playerName={kickingFieldPlayer.name}
            playerId={kickingFieldPlayer.id}
            initialKicks={playerKicks[kickingFieldPlayer.id] || []}
            onComplete={(kickStats) => {
              const playerId = kickingFieldPlayer.id;
              // Save kick positions
              setPlayerKicks(prev => ({ ...prev, [playerId]: kickStats.kicks }));
              // Update all kicking stats for this player
              updateStat(playerId, "conversions", kickStats.conversions);
              updateStat(playerId, "conversionAttempts", kickStats.conversionAttempts);
              updateStat(playerId, "penaltiesScored", kickStats.penaltiesScored);
              updateStat(playerId, "penaltyAttempts", kickStats.penaltyAttempts);
              updateStat(playerId, "dropGoals", kickStats.dropGoals);
              updateStat(playerId, "dropAttempts", kickStats.dropAttempts);
              // Points = tries * 5 + kicking points
              const playerData = statsData.find(p => p.playerId === playerId);
              const triesPoints = (Number(playerData?.tries) || 0) * 5;
              updateStat(playerId, "points", triesPoints + kickStats.points);
              setKickingFieldPlayer(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
