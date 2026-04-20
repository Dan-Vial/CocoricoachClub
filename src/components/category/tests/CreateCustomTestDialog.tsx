import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getTestCategoriesForSport } from "@/lib/constants/testCategories";

interface CreateCustomTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sportType?: string;
}

export function CreateCustomTestDialog({ open, onOpenChange, categoryId, sportType }: CreateCustomTestDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [testCategory, setTestCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [isTime, setIsTime] = useState(false);
  const [description, setDescription] = useState("");

  const testCategories = useMemo(() => {
    return getTestCategoriesForSport(sportType || "").filter(c => !c.value.startsWith("rehab_"));
  }, [sportType]);

  // Get club_id from category
  const { data: categoryData } = useQuery({
    queryKey: ["category-club-id", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("club_id")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const createTest = useMutation({
    mutationFn: async () => {
      if (!categoryData?.club_id) throw new Error("Club introuvable");
      
      const { data: user } = await supabase.auth.getUser();
      
      // Create the custom test
      const { data: customTest, error: testError } = await supabase
        .from("custom_tests")
        .insert({
          club_id: categoryData.club_id,
          name,
          test_category: testCategory,
          unit: unit || null,
          is_time: isTime,
          description: description || null,
          created_by: user?.user?.id || null,
        })
        .select("id")
        .single();
      
      if (testError) throw testError;

      // Link to this category
      const { error: linkError } = await supabase
        .from("custom_test_categories")
        .insert({
          custom_test_id: customTest.id,
          category_id: categoryId,
        });
      
      if (linkError) throw linkError;
    },
    onSuccess: () => {
      toast.success("Test personnalisé créé avec succès");
      queryClient.invalidateQueries({ queryKey: ["generic_tests_discovery", categoryId] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la création: " + error.message);
    },
  });

  const resetForm = () => {
    setName("");
    setTestCategory("");
    setUnit("");
    setIsTime(false);
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un test personnalisé</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau test dans une catégorie existante.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Catégorie</Label>
            <Select value={testCategory} onValueChange={setTestCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une catégorie..." />
              </SelectTrigger>
              <SelectContent>
                {testCategories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nom du test</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Test de détente verticale"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unité de mesure</Label>
              <Input
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="Ex: cm, kg, s"
              />
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <div className="flex items-center gap-2 h-10">
                <Switch checked={isTime} onCheckedChange={setIsTime} />
                <Label className="text-sm">Chronométré</Label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description (optionnel)</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description du test..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={() => createTest.mutate()}
            disabled={!name || !testCategory || createTest.isPending}
          >
            {createTest.isPending ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
