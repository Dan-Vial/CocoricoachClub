import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dumbbell, 
  Stethoscope, 
  Video, 
  ClipboardList, 
  Users, 
  Calendar,
  Swords,
  Clock,
  MapPin,
  ChevronLeft,
  User,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  categoryId: string;
  onAddSession: () => void;
  onAddMatch: () => void;
}

const EVENT_TYPES = [
  {
    id: "session",
    label: "Séance d'entraînement",
    description: "Planifier un entraînement collectif ou individuel",
    icon: Dumbbell,
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    hoverColor: "hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
    useExistingDialog: true,
  },
  {
    id: "match",
    label: "Match / Compétition",
    description: "Ajouter un match ou une compétition officielle",
    icon: Swords,
    color: "bg-rose-500",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    borderColor: "border-rose-200 dark:border-rose-800",
    hoverColor: "hover:bg-rose-100 dark:hover:bg-rose-900/50",
    useExistingDialog: true,
  },
  {
    id: "medical",
    label: "Rendez-vous médical",
    description: "Consultation, bilan de santé, suivi kiné",
    icon: Stethoscope,
    color: "bg-sky-500",
    bgColor: "bg-sky-50 dark:bg-sky-950/30",
    borderColor: "border-sky-200 dark:border-sky-800",
    hoverColor: "hover:bg-sky-100 dark:hover:bg-sky-900/50",
    useExistingDialog: false,
  },
  {
    id: "video",
    label: "Analyse vidéo",
    description: "Session d'analyse vidéo collective ou individuelle",
    icon: Video,
    color: "bg-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    hoverColor: "hover:bg-purple-100 dark:hover:bg-purple-900/50",
    useExistingDialog: false,
  },
  {
    id: "test",
    label: "Test physique",
    description: "Évaluation et tests de performance",
    icon: ClipboardList,
    color: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    hoverColor: "hover:bg-amber-100 dark:hover:bg-amber-900/50",
    useExistingDialog: true,
  },
  {
    id: "team_meeting",
    label: "Réunion d'équipe",
    description: "Briefing, débriefing, réunion tactique",
    icon: Users,
    color: "bg-indigo-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    borderColor: "border-indigo-200 dark:border-indigo-800",
    hoverColor: "hover:bg-indigo-100 dark:hover:bg-indigo-900/50",
    useExistingDialog: false,
  },
];

export function CreateEventDialog({
  open,
  onOpenChange,
  date,
  categoryId,
  onAddSession,
  onAddMatch,
}: CreateEventDialogProps) {
  const [step, setStep] = useState<"type" | "details">("type");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setStep("type");
    setSelectedType(null);
    setTitle("");
    setStartTime("09:00");
    setEndTime("10:00");
    setLocation("");
    setNotes("");
    setSelectedPlayers([]);
    setSelectAll(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleTypeSelect = (typeId: string) => {
    const eventType = EVENT_TYPES.find(t => t.id === typeId);
    
    if (eventType?.useExistingDialog) {
      if (typeId === "session" || typeId === "test") {
        onAddSession();
      } else if (typeId === "match") {
        onAddMatch();
      }
      handleClose(false);
    } else {
      setSelectedType(typeId);
      setStep("details");
      // Set default title based on type
      if (typeId === "medical") setTitle("Rendez-vous médical");
      if (typeId === "video") setTitle("Analyse vidéo");
      if (typeId === "team_meeting") setTitle("Réunion d'équipe");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked && players) {
      setSelectedPlayers(players.map(p => p.id));
    } else {
      setSelectedPlayers([]);
    }
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
    setSelectAll(false);
  };

  // Create event mutation (for custom events not using existing dialogs)
  const createEvent = useMutation({
    mutationFn: async () => {
      // For now, we'll create these as training sessions with a special type
      // In the future, you might want a dedicated calendar_events table
      const { error } = await supabase
        .from("training_sessions")
        .insert({
          category_id: categoryId,
          session_date: format(date, "yyyy-MM-dd"),
          session_start_time: startTime,
          session_end_time: endTime,
          training_type: selectedType === "medical" ? "repos" : 
                         selectedType === "video" ? "video" :
                         selectedType === "team_meeting" ? "reunion" : "autre",
          notes: `${title}${location ? ` - ${location}` : ""}${notes ? `\n${notes}` : ""}${selectedPlayers.length > 0 ? `\nParticipants: ${selectedPlayers.length} joueur(s)` : ""}`,
          intensity: 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      toast.success("Événement créé avec succès");
      handleClose(false);
    },
    onError: () => {
      toast.error("Erreur lors de la création de l'événement");
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Veuillez saisir un titre");
      return;
    }
    createEvent.mutate();
  };

  const selectedEventType = EVENT_TYPES.find(t => t.id === selectedType);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {step === "details" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 mr-1" onClick={() => setStep("type")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Calendar className="h-5 w-5 text-primary" />
            {step === "type" ? "Ajouter un événement" : selectedEventType?.label}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(date, "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </DialogHeader>

        {step === "type" ? (
          <div className="grid grid-cols-2 gap-3 mt-2">
            {EVENT_TYPES.map((event) => {
              const Icon = event.icon;
              return (
                <Card
                  key={event.id}
                  className={cn(
                    "cursor-pointer transition-all border-2",
                    event.bgColor,
                    event.borderColor,
                    event.hoverColor,
                    "hover:shadow-md hover:scale-[1.02]"
                  )}
                  onClick={() => handleTypeSelect(event.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", event.color)}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-tight">
                          {event.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Event details form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nom de l'événement"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Début
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Fin
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Lieu (optionnel)
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Salle de réunion, cabinet..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informations complémentaires..."
                  rows={2}
                />
              </div>
            </div>

            {/* Player selection */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> Participants
                </Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="selectAll"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="selectAll" className="text-xs cursor-pointer">
                    Tous
                  </Label>
                </div>
              </div>
              
              <ScrollArea className="flex-1 border rounded-lg p-2">
                <div className="grid grid-cols-2 gap-2">
                  {players?.map((player) => {
                    const isSelected = selectedPlayers.includes(player.id);
                    return (
                      <div
                        key={player.id}
                        onClick={() => togglePlayer(player.id)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all",
                          isSelected 
                            ? "bg-primary/10 border-2 border-primary" 
                            : "bg-muted/50 border-2 border-transparent hover:bg-muted"
                        )}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"
                        )}>
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{player.name}</p>
                          {player.position && (
                            <p className="text-xs text-muted-foreground">{player.position}</p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              
              {selectedPlayers.length > 0 && (
                <Badge variant="secondary" className="mt-2 w-fit">
                  {selectedPlayers.length} participant{selectedPlayers.length > 1 ? "s" : ""} sélectionné{selectedPlayers.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={createEvent.isPending}>
                {createEvent.isPending ? "Création..." : "Créer l'événement"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
