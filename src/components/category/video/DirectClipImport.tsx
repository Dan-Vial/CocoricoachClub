import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Clock,
  Users,
  Film,
  Plus,
  Trash2,
  Save,
  BarChart3,
} from "lucide-react";
import { VideoFileUpload } from "./VideoFileUpload";
import { getActionTypesForSport, ACTION_CATEGORIES } from "@/lib/constants/videoActionTypes";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DirectClipImportProps {
  categoryId: string;
  sportType?: string;
  onSuccess: () => void;
}

interface ClipToImport {
  clipUrl: string;
  clipFileUrl: string;
  title: string;
  actionType: string;
  matchId: string | null;
  startMinutes: string;
  startSeconds: string;
  endMinutes: string;
  endSeconds: string;
  selectedPlayers: string[];
  linkedStatId: string | null;
  notes: string;
}

export function DirectClipImport({
  categoryId,
  sportType,
  onSuccess,
}: DirectClipImportProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Current clip being created
  const [currentClip, setCurrentClip] = useState<Partial<ClipToImport>>({
    clipUrl: "",
    title: "",
    actionType: "",
    matchId: null,
    startMinutes: "",
    startSeconds: "",
    endMinutes: "",
    endSeconds: "",
    selectedPlayers: [],
    linkedStatId: null,
    notes: "",
  });

  const [clipsToImport, setClipsToImport] = useState<ClipToImport[]>([]);

  // Fetch matches
  const { data: matches } = useQuery({
    queryKey: ["matches-for-clips", categoryId],
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

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["category-players-import", categoryId],
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

  // Fetch match stats for selected match (for linking) - using competition_rounds instead
  const { data: matchStats } = useQuery({
    queryKey: ["match-stats-for-linking", currentClip.matchId],
    queryFn: async () => {
      if (!currentClip.matchId) return [];
      const { data, error } = await supabase
        .from("competition_rounds")
        .select(`
          id,
          round_number,
          result,
          players(id, name)
        `)
        .eq("match_id", currentClip.matchId);
      if (error) throw error;
      return data as Array<{
        id: string;
        round_number: number;
        result: string | null;
        players: { id: string; name: string } | null;
      }>;
    },
    enabled: !!currentClip.matchId,
  });

  // Action types
  const predefinedActions = getActionTypesForSport(sportType);
  const allActionTypes = [
    ...predefinedActions,
    ...(customActionTypes?.map((c) => ({
      value: `custom_${c.id}`,
      label: c.label,
      category: c.action_category as "offensive" | "defensive" | "physical" | "set_piece" | "transition" | "other",
    })) || []),
  ];

  const groupedActions = ACTION_CATEGORIES.map((cat) => ({
    ...cat,
    actions: allActionTypes.filter((a) => a.category === cat.value),
  })).filter((g) => g.actions.length > 0);

  const togglePlayer = (playerId: string) => {
    const current = currentClip.selectedPlayers || [];
    setCurrentClip({
      ...currentClip,
      selectedPlayers: current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    });
  };

  const addClipToList = () => {
    if (!currentClip.clipUrl?.trim()) {
      toast.error("Veuillez saisir l'URL du clip");
      return;
    }
    if (!currentClip.actionType) {
      toast.error("Veuillez sélectionner un type d'action");
      return;
    }

    const selectedAction = allActionTypes.find((a) => a.value === currentClip.actionType);

    const newClip: ClipToImport = {
      id: crypto.randomUUID(),
      clipUrl: currentClip.clipUrl || "",
      title: currentClip.title || selectedAction?.label || "",
      actionType: currentClip.actionType || "",
      matchId: currentClip.matchId || null,
      startMinutes: currentClip.startMinutes || "0",
      startSeconds: currentClip.startSeconds || "0",
      endMinutes: currentClip.endMinutes || "",
      endSeconds: currentClip.endSeconds || "",
      selectedPlayers: currentClip.selectedPlayers || [],
      linkedStatId: currentClip.linkedStatId || null,
      notes: currentClip.notes || "",
    };

    setClipsToImport([...clipsToImport, newClip]);
    
    // Reset form but keep match selection
    setCurrentClip({
      clipUrl: "",
      title: "",
      actionType: "",
      matchId: currentClip.matchId,
      startMinutes: "",
      startSeconds: "",
      endMinutes: "",
      endSeconds: "",
      selectedPlayers: [],
      linkedStatId: null,
      notes: "",
    });

    toast.success("Clip ajouté à la liste");
  };

  const removeClip = (id: string) => {
    setClipsToImport(clipsToImport.filter((c) => c.id !== id));
  };

  // Save clips mutation
  const saveClipsMutation = useMutation({
    mutationFn: async () => {
      // First create a video analysis if we have a match
      const analysisMatchId = clipsToImport[0]?.matchId;
      const match = matches?.find((m) => m.id === analysisMatchId);
      
      const { data: analysisData, error: analysisError } = await supabase
        .from("video_analyses")
        .insert({
          category_id: categoryId,
          match_id: analysisMatchId || null,
          title: match 
            ? `Clips ${match.is_home ? "vs" : "@"} ${match.opponent}`
            : `Import de clips - ${format(new Date(), "dd/MM/yyyy", { locale: fr })}`,
          video_source: "import",
          created_by: user?.id,
        })
        .select()
        .single();

      if (analysisError) throw analysisError;

      // Create all clips
      for (const clip of clipsToImport) {
        const resolvedActionType = clip.actionType.startsWith("custom_")
          ? clip.actionType.replace("custom_", "")
          : clip.actionType;

        const startTimeSeconds =
          (parseInt(clip.startMinutes) || 0) * 60 + (parseInt(clip.startSeconds) || 0);
        const endTimeSeconds = clip.endMinutes || clip.endSeconds
          ? (parseInt(clip.endMinutes) || 0) * 60 + (parseInt(clip.endSeconds) || 0)
          : null;

        const { data: clipData, error: clipError } = await supabase
          .from("video_clips")
          .insert({
            video_analysis_id: analysisData.id,
            category_id: categoryId,
            match_id: clip.matchId,
            title: clip.title,
            clip_url: clip.clipUrl,
            start_time_seconds: startTimeSeconds,
            end_time_seconds: endTimeSeconds,
            duration_seconds: endTimeSeconds ? endTimeSeconds - startTimeSeconds : null,
            action_type: resolvedActionType,
            notes: clip.notes || null,
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
      toast.success(`${clipsToImport.length} clip(s) importé(s)`);
      setClipsToImport([]);
      queryClient.invalidateQueries({ queryKey: ["video-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["video-clips"] });
      onSuccess();
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Importer un clip
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Match selection */}
          <div className="space-y-2">
            <Label>Match associé (optionnel)</Label>
            <Select
              value={currentClip.matchId || "none"}
              onValueChange={(v) => setCurrentClip({ ...currentClip, matchId: v === "none" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un match" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun match - Clip libre</SelectItem>
                {matches?.map((match) => (
                  <SelectItem key={match.id} value={match.id}>
                    {match.is_home ? "vs" : "@"} {match.opponent} -{" "}
                    {format(new Date(match.match_date), "dd/MM/yyyy", { locale: fr })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clip URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              URL du clip *
            </Label>
            <Input
              value={currentClip.clipUrl || ""}
              onChange={(e) => setCurrentClip({ ...currentClip, clipUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>

          {/* Action Type */}
          <div className="space-y-2">
            <Label>Type d'action *</Label>
            <Select
              value={currentClip.actionType || ""}
              onValueChange={(v) => setCurrentClip({ ...currentClip, actionType: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
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
              value={currentClip.title || ""}
              onChange={(e) => setCurrentClip({ ...currentClip, title: e.target.value })}
              placeholder="Auto-généré si vide"
            />
          </div>

          {/* Timecodes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timecode
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Début</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    value={currentClip.startMinutes || ""}
                    onChange={(e) => setCurrentClip({ ...currentClip, startMinutes: e.target.value })}
                    placeholder="00"
                    className="w-16 text-center"
                  />
                  <span>:</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={currentClip.startSeconds || ""}
                    onChange={(e) => setCurrentClip({ ...currentClip, startSeconds: e.target.value })}
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
                    value={currentClip.endMinutes || ""}
                    onChange={(e) => setCurrentClip({ ...currentClip, endMinutes: e.target.value })}
                    placeholder="00"
                    className="w-16 text-center"
                  />
                  <span>:</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={currentClip.endSeconds || ""}
                    onChange={(e) => setCurrentClip({ ...currentClip, endSeconds: e.target.value })}
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
            <ScrollArea className="h-28 border rounded-md p-2">
              <div className="space-y-1">
                {players?.map((player) => (
                  <div key={player.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`import-player-${player.id}`}
                      checked={(currentClip.selectedPlayers || []).includes(player.id)}
                      onCheckedChange={() => togglePlayer(player.id)}
                    />
                    <label
                      htmlFor={`import-player-${player.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {player.name}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Link to match stat */}
          {currentClip.matchId && matchStats && matchStats.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Lier à une statistique du match (optionnel)
              </Label>
              <Select
                value={currentClip.linkedStatId || "none"}
                onValueChange={(v) =>
                  setCurrentClip({ ...currentClip, linkedStatId: v === "none" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune statistique</SelectItem>
                  {matchStats?.map((stat) => (
                    <SelectItem key={stat.id} value={stat.id}>
                      {stat.players?.name || "Joueur inconnu"} - Round {stat.round_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea
              value={currentClip.notes || ""}
              onChange={(e) => setCurrentClip({ ...currentClip, notes: e.target.value })}
              placeholder="Notes sur ce clip..."
              rows={2}
            />
          </div>

          {/* Add button */}
          <Button onClick={addClipToList} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter à la liste
          </Button>
        </CardContent>
      </Card>

      {/* Clips to import list */}
      {clipsToImport.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Clips à importer ({clipsToImport.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clipsToImport.map((clip) => {
              const match = matches?.find((m) => m.id === clip.matchId);
              return (
                <div
                  key={clip.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-sm">{clip.title}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {clip.startMinutes}:{clip.startSeconds.padStart(2, "0")}
                        {(clip.endMinutes || clip.endSeconds) &&
                          ` → ${clip.endMinutes || "0"}:${(clip.endSeconds || "0").padStart(2, "0")}`}
                      </span>
                      {match && (
                        <Badge variant="outline" className="text-xs">
                          {match.is_home ? "vs" : "@"} {match.opponent}
                        </Badge>
                      )}
                      {clip.selectedPlayers.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {clip.selectedPlayers.length} joueur(s)
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeClip(clip.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            <Button
              onClick={() => saveClipsMutation.mutate()}
              disabled={saveClipsMutation.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveClipsMutation.isPending
                ? "Import en cours..."
                : `Importer ${clipsToImport.length} clip(s)`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
