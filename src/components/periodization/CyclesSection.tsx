import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AddCycleDialog } from "./AddCycleDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
import { toast } from "sonner";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface CyclesSectionProps {
  categoryId: string;
}

export function CyclesSection({ categoryId }: CyclesSectionProps) {
  const { isViewer } = useViewerModeContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<any>(null);
  const [deletingCycleId, setDeletingCycleId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: cycles, isLoading } = useQuery({
    queryKey: ["training_cycles", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_cycles")
        .select(`
          *,
          training_periods(name)
        `)
        .eq("category_id", categoryId)
        .order("week_number", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("training_cycles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_cycles", categoryId] });
      toast.success("Cycle supprimé");
      setDeletingCycleId(null);
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const handleEdit = (cycle: any) => {
    setEditingCycle(cycle);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setEditingCycle(null);
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Cycles d'Entraînement</h3>
        {!isViewer && (
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un Cycle
          </Button>
        )}
      </div>

      {cycles && cycles.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Semaine</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Intensité Cible</TableHead>
              <TableHead>Notes</TableHead>
              {!isViewer && <TableHead className="w-20">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cycles.map((cycle) => (
              <TableRow key={cycle.id}>
                <TableCell className="font-medium">S{cycle.week_number}</TableCell>
                <TableCell>{cycle.name}</TableCell>
                <TableCell>
                  {cycle.training_periods ? cycle.training_periods.name : "—"}
                </TableCell>
                <TableCell>
                  {format(new Date(cycle.start_date), "dd MMM", { locale: fr })}
                </TableCell>
                <TableCell>
                  {format(new Date(cycle.end_date), "dd MMM", { locale: fr })}
                </TableCell>
                <TableCell>{cycle.target_intensity || "—"}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {cycle.notes || "—"}
                </TableCell>
                {!isViewer && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(cycle)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingCycleId(cycle.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          Aucun cycle défini. Créez votre premier cycle d'entraînement.
        </p>
      )}

      <AddCycleDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        categoryId={categoryId}
        editingCycle={editingCycle}
      />

      <AlertDialog open={!!deletingCycleId} onOpenChange={() => setDeletingCycleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce cycle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCycleId && deleteMutation.mutate(deletingCycleId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
