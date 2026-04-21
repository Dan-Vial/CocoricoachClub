import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Trophy, Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PlayerMedalsSectionProps {
  playerId: string;
}

const MEDAL_ICONS: Record<string, string> = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
  ranking: "🏅",
  title: "🏆",
};

const MEDAL_LABELS: Record<string, string> = {
  gold: "Or",
  silver: "Argent",
  bronze: "Bronze",
  ranking: "Classement",
  title: "Titre",
};

const MEDAL_COLORS: Record<string, string> = {
  gold: "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400",
  silver: "bg-gray-400/10 border-gray-400/30 text-gray-700 dark:text-gray-300",
  bronze: "bg-orange-600/10 border-orange-600/30 text-orange-700 dark:text-orange-400",
  ranking: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400",
  title: "bg-primary/10 border-primary/30 text-primary",
};

export function PlayerMedalsSection({ playerId }: PlayerMedalsSectionProps) {
  const { data: medals, isLoading } = useQuery({
    queryKey: ["player-medals", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_medals")
        .select(
          `*, matches(id, opponent, competition, competition_stage, match_date, location)`
        )
        .eq("player_id", playerId)
        .order("awarded_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return null;
  if (!medals || medals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-5 w-5 text-primary" />
            Palmarès
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune médaille pour le moment. Ajoute des récompenses depuis l'onglet Compétition.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Counts
  const counts = medals.reduce(
    (acc, m) => {
      acc[m.medal_type] = (acc[m.medal_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-5 w-5 text-primary" />
            Palmarès ({medals.length})
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {(["gold", "silver", "bronze", "ranking", "title"] as const).map(
              (t) =>
                counts[t] > 0 && (
                  <Badge key={t} variant="outline" className="gap-1">
                    <span>{MEDAL_ICONS[t]}</span>
                    <span className="font-bold">{counts[t]}</span>
                  </Badge>
                )
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {medals.map((m: any) => {
            const match = m.matches;
            const compName =
              match?.competition || match?.opponent || "Compétition";
            return (
              <div
                key={m.id}
                className={`p-3 rounded-lg border ${MEDAL_COLORS[m.medal_type] || ""}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl shrink-0">
                    {MEDAL_ICONS[m.medal_type]}
                  </span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">
                        {m.medal_type === "ranking"
                          ? `${m.rank}ᵉ place`
                          : m.medal_type === "title"
                          ? m.custom_title
                          : MEDAL_LABELS[m.medal_type]}
                      </span>
                      {m.custom_title && m.medal_type !== "title" && (
                        <Badge variant="secondary" className="text-xs">
                          {m.custom_title}
                        </Badge>
                      )}
                      {m.team_label && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Users className="h-3 w-3" />
                          {m.team_label}
                        </Badge>
                      )}
                      {!m.team_label && m.group_id && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Users className="h-3 w-3" />
                          Équipe
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5" />
                      {compName}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(m.awarded_date), "d MMMM yyyy", {
                          locale: fr,
                        })}
                      </span>
                      {match?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {match.location}
                        </span>
                      )}
                    </div>
                    {m.notes && (
                      <p className="text-xs italic mt-1 opacity-80">{m.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
