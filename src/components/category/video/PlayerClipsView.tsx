import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Film, Search, ChevronRight } from "lucide-react";
import { VideoClipViewer } from "./VideoClipViewer";

interface PlayerClipsViewProps {
  categoryId: string;
  sportType?: string;
}

interface PlayerWithClips {
  id: string;
  name: string;
  avatar_url: string | null;
  position: string | null;
  clipCount: number;
}

export function PlayerClipsView({ categoryId, sportType }: PlayerClipsViewProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch players with clip counts
  const { data: playersWithClips, isLoading } = useQuery({
    queryKey: ["players-clip-counts", categoryId],
    queryFn: async () => {
      // Get all players
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name, avatar_url, position")
        .eq("category_id", categoryId)
        .order("name");

      if (playersError) throw playersError;

      // Get all clip associations - separate query to avoid deep type instantiation
      const { data: clips, error: clipsError } = await supabase
        .from("video_clips")
        .select("id")
        .eq("category_id", categoryId);

      if (clipsError) throw clipsError;

      const clipIds = clips?.map(c => c.id) || [];
      
      const { data: associations, error: assocError } = await supabase
        .from("clip_player_associations")
        .select("player_id, clip_id")
        .in("clip_id", clipIds.length > 0 ? clipIds : ["00000000-0000-0000-0000-000000000000"]);

      if (assocError) throw assocError;

      // Count clips per player
      const clipCounts: Record<string, number> = {};
      associations?.forEach((assoc) => {
        clipCounts[assoc.player_id] = (clipCounts[assoc.player_id] || 0) + 1;
      });

      return (players || []).map((player): PlayerWithClips => ({
        id: player.id,
        name: player.name,
        avatar_url: player.avatar_url,
        position: player.position,
        clipCount: clipCounts[player.id] || 0,
      }));
    },
  });

  // Fetch GPS summary for selected player
  const { data: playerGpsSummary } = useQuery({
    queryKey: ["player-gps-summary", selectedPlayerId],
    queryFn: async () => {
      if (!selectedPlayerId) return null;
      const { data, error } = await supabase
        .from("gps_sessions")
        .select("total_distance_m, max_speed_ms, sprint_count, player_load")
        .eq("player_id", selectedPlayerId)
        .eq("category_id", categoryId);

      if (error) throw error;

      if (!data || data.length === 0) return null;

      return {
        totalDistance: data.reduce((sum, g) => sum + (g.total_distance_m || 0), 0),
        avgMaxSpeed: data.reduce((sum, g) => sum + (g.max_speed_ms || 0), 0) / data.length,
        totalSprints: data.reduce((sum, g) => sum + (g.sprint_count || 0), 0),
        sessions: data.length,
      };
    },
    enabled: !!selectedPlayerId,
  });

  const filteredPlayers = playersWithClips?.filter(
    (player) =>
      !searchQuery ||
      player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPlayer = playersWithClips?.find((p) => p.id === selectedPlayerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (selectedPlayerId) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setSelectedPlayerId(null)}
          className="mb-2"
        >
          <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
          Retour à la liste
        </Button>

        {/* Player Header */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={selectedPlayer?.avatar_url || ""} />
                <AvatarFallback className="text-lg">
                  {selectedPlayer?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-bold">{selectedPlayer?.name}</h3>
                <p className="text-muted-foreground">{selectedPlayer?.position}</p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {selectedPlayer?.clipCount || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Clips</p>
                </div>
                {playerGpsSummary && (
                  <>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">
                        {Math.round(playerGpsSummary.totalDistance / 1000)}
                      </p>
                      <p className="text-xs text-muted-foreground">km total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">
                        {playerGpsSummary.totalSprints}
                      </p>
                      <p className="text-xs text-muted-foreground">Sprints</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player Clips */}
        <VideoClipViewer
          categoryId={categoryId}
          sportType={sportType}
          playerId={selectedPlayerId}
          showAllClips
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un joueur..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Players Grid */}
      {filteredPlayers?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucun joueur trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPlayers?.map((player) => (
            <Card
              key={player.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
              onClick={() => setSelectedPlayerId(player.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={player.avatar_url || ""} />
                    <AvatarFallback>
                      {player.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{player.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {player.position || "Non défini"}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <Badge
                      variant={player.clipCount > 0 ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      <Film className="h-3 w-3" />
                      {player.clipCount}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
