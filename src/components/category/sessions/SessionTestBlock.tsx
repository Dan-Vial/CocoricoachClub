import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, ClipboardCheck, Plus, Info, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTestCategoriesForSport, getGroupedTestCategories } from "@/lib/constants/testCategories";
import { HierarchicalTestSelector, resolveTestCategory, resolveGroupAndZone } from "../tests/HierarchicalTestSelector";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface SessionTest {
  id: string;
  test_category: string;
  test_type: string;
  result_unit: string;
  player_results: Record<string, string>;
}

interface SessionTestBlockProps {
  tests: SessionTest[];
  onTestsChange: (tests: SessionTest[]) => void;
  sportType?: string;
  players: { id: string; name: string; position?: string | null; avatar_url?: string | null }[];
  selectedPlayers: string[];
  playerSelectionMode: "all" | "specific";
  hideResults?: boolean;
}

export function SessionTestBlock({
  tests,
  onTestsChange,
  sportType,
  players,
  selectedPlayers,
  playerSelectionMode,
  hideResults = false,
}: SessionTestBlockProps) {
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  // Track hierarchical selection state per test
  const [testSelections, setTestSelections] = useState<Record<string, { group: string; zone: string }>>({});
  
  const filteredTestCategories = getTestCategoriesForSport(sportType || "");
  
  const effectivePlayers = playerSelectionMode === "all"
    ? players
    : players.filter(p => selectedPlayers.includes(p.id));

  const addTest = () => {
    const newTest: SessionTest = {
      id: crypto.randomUUID(),
      test_category: "",
      test_type: "",
      result_unit: "",
      player_results: {},
    };
    onTestsChange([...tests, newTest]);
    setExpandedTestId(newTest.id);
  };

  const removeTest = (testId: string) => {
    onTestsChange(tests.filter(t => t.id !== testId));
    if (expandedTestId === testId) setExpandedTestId(null);
    setTestSelections(prev => {
      const next = { ...prev };
      delete next[testId];
      return next;
    });
  };

  const handleGroupChange = (testId: string, group: string) => {
    setTestSelections(prev => ({ ...prev, [testId]: { group, zone: "" } }));
    onTestsChange(tests.map(t => t.id === testId ? { ...t, test_category: "", test_type: "", result_unit: "", player_results: {} } : t));
  };

  const handleZoneChange = (testId: string, zone: string) => {
    setTestSelections(prev => ({ ...prev, [testId]: { ...prev[testId], zone } }));
    const resolvedCategory = resolveTestCategory(testSelections[testId]?.group || "", zone, sportType || "");
    onTestsChange(tests.map(t => t.id === testId ? { ...t, test_category: resolvedCategory, test_type: "", result_unit: "", player_results: {} } : t));
  };

  const handleTestChange = (testId: string, testValue: string) => {
    const sel = testSelections[testId];
    const resolvedCategory = resolveTestCategory(sel?.group || "", sel?.zone || "", sportType || "");
    const category = filteredTestCategories.find(c => c.value === resolvedCategory);
    const testOption = category?.tests.find(t => t.value === testValue);
    onTestsChange(tests.map(t => t.id === testId ? {
      ...t,
      test_category: resolvedCategory,
      test_type: testValue,
      result_unit: testOption?.unit || "",
      player_results: {},
    } : t));
  };

  const updatePlayerResult = (testId: string, playerId: string, value: string) => {
    onTestsChange(tests.map(t => {
      if (t.id !== testId) return t;
      return { ...t, player_results: { ...t.player_results, [playerId]: value } };
    }));
  };

  const getTestLabel = (test: SessionTest): string => {
    const category = filteredTestCategories.find(c => c.value === test.test_category);
    const testOption = category?.tests.find(t => t.value === test.test_type);
    if (!category || !testOption) return "Test non configuré";
    const groupLabel = category.group ? `${category.groupLabel} > ${category.label}` : category.label;
    return `${groupLabel} - ${testOption.label}`;
  };

  const getFilledCount = (test: SessionTest): number => {
    return Object.values(test.player_results).filter(v => v && v.trim() !== "").length;
  };

  // Initialize selections from existing test data
  const getSelectionForTest = (test: SessionTest) => {
    if (testSelections[test.id]) return testSelections[test.id];
    if (test.test_category) {
      const resolved = resolveGroupAndZone(test.test_category, sportType || "");
      return resolved;
    }
    return { group: "", zone: "" };
  };

  if (tests.length === 0) {
    return (
      <div className="border-2 border-dashed border-emerald-500/30 rounded-xl p-6 bg-emerald-500/5">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <ClipboardCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h4 className="font-medium text-emerald-700 dark:text-emerald-400">Tests de performance</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez des tests qui seront automatiquement enregistrés dans les statistiques des athlètes
            </p>
          </div>
          <Button type="button" onClick={addTest} variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
            <Plus className="h-4 w-4 mr-2" /> Ajouter un test
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-emerald-600" />
          <span className="font-medium">Tests de performance</span>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
            {tests.length} test{tests.length > 1 ? "s" : ""}
          </Badge>
        </div>
        <Button type="button" onClick={addTest} variant="outline" size="sm" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>

      <div className="space-y-3">
        {tests.map((test, idx) => {
          const isExpanded = expandedTestId === test.id;
          const filledCount = getFilledCount(test);
          const sel = getSelectionForTest(test);
          
          return (
            <div
              key={test.id}
              className={cn(
                "border-2 rounded-xl transition-all",
                isExpanded ? "border-emerald-500 bg-emerald-500/5" : "border-emerald-500/30 bg-background hover:border-emerald-500/50"
              )}
            >
              <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedTestId(isExpanded ? null : test.id)}>
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  {test.test_type ? (
                    <span className="font-medium truncate">{getTestLabel(test)}</span>
                  ) : (
                    <span className="text-muted-foreground italic">Cliquez pour configurer...</span>
                  )}
                  {test.test_type && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{test.result_unit || "valeur"}</Badge>
                      <span className="text-xs text-muted-foreground">{filledCount}/{effectivePlayers.length} résultats</span>
                    </div>
                  )}
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeTest(test.id); }} className="h-8 w-8 text-destructive shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 space-y-4">
                  <HierarchicalTestSelector
                    sportType={sportType || ""}
                    selectedGroup={sel.group}
                    selectedZone={sel.zone}
                    selectedTest={test.test_type}
                    onGroupChange={(g) => handleGroupChange(test.id, g)}
                    onZoneChange={(z) => handleZoneChange(test.id, z)}
                    onTestChange={(t) => handleTestChange(test.id, t)}
                    compact
                  />

                  {!hideResults && test.test_type && effectivePlayers.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs flex items-center gap-2">
                          <Users className="h-3.5 w-3.5" /> Résultats des athlètes ({test.result_unit || "valeur"})
                        </Label>
                        <span className="text-xs text-muted-foreground">{filledCount}/{effectivePlayers.length} saisis</span>
                      </div>
                      <ScrollArea className="max-h-48">
                        <div className="grid grid-cols-2 gap-2 pr-2">
                          {effectivePlayers.map((player) => (
                            <div key={player.id} className={cn("flex items-center gap-2 p-2 rounded-lg border", test.player_results[player.id] ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-border")}>
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={player.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">{player.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate flex-1">{player.name}</span>
                              <Input type="number" step="0.01" placeholder={test.result_unit || "valeur"} className="h-7 w-20 text-xs" value={test.player_results[player.id] || ""} onChange={(e) => updatePlayerResult(test.id, player.id, e.target.value)} />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {hideResults && test.test_type && (
                    <div className="text-center py-3 text-sm text-muted-foreground border rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10">
                      <ClipboardCheck className="h-6 w-6 mx-auto mb-1 text-emerald-600" />
                      Les résultats seront saisis après la séance via "Retour/Commentaire"
                    </div>
                  )}

                  {!hideResults && test.test_type && effectivePlayers.length === 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-muted/30">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Aucun athlète sélectionné.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Les tests ajoutés ici seront automatiquement enregistrés dans l'onglet "Tests" et 
          apparaîtront dans les statistiques de chaque athlète après l'enregistrement de la séance.
        </span>
      </div>
    </div>
  );
}
