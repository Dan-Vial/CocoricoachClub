import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { categorySchema } from "@/lib/validations";
import { Pencil } from "lucide-react";

interface EditableCategoryNameProps {
  categoryId: string;
  initialName: string;
}

export function EditableCategoryName({ categoryId, initialName }: EditableCategoryNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();

  const updateName = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase
        .from("categories")
        .update({ name: newName })
        .eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category", categoryId] });
      toast.success("Nom de la catégorie mis à jour");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du nom");
      setName(initialName);
    },
  });

  const handleBlur = () => {
    setValidationError("");
    
    if (name.trim() === initialName) {
      setIsEditing(false);
      return;
    }

    const result = categorySchema.safeParse({ name: name.trim() });
    
    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      setName(initialName);
      setIsEditing(false);
      toast.error(result.error.errors[0].message);
      return;
    }

    updateName.mutate(result.data.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setName(initialName);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="text-4xl font-bold text-white bg-transparent border-white/30 focus:border-white"
        autoFocus
      />
    );
  }

  return (
    <div className="flex items-center gap-3 group">
      <h1 className="text-4xl font-bold text-white">
        {initialName}
      </h1>
      <button
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-md"
        aria-label="Modifier le nom"
      >
        <Pencil className="h-5 w-5 text-white" />
      </button>
    </div>
  );
}
