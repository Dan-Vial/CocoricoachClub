import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

interface AddCycleCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

export function AddCycleCategoryDialog({ open, onOpenChange, categoryId }: AddCycleCategoryDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const queryClient = useQueryClient();

  const { data: existingCategories = [] } = useQuery({
    queryKey: ["periodization_categories", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("periodization_categories")
        .select("*")
        .eq("category_id", categoryId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      // Check if name already exists for this category
      const duplicate = existingCategories.find(
        c => c.name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      if (duplicate) {
        throw new Error("duplicate");
      }
      const { error } = await supabase.from("periodization_categories").insert({
        category_id: categoryId,
        name: name.trim(),
        color,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodization_categories", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["periodization_cycles", categoryId] });
      toast.success("Ligne de périodisation créée");
      setName("");
      setColor(PRESET_COLORS[0]);
    },
    onError: (err: Error) => {
      if (err.message === "duplicate") {
        toast.error("Cette ligne existe déjà");
      } else {
        toast.error("Erreur lors de la création");
      }
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("periodization_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodization_categories", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["periodization_cycles", categoryId] });
      toast.success("Ligne supprimée (et ses cycles associés)");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gérer les lignes de périodisation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {existingCategories.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Lignes existantes</Label>
              {existingCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Supprimer la ligne "${cat.name}" et tous ses cycles ?`)) {
                        deleteCategory.mutate(cat.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4">
            <Label>Nouvelle ligne</Label>
            <Input
              className="mt-1"
              placeholder="Ex: Sport, Préparation Physique, Mental..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Couleur</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <Button
            className="w-full gap-2"
            disabled={!name.trim() || createCategory.isPending}
            onClick={() => createCategory.mutate()}
          >
            <Plus className="h-4 w-4" />
            Ajouter la ligne
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
