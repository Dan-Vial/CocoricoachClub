import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { AddBenchmarkDialog } from "./AddBenchmarkDialog";

interface PositionBenchmarksSectionProps {
  categoryId: string;
}

const POSITIONS = {
  pilier: "Pilier",
  talonneur: "Talonneur",
  deuxieme_ligne: "2ème Ligne",
  flanker: "Flanker",
  numero_8: "Numéro 8",
  demi_melee: "Demi de mêlée",
  demi_ouverture: "Demi d'ouverture",
  centre: "Centre",
  ailier: "Ailier",
  arriere: "Arrière",
};

export function PositionBenchmarksSection({ categoryId }: PositionBenchmarksSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: benchmarks, isLoading } = useQuery({
    queryKey: ["position-benchmarks", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("position_benchmarks")
        .select("*")
        .eq("category_id", categoryId)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("position_benchmarks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position-benchmarks", categoryId] });
      toast.success("Benchmark supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Benchmarks Pré-Saison par Poste
            </CardTitle>
            <CardDescription>Objectifs physiques par poste avec comparaison aux standards élite</CardDescription>
          </div>
          <Button onClick={() => { setEditingBenchmark(null); setIsDialogOpen(true); }} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {benchmarks?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Aucun benchmark défini. Définissez les objectifs physiques par poste.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Définir les benchmarks
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Poste</TableHead>
                  <TableHead className="text-center">40m Sprint</TableHead>
                  <TableHead className="text-center">Yo-Yo</TableHead>
                  <TableHead className="text-center">Squat (ratio)</TableHead>
                  <TableHead className="text-center">Bench (ratio)</TableHead>
                  <TableHead className="text-center">% MG Max</TableHead>
                  <TableHead className="text-center">CMJ (cm)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmarks?.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {POSITIONS[b.position as keyof typeof POSITIONS] || b.position}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1">
                        <span className="text-green-400 text-sm">
                          Élite: {b.sprint_40m_elite ? `${b.sprint_40m_elite}s` : "-"}
                        </span>
                        <span className="text-yellow-400 text-sm">
                          Bon: {b.sprint_40m_good ? `${b.sprint_40m_good}s` : "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1">
                        <span className="text-green-400 text-sm">É: {b.yo_yo_level_elite || "-"}</span>
                        <span className="text-yellow-400 text-sm">B: {b.yo_yo_level_good || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1">
                        <span className="text-green-400 text-sm">É: {b.squat_ratio_elite || "-"}x</span>
                        <span className="text-yellow-400 text-sm">B: {b.squat_ratio_good || "-"}x</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1">
                        <span className="text-green-400 text-sm">É: {b.bench_ratio_elite || "-"}x</span>
                        <span className="text-yellow-400 text-sm">B: {b.bench_ratio_good || "-"}x</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {b.body_fat_max ? `${b.body_fat_max}%` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1">
                        <span className="text-green-400 text-sm">É: {b.cmj_cm_elite || "-"}</span>
                        <span className="text-yellow-400 text-sm">B: {b.cmj_cm_good || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingBenchmark(b); setIsDialogOpen(true); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(b.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AddBenchmarkDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryId={categoryId}
        existingBenchmark={editingBenchmark}
        existingPositions={benchmarks?.map(b => b.position) || []}
      />
    </Card>
  );
}
