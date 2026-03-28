import { useState, useMemo } from "react";
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
import { Plus, Trash2, Filter, ClipboardList, CalendarPlus } from "lucide-react";
import { CreateCustomTestDialog } from "./CreateCustomTestDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { UnifiedTestDialog } from "./UnifiedTestDialog";
import { ScheduleTestDialog } from "./ScheduleTestDialog";
import { TEST_CATEGORIES, getTestLabel, getTestCategoriesForSport, TestCategory } from "@/lib/constants/testCategories";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface GenericTestsSectionProps {
  categoryId: string;
  sportType?: string;
  defaultCategory?: string;
}

export function GenericTestsSection({ categoryId, sportType, defaultCategory }: GenericTestsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isCreateTestDialogOpen, setIsCreateTestDialogOpen] = useState(false);
  const isRehabMode = defaultCategory === "rehab";
  const isSingleCategoryMode = !!defaultCategory && defaultCategory !== "rehab" && defaultCategory !== "all";
  const [filterCategory, setFilterCategory] = useState<string>(
    isRehabMode ? "all" : (defaultCategory || "all")
  );
  const [filterTestType, setFilterTestType] = useState<string>("all");
  const queryClient = useQueryClient();
  const { isViewer } = useViewerModeContext();

  // Get filtered test categories based on sport type and mode
  const allSportCategories = getTestCategoriesForSport(sportType || "");

  // Fetch all tests to discover unique categories and types from DB
  const { data: allTestsForDiscovery } = useQuery({
    queryKey: ["generic_tests_discovery", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generic_tests")
        .select("test_category, test_type, result_unit")
        .eq("category_id", categoryId);
      if (error) throw error;
      return data;
    },
  });

  // Build categories depending on mode
  const filteredTestCategories = useMemo(() => {
    // Separate rehab and non-rehab categories
    const rehabCats = allSportCategories.filter(c => c.value.startsWith("rehab_"));
    const nonRehabCats = allSportCategories.filter(c => !c.value.startsWith("rehab_"));

    let categories: TestCategory[];
    
    if (isRehabMode) {
      // In rehab mode: show each rehab subcategory as a selectable category
      categories = [...rehabCats];
    } else {
      // In normal mode: show non-rehab categories only
      categories = [...nonRehabCats];
    }

    // Dynamically add categories discovered from DB
    const existingCategoryValues = new Set(categories.map(c => c.value));
    const existingTestsByCategory = new Map<string, Set<string>>();

    categories.forEach(cat => {
      existingTestsByCategory.set(cat.value, new Set(cat.tests.map(t => t.value)));
    });

    if (allTestsForDiscovery?.length) {
      allTestsForDiscovery.forEach(test => {
        const catValue = test.test_category;
        const testType = test.test_type;
        if (!catValue || !testType) return;

        // Only add if it matches current mode
        const isRehabCat = catValue.startsWith("rehab_");
        if (isRehabMode !== isRehabCat) return;

        if (!existingCategoryValues.has(catValue)) {
          const newCategory: TestCategory = {
            value: catValue,
            label: formatCategoryLabel(catValue),
            tests: [{ value: testType, label: formatTestTypeLabel(testType), unit: test.result_unit || "" }]
          };
          categories.push(newCategory);
          existingCategoryValues.add(catValue);
          existingTestsByCategory.set(catValue, new Set([testType]));
        } else {
          const existingTests = existingTestsByCategory.get(catValue);
          if (existingTests && !existingTests.has(testType)) {
            const category = categories.find(c => c.value === catValue);
            if (category) {
              category.tests.push({ value: testType, label: formatTestTypeLabel(testType), unit: test.result_unit || "" });
              existingTests.add(testType);
            }
          }
        }
      });
    }

    return categories;
  }, [allSportCategories, allTestsForDiscovery, isRehabMode]);

  const { data: tests, isLoading } = useQuery({
    queryKey: ["generic_tests", categoryId, filterCategory, filterTestType, isRehabMode],
    queryFn: async () => {
      let query = supabase
        .from("generic_tests")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("test_date", { ascending: false });

      if (isRehabMode) {
        query = query.ilike("test_category", "rehab_%");
      } else {
        query = query.or("test_category.not.ilike.rehab_%,test_category.is.null");
      }

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
      queryClient.invalidateQueries({ queryKey: ["generic_tests_discovery", categoryId] });
      toast.success("Test supprimé avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression du test");
    },
  });

  const selectedCategory = filteredTestCategories.find(c => c.value === filterCategory);

  const handleCategoryFilterChange = (value: string) => {
    setFilterCategory(value);
    setFilterTestType("all");
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <Card className="bg-gradient-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          {isRehabMode 
            ? "Tests de Réathlétisation" 
            : isSingleCategoryMode 
              ? (filteredTestCategories.find(c => c.value === defaultCategory)?.label || formatCategoryLabel(defaultCategory || ""))
              : "Tous les Tests de Performance"
          }
        </CardTitle>
        {!isViewer && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
              <ClipboardList className="h-4 w-4 mr-1" /> Saisir des résultats
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsCreateTestDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Créer un test
            </Button>
            {filterTestType !== "all" && selectedCategory && (
              <Button size="sm" variant="outline" onClick={() => setIsScheduleDialogOpen(true)}>
                <CalendarPlus className="h-4 w-4 mr-1" /> Planifier
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtrer:</span>
          </div>

          {/* Category dropdown - hidden in single category mode */}
          {!isSingleCategoryMode && (
            <Select value={filterCategory} onValueChange={handleCategoryFilterChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Toutes catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {filteredTestCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Test type dropdown - always visible when a category is selected */}
          {filterCategory !== "all" && selectedCategory && (
            <Select value={filterTestType} onValueChange={setFilterTestType}>
              <SelectTrigger className="w-[250px]">
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
                <ClipboardList className="h-4 w-4" />
                Saisir le premier test
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
                        {filteredTestCategories.find(c => c.value === test.test_category)?.label || formatCategoryLabel(test.test_category)}
                      </span>
                      {filteredTestCategories
                        .find(c => c.value === test.test_category)
                        ?.tests.find(t => t.value === test.test_type)?.label || formatTestTypeLabel(test.test_type)}
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
        sportType={sportType}
        defaultFilterCategory={filterCategory !== "all" ? filterCategory : undefined}
        defaultFilterTestType={filterTestType !== "all" ? filterTestType : undefined}
        allowCustomTest={!defaultCategory || defaultCategory === "all"}
      />

      {filterTestType !== "all" && selectedCategory && (() => {
        const cat = filteredTestCategories.find(c => c.value === filterCategory);
        const test = cat?.tests.find(t => t.value === filterTestType);
        if (!cat || !test) return null;
        return (
          <ScheduleTestDialog
            open={isScheduleDialogOpen}
            onOpenChange={setIsScheduleDialogOpen}
            categoryId={categoryId}
            testCategoryLabel={cat.label}
            testTypeLabel={test.label}
            testCategory={cat.value}
            testType={test.value}
            testUnit={test.unit || ""}
          />
        );
      })()}

      <CreateCustomTestDialog
        open={isCreateTestDialogOpen}
        onOpenChange={setIsCreateTestDialogOpen}
        categoryId={categoryId}
        sportType={sportType}
      />
    </Card>
  );
}

// Helper functions to format labels
function formatCategoryLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatTestTypeLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}