import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, CheckCircle2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAthleteAccess } from "@/contexts/AthleteAccessContext";
import { format, parseISO, subDays } from "date-fns";
import { fr } from "date-fns/locale";

export function AthleteMatchStats() {
  const { playerId, categoryId } = useAthleteAccess();
  const queryClient = useQueryClient();
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [stats, setStats] = useState({
    minutes_played: "",
    goals: "",
    assists: "",
    yellow_cards: "",
    red_cards: "",
  });

  // Fetch recent matches (last 30 days)
  const { data: matches, isLoading } = useQuery({
    queryKey: ["athlete-matches", categoryId],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("category_id", categoryId)
        .gte("match_date", thirtyDaysAgo)
        .order("match_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });

  // Check if player is in lineup for matches
  const { data: lineups } = useQuery({
    queryKey: ["athlete-lineups", playerId, matches?.map(m => m.id)],
    queryFn: async () => {
      const matchIds = matches?.map(m => m.id) || [];
      if (matchIds.length === 0) return new Set<string>();
      
      const { data, error } = await supabase
        .from("match_lineup" as any)
        .select("match_id")
        .eq("player_id", playerId!)
        .in("match_id", matchIds);
      
      if (error) throw error;
      return new Set((data as any[] || []).map((l) => l.match_id as string));
    },
    enabled: !!playerId && !!matches && matches.length > 0,
  });

  // Fetch existing stats
  const { data: existingStats } = useQuery({
    queryKey: ["athlete-match-stats", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_match_stats")
        .select("match_id")
        .eq("player_id", playerId);
      
      if (error) throw error;
      return new Set(data.map(s => s.match_id));
    },
    enabled: !!playerId,
  });

  const submitStats = useMutation({
    mutationFn: async () => {
      if (!selectedMatch || !playerId) {
        throw new Error("Données manquantes");
      }

      const { error } = await supabase.from("player_match_stats").insert({
        match_id: selectedMatch,
        player_id: playerId,
        minutes_played: parseInt(stats.minutes_played) || 0,
        goals: parseInt(stats.goals) || 0,
        assists: parseInt(stats.assists) || 0,
        yellow_cards: parseInt(stats.yellow_cards) || 0,
        red_cards: parseInt(stats.red_cards) || 0,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete-match-stats", playerId] });
      toast.success("Statistiques enregistrées !");
      setSelectedMatch(null);
      setStats({
        minutes_played: "",
        goals: "",
        assists: "",
        yellow_cards: "",
        red_cards: "",
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement des compétitions...
        </CardContent>
      </Card>
    );
  }

  // Filter matches where player is in lineup
  const myMatches = matches?.filter(m => lineups?.has(m.id)) || [];
  const pendingMatches = myMatches.filter(m => !existingStats?.has(m.id));
  const completedMatches = myMatches.filter(m => existingStats?.has(m.id));

  return (
    <div className="space-y-6">
      {/* Pending Matches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Compétitions à compléter
          </CardTitle>
          <CardDescription>
            Sélectionnez une compétition pour saisir vos statistiques
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myMatches.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucune compétition récente où vous êtes inscrit
            </p>
          ) : pendingMatches.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Toutes vos compétitions sont complétées !
            </p>
          ) : (
            <div className="space-y-3">
              {pendingMatches.map((match) => (
                <div
                  key={match.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedMatch === match.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedMatch(match.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(parseISO(match.match_date), "EEEE d MMMM", { locale: fr })}
                      </span>
                    </div>
                    {match.is_home ? (
                      <Badge variant="secondary">Domicile</Badge>
                    ) : (
                      <Badge variant="outline">Extérieur</Badge>
                    )}
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">vs {match.opponent}</span>
                    {match.score_home !== null && match.score_away !== null && (
                      <span className="ml-2 text-muted-foreground">
                        ({match.score_home} - {match.score_away})
                      </span>
                    )}
                  </div>
                  {match.location && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {match.location}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Entry Form */}
      {selectedMatch && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Vos statistiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minutes">Minutes jouées</Label>
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  value={stats.minutes_played}
                  onChange={(e) => setStats(s => ({ ...s, minutes_played: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goals">Buts / Essais</Label>
                <Input
                  id="goals"
                  type="number"
                  min="0"
                  value={stats.goals}
                  onChange={(e) => setStats(s => ({ ...s, goals: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assists">Passes décisives</Label>
                <Input
                  id="assists"
                  type="number"
                  min="0"
                  value={stats.assists}
                  onChange={(e) => setStats(s => ({ ...s, assists: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yellow">Cartons jaunes</Label>
                <Input
                  id="yellow"
                  type="number"
                  min="0"
                  value={stats.yellow_cards}
                  onChange={(e) => setStats(s => ({ ...s, yellow_cards: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedMatch(null)}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={() => submitStats.mutate()}
                disabled={submitStats.isPending}
              >
                {submitStats.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Matches */}
      {completedMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Compétitions complétées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedMatches.map((match) => (
                <div
                  key={match.id}
                  className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>
                      {format(parseISO(match.match_date), "d MMMM", { locale: fr })} - vs {match.opponent}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
