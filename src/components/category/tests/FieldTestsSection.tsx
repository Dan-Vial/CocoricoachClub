import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Timer, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { AddFieldTestDialog } from "./AddFieldTestDialog";
import { getFieldTestLabel, getFieldTestsForSport, YO_YO_LEVELS } from "@/lib/constants/fieldTests";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface FieldTestsSectionProps {
  categoryId: string;
  sportType?: string;
}

export function FieldTestsSection({ categoryId, sportType = "XV" }: FieldTestsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { isViewer } = useViewerModeContext();

  const sportConfig = getFieldTestsForSport(sportType);

  const { data: tests, isLoading } = useQuery({
    queryKey: ["rugby-specific-tests", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rugby_specific_tests")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("test_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rugby_specific_tests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rugby-specific-tests", categoryId] });
      toast.success("Test supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const getYoYoLevel = (level: string | null, distance: number | null) => {
    if (!level && !distance) return "-";
    return `${level || "-"} (${distance ? `${distance}m` : "-"})`;
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return mins > 0 ? `${mins}:${secs.padStart(5, '0')}` : `${secs}s`;
  };

  const formatResult = (test: any) => {
    // Yo-Yo tests
    if (test.test_type.includes("yo_yo")) {
      return getYoYoLevel(test.yo_yo_level, test.yo_yo_distance_m);
    }
    // Bronco or other time tests
    if (test.bronco_time_seconds) {
      return formatTime(test.bronco_time_seconds);
    }
    // Agility tests
    if (test.agility_time_seconds) {
      return formatTime(test.agility_time_seconds);
    }
    // Generic result (for new test types stored in notes or other fields)
    return test.notes || "-";
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
              <Timer className="h-5 w-5 text-primary" />
              Tests Terrains - {sportConfig.sportLabel}
            </CardTitle>
            <CardDescription>
              {sportConfig.tests.map(t => t.label).slice(0, 3).join(", ")}
              {sportConfig.tests.length > 3 && "..."}
            </CardDescription>
          </div>
          {!isViewer && (
            <Button onClick={() => setIsDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {tests?.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun test terrain enregistré
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type de Test</TableHead>
                  <TableHead className="text-right">Résultat</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests?.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.players?.name}</TableCell>
                    <TableCell>{format(new Date(test.test_date), "dd MMM yyyy", { locale: fr })}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getFieldTestLabel(test.test_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatResult(test)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {test.notes || "-"}
                    </TableCell>
                    <TableCell>
                      {!isViewer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(test.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AddFieldTestDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryId={categoryId}
        sportType={sportType}
      />
    </Card>
  );
}
