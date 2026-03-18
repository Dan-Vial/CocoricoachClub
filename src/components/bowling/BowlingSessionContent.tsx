import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BowlingScoreSheet } from "@/components/athlete-portal/BowlingScoreSheet";
import { BowlingSpareTraining } from "./BowlingSpareTraining";
import { Target, Plus, Trophy, Eye, Users, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BowlingSessionContentProps {
  sessionId: string;
  categoryId: string;
  blockType: "bowling_game" | "bowling_spare";
  sessionDate: string;
}

export function BowlingSessionContent({ sessionId, categoryId, blockType, sessionDate }: BowlingSessionContentProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [activeSheetPlayers, setActiveSheetPlayers] = useState<string[]>([]);
  const [activeSheetPlayerId, setActiveSheetPlayerId] = useState<string>("");
  const [viewingRoundId, setViewingRoundId] = useState<string | null>(null);

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // For bowling_game: fetch/create a training match linked to this session
  const { data: trainingMatch } = useQuery({
    queryKey: ["bowling-training-match", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, opponent, match_date")
        .eq("category_id", categoryId)
        .eq("event_type", "training")
        .eq("match_date", sessionDate)
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: blockType === "bowling_game",
  });

  // Fetch rounds for viewing
  const { data: rounds } = useQuery({
    queryKey: ["bowling-training-rounds", trainingMatch?.id],
    queryFn: async () => {
      if (!trainingMatch?.id) return [];
      const { data, error } = await supabase
        .from("competition_rounds")
        .select("*, player:players(name, first_name)")
        .eq("match_id", trainingMatch.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!trainingMatch?.id,
  });

  // Fetch round stats for viewing
  const { data: viewingRoundStats } = useQuery({
    queryKey: ["round-stats-view", viewingRoundId],
    queryFn: async () => {
      if (!viewingRoundId) return null;
      const { data, error } = await supabase
        .from("competition_round_stats")
        .select("*")
        .eq("round_id", viewingRoundId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!viewingRoundId,
  });

  // Create training match if it doesn't exist
  const createTrainingMatch = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("matches").insert({
        category_id: categoryId,
        opponent: `Entraînement ${format(new Date(sessionDate), "dd/MM/yyyy")}`,
        match_date: sessionDate,
        event_type: "training",
        is_home: true,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bowling-training-match", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["matches", categoryId] });
    },
  });

  const handleStartScoreSheet = async () => {
    if (!selectedPlayerId) {
      toast.error("Sélectionnez un joueur");
      return;
    }
    
    if (!trainingMatch) {
      await createTrainingMatch.mutateAsync();
    }

    // Add player to active sheets if not already there
    if (!activeSheetPlayers.includes(selectedPlayerId)) {
      setActiveSheetPlayers(prev => [...prev, selectedPlayerId]);
    }
    setActiveSheetPlayerId(selectedPlayerId);
  };

  const getPlayerName = (playerId: string) => {
    const p = players?.find(pl => pl.id === playerId);
    if (!p) return "Joueur";
    return p.first_name ? `${p.first_name} ${p.name}` : p.name;
  };

  const handleSaveScore = useCallback(async (playerId: string, stats: any, frames: any, ballData?: any) => {
    const matchId = trainingMatch?.id;
    if (!matchId || !playerId) return;

    const existingCount = rounds?.filter(r => r.player_id === playerId).length || 0;

    const { data: roundData, error: roundError } = await supabase
      .from("competition_rounds")
      .insert({
        match_id: matchId,
        player_id: playerId,
        round_number: existingCount + 1,
        result: stats.totalScore?.toString() || "0",
        notes: ballData ? JSON.stringify(ballData) : null,
      })
      .select()
      .single();

    if (roundError) {
      toast.error("Erreur lors de l'enregistrement");
      return;
    }

    const statData: any = {
      frames,
      totalScore: stats.totalScore,
      strikes: stats.strikes,
      spares: stats.spares,
      opens: stats.opens,
      splits: stats.splits,
      strikePercentage: stats.strikePercentage,
      sparePercentage: stats.sparePercentage,
      firstBallAverage: stats.firstBallAverage,
      ballData,
    };

    await supabase.from("competition_round_stats").insert({
      round_id: roundData.id,
      stat_data: statData,
    });

    queryClient.invalidateQueries({ queryKey: ["bowling-training-rounds", matchId] });
    toast.success(`${getPlayerName(playerId)} : ${stats.totalScore} points enregistrés`);
    
    // Remove from active sheets after save
    setActiveSheetPlayers(prev => prev.filter(id => id !== playerId));
    if (activeSheetPlayerId === playerId) {
      const remaining = activeSheetPlayers.filter(id => id !== playerId);
      setActiveSheetPlayerId(remaining[0] || "");
    }
  }, [trainingMatch, rounds, players, queryClient, activeSheetPlayers, activeSheetPlayerId]);

  const handleCloseSheet = (playerId: string) => {
    setActiveSheetPlayers(prev => prev.filter(id => id !== playerId));
    if (activeSheetPlayerId === playerId) {
      const remaining = activeSheetPlayers.filter(id => id !== playerId);
      setActiveSheetPlayerId(remaining[0] || "");
    }
  };

  // Group rounds by player for display
  const roundsByPlayer = (() => {
    if (!rounds) return [];
    const map = new Map<string, { playerName: string; rounds: any[] }>();
    for (const r of rounds) {
      const pid = r.player_id;
      if (!map.has(pid)) {
        const pName = r.player?.first_name
          ? `${r.player.first_name} ${r.player.name}`
          : r.player?.name || "Joueur";
        map.set(pid, { playerName: pName, rounds: [] });
      }
      map.get(pid)!.rounds.push(r);
    }
    return Array.from(map.entries()).map(([playerId, data]) => ({
      playerId,
      ...data,
    }));
  })();

  if (blockType === "bowling_spare") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-destructive" />
          <h4 className="font-medium">Entraînement Précision</h4>
        </div>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un joueur" />
                  </SelectTrigger>
                  <SelectContent>
                    {players?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name ? `${p.first_name} ${p.name}` : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedPlayerId ? (
          <BowlingSpareTraining
            playerId={selectedPlayerId}
            categoryId={categoryId}
            trainingSessionId={sessionId}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Sélectionnez un joueur pour enregistrer les exercices de précision
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Quille 7 · Quille 10 · Spares · Poche
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // bowling_game mode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h4 className="font-medium">Parties d'entraînement</h4>
        </div>
      </div>

      {/* New game entry */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un joueur" />
                </SelectTrigger>
                <SelectContent>
                  {players?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name ? `${p.first_name} ${p.name}` : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleStartScoreSheet} disabled={!selectedPlayerId} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle partie
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active score sheets with player tabs */}
      {activeSheetPlayers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Feuilles de score en cours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Player tabs for switching */}
            <div className="flex flex-wrap gap-1.5">
              {activeSheetPlayers.map(pid => (
                <div key={pid} className="flex items-center gap-0.5">
                  <Button
                    variant={activeSheetPlayerId === pid ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setActiveSheetPlayerId(pid)}
                  >
                    {getPlayerName(pid)}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleCloseSheet(pid)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Render all active score sheets, show only selected */}
            {activeSheetPlayers.map(pid => (
              <div key={pid} style={{ display: activeSheetPlayerId === pid ? "block" : "none" }}>
                <BowlingScoreSheet
                  playerId={pid}
                  categoryId={categoryId}
                  onSave={(stats, frames, ballData) => handleSaveScore(pid, stats, frames, ballData)}
                  onCancel={() => handleCloseSheet(pid)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Existing rounds grouped by player */}
      {roundsByPlayer.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Parties enregistrées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {roundsByPlayer.map(({ playerId, playerName, rounds: playerRounds }) => (
              <div key={playerId}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">{playerName}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {playerRounds.length} partie{playerRounds.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1.5 ml-2">
                  {playerRounds.map((round: any) => (
                    <div
                      key={round.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono text-xs">
                          #{round.round_number}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">
                          {round.result || "—"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingRoundId(round.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* View Round Dialog */}
      <Dialog open={!!viewingRoundId} onOpenChange={(open) => !open && setViewingRoundId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détail de la partie</DialogTitle>
          </DialogHeader>
          {viewingRoundStats?.stat_data && (
            <BowlingScoreSheet
              playerId=""
              categoryId={categoryId}
              readOnly
              initialFrames={(viewingRoundStats.stat_data as any).frames}
              onSave={() => {}}
              onCancel={() => setViewingRoundId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
