import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Video, Calendar, Users } from "lucide-react";
import { VideoFileUpload } from "./VideoFileUpload";
import { getVideoTerminology } from "@/lib/constants/videoActionTypes";

interface AddVideoAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  onSuccess: () => void;
  sportType?: string;
}

export function AddVideoAnalysisDialog({
  open,
  onOpenChange,
  categoryId,
  onSuccess,
  sportType,
}: AddVideoAnalysisDialogProps) {
  const terminology = getVideoTerminology(sportType);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFileUrl, setVideoFileUrl] = useState("");
  const [videoSource, setVideoSource] = useState("upload");
  const [matchId, setMatchId] = useState("");
  const [matchStartTime, setMatchStartTime] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  // Fetch matches for this category
  const { data: matches } = useQuery({
    queryKey: ["matches-for-video", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, opponent, match_date, is_home")
        .eq("category_id", categoryId)
        .order("match_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all players for this category
  const { data: players } = useQuery({
    queryKey: ["category-players-video-analysis", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name, position")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; first_name: string | null; position: string | null }[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const finalVideoUrl = videoUrl || null;
      const finalVideoFileUrl = videoFileUrl || null;

      // Auto-detect source
      let resolvedSource = videoSource;
      if (finalVideoFileUrl) resolvedSource = "upload";
      else if (finalVideoUrl?.includes("veo.co")) resolvedSource = "veo";
      else if (finalVideoUrl?.includes("hudl.com")) resolvedSource = "hudl";
      else if (finalVideoUrl?.includes("youtube.com") || finalVideoUrl?.includes("youtu.be")) resolvedSource = "youtube";
      else if (finalVideoUrl?.includes("vimeo.com")) resolvedSource = "vimeo";

      // Create video analysis
      const { data: analysisData, error: analysisError } = await supabase
        .from("video_analyses")
        .insert({
          category_id: categoryId,
          match_id: matchId || null,
          title,
          description: description || null,
          video_url: finalVideoUrl,
          video_file_url: finalVideoFileUrl,
          video_source: resolvedSource,
          match_start_timestamp: matchStartTime ? new Date(matchStartTime).toISOString() : null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (analysisError) throw analysisError;

      // If players are selected, store the player associations in the description as JSON metadata
      if (selectedPlayers.length > 0 && analysisData) {
        const { error: updateError } = await supabase
          .from("video_analyses")
          .update({
            description: JSON.stringify({
              text: description || "",
              tagged_players: selectedPlayers,
            }),
          })
          .eq("id", analysisData.id);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      toast.success("Analyse vidéo créée avec succès");
      queryClient.invalidateQueries({ queryKey: ["video-analyses"] });
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      toast.error("Erreur lors de la création: " + error.message);
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setVideoFileUrl("");
    setVideoSource("upload");
    setMatchId("");
    setMatchStartTime("");
    setSelectedPlayers([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Veuillez saisir un titre");
      return;
    }
    if (!videoUrl && !videoFileUrl) {
      toast.error("Veuillez uploader une vidéo ou saisir un lien");
      return;
    }
    createMutation.mutate();
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Nouvelle Analyse Vidéo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4 pb-4">
              {/* Title */}
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Analyse mêlées vs Racing"
                />
              </div>

              {/* Match/Competition Selection (Optional) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {terminology.associatedLabel}
                </Label>
                <Select value={matchId} onValueChange={setMatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder={terminology.noMatchLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{terminology.noMatchLabel}</SelectItem>
                    {matches?.map((match) => (
                      <SelectItem key={match.id} value={match.id}>
                        {match.is_home ? "vs" : "@"} {match.opponent} -{" "}
                        {format(new Date(match.match_date), "dd/MM/yyyy", { locale: fr })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Vous pouvez créer une analyse sans {terminology.match.toLowerCase()} (entraînement, compilation...)
                </p>
              </div>

              {/* Video Upload / URL */}
              <VideoFileUpload
                label="Vidéo source"
                onFileUploaded={(url, source) => {
                  if (source === "upload") {
                    setVideoFileUrl(url);
                    setVideoUrl("");
                    setVideoSource("upload");
                  } else {
                    setVideoUrl(url);
                    setVideoFileUrl("");
                  }
                }}
                currentUrl={videoUrl || videoFileUrl}
              />

              {/* Start time */}
              <div className="space-y-2">
                <Label>Début de la vidéo (optionnel)</Label>
                <Input
                  type="datetime-local"
                  value={matchStartTime}
                  onChange={(e) => setMatchStartTime(e.target.value)}
                />
              </div>

              {/* Player Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {terminology.playersLabel} concerné(e)s (optionnel)
                </Label>
                <div className="h-32 border rounded-md p-2 overflow-y-auto">
                  <div className="space-y-2">
                    {players?.map((player) => (
                      <div key={player.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`player-${player.id}`}
                          checked={selectedPlayers.includes(player.id)}
                          onCheckedChange={() => togglePlayer(player.id)}
                        />
                        <label
                          htmlFor={`player-${player.id}`}
                          className="text-sm cursor-pointer flex items-center gap-2"
                        >
                          {player.first_name ? `${player.first_name} ${player.name}` : player.name}
                          {player.position && (
                            <span className="text-xs text-muted-foreground">
                              ({player.position})
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sélectionnez les {terminology.playersLabel.toLowerCase()} pour filtrer leurs clips associés
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description (optionnel)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes sur cette vidéo..."
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 p-6 pt-4 border-t flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Création..." : "Créer l'analyse"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
