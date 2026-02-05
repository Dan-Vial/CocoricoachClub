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
import { Video, Link, Calendar, Users } from "lucide-react";

interface AddVideoAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  onSuccess: () => void;
}

const VIDEO_SOURCES = [
  { value: "veo", label: "VEO" },
  { value: "hudl", label: "Hudl" },
  { value: "youtube", label: "YouTube" },
  { value: "vimeo", label: "Vimeo" },
  { value: "local", label: "Fichier local" },
  { value: "other", label: "Autre" },
];

export function AddVideoAnalysisDialog({
  open,
  onOpenChange,
  categoryId,
  onSuccess,
}: AddVideoAnalysisDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoSource, setVideoSource] = useState("veo");
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
        .select("id, name, position")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; position: string | null }[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create video analysis
      const { data: analysisData, error: analysisError } = await supabase
        .from("video_analyses")
        .insert({
          category_id: categoryId,
          match_id: matchId || null,
          title,
          description: description || null,
          video_url: videoUrl || null,
          video_source: videoSource,
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
    setVideoSource("veo");
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
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Nouvelle Analyse Vidéo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 pb-4">
              {/* Title */}
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre de l'analyse vidéo"
                />
              </div>

              {/* Match Selection (Optional) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Match associé (optionnel)
                </Label>
                <Select value={matchId} onValueChange={setMatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun match - Vidéo libre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun match - Vidéo libre</SelectItem>
                    {matches?.map((match) => (
                      <SelectItem key={match.id} value={match.id}>
                        <div className="flex items-center gap-2">
                          <span>
                            {match.is_home ? "vs" : "@"} {match.opponent} -{" "}
                            {format(new Date(match.match_date), "dd/MM/yyyy", { locale: fr })}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Vous pouvez créer une analyse sans match (entraînement, compilation...)
                </p>
              </div>

              {/* Video Source */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source vidéo</Label>
                  <Select value={videoSource} onValueChange={setVideoSource}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_SOURCES.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Début de la vidéo</Label>
                  <Input
                    type="datetime-local"
                    value={matchStartTime}
                    onChange={(e) => setMatchStartTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Video URL */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  URL de la vidéo (optionnel)
                </Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://app.veo.co/..."
                />
              </div>

              {/* Player Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Joueurs concernés (optionnel)
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
                          {player.name}
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
                  Sélectionnez les joueurs pour filtrer leurs clips associés
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

          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
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
