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
import { Film, Clock, Users, Plus, X } from "lucide-react";
import { VideoFileUpload } from "./VideoFileUpload";
import { getActionTypesForSport, ACTION_CATEGORIES, getActionTypeLabel } from "@/lib/constants/videoActionTypes";
import { Badge } from "@/components/ui/badge";

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
  const [clipFileUrl, setClipFileUrl] = useState("");
  const [actionType, setActionType] = useState("");
  const [actionCategory, setActionCategory] = useState("");
  const [startMinutes, setStartMinutes] = useState("");
  const [startSeconds, setStartSeconds] = useState("");
  const [endMinutes, setEndMinutes] = useState("");
  const [endSeconds, setEndSeconds] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newCustomCategory, setNewCustomCategory] = useState<string>("other");

  // Fetch custom action types for this category
  const { data: customActionTypes } = useQuery({
    queryKey: ["custom-video-action-types", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_video_action_types")
        .select("*")
        .eq("category_id", categoryId)
        .order("label");
      if (error) throw error;
      return data || [];
    },
  });

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

  // Get combined action types (predefined + custom)
  const predefinedActions = getActionTypesForSport(sportType);
  const allActionTypes = [
    ...predefinedActions,
    ...(customActionTypes?.map(c => ({
      value: `custom_${c.id}`,
      label: c.label,
      category: c.action_category as "offensive" | "defensive" | "physical" | "set_piece" | "transition" | "other",
      isCustom: true,
      customId: c.id,
    })) || []),
  ];

  // Group actions by category for better UX
  const groupedActions = ACTION_CATEGORIES.map(cat => ({
    ...cat,
    actions: allActionTypes.filter(a => a.category === cat.value),
  })).filter(g => g.actions.length > 0);

  const createCustomActionMutation = useMutation({
    mutationFn: async () => {
      const value = newCustomLabel
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

      const { error } = await supabase
        .from("custom_video_action_types")
        .insert({
          category_id: categoryId,
          value,
          label: newCustomLabel,
          action_category: newCustomCategory,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Action personnalisée ajoutée");
      queryClient.invalidateQueries({ queryKey: ["custom-video-action-types", categoryId] });
      setNewCustomLabel("");
      setNewCustomCategory("other");
      setShowAddCustom(false);
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const deleteCustomActionMutation = useMutation({
    mutationFn: async (customId: string) => {
      const { error } = await supabase
        .from("custom_video_action_types")
        .delete()
        .eq("id", customId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Action supprimée");
      queryClient.invalidateQueries({ queryKey: ["custom-video-action-types", categoryId] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const startTimeSeconds =
        (parseInt(startMinutes) || 0) * 60 + (parseInt(startSeconds) || 0);
      const endTimeSeconds = endMinutes || endSeconds
        ? (parseInt(endMinutes) || 0) * 60 + (parseInt(endSeconds) || 0)
        : null;

      // Resolve action type (remove custom_ prefix for storage)
      const resolvedActionType = actionType.startsWith("custom_") 
        ? actionType.replace("custom_", "")
        : actionType;

      // Get label for title
      const selectedAction = allActionTypes.find(a => a.value === actionType);
      const actionLabel = selectedAction?.label || resolvedActionType;

      // Create clip
      const { data: clipData, error: clipError } = await supabase
        .from("video_clips")
        .insert({
          video_analysis_id: analysisId,
          category_id: categoryId,
          match_id: matchId || null,
          title: title || actionLabel,
          clip_url: clipUrl || clipFileUrl,
          video_file_url: clipFileUrl || null,
          start_time_seconds: startTimeSeconds,
          end_time_seconds: endTimeSeconds,
          duration_seconds: endTimeSeconds ? endTimeSeconds - startTimeSeconds : null,
          action_type: resolvedActionType,
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
    setShowAddCustom(false);
    setNewCustomLabel("");
    setNewCustomCategory("other");
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

          {/* Action Type - Grouped by category */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Type d'action *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Personnalisé
              </Button>
            </div>

            {showAddCustom && (
              <div className="p-3 border rounded-md bg-muted/50 space-y-2">
                <Input
                  value={newCustomLabel}
                  onChange={(e) => setNewCustomLabel(e.target.value)}
                  placeholder="Nom de l'action (ex: Corner rentrant)"
                  className="h-8"
                />
                <div className="flex gap-2">
                  <Select value={newCustomCategory} onValueChange={setNewCustomCategory}>
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => createCustomActionMutation.mutate()}
                    disabled={!newCustomLabel.trim() || createCustomActionMutation.isPending}
                    className="h-8"
                  >
                    Ajouter
                  </Button>
                </div>
              </div>
            )}

            {/* Custom actions badges */}
            {customActionTypes && customActionTypes.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                <span className="text-xs text-muted-foreground mr-1">Perso:</span>
                {customActionTypes.map((custom) => (
                  <Badge key={custom.id} variant="secondary" className="text-xs gap-1">
                    {custom.label}
                    <button
                      type="button"
                      onClick={() => deleteCustomActionMutation.mutate(custom.id)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {groupedActions.map((group) => (
                  <div key={group.value}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {group.label}
                    </div>
                    {group.actions.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                        {"isCustom" in action && action.isCustom && (
                          <span className="ml-2 text-xs text-muted-foreground">(perso)</span>
                        )}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category filter */}
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
