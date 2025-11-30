import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddJumpTestDialog } from "./AddJumpTestDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface JumpTestsSectionProps {
  categoryId: string;
}

const TEST_TYPE_LABELS: Record<string, string> = {
  vertical_jump: "Saut Vertical (CMJ)",
  horizontal_jump: "Saut Horizontal",
};

export function JumpTestsSection({ categoryId }: JumpTestsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tests, isLoading } = useQuery({
    queryKey: ["jump_tests", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jump_tests")
        .select(`*, players(name)`)
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jump_tests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jump_tests", categoryId] });
      toast.success("Test supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  if (isLoading) return <p>Chargement...</p>;

  return (
    <Card className="bg-gradient-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Tests de Détente</CardTitle>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        {!tests || tests.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun test de détente enregistré</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Joueur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Résultat (cm)</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test: any) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">{test.players?.name}</TableCell>
                  <TableCell>{format(new Date(test.test_date), "dd/MM/yyyy", { locale: fr })}</TableCell>
                  <TableCell>{TEST_TYPE_LABELS[test.test_type] || test.test_type}</TableCell>
                  <TableCell className="font-semibold">{test.result_cm} cm</TableCell>
                  <TableCell className="max-w-[150px] truncate">{test.notes || "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(test.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <AddJumpTestDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryId={categoryId}
        players={players || []}
      />
    </Card>
  );
}
