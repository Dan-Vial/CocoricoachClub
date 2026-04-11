import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bookmark, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CycleColorPickerProps {
  categoryId: string;
  color: string;
  customColor: string;
  onCustomColorChange: (color: string) => void;
}

export function CycleColorPicker({ categoryId, color, customColor, onCustomColorChange }: CycleColorPickerProps) {
  const queryClient = useQueryClient();

  const { data: savedColors = [] } = useQuery({
    queryKey: ["saved_cycle_colors", categoryId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("periodization_saved_colors")
        .select("color")
        .eq("category_id", categoryId)
        .order("created_at");
      if (error) throw error;
      return (data as { color: string }[]).map(d => d.color);
    },
  });

  const saveColor = useMutation({
    mutationFn: async (colorToSave: string) => {
      const { error } = await (supabase as any)
        .from("periodization_saved_colors")
        .upsert(
          { category_id: categoryId, color: colorToSave },
          { onConflict: "category_id,color" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_cycle_colors", categoryId] });
      toast.success("Couleur enregistrée");
    },
  });

  const isAlreadySaved = savedColors.includes(color);

  return (
    <div>
      <Label>Couleur du cycle</Label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="color"
          value={color}
          onChange={(e) => onCustomColorChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-border"
        />
        <span className="text-xs text-muted-foreground">
          {customColor ? "Couleur personnalisée" : "Couleur de la ligne"}
        </span>
        {customColor && (
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => onCustomColorChange("")}>
            Réinitialiser
          </Button>
        )}
        {customColor && !isAlreadySaved && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs px-2 gap-1"
            onClick={() => saveColor.mutate(color)}
            disabled={saveColor.isPending}
          >
            <Bookmark className="h-3 w-3" />
            Enregistrer
          </Button>
        )}
      </div>

      {savedColors.length > 0 && (
        <div className="mt-2">
          <span className="text-xs text-muted-foreground">Couleurs enregistrées :</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {savedColors.map((sc) => (
              <button
                key={sc}
                className={cn(
                  "w-6 h-6 rounded-md border-2 transition-all hover:scale-110 flex items-center justify-center",
                  color === sc ? "border-foreground ring-1 ring-foreground" : "border-border"
                )}
                style={{ backgroundColor: sc }}
                onClick={() => onCustomColorChange(sc)}
                title={sc}
              >
                {color === sc && <Check className="h-3 w-3 text-white drop-shadow-md" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}