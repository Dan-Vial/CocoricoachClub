import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getTrainingTypesGrouped,
  hasGroupedTrainingTypes,
  getTrainingTypesForSport,
} from "@/lib/constants/trainingTypes";
import { Plus, Dumbbell, Trash2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CustomTrainingTypeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  sportType?: string;
  categoryId: string;
  required?: boolean;
  placeholder?: string;
  showExerciseIcon?: boolean;
}

export function CustomTrainingTypeSelect({
  value,
  onValueChange,
  sportType,
  categoryId,
  required = false,
  placeholder = "Sélectionner un type",
  showExerciseIcon = false,
}: CustomTrainingTypeSelectProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTypeName, setCustomTypeName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<{ id: string; name: string } | null>(null);

  // Fetch custom training types for this category
  const { data: customTypes = [] } = useQuery({
    queryKey: ["custom-training-types", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_training_types")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });

  // Add custom type mutation
  const addCustomType = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("custom_training_types")
        .insert({
          category_id: categoryId,
          name: name.trim(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["custom-training-types", categoryId] });
      toast.success("Thème personnalisé ajouté");
      setCustomTypeName("");
      setIsAddingCustom(false);
      onValueChange(data.name);
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Ce thème existe déjà");
      } else {
        toast.error("Erreur lors de l'ajout du thème");
      }
    },
  });

  // Delete custom type mutation
  const deleteCustomType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_training_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-training-types", categoryId] });
      toast.success("Thème personnalisé supprimé");
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const handleAddCustomType = () => {
    if (!customTypeName.trim()) return;
    addCustomType.mutate(customTypeName);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTypeToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const hasGroups = hasGroupedTrainingTypes(sportType);
  const groups = getTrainingTypesGrouped(sportType);
  const flatTypes = getTrainingTypesForSport(sportType);

  const renderSelectContent = () => {
    return (
      <SelectContent className="max-h-[400px] bg-popover z-50">
        {/* Custom types section */}
        {customTypes.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-accent/50 py-2 px-2 sticky -top-1 z-10 flex items-center gap-2">
              <Settings className="h-3 w-3" />
              Mes thèmes personnalisés
            </SelectLabel>
            {customTypes.map((ct) => (
              <SelectItem key={ct.id} value={ct.name} className="pl-6 group">
                {ct.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {/* Grouped types for sports with categories */}
        {hasGroups && groups.length > 0 ? (
          groups.map((group) => (
            <SelectGroup key={group.category.key}>
              <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted py-2 px-2 sticky -top-1 z-10">
                {group.category.label}
              </SelectLabel>
              {group.types.map((t) => (
                <SelectItem key={t.value} value={t.value} className="pl-6">
                  {showExerciseIcon && t.hasExercises ? (
                    <span className="flex items-center gap-2">
                      {t.label}
                      <Dumbbell className="h-3 w-3 text-muted-foreground" />
                    </span>
                  ) : (
                    t.label
                  )}
                </SelectItem>
              ))}
            </SelectGroup>
          ))
        ) : (
          // Flat list for sports without categories
          flatTypes.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {showExerciseIcon && t.hasExercises ? (
                <span className="flex items-center gap-2">
                  {t.label}
                  <Dumbbell className="h-3 w-3 text-muted-foreground" />
                </span>
              ) : (
                t.label
              )}
            </SelectItem>
          ))
        )}

        {/* Add custom option */}
        <div className="p-2 border-t" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {isAddingCustom ? (
            <div className="flex gap-2">
              <Input
                placeholder="Nom du thème..."
                value={customTypeName}
                onChange={(e) => {
                  e.stopPropagation();
                  setCustomTypeName(e.target.value);
                }}
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomType();
                  }
                  if (e.key === "Escape") {
                    setIsAddingCustom(false);
                    setCustomTypeName("");
                  }
                }}
                autoFocus
              />
              <Button
                size="sm"
                className="h-8"
                onClick={handleAddCustomType}
                disabled={!customTypeName.trim() || addCustomType.isPending}
              >
                Ajouter
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-primary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsAddingCustom(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer un thème personnalisé
            </Button>
          )}
        </div>
      </SelectContent>
    );
  };

  return (
    <>
      <Select value={value} onValueChange={onValueChange} required={required}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        {renderSelectContent()}
      </Select>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce thème ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le thème "{typeToDelete?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => typeToDelete && deleteCustomType.mutate(typeToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
