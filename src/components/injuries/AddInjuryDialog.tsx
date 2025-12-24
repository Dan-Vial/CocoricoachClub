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
import { toast } from "sonner";
import { RUGBY_INJURY_TYPES } from "@/lib/constants/rugbyInjuries";
import { Badge } from "@/components/ui/badge";

interface AddInjuryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  playerId?: string;
}

const severityOptions = [
  { value: "légère", label: "Légère" },
  { value: "modérée", label: "Modérée" },
  { value: "grave", label: "Grave" },
];

export function AddInjuryDialog({
  open,
  onOpenChange,
  categoryId,
  playerId,
}: AddInjuryDialogProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(playerId || "");
  const [injuryType, setInjuryType] = useState("");
  const [customInjuryType, setCustomInjuryType] = useState("");
  const [injuryDate, setInjuryDate] = useState(new Date().toISOString().split("T")[0]);
  const [severity, setSeverity] = useState<string>("");
  const [estimatedReturnDate, setEstimatedReturnDate] = useState("");
  const [description, setDescription] = useState("");
  const [protocolNotes, setProtocolNotes] = useState("");
  const queryClient = useQueryClient();

  const selectedInjury = RUGBY_INJURY_TYPES.find(i => i.name === injuryType);

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !playerId,
  });

  const addInjury = useMutation({
    mutationFn: async () => {
      const finalInjuryType = injuryType === "other" ? customInjuryType : injuryType;
      const { error } = await supabase.from("injuries").insert([
        {
          player_id: selectedPlayerId,
          category_id: categoryId,
          injury_type: finalInjuryType,
          injury_date: injuryDate,
          severity: severity as any,
          estimated_return_date: estimatedReturnDate || null,
          description: description || null,
          protocol_notes: protocolNotes || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["injuries"] });
      toast.success("Blessure enregistrée avec succès");
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement de la blessure");
    },
  });

  const resetForm = () => {
    if (!playerId) setSelectedPlayerId("");
    setInjuryType("");
    setCustomInjuryType("");
    setInjuryDate(new Date().toISOString().split("T")[0]);
    setSeverity("");
    setEstimatedReturnDate("");
    setDescription("");
    setProtocolNotes("");
  };

  // Auto-calculate estimated return date based on injury type
  const handleInjuryTypeChange = (value: string) => {
    setInjuryType(value);
    const injury = RUGBY_INJURY_TYPES.find(i => i.name === value);
    if (injury && !estimatedReturnDate) {
      const returnDate = new Date(injuryDate);
      returnDate.setDate(returnDate.getDate() + injury.durationMin);
      setEstimatedReturnDate(returnDate.toISOString().split("T")[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalInjuryType = injuryType === "other" ? customInjuryType : injuryType;
    if (selectedPlayerId && finalInjuryType && severity) {
      addInjury.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enregistrer une blessure</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {!playerId && (
              <div className="space-y-2">
                <Label htmlFor="player">Joueur *</Label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un joueur" />
                  </SelectTrigger>
                  <SelectContent>
                    {players?.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="injuryType">Type de blessure *</Label>
              <Select value={injuryType} onValueChange={handleInjuryTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type de blessure" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {RUGBY_INJURY_TYPES.map((injury) => (
                    <SelectItem key={injury.name} value={injury.name}>
                      <div className="flex items-center gap-2">
                        <span>{injury.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {injury.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Autre (personnalisé)</SelectItem>
                </SelectContent>
              </Select>
              {injuryType === "other" && (
                <Input
                  value={customInjuryType}
                  onChange={(e) => setCustomInjuryType(e.target.value)}
                  placeholder="Décrire la blessure..."
                  className="mt-2"
                />
              )}
              {selectedInjury && (
                <p className="text-xs text-muted-foreground">
                  Durée typique: {selectedInjury.durationMin}-{selectedInjury.durationMax} jours
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="injuryDate">Date de blessure *</Label>
                <Input
                  id="injuryDate"
                  type="date"
                  value={injuryDate}
                  onChange={(e) => setInjuryDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Gravité *</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedReturnDate">Date de retour estimée</Label>
              <Input
                id="estimatedReturnDate"
                type="date"
                value={estimatedReturnDate}
                onChange={(e) => setEstimatedReturnDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Circonstances de la blessure, diagnostic..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="protocolNotes">Notes sur le protocole de réathlétisation</Label>
              <Textarea
                id="protocolNotes"
                value={protocolNotes}
                onChange={(e) => setProtocolNotes(e.target.value)}
                placeholder="Plan de retour, exercices recommandés..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={addInjury.isPending}>
              {addInjury.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
