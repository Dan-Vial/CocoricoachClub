import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface EditableRugbyTypeProps {
  categoryId: string;
  currentType: string;
}

export function EditableRugbyType({ categoryId, currentType }: EditableRugbyTypeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rugbyType, setRugbyType] = useState(currentType);
  const queryClient = useQueryClient();

  const updateType = useMutation({
    mutationFn: async (newType: string) => {
      const { error } = await supabase
        .from("categories")
        .update({ rugby_type: newType })
        .eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category", categoryId] });
      toast.success("Type de rugby mis à jour");
      setIsOpen(false);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du type");
      setRugbyType(currentType);
    },
  });

  const handleSubmit = () => {
    if (rugbyType === currentType) {
      setIsOpen(false);
      return;
    }
    updateType.mutate(rugbyType);
  };

  return (
    <>
      <div className="flex items-center gap-2 group">
        <span className="text-primary-foreground/90">
          Rugby à {currentType}
        </span>
        <button
          onClick={() => {
            setRugbyType(currentType);
            setIsOpen(true);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary-foreground/10 rounded-md"
          aria-label="Modifier le type de rugby"
        >
          <Pencil className="h-4 w-4 text-primary-foreground" />
        </button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le type de rugby</DialogTitle>
            <DialogDescription>
              Changez le type de rugby pour cette catégorie. 
              {currentType === "XV" && " Passer au rugby à 7 activera l'onglet Tournois."}
              {currentType === "7" && " Passer au rugby à XV désactivera l'onglet Tournois."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <RadioGroup value={rugbyType} onValueChange={setRugbyType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="XV" id="type-xv" />
                <Label htmlFor="type-xv" className="cursor-pointer">
                  Rugby à XV
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="7" id="type-7" />
                <Label htmlFor="type-7" className="cursor-pointer">
                  Rugby à 7
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={updateType.isPending}>
              {updateType.isPending ? "Mise à jour..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
