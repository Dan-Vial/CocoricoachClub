import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Activity, ClipboardCheck, Plus, X } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getTrainingTypeLabel } from "@/lib/constants/trainingTypes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTestCategoriesForSport, TestCategory } from "@/lib/constants/testCategories";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SessionFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionType: string;
  categoryId: string;
}

interface SessionTest {
  id: string;
  test_category: string;
  test_type: string;
  result_unit: string;
  player_results: Record<string, string>;
}

export function SessionFeedbackDialog({
  open,
  onOpenChange,
  sessionId,
  sessionType,
  categoryId,
}: SessionFeedbackDialogProps) {
  const [rpeValues, setRpeValues] = useState<Record<string, { rpe: string; duration: string }>>({});
  const [sessionTests, setSessionTests] = useState<SessionTest[]>([]);
  const [activeTab, setActiveTab] = useState(sessionType === "test" ? "tests" : "rpe");
  const queryClient = useQueryClient();

  // Fetch category to get sport type
  const { data: category } = useQuery({
    queryKey: ["category-for-feedback", categoryId],
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
  const testCategories = getTestCategoriesForSport(sportType);

  // Fetch session details to get default duration
  const { data: session } = useQuery({
    queryKey: ["session-for-rpe", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("session_start_time, session_end_time, session_date")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Calculate default duration from session times
  const defaultDuration = useMemo(() => {
    if (session?.session_start_time && session?.session_end_time) {
      const start = session.session_start_time.split(":");
      const end = session.session_end_time.split(":");
      const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
      const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
      return Math.max(0, endMinutes - startMinutes);
    }
    return 60; // Default 60 minutes if no times set
  }, [session]);

  // Fetch players
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

  // Fetch existing RPE data
  const { data: existingRpe } = useQuery({
    queryKey: ["awcr_tracking", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("*")
        .eq("training_session_id", sessionId);
      if (error) throw error;
      return data;
    },
    enabled: open && !!sessionId,
  });

  // Fetch attendance
  const { data: attendance } = useQuery({
    queryKey: ["session-attendance", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_attendance")
        .select("player_id")
        .eq("training_session_id", sessionId);
      if (error) throw error;
      return data;
    },
    enabled: open && !!sessionId,
  });

  // Initialize RPE values with default duration when players load
  useEffect(() => {
    if (players && defaultDuration && open) {
      const initial: Record<string, { rpe: string; duration: string }> = {};
      players.forEach((player) => {
        // Don't overwrite existing values
        if (!rpeValues[player.id]) {
          initial[player.id] = { rpe: "", duration: defaultDuration.toString() };
        }
      });
      if (Object.keys(initial).length > 0) {
        setRpeValues((prev) => ({ ...initial, ...prev }));
      }
    }
  }, [players, defaultDuration, open]);

  // Pre-load tests configured for this session
  const { data: preloadedTests } = useQuery({
    queryKey: ["session-preloaded-tests", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generic_tests")
        .select("test_category, test_type, result_unit")
        .ilike("notes", `%Session ID: ${sessionId}%`)
        .limit(20);
      if (error) throw error;
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

  // Pre-populate tests from session data when dialog opens
  useEffect(() => {
    if (preloadedTests && preloadedTests.length > 0 && sessionTests.length === 0 && open) {
      const entries: SessionTest[] = preloadedTests.map(t => ({
        id: crypto.randomUUID(),
        test_category: t.test_category,
        test_type: t.test_type,
        result_unit: t.result_unit || "",
        player_results: {},
      }));
      setSessionTests(entries);
    }
  }, [preloadedTests, open]);

  // Reset values when dialog closes
  useEffect(() => {
    if (!open) {
      setRpeValues({});
      setSessionTests([]);
      setActiveTab(sessionType === "test" ? "tests" : "rpe");
    }
  }, [open, sessionType]);

  // Calculate AWCR for a player
  const calculateAWCR = async (playerId: string, sessionDateStr: string, newLoad: number) => {
    const sevenDaysAgo = new Date(sessionDateStr);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const twentyEightDaysAgo = new Date(sessionDateStr);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    const { data: recentSessions } = await supabase
      .from("awcr_tracking")
      .select("training_load")
      .eq("player_id", playerId)
      .gte("session_date", sevenDaysAgo.toISOString().split("T")[0])
      .lt("session_date", sessionDateStr);

    const { data: chronicSessions } = await supabase
      .from("awcr_tracking")
      .select("training_load")
      .eq("player_id", playerId)
      .gte("session_date", twentyEightDaysAgo.toISOString().split("T")[0])
      .lt("session_date", sessionDateStr);

    const acuteTotal = (recentSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0) + newLoad;
    const chronicTotal = chronicSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0;

    const acuteAvg = acuteTotal / 7;
    const chronicAvg = chronicTotal / 28;

    const awcr = chronicAvg > 0 ? acuteAvg / chronicAvg : 0;

    return { acuteLoad: acuteAvg, chronicLoad: chronicAvg, awcr };
  };

  const saveData = useMutation({
    mutationFn: async () => {
      if (!session?.session_date) throw new Error("Date de séance manquante");
      
      // Save RPE data
      const playersToSave = players?.filter((p) => rpeValues[p.id]?.rpe && rpeValues[p.id]?.duration) || [];

      for (const player of playersToSave) {
        const existingEntry = existingRpe?.find((r) => r.player_id === player.id);
        if (existingEntry) continue; // Skip already saved

        const rpe = parseInt(rpeValues[player.id].rpe);
        const duration = parseInt(rpeValues[player.id].duration);
        const trainingLoad = rpe * duration;

        const { acuteLoad, chronicLoad, awcr } = await calculateAWCR(
          player.id,
          session.session_date,
          trainingLoad
        );

        const { error } = await supabase.from("awcr_tracking").insert({
          player_id: player.id,
          category_id: categoryId,
          training_session_id: sessionId,
          session_date: session.session_date,
          rpe,
          duration_minutes: duration,
          acute_load: acuteLoad,
          chronic_load: chronicLoad,
          awcr: awcr,
        });

        if (error) throw error;
      }

      // Save test results
      const testRecords: any[] = [];
      sessionTests.forEach(test => {
        if (!test.test_type) return;
        
        Object.entries(test.player_results).forEach(([playerId, resultValue]) => {
          if (!resultValue || resultValue.trim() === "") return;
          
          testRecords.push({
            player_id: playerId,
            category_id: categoryId,
            test_date: session.session_date,
            test_category: test.test_category,
            test_type: test.test_type,
            result_value: parseFloat(resultValue),
            result_unit: test.result_unit || null,
            notes: `Séance du ${session.session_date} (Session ID: ${sessionId})`,
          });
        });
      });
      
      if (testRecords.length > 0) {
        const { error } = await supabase.from("generic_tests").insert(testRecords);
        if (error) throw error;
      }

      return { rpeCount: playersToSave.length, testCount: testRecords.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["awcr_tracking"] });
      queryClient.invalidateQueries({ queryKey: ["awcr-data"] });
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["generic_tests", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["generic_tests_discovery", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_session_tests"] });
      
      let message = "";
      if (result.rpeCount > 0) message += `${result.rpeCount} RPE enregistré(s)`;
      if (result.testCount > 0) {
        if (message) message += " et ";
        message += `${result.testCount} résultat(s) de test`;
      }
      if (message) {
        toast.success(message);
      } else {
        toast.info("Aucune donnée à enregistrer");
      }
      
      setRpeValues({});
      setSessionTests([]);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  const handleRpeChange = (playerId: string, field: "rpe" | "duration", value: string) => {
    setRpeValues((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value,
      },
    }));
  };

  // Test management functions
  const addTest = () => {
    const newTest: SessionTest = {
      id: crypto.randomUUID(),
      test_category: "",
      test_type: "",
      result_unit: "",
      player_results: {},
    };
    setSessionTests([...sessionTests, newTest]);
  };

  const updateTest = (testId: string, field: keyof SessionTest, value: any) => {
    setSessionTests(tests => tests.map(t => t.id === testId ? { ...t, [field]: value } : t));
  };

  const removeTest = (testId: string) => {
    setSessionTests(tests => tests.filter(t => t.id !== testId));
  };

  const handleTestCategoryChange = (testId: string, categoryValue: string) => {
    setSessionTests(tests => tests.map(t => t.id === testId ? {
      ...t,
      test_category: categoryValue,
      test_type: "",
      result_unit: "",
      player_results: {},
    } : t));
  };

  const handleTestTypeChange = (testId: string, testTypeValue: string) => {
    const test = sessionTests.find(t => t.id === testId);
    if (!test) return;
    
    const category = testCategories.find(c => c.value === test.test_category);
    const testOption = category?.tests.find(t => t.value === testTypeValue);
    
    setSessionTests(tests => tests.map(t => t.id === testId ? {
      ...t,
      test_type: testTypeValue,
      result_unit: testOption?.unit || "",
      player_results: {},
    } : t));
  };

  const updatePlayerTestResult = (testId: string, playerId: string, value: string) => {
    setSessionTests(tests => tests.map(t => {
      if (t.id !== testId) return t;
      return {
        ...t,
        player_results: { ...t.player_results, [playerId]: value },
      };
    }));
  };

  const attendedPlayerIds = new Set(attendance?.map((a) => a.player_id) || []);
  const playersWithRpe = new Set(existingRpe?.map((r) => r.player_id) || []);
  
  // Filter to only show players who attended (or all if no attendance recorded)
  const playersToShow = useMemo(() => {
    if (!players) return [];
    if (!attendance || attendance.length === 0) return players;
    return players.filter((p) => attendedPlayerIds.has(p.id));
  }, [players, attendance, attendedPlayerIds]);

  const hasNewRpeValues = Object.entries(rpeValues).some(
    ([id, val]) => val.rpe && val.duration && !playersWithRpe.has(id)
  );

  const hasTestResults = sessionTests.some(t => 
    t.test_type && Object.values(t.player_results).some(v => v && v.trim() !== "")
  );

  const testResultsCount = sessionTests.reduce((acc, t) => 
    acc + Object.values(t.player_results).filter(v => v && v.trim() !== "").length, 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Saisie post-séance - {getTrainingTypeLabel(sessionType)}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full">
            <TabsTrigger value="rpe" className="flex-1 gap-2">
              <Activity className="h-4 w-4" />
              RPE
              {hasNewRpeValues && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {Object.entries(rpeValues).filter(([id, v]) => v.rpe && !playersWithRpe.has(id)).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tests" className="flex-1 gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Tests
              {testResultsCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-emerald-100 text-emerald-700">
                  {testResultsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rpe" className="flex-1 flex flex-col min-h-0 mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              RPE: Rate of Perceived Exertion (0-10). La durée est pré-remplie depuis les horaires de la séance.
            </p>

            <ScrollArea className="flex-1 max-h-[45vh] pr-2">
              <div className="space-y-2">
                {playersToShow.map((player) => {
                  const existing = existingRpe?.find((r) => r.player_id === player.id);

                  return (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {player.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Label className="w-28 font-medium truncate">{player.name}</Label>
                      {existing ? (
                        <span className="text-sm text-muted-foreground">
                          ✓ RPE {existing.rpe} - {existing.duration_minutes}min
                          <span className="text-xs ml-1">(charge: {existing.training_load})</span>
                        </span>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-muted-foreground">RPE</Label>
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              placeholder="0-10"
                              className="w-16 h-8"
                              value={rpeValues[player.id]?.rpe || ""}
                              onChange={(e) => handleRpeChange(player.id, "rpe", e.target.value)}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-muted-foreground">Min</Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="Min"
                              className="w-20 h-8"
                              value={rpeValues[player.id]?.duration || ""}
                              onChange={(e) => handleRpeChange(player.id, "duration", e.target.value)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tests" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                Ajoutez des résultats de tests réalisés pendant la séance
              </p>
              <Button
                type="button"
                onClick={addTest}
                variant="outline"
                size="sm"
                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter test
              </Button>
            </div>

            <ScrollArea className="flex-1 max-h-[45vh] pr-2">
              {sessionTests.length === 0 ? (
                <div className="border-2 border-dashed border-emerald-500/30 rounded-xl p-6 bg-emerald-500/5 text-center">
                  <ClipboardCheck className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucun test ajouté. Cliquez sur "Ajouter test" pour enregistrer des résultats.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessionTests.map((test, idx) => {
                    const currentCategory = testCategories.find(c => c.value === test.test_category);
                    const filledCount = Object.values(test.player_results).filter(v => v && v.trim() !== "").length;

                    return (
                      <div
                        key={test.id}
                        className="border-2 rounded-xl border-emerald-500/30 bg-background p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
                              {idx + 1}
                            </div>
                            {test.test_type && (
                              <Badge variant="outline" className="text-xs">
                                {filledCount}/{playersToShow.length} résultats
                              </Badge>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTest(test.id)}
                            className="h-7 w-7 text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={test.test_category}
                            onValueChange={(v) => handleTestCategoryChange(test.id, v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Catégorie..." />
                            </SelectTrigger>
                            <SelectContent>
                              {testCategories.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={test.test_type}
                            onValueChange={(v) => handleTestTypeChange(test.id, v)}
                            disabled={!test.test_category}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Type..." />
                            </SelectTrigger>
                            <SelectContent>
                              {currentCategory?.tests.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label} {t.unit && `(${t.unit})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {test.test_type && playersToShow.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {playersToShow.map((player) => (
                              <div
                                key={player.id}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-lg border",
                                  test.player_results[player.id]
                                    ? "border-emerald-300 bg-emerald-50/50"
                                    : "border-border"
                                )}
                              >
                                <Avatar className="h-5 w-5 shrink-0">
                                  <AvatarImage src={player.avatar_url || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {player.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs truncate flex-1">{player.name}</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder={test.result_unit || "val"}
                                  className="h-6 w-16 text-xs"
                                  value={test.player_results[player.id] || ""}
                                  onChange={(e) => updatePlayerTestResult(test.id, player.id, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => saveData.mutate()}
            disabled={saveData.isPending || (!hasNewRpeValues && !hasTestResults)}
          >
            {saveData.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
