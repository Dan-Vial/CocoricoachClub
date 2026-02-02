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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Video, Link, Calendar } from "lucide-react";

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("video_analyses").insert({
        category_id: categoryId,
        match_id: matchId,
        title,
        description: description || null,
        video_url: videoUrl || null,
        video_source: videoSource,
        match_start_timestamp: matchStartTime ? new Date(matchStartTime).toISOString() : null,
        created_by: user?.id,
      });
      if (error) throw error;
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchId) {
      toast.error("Veuillez sélectionner un match");
      return;
    }
    if (!title.trim()) {
      toast.error("Veuillez saisir un titre");
      return;
    }
    createMutation.mutate();
  };

  const selectedMatch = matches?.find((m) => m.id === matchId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Nouvelle Analyse Vidéo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Match Selection */}
          <div className="space-y-2">
            <Label>Match associé *</Label>
            <Select value={matchId} onValueChange={setMatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un match" />
              </SelectTrigger>
              <SelectContent>
                {matches?.map((match) => (
                  <SelectItem key={match.id} value={match.id}>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {match.is_home ? "vs" : "@"} {match.opponent} -{" "}
                        {format(new Date(match.match_date), "dd/MM/yyyy", { locale: fr })}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                selectedMatch
                  ? `Analyse ${selectedMatch.is_home ? "vs" : "@"} ${selectedMatch.opponent}`
                  : "Titre de l'analyse"
              }
            />
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
              <Label>Début du match</Label>
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
              URL de la vidéo complète (optionnel)
            </Label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://app.veo.co/..."
            />
            <p className="text-xs text-muted-foreground">
              Lien vers la vidéo complète du match (VEO, Hudl, YouTube...)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optionnel)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes sur ce match..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
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
