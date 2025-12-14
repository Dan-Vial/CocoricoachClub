import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Scale, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { AddBodyCompositionDialog } from "./AddBodyCompositionDialog";

interface BodyCompositionSectionProps {
  categoryId: string;
}

export function BodyCompositionSection({ categoryId }: BodyCompositionSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: compositions, isLoading } = useQuery({
    queryKey: ["body-composition", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_composition")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("measurement_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("body_composition").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["body-composition", categoryId] });
      toast.success("Mesure supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const getBmiCategory = (bmi: number | null) => {
    if (!bmi) return null;
    if (bmi < 18.5) return <Badge variant="outline" className="bg-blue-500/20 text-blue-400">Insuffisance</Badge>;
    if (bmi < 25) return <Badge variant="outline" className="bg-green-500/20 text-green-400">Normal</Badge>;
    if (bmi < 30) return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400">Surpoids</Badge>;
    return <Badge variant="outline" className="bg-red-500/20 text-red-400">Obésité</Badge>;
  };

  const getBodyFatCategory = (bf: number | null) => {
    if (!bf) return null;
    if (bf < 10) return <Badge variant="outline" className="bg-blue-500/20 text-blue-400">Athlète élite</Badge>;
    if (bf < 14) return <Badge variant="outline" className="bg-green-500/20 text-green-400">Athlète</Badge>;
    if (bf < 18) return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400">Fitness</Badge>;
    return <Badge variant="outline" className="bg-orange-500/20 text-orange-400">Standard</Badge>;
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Composition Corporelle
            </CardTitle>
            <CardDescription>Suivi du % masse grasse, masse musculaire et IMC</CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {compositions?.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucune mesure de composition corporelle enregistrée
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Poids (kg)</TableHead>
                  <TableHead className="text-right">Taille (cm)</TableHead>
                  <TableHead className="text-right">% Masse Grasse</TableHead>
                  <TableHead className="text-right">Masse Musc. (kg)</TableHead>
                  <TableHead className="text-right">IMC</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compositions?.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.players?.name}</TableCell>
                    <TableCell>{format(new Date(comp.measurement_date), "dd MMM yyyy", { locale: fr })}</TableCell>
                    <TableCell className="text-right">{comp.weight_kg?.toFixed(1) || "-"}</TableCell>
                    <TableCell className="text-right">{comp.height_cm?.toFixed(0) || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {comp.body_fat_percentage?.toFixed(1) || "-"}%
                        {getBodyFatCategory(comp.body_fat_percentage)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{comp.muscle_mass_kg?.toFixed(1) || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {comp.bmi?.toFixed(1) || "-"}
                        {getBmiCategory(comp.bmi)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(comp.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AddBodyCompositionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryId={categoryId}
      />
    </Card>
  );
}
