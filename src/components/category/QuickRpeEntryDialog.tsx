import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface QuickRpeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sessionId: string;
  sessionDate: string;
}

export function QuickRpeEntryDialog({
  open,
  onOpenChange,
  categoryId,
  sessionId,
  sessionDate,
}: QuickRpeEntryDialogProps) {
  const queryClient = useQueryClient();
  const [rpeValues, setRpeValues] = useState<Record<string, { rpe: string; duration: string }>>({});

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
  });

  const { data: existingRpe } = useQuery({
    queryKey: ["awcr_tracking", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("*")
        .eq("training_session_id", sessionId);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const saveRpe = useMutation({
    mutationFn: async () => {
      const entries = players
        ?.filter((p) => rpeValues[p.id]?.rpe && rpeValues[p.id]?.duration)
        .map((p) => ({
          player_id: p.id,
          category_id: categoryId,
          training_session_id: sessionId,
          session_date: sessionDate,
          rpe: parseInt(rpeValues[p.id].rpe),
          duration_minutes: parseInt(rpeValues[p.id].duration),
        }));

      if (!entries || entries.length === 0) {
        throw new Error("Aucun RPE à enregistrer");
      }

      const { error } = await supabase.from("awcr_tracking").insert(entries);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["awcr_tracking"] });
      toast.success("RPE enregistrés avec succès");
      setRpeValues({});
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  const handleChange = (playerId: string, field: "rpe" | "duration", value: string) => {
    setRpeValues((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Saisie RPE - {format(new Date(sessionDate), "PPP", { locale: fr })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground mb-4">
            RPE: Rate of Perceived Exertion (0-10). Durée en minutes.
          </div>
          {players?.map((player) => {
            const existing = existingRpe?.find((r) => r.player_id === player.id);
            return (
              <div key={player.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Label className="w-48 font-medium">{player.name}</Label>
                {existing ? (
                  <span className="text-sm text-muted-foreground">
                    Déjà saisi: RPE {existing.rpe} - {existing.duration_minutes}min
                  </span>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">RPE</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        placeholder="0-10"
                        className="w-20"
                        value={rpeValues[player.id]?.rpe || ""}
                        onChange={(e) => handleChange(player.id, "rpe", e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Durée</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Minutes"
                        className="w-24"
                        value={rpeValues[player.id]?.duration || ""}
                        onChange={(e) => handleChange(player.id, "duration", e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => saveRpe.mutate()} disabled={saveRpe.isPending}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
