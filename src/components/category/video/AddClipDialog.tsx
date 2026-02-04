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
import { Film, Clock, Users, Link } from "lucide-react";
import { getActionTypesForSport, ACTION_CATEGORIES, getActionTypeLabel } from "@/lib/constants/videoActionTypes";

interface AddClipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string;
  categoryId: string;
  matchId?: string | null;
  sportType?: string;
  onSuccess: () => void;
}

export function AddClipDialog({
  open,
  onOpenChange,
  analysisId,
  categoryId,
  matchId,
  sportType,
  onSuccess,
}: AddClipDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [clipUrl, setClipUrl] = useState("");
  const [actionType, setActionType] = useState("");
  const [actionCategory, setActionCategory] = useState("");
  const [startMinutes, setStartMinutes] = useState("");
  const [startSeconds, setStartSeconds] = useState("");
  const [endMinutes, setEndMinutes] = useState("");
  const [endSeconds, setEndSeconds] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  // Fetch lineup players for this match (if match exists)
  const { data: lineupPlayers } = useQuery({
    queryKey: ["match-lineup-players", matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from("match_lineups")
        .select(`
          player_id,
          players(id, name, position)
        `)
        .eq("match_id", matchId);
      if (error) throw error;
      return data?.map((l) => l.players).filter(Boolean) as { id: string; name: string; position: string | null }[] || [];
    },
    enabled: !!matchId,
  });

  // Also fetch all category players as fallback
  const { data: allPlayers } = useQuery({
    queryKey: ["category-players-video", categoryId],
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

  const players = (lineupPlayers?.length ? lineupPlayers : allPlayers) || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const startTimeSeconds =
        (parseInt(startMinutes) || 0) * 60 + (parseInt(startSeconds) || 0);
      const endTimeSeconds = endMinutes || endSeconds
        ? (parseInt(endMinutes) || 0) * 60 + (parseInt(endSeconds) || 0)
        : null;

      // Create clip
      const { data: clipData, error: clipError } = await supabase
        .from("video_clips")
        .insert({
          video_analysis_id: analysisId,
          category_id: categoryId,
          match_id: matchId || null,
          title: title || getActionTypeLabel(actionType) || actionType,
          clip_url: clipUrl,
          start_time_seconds: startTimeSeconds,
          end_time_seconds: endTimeSeconds,
          duration_seconds: endTimeSeconds ? endTimeSeconds - startTimeSeconds : null,
          action_type: actionType,
          action_category: actionCategory || null,
          notes: notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (clipError) throw clipError;

      // Create player associations
      if (selectedPlayers.length > 0 && clipData) {
        const associations = selectedPlayers.map((playerId, index) => ({
          clip_id: clipData.id,
          player_id: playerId,
          role: index === 0 ? "main" : "secondary",
        }));

        const { error: assocError } = await supabase
          .from("clip_player_associations")
          .insert(associations);

        if (assocError) throw assocError;
      }
    },
    onSuccess: () => {
      toast.success("Clip ajouté avec succès");
      queryClient.invalidateQueries({ queryKey: ["video-clips"] });
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const resetForm = () => {
    setTitle("");
    setClipUrl("");
    setActionType("");
    setActionCategory("");
    setStartMinutes("");
    setStartSeconds("");
    setEndMinutes("");
    setEndSeconds("");
    setNotes("");
    setSelectedPlayers([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clipUrl.trim()) {
      toast.error("Veuillez saisir l'URL du clip");
      return;
    }
    if (!actionType) {
      toast.error("Veuillez sélectionner un type d'action");
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Ajouter un Clip
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Clip URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              URL du clip *
            </Label>
            <Input
              value={clipUrl}
              onChange={(e) => setClipUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Lien vers le clip pré-découpé (VEO, YouTube, Vimeo...)
            </p>
          </div>

          {/* Action Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type d'action *</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {getActionTypesForSport(sportType).map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={actionCategory} onValueChange={setActionCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Optionnel" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Titre du clip</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto-généré si vide"
            />
          </div>

          {/* Timecodes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timecode dans le match
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Début</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    value={startMinutes}
                    onChange={(e) => setStartMinutes(e.target.value)}
                    placeholder="00"
                    className="w-16 text-center"
                  />
                  <span>:</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={startSeconds}
                    onChange={(e) => setStartSeconds(e.target.value)}
                    placeholder="00"
                    className="w-16 text-center"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Fin (optionnel)</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    value={endMinutes}
                    onChange={(e) => setEndMinutes(e.target.value)}
                    placeholder="00"
                    className="w-16 text-center"
                  />
                  <span>:</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={endSeconds}
                    onChange={(e) => setEndSeconds(e.target.value)}
                    placeholder="00"
                    className="w-16 text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Players */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Joueurs impliqués
            </Label>
            <ScrollArea className="h-32 border rounded-md p-2">
              <div className="space-y-2">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center gap-2">
                    <Checkbox
                      id={player.id}
                      checked={selectedPlayers.includes(player.id)}
                      onCheckedChange={() => togglePlayer(player.id)}
                    />
                    <label
                      htmlFor={player.id}
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
            </ScrollArea>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexte, observations..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Ajout..." : "Ajouter le clip"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
