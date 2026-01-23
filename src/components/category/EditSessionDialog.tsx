import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { getTrainingTypesForSport } from "@/lib/constants/trainingTypes";
import { GroupedTrainingTypeSelect } from "@/components/category/sessions/GroupedTrainingTypeSelect";

interface Session {
  id: string;
  session_date: string;
  session_start_time: string | null;
  session_end_time: string | null;
  training_type: string;
  intensity: number | null;
  notes: string | null;
}

interface EditSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  session: Session | null;
}

export function EditSessionDialog({
  open,
  onOpenChange,
  categoryId,
  session,
}: EditSessionDialogProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [type, setType] = useState("");
  const [intensity, setIntensity] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  // Fetch category to get sport type
  const { data: category } = useQuery({
    queryKey: ["category-sport-type", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const trainingTypes = getTrainingTypesForSport(category?.rugby_type);

  useEffect(() => {
    if (session) {
      setDate(session.session_date);
      setStartTime(session.session_start_time || "");
      setEndTime(session.session_end_time || "");
      setType(session.training_type);
      setIntensity(session.intensity?.toString() || "");
      setNotes(session.notes || "");
    }
  }, [session]);

  const updateSession = useMutation({
    mutationFn: async () => {
      if (!session) return;
      const { error } = await supabase
        .from("training_sessions")
        .update({
          session_date: date,
          session_start_time: startTime || null,
          session_end_time: endTime || null,
          training_type: type as any,
          intensity: intensity ? parseInt(intensity) : null,
          notes: notes || null,
        })
        .eq("id", session.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      toast.success("Séance modifiée avec succès");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de la modification de la séance");
    },
  });

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
      updateSession.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier la séance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date *</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startTime">Heure de début</Label>
                <Input
                  id="edit-startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endTime">Heure de fin</Label>
                <Input
                  id="edit-endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type">Type d'entraînement *</Label>
              <GroupedTrainingTypeSelect
                value={type}
                onValueChange={setType}
                sportType={category?.rugby_type}
                required={true}
                placeholder="Sélectionner un type"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-intensity">Intensité (1-10)</Label>
              <Input
                id="edit-intensity"
                type="number"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value)}
                placeholder="De 1 à 10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarques ou détails supplémentaires..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!date || !type || updateSession.isPending}>
              {updateSession.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
