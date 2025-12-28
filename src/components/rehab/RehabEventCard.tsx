import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, Dumbbell, Edit2, Save, X } from "lucide-react";
import { parseISO } from "date-fns";

interface RehabEventCardProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    event_type: string;
    phase_number: number;
    phase_name: string;
    is_completed: boolean | null;
    completed_at: string | null;
    notes: string | null;
    player_rehab_protocols?: {
      injury_protocols?: {
        name: string;
      };
    };
  };
  playerId: string;
  canEdit?: boolean;
}

export function RehabEventCard({ event, playerId, canEdit = true }: RehabEventCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(event.notes || "");
  const queryClient = useQueryClient();

  const toggleComplete = useMutation({
    mutationFn: async () => {
      const newCompleted = !event.is_completed;
      const { error } = await supabase
        .from("rehab_calendar_events")
        .update({
          is_completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
        })
        .eq("id", event.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rehab-calendar-events", playerId] });
      toast.success(event.is_completed ? "Marqué comme non terminé" : "Marqué comme terminé");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const saveNotes = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("rehab_calendar_events")
        .update({ notes: notesValue || null })
        .eq("id", event.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rehab-calendar-events", playerId] });
      setIsEditingNotes(false);
      toast.success("Notes enregistrées");
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'phase_start': return 'Début de phase';
      case 'checkpoint': return 'Évaluation';
      case 'phase_end': return 'Fin de phase';
      default: return type;
    }
  };

  const getEventTypeColor = (type: string, isCompleted: boolean) => {
    if (isCompleted) return 'bg-green-500/20 text-green-700 dark:text-green-400 border-l-green-500';
    switch (type) {
      case 'phase_start': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-l-blue-500';
      case 'checkpoint': return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-l-amber-500';
      default: return 'bg-muted text-muted-foreground border-l-muted';
    }
  };

  const eventDate = parseISO(event.event_date);
  const protocolName = event.player_rehab_protocols?.injury_protocols?.name;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`p-3 border-l-4 rounded-lg transition-colors ${getEventTypeColor(event.event_type, event.is_completed || false)}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            {canEdit && (
              <Checkbox
                checked={event.is_completed || false}
                onCheckedChange={() => toggleComplete.mutate()}
                className="mt-1"
              />
            )}
            <div className="flex items-start gap-2">
              <Dumbbell className="h-4 w-4 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{event.title}</p>
                  {event.is_completed && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {eventDate.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                {protocolName && (
                  <p className="text-xs text-muted-foreground">
                    Protocole: {protocolName}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getEventTypeLabel(event.event_type)}
            </Badge>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="mt-3 space-y-3">
          {event.description && (
            <p className="text-sm text-muted-foreground ml-7">{event.description}</p>
          )}
          
          <div className="ml-7 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Notes de suivi</span>
              {canEdit && !isEditingNotes && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>
                  <Edit2 className="h-3 w-3 mr-1" />
                  Modifier
                </Button>
              )}
            </div>
            
            {isEditingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Ajouter des notes de suivi..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending}>
                    <Save className="h-3 w-3 mr-1" />
                    Enregistrer
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setIsEditingNotes(false);
                      setNotesValue(event.notes || "");
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {event.notes || "Aucune note"}
              </p>
            )}
          </div>

          {event.completed_at && (
            <p className="text-xs text-muted-foreground ml-7">
              Terminé le {new Date(event.completed_at).toLocaleDateString("fr-FR")}
            </p>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}