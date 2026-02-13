import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Trash2, ClipboardCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getTestCategoriesForSport, TestCategory } from "@/lib/constants/testCategories";

interface QuickTestEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sessionDate: string;
  sessionId?: string;
}

interface TestEntry {
  id: string;
  test_category: string;
  test_type: string;
  result_unit: string;
  player_results: Record<string, string>;
}

export function QuickTestEntryDialog({
  open,
  onOpenChange,
  categoryId,
  sessionDate,
  sessionId,
}: QuickTestEntryDialogProps) {
  const queryClient = useQueryClient();
  const [testEntries, setTestEntries] = useState<TestEntry[]>([]);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  // Fetch category sport type
  const { data: category } = useQuery({
    queryKey: ["category-for-test-entry", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const sportType = category?.rugby_type || "";
  const testCategories = useMemo(() => getTestCategoriesForSport(sportType), [sportType]);

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, avatar_url")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch existing test results for this date
  const { data: existingResults } = useQuery({
    queryKey: ["existing_generic_tests", categoryId, sessionDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generic_tests")
        .select("*")
        .eq("category_id", categoryId)
        .eq("test_date", sessionDate);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Pre-load tests from session if available (query by Session ID in notes)
  const { data: sessionTestsData } = useQuery({
    queryKey: ["session-tests-preload", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from("generic_tests")
        .select("test_category, test_type, result_unit")
        .ilike("notes", `%Session ID: ${sessionId}%`)
        .limit(20);
      if (error) throw error;
      // Get unique test types
      const uniqueTests = new Map<string, { test_category: string; test_type: string; result_unit: string | null }>();
      data?.forEach(t => {
        const key = `${t.test_category}_${t.test_type}`;
        if (!uniqueTests.has(key)) {
          uniqueTests.set(key, t);
        }
      });
      return Array.from(uniqueTests.values());
    },
    enabled: open && !!sessionId,
  });

  // Pre-populate tests from session data
  useEffect(() => {
    if (sessionTestsData && sessionTestsData.length > 0 && testEntries.length === 0) {
      const entries: TestEntry[] = sessionTestsData.map(t => ({
        id: crypto.randomUUID(),
        test_category: t.test_category,
        test_type: t.test_type,
        result_unit: t.result_unit || "",
        player_results: {},
      }));
      setTestEntries(entries);
      if (entries.length > 0) {
        setExpandedTestId(entries[0].id);
      }
    }
  }, [sessionTestsData]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTestEntries([]);
      setExpandedTestId(null);
    }
  }, [open]);

  const addTest = () => {
    const newTest: TestEntry = {
      id: crypto.randomUUID(),
      test_category: "",
      test_type: "",
      result_unit: "",
      player_results: {},
    };
    setTestEntries(prev => [...prev, newTest]);
    setExpandedTestId(newTest.id);
  };

  const removeTest = (id: string) => {
    setTestEntries(prev => prev.filter(t => t.id !== id));
    if (expandedTestId === id) setExpandedTestId(null);
  };

  const handleCategoryChange = (testId: string, categoryValue: string) => {
    setTestEntries(prev => prev.map(t => t.id === testId ? {
      ...t,
      test_category: categoryValue,
      test_type: "",
      result_unit: "",
      player_results: {},
    } : t));
  };

  const handleTestTypeChange = (testId: string, testTypeValue: string) => {
    const test = testEntries.find(t => t.id === testId);
    if (!test) return;
    const cat = testCategories.find(c => c.value === test.test_category);
    const testOption = cat?.tests.find(t => t.value === testTypeValue);
    setTestEntries(prev => prev.map(t => t.id === testId ? {
      ...t,
      test_type: testTypeValue,
      result_unit: testOption?.unit || "",
      player_results: {},
    } : t));
  };

  const updatePlayerResult = (testId: string, playerId: string, value: string) => {
    setTestEntries(prev => prev.map(t => {
      if (t.id !== testId) return t;
      return { ...t, player_results: { ...t.player_results, [playerId]: value } };
    }));
  };

  const getTestLabel = (test: TestEntry): string => {
    const cat = testCategories.find(c => c.value === test.test_category);
    const testOption = cat?.tests.find(t => t.value === test.test_type);
    if (!cat || !testOption) return "Test non configuré";
    return `${cat.label} - ${testOption.label}`;
  };

  const getFilledCount = (test: TestEntry): number => {
    return Object.values(test.player_results).filter(v => v && v.trim() !== "").length;
  };

  // Check if a player already has a result for this test
  const getExistingResult = (testType: string, playerId: string) => {
    return existingResults?.find(r => r.test_type === testType && r.player_id === playerId);
  };

  const saveTests = useMutation({
    mutationFn: async () => {
      const testRecords: any[] = [];

      testEntries.forEach(test => {
        if (!test.test_type) return;
        Object.entries(test.player_results).forEach(([playerId, value]) => {
          if (!value || value.trim() === "") return;
          // Skip if already exists
          if (getExistingResult(test.test_type, playerId)) return;
          testRecords.push({
            player_id: playerId,
            category_id: categoryId,
            test_date: sessionDate,
            test_category: test.test_category,
            test_type: test.test_type,
            result_value: parseFloat(value),
            result_unit: test.result_unit || null,
            notes: sessionId ? `Séance du ${sessionDate} (Session ID: ${sessionId})` : `Séance du ${sessionDate}`,
          });
        });
      });

      if (testRecords.length === 0) {
        throw new Error("Aucun résultat à enregistrer");
      }

      const { error } = await supabase.from("generic_tests").insert(testRecords);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generic_tests"] });
      queryClient.invalidateQueries({ queryKey: ["existing_generic_tests", categoryId, sessionDate] });
      toast.success("Résultats de tests enregistrés");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  const hasResults = testEntries.some(t =>
    t.test_type && Object.values(t.player_results).some(v => v && v.trim() !== "")
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-amber-500" />
            Saisie des tests - {format(new Date(sessionDate), "PPP", { locale: fr })}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4">
            {/* Add test button */}
            <Button
              type="button"
              onClick={addTest}
              variant="outline"
              className="w-full border-2 border-dashed border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un test
            </Button>

            {testEntries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Sélectionnez les tests que vous souhaitez saisir</p>
                <p className="text-xs mt-1">Choisissez parmi toutes les catégories de tests disponibles</p>
              </div>
            )}

            {/* Test entries */}
            {testEntries.map((test, idx) => {
              const currentCategory = testCategories.find(c => c.value === test.test_category);
              const isExpanded = expandedTestId === test.id;
              const filledCount = getFilledCount(test);

              return (
                <div
                  key={test.id}
                  className={cn(
                    "border-2 rounded-xl transition-all",
                    isExpanded
                      ? "border-amber-500 bg-amber-500/5"
                      : "border-amber-500/30 bg-background hover:border-amber-500/50"
                  )}
                >
                  {/* Header */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      {test.test_type ? (
                        <span className="font-medium truncate">{getTestLabel(test)}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Cliquez pour configurer...</span>
                      )}
                      {test.test_type && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {test.result_unit || "valeur"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {filledCount}/{players?.length || 0} résultats
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTest(test.id);
                      }}
                      className="h-8 w-8 text-destructive shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 space-y-4">
                      {/* Test selection */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Catégorie de test</Label>
                          <Select
                            value={test.test_category}
                            onValueChange={(v) => handleCategoryChange(test.id, v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent className="z-[9999] max-h-60">
                              {testCategories.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Type de test</Label>
                          <Select
                            value={test.test_type}
                            onValueChange={(v) => handleTestTypeChange(test.id, v)}
                            disabled={!test.test_category}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent className="z-[9999] max-h-60">
                              {currentCategory?.tests.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label} {t.unit && `(${t.unit})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Player results */}
                      {test.test_type && players && players.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs">
                            Résultats des athlètes ({test.result_unit || "valeur"})
                          </Label>
                          <ScrollArea className="max-h-48">
                            <div className="grid grid-cols-2 gap-2 pr-2">
                              {players.map((player) => {
                                const existing = getExistingResult(test.test_type, player.id);
                                return (
                                  <div
                                    key={player.id}
                                    className={cn(
                                      "flex items-center gap-2 p-2 rounded-lg border",
                                      existing
                                        ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10"
                                        : test.player_results[player.id]
                                          ? "border-amber-300 bg-amber-50/50 dark:bg-amber-900/10"
                                          : "border-border"
                                    )}
                                  >
                                    <Avatar className="h-6 w-6 shrink-0">
                                      <AvatarImage src={player.avatar_url || undefined} />
                                      <AvatarFallback className="text-xs">
                                        {player.name.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm truncate flex-1">{player.name}</span>
                                    {existing ? (
                                      <span className="text-xs text-emerald-600 font-medium">
                                        ✓ {existing.result_value} {existing.result_unit}
                                      </span>
                                    ) : (
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder={test.result_unit || "valeur"}
                                        className="h-7 w-20 text-xs"
                                        value={test.player_results[player.id] || ""}
                                        onChange={(e) => updatePlayerResult(test.id, player.id, e.target.value)}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Save button */}
            {hasResults && (
              <Button
                onClick={() => saveTests.mutate()}
                disabled={saveTests.isPending}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              >
                Enregistrer les résultats
              </Button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
