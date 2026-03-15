import { useState } from "react";
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
import { Target, Plus, Trophy, Eye } from "lucide-react";
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
  const [showScoreSheet, setShowScoreSheet] = useState(false);
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
      // Look for a match linked to this session date with training type
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
    
    // Create match if needed
    if (!trainingMatch) {
      await createTrainingMatch.mutateAsync();
    }
    setShowScoreSheet(true);
  };

  const handleSaveScore = async (stats: any, frames: any, ballData?: any) => {
    const matchId = trainingMatch?.id;
    if (!matchId || !selectedPlayerId) return;

    // Count existing rounds for this player
    const existingCount = rounds?.filter(r => r.player_id === selectedPlayerId).length || 0;

    const { data: roundData, error: roundError } = await supabase
      .from("competition_rounds")
      .insert({
        match_id: matchId,
        player_id: selectedPlayerId,
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

    // Save detailed stats
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
    toast.success(`Partie enregistrée : ${stats.totalScore} points`);
    setShowScoreSheet(false);
  };

  if (blockType === "bowling_spare") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-orange-500" />
          <h4 className="font-medium">Entraînement Spécifique Spares</h4>
        </div>
        {selectedPlayerId ? (
          <BowlingSpareTraining
            playerId={selectedPlayerId}
            categoryId={categoryId}
            trainingSessionId={sessionId}
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Sélectionnez un joueur pour enregistrer les exercices de spare</p>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un joueur" />
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
            </CardContent>
          </Card>
        )}
        {selectedPlayerId && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedPlayerId("")}>
              Changer de joueur
            </Button>
          </div>
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

      {/* Existing rounds */}
      {rounds && rounds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Parties enregistrées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rounds.map((round: any) => (
                <div
                  key={round.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="font-mono">
                      #{round.round_number}
                    </Badge>
                    <span className="text-sm font-medium">
                      {round.player?.first_name
                        ? `${round.player.first_name} ${round.player.name}`
                        : round.player?.name || "Joueur"}
                    </span>
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
          </CardContent>
        </Card>
      )}

      {/* Score Sheet Dialog */}
      <Dialog open={showScoreSheet} onOpenChange={setShowScoreSheet}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feuille de score - Entraînement</DialogTitle>
          </DialogHeader>
          {selectedPlayerId && (
            <BowlingScoreSheet
              playerId={selectedPlayerId}
              categoryId={categoryId}
              onSave={handleSaveScore}
              onCancel={() => setShowScoreSheet(false)}
            />
          )}
        </DialogContent>
      </Dialog>

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
