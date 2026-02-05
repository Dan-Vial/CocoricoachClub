import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Film,
  ExternalLink,
  Clock,
  Users,
  BarChart3,
  Trash2,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { ClipStatsPanel } from "./ClipStatsPanel";
import { getActionTypeLabel, getActionCategoryColor, getActionTypesForSport } from "@/lib/constants/videoActionTypes";

interface VideoClipViewerProps {
  analysisId?: string;
  categoryId: string;
  sportType?: string;
  onBack?: () => void;
  showAllClips?: boolean;
  playerId?: string;
}

interface ClipData {
  id: string;
  title: string;
  clip_url: string;
  start_time_seconds: number;
  end_time_seconds: number | null;
  action_type: string;
  action_category: string | null;
  notes: string | null;
  match_id: string;
  video_analysis_id: string;
  clip_player_associations: Array<{
    player_id: string;
    role: string;
    players: { id: string; name: string; position: string | null } | null;
  }>;
  matches: { id: string; opponent: string; match_date: string; is_home: boolean } | null;
}

export function VideoClipViewer({
  analysisId,
  categoryId,
  sportType,
  onBack,
  showAllClips = false,
  playerId,
}: VideoClipViewerProps) {
  const queryClient = useQueryClient();
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("all");
  const [playerFilter, setPlayerFilter] = useState<string>("all");

  // Fetch clips
  const { data: clips, isLoading } = useQuery({
    queryKey: ["video-clips", categoryId, analysisId, playerId],
    queryFn: async () => {
      // First, get clips
      let clipsQuery = supabase
        .from("video_clips")
        .select("*, matches(id, opponent, match_date, is_home)")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });

      if (analysisId) {
        clipsQuery = clipsQuery.eq("video_analysis_id", analysisId);
      }

      const { data: clipsData, error: clipsError } = await clipsQuery;
      if (clipsError) throw clipsError;

      if (!clipsData || clipsData.length === 0) return [];

      // Get player associations separately
      const clipIds = clipsData.map(c => c.id);
      const { data: associations, error: assocError } = await supabase
        .from("clip_player_associations")
        .select("clip_id, player_id, role")
        .in("clip_id", clipIds);

      if (assocError) throw assocError;

      // Get player names
      const playerIds = [...new Set(associations?.map(a => a.player_id) || [])];
      let playersMap: Record<string, { id: string; name: string; position: string | null }> = {};
      
      if (playerIds.length > 0) {
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, name, position")
          .in("id", playerIds);
        
        if (!playersError && playersData) {
          playersData.forEach(p => {
            playersMap[p.id] = p;
          });
        }
      }

      // Combine data
      const result: ClipData[] = clipsData.map(clip => ({
        id: clip.id,
        title: clip.title,
        clip_url: clip.clip_url,
        start_time_seconds: clip.start_time_seconds,
        end_time_seconds: clip.end_time_seconds,
        action_type: clip.action_type,
        action_category: clip.action_category,
        notes: clip.notes,
        match_id: clip.match_id,
        video_analysis_id: clip.video_analysis_id,
        matches: clip.matches as { id: string; opponent: string; match_date: string; is_home: boolean } | null,
        clip_player_associations: (associations || [])
          .filter(a => a.clip_id === clip.id)
          .map(a => ({
            player_id: a.player_id,
            role: a.role,
            players: playersMap[a.player_id] || null
          }))
      }));

      // If filtering by player, filter after fetch
      if (playerId) {
        return result.filter((clip) =>
          clip.clip_player_associations?.some(
            (assoc) => assoc.player_id === playerId
          )
        );
      }

      return result;
    },
  });

  // Fetch players for filter
  const { data: players } = useQuery({
    queryKey: ["category-players-filter", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (clipId: string) => {
      const { error } = await supabase.from("video_clips").delete().eq("id", clipId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clip supprimé");
      queryClient.invalidateQueries({ queryKey: ["video-clips"] });
      setSelectedClipId(null);
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });

  // Filter clips
  const filteredClips = clips?.filter((clip) => {
    const matchesSearch =
      !searchQuery ||
      clip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction =
      actionTypeFilter === "all" || clip.action_type === actionTypeFilter;

    const matchesPlayer =
      playerFilter === "all" ||
      clip.clip_player_associations?.some(
        (assoc) => assoc.player_id === playerFilter
      );

    return matchesSearch && matchesAction && matchesPlayer;
  });

  const selectedClip = clips?.find((c) => c.id === selectedClipId);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}'${secs.toString().padStart(2, "0")}`;
  };

  // Build URL with timestamp for playback
  const getClipUrlWithTimestamp = (url: string, startTime: number) => {
    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}t=${Math.floor(startTime)}`;
    }
    // Vimeo
    if (url.includes("vimeo.com")) {
      return `${url}#t=${Math.floor(startTime)}s`;
    }
    // VEO - uses ?t= parameter in seconds
    if (url.includes("veo.co")) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}t=${Math.floor(startTime)}`;
    }
    // Hudl - uses ?time= parameter
    if (url.includes("hudl.com")) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}time=${Math.floor(startTime)}`;
    }
    // For other sources, return as-is (user can manually seek)
    return url;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux analyses
        </Button>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes actions</SelectItem>
                {getActionTypesForSport(sportType).map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={playerFilter} onValueChange={setPlayerFilter}>
              <SelectTrigger className="w-40">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Joueur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous joueurs</SelectItem>
                {players?.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Clips List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  Clips ({filteredClips?.length || 0})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredClips?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun clip trouvé
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredClips?.map((clip) => {
                      const matchData = clip.matches;
                      const playerAssocs = clip.clip_player_associations || [];

                      return (
                        <div
                          key={clip.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedClipId === clip.id
                              ? "border-primary bg-primary/5"
                              : "hover:border-primary/50"
                          }`}
                          onClick={() => setSelectedClipId(clip.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={getActionCategoryColor(clip.action_category)}
                                >
                                  {getActionTypeLabel(clip.action_type)}
                                </Badge>
                                <span className="text-sm font-medium">{clip.title}</span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(clip.start_time_seconds)}
                                  {clip.end_time_seconds &&
                                    ` - ${formatTime(clip.end_time_seconds)}`}
                                </span>
                                {matchData && (
                                  <span>
                                    {matchData.is_home ? "vs" : "@"} {matchData.opponent}
                                  </span>
                                )}
                              </div>

                              {playerAssocs.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {playerAssocs.map((assoc) => (
                                    <Badge
                                      key={assoc.player_id}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {assoc.players?.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(getClipUrlWithTimestamp(clip.clip_url, clip.start_time_seconds), "_blank");
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Supprimer ce clip ?")) {
                                    deleteMutation.mutate(clip.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Panel */}
        <div className="lg:col-span-1">
          {selectedClip ? (
            <ClipStatsPanel
              clip={{
                ...selectedClip,
                clip_player_associations: selectedClip.clip_player_associations?.map(a => ({
                  player_id: a.player_id,
                  role: a.role,
                  players: a.players ? { ...a.players, jersey_number: null } : null
                })),
              }}
              categoryId={categoryId}
              sportType={sportType}
            />
          ) : (
            <Card className="h-full">
              <CardContent className="flex items-center justify-center h-full py-12">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Sélectionnez un clip pour voir</p>
                  <p className="text-sm">les statistiques liées</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
