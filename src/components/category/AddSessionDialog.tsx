import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Users, UserCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

const trainingTypes = [
  { value: "collectif", label: "Collectif" },
  { value: "technique_individuelle", label: "Technique Individuelle" },
  { value: "physique", label: "Physique" },
  { value: "musculation", label: "Musculation" },
  { value: "reathlétisation", label: "Réathlétisation" },
  { value: "repos", label: "Repos" },
  { value: "test", label: "Test" },
];

export function AddSessionDialog({
  open,
  onOpenChange,
  categoryId,
}: AddSessionDialogProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [type, setType] = useState("");
  const [intensity, setIntensity] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [playerSelectionMode, setPlayerSelectionMode] = useState<"all" | "specific">("all");
  const queryClient = useQueryClient();

  // Fetch players with their injury status
  const { data: players } = useQuery({
    queryKey: ["players-with-injuries", categoryId],
    queryFn: async () => {
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, name, position, avatar_url")
        .eq("category_id", categoryId)
        .order("name");
      if (playersError) throw playersError;

      // Fetch active injuries
      const { data: injuriesData } = await supabase
        .from("injuries")
        .select("player_id")
        .eq("category_id", categoryId)
        .in("status", ["active", "recovering"]);

      const injuredPlayerIds = new Set(injuriesData?.map(i => i.player_id) || []);

      return playersData?.map(p => ({
        ...p,
        isInjured: injuredPlayerIds.has(p.id)
      })) || [];
    },
    enabled: open,
  });

  const injuredPlayers = players?.filter(p => p.isInjured) || [];
  const healthyPlayers = players?.filter(p => !p.isInjured) || [];

  const addSession = useMutation({
    mutationFn: async () => {
      // Create the session
      const { data: sessionData, error: sessionError } = await supabase
        .from("training_sessions")
        .insert([{
          category_id: categoryId,
          session_date: date,
          session_start_time: startTime || null,
          session_end_time: endTime || null,
          training_type: type as any,
          intensity: intensity ? parseInt(intensity) : null,
          notes: notes || null,
        }])
        .select()
        .single();
      
      if (sessionError) throw sessionError;

      // If specific players are selected, create attendance records
      if (playerSelectionMode === "specific" && selectedPlayers.length > 0) {
        const attendanceRecords = selectedPlayers.map(playerId => ({
          player_id: playerId,
          category_id: categoryId,
          attendance_date: date,
          training_session_id: sessionData.id,
          status: "present",
        }));

        const { error: attendanceError } = await supabase
          .from("training_attendance")
          .insert(attendanceRecords);
        
        if (attendanceError) throw attendanceError;
      }

      return sessionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["training_attendance"] });
      toast.success("Séance ajoutée avec succès");
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de la séance");
    },
  });

  const resetForm = () => {
    setDate("");
    setStartTime("");
    setEndTime("");
    setType("");
    setIntensity("");
    setNotes("");
    setSelectedPlayers([]);
    setPlayerSelectionMode("all");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (endTime && !startTime) {
      toast.error("Veuillez indiquer une heure de début si vous spécifiez une heure de fin");
      return;
    }
    
    if (startTime && endTime && endTime <= startTime) {
      toast.error("L'heure de fin doit être après l'heure de début");
      return;
    }
    
    if (date && type) {
      addSession.mutate();
    }
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const selectAllInjured = () => {
    setSelectedPlayers(injuredPlayers.map(p => p.id));
    setPlayerSelectionMode("specific");
  };

  const selectAllHealthy = () => {
    setSelectedPlayers(healthyPlayers.map(p => p.id));
    setPlayerSelectionMode("specific");
  };

  const selectAll = () => {
    setSelectedPlayers(players?.map(p => p.id) || []);
    setPlayerSelectionMode("specific");
  };

  const clearSelection = () => {
    setSelectedPlayers([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajouter une séance d'entraînement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Heure de début</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Heure de fin</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type d'entraînement *</Label>
                <Select value={type} onValueChange={setType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainingTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="intensity">Intensité (1-10)</Label>
                <Input
                  id="intensity"
                  type="number"
                  min="1"
                  max="10"
                  value={intensity}
                  onChange={(e) => setIntensity(e.target.value)}
                  placeholder="De 1 à 10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Remarques ou détails supplémentaires..."
                  rows={2}
                />
              </div>

              {/* Player Selection Section */}
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-base font-medium">
                    <Users className="h-4 w-4" />
                    Joueurs concernés
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={playerSelectionMode === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setPlayerSelectionMode("all");
                        setSelectedPlayers([]);
                      }}
                    >
                      Tous
                    </Button>
                    <Button
                      type="button"
                      variant={playerSelectionMode === "specific" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPlayerSelectionMode("specific")}
                    >
                      Spécifiques
                    </Button>
                  </div>
                </div>

                {playerSelectionMode === "specific" && (
                  <>
                    {/* Quick selection buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAll}
                        className="text-xs"
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Tous ({players?.length || 0})
                      </Button>
                      {injuredPlayers.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={selectAllInjured}
                          className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Blessés ({injuredPlayers.length})
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllHealthy}
                        className="text-xs border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Aptes ({healthyPlayers.length})
                      </Button>
                      {selectedPlayers.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearSelection}
                          className="text-xs text-muted-foreground"
                        >
                          Effacer
                        </Button>
                      )}
                    </div>

                    {/* Selected count */}
                    {selectedPlayers.length > 0 && (
                      <Badge variant="secondary" className="w-fit">
                        {selectedPlayers.length} joueur(s) sélectionné(s)
                      </Badge>
                    )}

                    {/* Player list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {players?.map((player) => (
                        <div
                          key={player.id}
                          onClick={() => togglePlayer(player.id)}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors",
                            selectedPlayers.includes(player.id)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-muted/50",
                            player.isInjured && "border-amber-300 bg-amber-50/50"
                          )}
                        >
                          <Checkbox
                            checked={selectedPlayers.includes(player.id)}
                            onCheckedChange={() => togglePlayer(player.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={player.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {player.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate flex-1">{player.name}</span>
                          {player.isInjured && (
                            <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          )}
                          {player.position && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {player.position}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {playerSelectionMode === "all" && (
                  <p className="text-sm text-muted-foreground">
                    Tous les joueurs de la catégorie seront concernés par cette séance.
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!date || !type || addSession.isPending}>
              {addSession.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
