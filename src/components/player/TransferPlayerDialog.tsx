import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface TransferPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  playerName: string;
  currentCategoryId: string;
  currentCategoryName: string;
  clubId: string;
}

export function TransferPlayerDialog({
  open,
  onOpenChange,
  playerId,
  playerName,
  currentCategoryId,
  currentCategoryName,
  clubId,
}: TransferPlayerDialogProps) {
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all categories from the same club (excluding current)
  const { data: availableCategories } = useQuery({
    queryKey: ["categories-for-transfer", clubId, currentCategoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("club_id", clubId)
        .neq("id", currentCategoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const transferPlayer = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("transfer_player_with_history", {
        _player_id: playerId,
        _from_category_id: currentCategoryId,
        _to_category_id: targetCategoryId,
        _reason: reason || null,
        _notes: notes || null,
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || "Erreur lors du transfert");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", playerId] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["player-transfers", playerId] });
      toast.success(`${playerName} a été transféré avec tout son historique`);
      onOpenChange(false);
      setTargetCategoryId("");
      setReason("");
      setNotes("");
    },
    onError: (error) => {
      console.error("Transfer error:", error);
      toast.error(error.message || "Erreur lors du transfert du joueur");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCategoryId) {
      toast.error("Veuillez sélectionner une catégorie de destination");
      return;
    }
    transferPlayer.mutate();
  };

  const selectedCategory = availableCategories?.find(c => c.id === targetCategoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Transférer {playerName}
          </DialogTitle>
          <DialogDescription>
            Transférer ce joueur vers une autre catégorie du même club.
            Tout l'historique sera migré automatiquement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-center gap-4 py-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Depuis</p>
              <p className="font-medium">{currentCategoryName}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Vers</p>
              <p className="font-medium">
                {selectedCategory?.name || "Sélectionner..."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetCategory">Catégorie de destination *</Label>
            <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!availableCategories || availableCategories.length === 0) && (
              <p className="text-sm text-muted-foreground">
                Aucune autre catégorie disponible dans ce club
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Raison du transfert</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une raison" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="age_promotion">Montée de catégorie d'âge</SelectItem>
                <SelectItem value="level_promotion">Promotion niveau supérieur</SelectItem>
                <SelectItem value="national_selection">Sélection nationale</SelectItem>
                <SelectItem value="level_adjustment">Ajustement de niveau</SelectItem>
                <SelectItem value="end_of_season">Fin de saison</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations complémentaires sur le transfert..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-700 dark:text-green-400">
                <p className="font-medium">Transfert complet avec historique</p>
                <p className="mt-1">Tout l'historique du joueur (tests, blessures, wellness, composition corporelle, stats, etc.) sera automatiquement migré vers la nouvelle catégorie.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                L'espace athlète sera automatiquement lié à la nouvelle catégorie. 
                Les séances et matchs passés resteront accessibles.
              </p>
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
            <Button
              type="submit"
              disabled={!targetCategoryId || transferPlayer.isPending}
            >
              {transferPlayer.isPending ? "Transfert en cours..." : "Transférer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
