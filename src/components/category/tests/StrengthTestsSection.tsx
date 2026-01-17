import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddStrengthTestDialog } from "./AddStrengthTestDialog";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface StrengthTestsSectionProps {
  categoryId: string;
}

export function StrengthTestsSection({ categoryId }: StrengthTestsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { isViewer } = useViewerModeContext();

  const { data: tests, isLoading } = useQuery({
    queryKey: ["strength_tests", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strength_tests")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("test_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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

  const deleteTest = useMutation({
    mutationFn: async (testId: string) => {
      const { error } = await supabase.from("strength_tests").delete().eq("id", testId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strength_tests", categoryId] });
      toast.success("Test supprimé avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression du test");
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Enregistrez les performances de musculation en kg
        </p>
        {!isViewer && (
          <Button onClick={() => setIsDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un test
          </Button>
        )}
      </div>

      {tests && tests.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Aucun test de musculation enregistré</p>
          {!isViewer && (
            <Button onClick={() => setIsDialogOpen(true)} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter le premier test
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Joueur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Exercice</TableHead>
                <TableHead>Poids (kg)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests?.map((test) => (
                <TableRow key={test.id} className="animate-fade-in">
                  <TableCell className="font-medium">{test.players?.name}</TableCell>
                  <TableCell>{new Date(test.test_date).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>{test.test_name}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    {test.weight_kg} kg
                  </TableCell>
                  <TableCell className="text-right">
                    {!isViewer && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Êtes-vous sûr de vouloir supprimer ce test ?")) {
                            deleteTest.mutate(test.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {players && (
        <AddStrengthTestDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          categoryId={categoryId}
          players={players}
        />
      )}
    </div>
  );
}
