import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Play,
  BarChart3,
  Activity,
  Zap,
  Timer,
  Users,
  Trophy,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ClipStatsPanelProps {
  clip: {
    id: string;
    title: string;
    clip_url: string;
    start_time_seconds: number;
    end_time_seconds: number | null;
    action_type: string;
    action_category: string | null;
    notes: string | null;
    match_id: string;
    clip_player_associations?: Array<{
      player_id: string;
      role: string;
      players: { id: string; name: string; jersey_number: number | null } | null;
    }>;
    matches?: {
      opponent: string;
      match_date: string;
      is_home: boolean;
    } | null;
  };
  categoryId: string;
}

export function ClipStatsPanel({ clip, categoryId }: ClipStatsPanelProps) {
  const playerIds = clip.clip_player_associations?.map((a) => a.player_id) || [];

  // Fetch match stats for involved players
  const { data: matchStats } = useQuery({
    queryKey: ["clip-match-stats", clip.match_id, playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) return [];
      const { data, error } = await supabase
        .from("player_match_stats")
        .select("*")
        .eq("match_id", clip.match_id)
        .in("player_id", playerIds);
      if (error) throw error;
      return data;
    },
    enabled: playerIds.length > 0,
  });

  // Fetch GPS data for match and players
  const { data: gpsData } = useQuery({
    queryKey: ["clip-gps-data", clip.match_id, playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) return [];
      const { data, error } = await supabase
        .from("gps_sessions")
        .select("*")
        .eq("match_id", clip.match_id)
        .in("player_id", playerIds);
      if (error) throw error;
      return data;
    },
    enabled: playerIds.length > 0,
  });

  // Fetch overall match stats
  const { data: overallMatchStats } = useQuery({
    queryKey: ["match-overall-stats", clip.match_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_match_stats")
        .select("*")
        .eq("match_id", clip.match_id);
      if (error) throw error;
      return data;
    },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}'${secs.toString().padStart(2, "0")}`;
  };

  const playerAssocs = clip.clip_player_associations || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Contexte du Clip
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Preview */}
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Button
              size="lg"
              className="rounded-full"
              onClick={() => window.open(clip.clip_url, "_blank")}
            >
              <Play className="h-6 w-6 mr-2" />
              Voir le clip
            </Button>
          </div>
        </div>

        {/* Clip Info */}
        <div className="space-y-2">
          <h4 className="font-medium">{clip.title}</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              <Timer className="h-3 w-3 mr-1" />
              {formatTime(clip.start_time_seconds)}
              {clip.end_time_seconds && ` - ${formatTime(clip.end_time_seconds)}`}
            </Badge>
            {clip.matches && (
              <Badge variant="outline">
                {clip.matches.is_home ? "vs" : "@"} {clip.matches.opponent}
              </Badge>
            )}
          </div>
          {clip.notes && (
            <p className="text-sm text-muted-foreground">{clip.notes}</p>
          )}
        </div>

        <Separator />

        {/* Joueurs impliqués */}
        {playerAssocs.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Joueurs ({playerAssocs.length})
            </h5>
            <div className="space-y-2">
              {playerAssocs.map((assoc) => {
                const playerStats = matchStats?.find(
                  (s) => s.player_id === assoc.player_id
                );
                const playerGps = gpsData?.find(
                  (g) => g.player_id === assoc.player_id
                );
                const sportData = (playerStats as { sport_data?: Record<string, number> })?.sport_data || {};

                return (
                  <div
                    key={assoc.player_id}
                    className="p-2 bg-muted/50 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {assoc.players?.jersey_number && `#${assoc.players.jersey_number} `}
                        {assoc.players?.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {assoc.role === "main" ? "Principal" : "Secondaire"}
                      </Badge>
                    </div>

                    {/* Player Stats */}
                    {playerStats && (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {sportData.tries !== undefined && sportData.tries > 0 && (
                          <div className="text-center p-1 bg-background rounded">
                            <p className="font-bold">{sportData.tries}</p>
                            <p className="text-muted-foreground">Essais</p>
                          </div>
                        )}
                        {sportData.tackles !== undefined && sportData.tackles > 0 && (
                          <div className="text-center p-1 bg-background rounded">
                            <p className="font-bold">{sportData.tackles}</p>
                            <p className="text-muted-foreground">Plaquages</p>
                          </div>
                        )}
                        {sportData.carries !== undefined && sportData.carries > 0 && (
                          <div className="text-center p-1 bg-background rounded">
                            <p className="font-bold">{sportData.carries}</p>
                            <p className="text-muted-foreground">Courses</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Player GPS */}
                    {playerGps && (
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-blue-500" />
                          <span>{Math.round((playerGps.total_distance_m || 0) / 1000 * 10) / 10} km</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-yellow-500" />
                          <span>{Math.round((playerGps.max_speed_ms || 0) * 3.6)} km/h</span>
                        </div>
                        {playerGps.sprint_count && (
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-green-500" />
                            <span>{playerGps.sprint_count} sprints</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {playerAssocs.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Aucun joueur associé à ce clip
          </div>
        )}

        <Separator />

        {/* Stats du Match */}
        {overallMatchStats && overallMatchStats.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Stats Match (équipe)
            </h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(() => {
                const totals = overallMatchStats.reduce(
                  (acc, stat) => {
                    const sportData = (stat as { sport_data?: Record<string, number> }).sport_data || {};
                    return {
                      tries: acc.tries + (sportData.tries || 0),
                      tackles: acc.tackles + (sportData.tackles || 0),
                      carries: acc.carries + (sportData.carries || 0),
                      passes: acc.passes + (sportData.passes || 0),
                    };
                  },
                  { tries: 0, tackles: 0, carries: 0, passes: 0 }
                );

                return (
                  <>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="font-bold text-lg">{totals.tries}</p>
                      <p className="text-muted-foreground">Essais</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="font-bold text-lg">{totals.tackles}</p>
                      <p className="text-muted-foreground">Plaquages</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="font-bold text-lg">{totals.carries}</p>
                      <p className="text-muted-foreground">Courses</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="font-bold text-lg">{totals.passes}</p>
                      <p className="text-muted-foreground">Passes</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* External Link */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.open(clip.clip_url, "_blank")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Ouvrir dans un nouvel onglet
        </Button>
      </CardContent>
    </Card>
  );
}
