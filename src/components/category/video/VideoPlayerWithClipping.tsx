import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  Clock,
  Save,
  Trash2,
  Users,
  Film,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getActionTypesForSport, ACTION_CATEGORIES } from "@/lib/constants/videoActionTypes";

interface VideoPlayerWithClippingProps {
  analysisId: string;
  categoryId: string;
  matchId?: string | null;
  videoUrl: string;
  sportType?: string;
  onClipCreated: () => void;
}

interface PendingClip {
  id: string;
  startTime: number;
  endTime: number | null;
  actionType: string;
  title: string;
  selectedPlayers: string[];
}

export function VideoPlayerWithClipping({
  analysisId,
  categoryId,
  matchId,
  videoUrl,
  sportType,
  onClipCreated,
}: VideoPlayerWithClippingProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Clip creation state
  const [clipStartTime, setClipStartTime] = useState<number | null>(null);
  const [clipEndTime, setClipEndTime] = useState<number | null>(null);
  const [pendingClips, setPendingClips] = useState<PendingClip[]>([]);
  
  // Manual time input
  const [manualStartMin, setManualStartMin] = useState("");
  const [manualStartSec, setManualStartSec] = useState("");
  const [manualEndMin, setManualEndMin] = useState("");
  const [manualEndSec, setManualEndSec] = useState("");
  
  // Current clip form
  const [currentActionType, setCurrentActionType] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [showPlayerPanel, setShowPlayerPanel] = useState(false);

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["category-players-clipping", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; position: string | null }[];
    },
  });

  // Fetch custom action types
  const { data: customActionTypes } = useQuery({
    queryKey: ["custom-video-action-types", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_video_action_types")
        .select("*")
        .eq("category_id", categoryId);
      if (error) throw error;
      return data || [];
    },
  });

  // All action types
  const predefinedActions = getActionTypesForSport(sportType);
  const allActionTypes = [
    ...predefinedActions,
    ...(customActionTypes?.map((c) => ({
      value: `custom_${c.id}`,
      label: c.label,
      category: c.action_category as "offensive" | "defensive" | "physical" | "set_piece" | "transition" | "other",
    })) || []),
  ];

  // Group actions by category
  const groupedActions = ACTION_CATEGORIES.map((cat) => ({
    ...cat,
    actions: allActionTypes.filter((a) => a.category === cat.value),
  })).filter((g) => g.actions.length > 0);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Parse embedded video URL for iframe
  const getEmbedUrl = (url: string) => {
    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be")
        ? url.split("/").pop()?.split("?")[0]
        : new URL(url).searchParams.get("v");
      return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    }
    // Vimeo
    if (url.includes("vimeo.com")) {
      const videoId = url.split("/").pop()?.split("?")[0];
      return `https://player.vimeo.com/video/${videoId}?api=1`;
    }
    // Return original for other sources
    return url;
  };

  // Mark clip start at current time
  const markClipStart = () => {
    setClipStartTime(currentTime);
    setManualStartMin(Math.floor(currentTime / 60).toString());
    setManualStartSec(Math.floor(currentTime % 60).toString());
    toast.info(`Début du clip marqué à ${formatTime(currentTime)}`);
  };

  // Mark clip end at current time
  const markClipEnd = () => {
    if (clipStartTime === null) {
      toast.error("Veuillez d'abord marquer le début du clip");
      return;
    }
    setClipEndTime(currentTime);
    setManualEndMin(Math.floor(currentTime / 60).toString());
    setManualEndSec(Math.floor(currentTime % 60).toString());
    toast.info(`Fin du clip marquée à ${formatTime(currentTime)}`);
  };

  // Update times from manual input
  const updateTimesFromManual = () => {
    const startSec = (parseInt(manualStartMin) || 0) * 60 + (parseInt(manualStartSec) || 0);
    const endSec = manualEndMin || manualEndSec
      ? (parseInt(manualEndMin) || 0) * 60 + (parseInt(manualEndSec) || 0)
      : null;
    setClipStartTime(startSec);
    setClipEndTime(endSec);
  };

  // Add to pending clips list
  const addToPendingClips = () => {
    if (clipStartTime === null) {
      toast.error("Veuillez définir le début du clip");
      return;
    }
    if (!currentActionType) {
      toast.error("Veuillez sélectionner un type d'action");
      return;
    }

    const selectedAction = allActionTypes.find((a) => a.value === currentActionType);
    const newClip: PendingClip = {
      id: crypto.randomUUID(),
      startTime: clipStartTime,
      endTime: clipEndTime,
      actionType: currentActionType,
      title: currentTitle || selectedAction?.label || "",
      selectedPlayers: [...selectedPlayers],
    };

    setPendingClips([...pendingClips, newClip]);
    
    // Reset form
    setClipStartTime(null);
    setClipEndTime(null);
    setCurrentActionType("");
    setCurrentTitle("");
    setSelectedPlayers([]);
    setManualStartMin("");
    setManualStartSec("");
    setManualEndMin("");
    setManualEndSec("");
    
    toast.success("Clip ajouté à la liste");
  };

  // Remove from pending
  const removePendingClip = (id: string) => {
    setPendingClips(pendingClips.filter((c) => c.id !== id));
  };

  // Save all clips mutation
  const saveClipsMutation = useMutation({
    mutationFn: async () => {
      for (const clip of pendingClips) {
        const resolvedActionType = clip.actionType.startsWith("custom_")
          ? clip.actionType.replace("custom_", "")
          : clip.actionType;

        // Create clip
        const { data: clipData, error: clipError } = await supabase
          .from("video_clips")
          .insert({
            video_analysis_id: analysisId,
            category_id: categoryId,
            match_id: matchId || null,
            title: clip.title,
            clip_url: videoUrl,
            start_time_seconds: clip.startTime,
            end_time_seconds: clip.endTime,
            duration_seconds: clip.endTime ? clip.endTime - clip.startTime : null,
            action_type: resolvedActionType,
            created_by: user?.id,
          })
          .select()
          .single();

        if (clipError) throw clipError;

        // Player associations
        if (clip.selectedPlayers.length > 0 && clipData) {
          const associations = clip.selectedPlayers.map((playerId, index) => ({
            clip_id: clipData.id,
            player_id: playerId,
            role: index === 0 ? "main" : "secondary",
          }));

          const { error: assocError } = await supabase
            .from("clip_player_associations")
            .insert(associations);

          if (assocError) throw assocError;
        }
      }
    },
    onSuccess: () => {
      toast.success(`${pendingClips.length} clip(s) enregistré(s)`);
      setPendingClips([]);
      queryClient.invalidateQueries({ queryKey: ["video-clips"] });
      onClipCreated();
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const embedUrl = getEmbedUrl(videoUrl);
  const isEmbeddable = embedUrl !== videoUrl;

  return (
    <div className="space-y-4">
      {/* Video Player Area */}
      <Card>
        <CardContent className="p-4">
          {isEmbeddable ? (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center space-y-4 p-6">
                <Film className="h-12 w-12 mx-auto text-muted-foreground" />
                <div className="space-y-2">
                  <p className="font-medium">Source vidéo externe</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Ouvrez la vidéo dans un nouvel onglet, notez les timestamps des moments clés, 
                    puis saisissez-les manuellement ci-dessous pour créer vos clips.
                  </p>
                </div>
                <Button onClick={() => window.open(videoUrl, "_blank")}>
                  <Play className="h-4 w-4 mr-2" />
                  Ouvrir la vidéo dans un nouvel onglet
                </Button>
              </div>
            </div>
          )}

          {/* Manual Time Controls */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Définir les timestamps manuellement
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Début du clip</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    value={manualStartMin}
                    onChange={(e) => {
                      setManualStartMin(e.target.value);
                    }}
                    onBlur={updateTimesFromManual}
                    placeholder="00"
                    className="w-16 text-center"
                  />
                  <span>:</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={manualStartSec}
                    onChange={(e) => {
                      setManualStartSec(e.target.value);
                    }}
                    onBlur={updateTimesFromManual}
                    placeholder="00"
                    className="w-16 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={markClipStart}
                    className="ml-2"
                  >
                    <Scissors className="h-4 w-4 mr-1" />
                    Marquer
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Fin du clip</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    value={manualEndMin}
                    onChange={(e) => {
                      setManualEndMin(e.target.value);
                    }}
                    onBlur={updateTimesFromManual}
                    placeholder="00"
                    className="w-16 text-center"
                  />
                  <span>:</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={manualEndSec}
                    onChange={(e) => {
                      setManualEndSec(e.target.value);
                    }}
                    onBlur={updateTimesFromManual}
                    placeholder="00"
                    className="w-16 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={markClipEnd}
                    className="ml-2"
                  >
                    <Scissors className="h-4 w-4 mr-1" />
                    Marquer
                  </Button>
                </div>
              </div>
            </div>

            {clipStartTime !== null && (
              <Badge variant="secondary">
                Clip: {formatTime(clipStartTime)}
                {clipEndTime !== null && ` → ${formatTime(clipEndTime)}`}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clip Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            Détails du clip
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action Type */}
          <div className="space-y-2">
            <Label>Type d'action *</Label>
            <Select value={currentActionType} onValueChange={setCurrentActionType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une action" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {groupedActions.map((group) => (
                  <div key={group.value}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {group.label}
                    </div>
                    {group.actions.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Titre (optionnel)</Label>
            <Input
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              placeholder="Auto-généré si vide"
            />
          </div>

          {/* Players */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPlayerPanel(!showPlayerPanel)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Joueurs ({selectedPlayers.length} sélectionné{selectedPlayers.length > 1 ? "s" : ""})
              </span>
              {showPlayerPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {showPlayerPanel && (
              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="space-y-1">
                  {players?.map((player) => (
                    <div key={player.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`clip-player-${player.id}`}
                        checked={selectedPlayers.includes(player.id)}
                        onCheckedChange={() => togglePlayer(player.id)}
                      />
                      <label
                        htmlFor={`clip-player-${player.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {player.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Add to list button */}
          <Button
            type="button"
            onClick={addToPendingClips}
            disabled={clipStartTime === null || !currentActionType}
            className="w-full"
          >
            <Film className="h-4 w-4 mr-2" />
            Ajouter ce clip à la liste
          </Button>
        </CardContent>
      </Card>

      {/* Pending Clips List */}
      {pendingClips.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Clips à enregistrer ({pendingClips.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingClips.map((clip) => (
              <div
                key={clip.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
              >
                <div className="space-y-1">
                  <div className="font-medium text-sm">{clip.title}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTime(clip.startTime)}
                    {clip.endTime && ` → ${formatTime(clip.endTime)}`}
                    {clip.selectedPlayers.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {clip.selectedPlayers.length} joueur(s)
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removePendingClip(clip.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              onClick={() => saveClipsMutation.mutate()}
              disabled={saveClipsMutation.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveClipsMutation.isPending
                ? "Enregistrement..."
                : `Enregistrer ${pendingClips.length} clip(s)`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
