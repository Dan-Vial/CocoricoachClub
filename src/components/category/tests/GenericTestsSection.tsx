import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { UnifiedTestDialog } from "./UnifiedTestDialog";
import { TEST_CATEGORIES, getTestLabel } from "@/lib/constants/testCategories";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface GenericTestsSectionProps {
  categoryId: string;
}

export function GenericTestsSection({ categoryId }: GenericTestsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTestType, setFilterTestType] = useState<string>("all");
  const queryClient = useQueryClient();
  const { isViewer } = useViewerModeContext();

  const { data: tests, isLoading } = useQuery({
    queryKey: ["generic_tests", categoryId, filterCategory, filterTestType],
    queryFn: async () => {
      let query = supabase
        .from("generic_tests")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("test_date", { ascending: false });

      if (filterCategory !== "all") {
        query = query.eq("test_category", filterCategory);
      }
      if (filterTestType !== "all") {
        query = query.eq("test_type", filterTestType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteTest = useMutation({
    mutationFn: async (testId: string) => {
      const { error } = await supabase.from("generic_tests").delete().eq("id", testId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generic_tests", categoryId] });
      toast.success("Test supprimé avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression du test");
    },
  });

  const selectedCategory = TEST_CATEGORIES.find(c => c.value === filterCategory);

  const handleCategoryFilterChange = (value: string) => {
    setFilterCategory(value);
    setFilterTestType("all");
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <Card className="bg-gradient-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Tous les Tests de Performance</CardTitle>
        {!isViewer && (
          <Button size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter un test
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtrer:</span>
          </div>
          <Select value={filterCategory} onValueChange={handleCategoryFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Toutes catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {TEST_CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filterCategory !== "all" && selectedCategory && (
            <Select value={filterTestType} onValueChange={setFilterTestType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tous les tests" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les tests</SelectItem>
                <SelectGroup>
                  <SelectLabel>{selectedCategory.label}</SelectLabel>
                  {selectedCategory.tests.map((test) => (
                    <SelectItem key={test.value} value={test.value}>
                      {test.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>

        {!tests || tests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Aucun test enregistré</p>
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
                  <TableHead>Test</TableHead>
                  <TableHead>Résultat</TableHead>
                  <TableHead>Notes</TableHead>
                  {!isViewer && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test: any) => (
                  <TableRow key={test.id} className="animate-fade-in">
                    <TableCell className="font-medium">{test.players?.name}</TableCell>
                    <TableCell>
                      {format(new Date(test.test_date), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground block">
                        {TEST_CATEGORIES.find(c => c.value === test.test_category)?.label}
                      </span>
                      {TEST_CATEGORIES
                        .find(c => c.value === test.test_category)
                        ?.tests.find(t => t.value === test.test_type)?.label || test.test_type}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {test.result_value} {test.result_unit}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground text-sm">
                      {test.notes || "-"}
                    </TableCell>
                    {!isViewer && (
                      <TableCell className="text-right">
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
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <UnifiedTestDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryId={categoryId}
      />
    </Card>
  );
}