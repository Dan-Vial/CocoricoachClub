import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface AddNationalEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

const EVENT_TYPES = [
  { value: "test_match", label: "Test Match" },
  { value: "six_nations", label: "Tournoi des 6 Nations" },
  { value: "world_cup", label: "Coupe du Monde" },
  { value: "autumn_nations", label: "Autumn Nations Series" },
  { value: "summer_tour", label: "Tournée d'été" },
  { value: "stage", label: "Stage" },
  { value: "rassemblement", label: "Rassemblement" },
  { value: "other", label: "Autre" },
];

export function AddNationalEventDialog({
  open,
  onOpenChange,
  categoryId,
}: AddNationalEventDialogProps) {
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [opponent, setOpponent] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const isMatch = ["test_match", "six_nations", "world_cup", "autumn_nations", "summer_tour"].includes(eventType);

  const addEvent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("national_team_events").insert({
        category_id: categoryId,
        name,
        event_type: eventType,
        start_date: startDate,
        end_date: endDate || null,
        location: location || null,
        opponent: isMatch ? opponent || null : null,
        is_home: isMatch ? isHome : null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["national_team_events", categoryId] });
      toast.success("Événement ajouté avec succès");
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de l'événement");
    },
  });

  const resetForm = () => {
    setName("");
    setEventType("");
    setStartDate("");
    setEndDate("");
    setLocation("");
    setOpponent("");
    setIsHome(true);
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && eventType && startDate) {
      addEvent.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un événement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="eventType">Type d'événement *</Label>
              <Select value={eventType} onValueChange={setEventType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'événement *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: France vs Angleterre, Stage de Marcoussis"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Date de début *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Date de fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lieu</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Stade de France, Marcoussis"
              />
            </div>

            {isMatch && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="opponent">Adversaire</Label>
                  <Input
                    id="opponent"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    placeholder="Ex: Angleterre, Nouvelle-Zélande"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isHome">Match à domicile</Label>
                  <Switch
                    id="isHome"
                    checked={isHome}
                    onCheckedChange={setIsHome}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations supplémentaires..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!name || !eventType || !startDate || addEvent.isPending}>
              {addEvent.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
