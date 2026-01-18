import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Trash2,
  Users,
  BarChart3,
  MapPin,
  Home,
  Plane,
  Edit2,
  Check,
  X,
  Trophy,
  Swords,
} from "lucide-react";
import { MatchLineupDialog } from "./MatchLineupDialog";
import { SportMatchStatsDialog } from "./SportMatchStatsDialog";
import { CompetitionRoundsDialog } from "./CompetitionRoundsDialog";
import { isIndividualSport } from "@/lib/constants/sportTypes";

interface Match {
  id: string;
  opponent: string;
  match_date: string;
  match_time: string | null;
  location: string | null;
  is_home: boolean;
  score_home: number | null;
  score_away: number | null;
  notes: string | null;
  category_id: string;
  competition: string | null;
}

interface MatchCardProps {
  match: Match;
  categoryId: string;
}

export function MatchCard({ match, categoryId }: MatchCardProps) {
  const [isLineupOpen, setIsLineupOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isRoundsOpen, setIsRoundsOpen] = useState(false);
  const [isEditingScore, setIsEditingScore] = useState(false);
  const [scoreHome, setScoreHome] = useState(match.score_home?.toString() || "");
  const [scoreAway, setScoreAway] = useState(match.score_away?.toString() || "");
  const queryClient = useQueryClient();

  const { data: category } = useQuery({
    queryKey: ["category-sport", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: lineupCount } = useQuery({
    queryKey: ["match_lineup_count", match.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("match_lineups")
        .select("*", { count: "exact", head: true })
        .eq("match_id", match.id);
      if (error) throw error;
      return count || 0;
    },
  });

  const sportType = category?.rugby_type || "XV";
  const isIndividual = isIndividualSport(sportType);

  const deleteMatch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("matches").delete().eq("id", match.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches", categoryId] });
      toast.success(isIndividual ? "Compétition supprimée" : "Match supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const updateScore = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("matches")
        .update({
          score_home: scoreHome ? parseInt(scoreHome) : null,
          score_away: scoreAway ? parseInt(scoreAway) : null,
        })
        .eq("id", match.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches", categoryId] });
      toast.success("Score mis à jour");
      setIsEditingScore(false);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const matchDate = new Date(match.match_date);
  const isPast = matchDate < new Date();

  return (
    <>
      <div className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {!isIndividual && (
                <Badge variant={match.is_home ? "default" : "secondary"} className="text-xs">
                  {match.is_home ? (
                    <><Home className="h-3 w-3 mr-1" /> Domicile</>
                  ) : (
                    <><Plane className="h-3 w-3 mr-1" /> Extérieur</>
                  )}
                </Badge>
              )}
              {isPast && (
                <Badge variant="outline" className="text-xs">
                  Terminé
                </Badge>
              )}
            </div>

            <h4 className="font-semibold text-lg">
              {isIndividual 
                ? (match.competition || match.opponent || "Compétition")
                : `${match.is_home ? "vs" : "@"} ${match.opponent}`
              }
            </h4>

            <div className="text-sm text-muted-foreground mt-1 space-y-1">
              <p>
                {format(matchDate, "EEEE d MMMM yyyy", { locale: fr })}
                {match.match_time && ` à ${match.match_time.slice(0, 5)}`}
              </p>
              {/* For individual sports, show event name if different from competition */}
              {isIndividual && match.opponent && match.opponent !== match.competition && (
                <p className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  {match.opponent}
                </p>
              )}
              {/* For team sports, show competition */}
              {!isIndividual && match.competition && (
                <p className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  {match.competition}
                </p>
              )}
              {match.location && (
                <p className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {match.location}
                </p>
              )}
            </div>

            {/* Score - Only for team sports */}
            {!isIndividual && (
              <div className="mt-3">
                {isEditingScore ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={scoreHome}
                      onChange={(e) => setScoreHome(e.target.value)}
                      placeholder="Nous"
                      className="w-16 h-8"
                      min={0}
                    />
                    <span>-</span>
                    <Input
                      type="number"
                      value={scoreAway}
                      onChange={(e) => setScoreAway(e.target.value)}
                      placeholder="Eux"
                      className="w-16 h-8"
                      min={0}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateScore.mutate()}>
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditingScore(false)}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {match.score_home !== null && match.score_away !== null ? (
                      <span className={`font-bold text-xl ${
                        match.score_home > match.score_away
                          ? "text-green-500"
                          : match.score_home < match.score_away
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}>
                        {match.score_home} - {match.score_away}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Score non renseigné</span>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setIsEditingScore(true)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {match.notes && (
              <p className="text-sm text-muted-foreground mt-2 italic">{match.notes}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsLineupOpen(true)}
            >
              <Users className="h-4 w-4" />
              {isIndividual ? `Participants (${lineupCount})` : `Compo (${lineupCount})`}
            </Button>
            {/* Show rounds button for Judo and Bowling */}
            {(sportType.toLowerCase().includes("judo") || sportType.toLowerCase().includes("bowling")) && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setIsRoundsOpen(true)}
              >
                <Swords className="h-4 w-4" />
                {sportType.toLowerCase().includes("judo") ? "Combats" : "Parties"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsStatsOpen(true)}
            >
              <BarChart3 className="h-4 w-4" />
              Stats
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                if (confirm(isIndividual ? "Supprimer cette compétition ?" : "Supprimer ce match ?")) {
                  deleteMatch.mutate();
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>

      <MatchLineupDialog
        open={isLineupOpen}
        onOpenChange={setIsLineupOpen}
        matchId={match.id}
        categoryId={categoryId}
      />

      <SportMatchStatsDialog
        open={isStatsOpen}
        onOpenChange={setIsStatsOpen}
        matchId={match.id}
        categoryId={categoryId}
        sportType={category?.rugby_type || "XV"}
      />

      {(sportType.toLowerCase().includes("judo") || sportType.toLowerCase().includes("bowling")) && (
        <CompetitionRoundsDialog
          open={isRoundsOpen}
          onOpenChange={setIsRoundsOpen}
          matchId={match.id}
          categoryId={categoryId}
          sportType={sportType}
        />
      )}
    </>
  );
}
