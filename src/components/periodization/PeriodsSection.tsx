import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AddPeriodDialog } from "./AddPeriodDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

interface PeriodsSectionProps {
  categoryId: string;
}

export function PeriodsSection({ categoryId }: PeriodsSectionProps) {
  const { isViewer } = useViewerModeContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<any>(null);
  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: periods, isLoading } = useQuery({
    queryKey: ["training_periods", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_periods")
        .select("*")
        .eq("category_id", categoryId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("training_periods")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_periods", categoryId] });
      toast.success("Période supprimée");
      setDeletingPeriodId(null);
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const getPeriodTypeBadge = (type: string) => {
    const config = {
      préparation: { label: "Préparation", variant: "default" as const },
      compétition: { label: "Compétition", variant: "destructive" as const },
      récupération: { label: "Récupération", variant: "secondary" as const },
      trêve: { label: "Trêve", variant: "outline" as const },
    };
    const { label, variant } = config[type as keyof typeof config] || { label: type, variant: "default" as const };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const handleEdit = (period: any) => {
    setEditingPeriod(period);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setEditingPeriod(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Périodes d'Entraînement</h3>
        {!isViewer && (
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une Période
          </Button>
        )}
      </div>

      {periods && periods.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Charge Cible (%)</TableHead>
              <TableHead>Description</TableHead>
              {!isViewer && <TableHead className="w-20">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((period) => (
              <TableRow key={period.id}>
                <TableCell className="font-medium">{period.name}</TableCell>
                <TableCell>{getPeriodTypeBadge(period.period_type)}</TableCell>
                <TableCell>
                  {format(new Date(period.start_date), "dd MMM yyyy", { locale: fr })}
                </TableCell>
                <TableCell>
                  {format(new Date(period.end_date), "dd MMM yyyy", { locale: fr })}
                </TableCell>
                <TableCell>{period.target_load_percentage || "—"}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {period.description || "—"}
                </TableCell>
                {!isViewer && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(period)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingPeriodId(period.id)}
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
          Aucune période définie. Créez votre première période d'entraînement.
        </p>
      )}

      <AddPeriodDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        categoryId={categoryId}
        editingPeriod={editingPeriod}
      />

      <AlertDialog open={!!deletingPeriodId} onOpenChange={() => setDeletingPeriodId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette période ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les cycles associés ne seront pas supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPeriodId && deleteMutation.mutate(deletingPeriodId)}
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
