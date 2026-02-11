import { useState } from "react";
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
import { Plus, Trash2, Clock, Dumbbell, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuickTestEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sessionDate: string;
}

interface TestEntry {
  id: string;
  type: "sprint_40m" | "1600m_run" | "musculation";
  label: string;
  strengthTestName?: string;
}

const AVAILABLE_TESTS = [
  { value: "sprint_40m", label: "Sprint 40m", icon: "⚡" },
  { value: "1600m_run", label: "1600m Run (VMA)", icon: "🏃" },
  { value: "musculation", label: "Musculation", icon: "💪" },
] as const;

export function QuickTestEntryDialog({
  open,
  onOpenChange,
  categoryId,
  sessionDate,
}: QuickTestEntryDialogProps) {
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [selectedTests, setSelectedTests] = useState<TestEntry[]>([]);
  const [addingTestType, setAddingTestType] = useState<string>("");

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

  const { data: existingTests } = useQuery({
    queryKey: ["existing_tests", categoryId, sessionDate],
    queryFn: async () => {
      const [speedTests, strengthTests] = await Promise.all([
        supabase
          .from("speed_tests")
          .select("*")
          .eq("category_id", categoryId)
          .eq("test_date", sessionDate),
        supabase
          .from("strength_tests")
          .select("*")
          .eq("category_id", categoryId)
          .eq("test_date", sessionDate),
      ]);
      return {
        speedTests: speedTests.data || [],
        strengthTests: strengthTests.data || [],
      };
    },
    enabled: open,
  });

  // Fetch existing strength test names for dropdown
  const { data: existingStrengthTestNames } = useQuery({
    queryKey: ["strength_test_names", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strength_tests")
        .select("test_name")
        .eq("category_id", categoryId)
        .order("test_name");
      if (error) throw error;
      const uniqueNames = [...new Set(data?.map(t => t.test_name).filter(Boolean))];
      return uniqueNames;
    },
    enabled: open,
  });

  const addTestSection = (typeValue: string) => {
    const testDef = AVAILABLE_TESTS.find(t => t.value === typeValue);
    if (!testDef) return;

    const newEntry: TestEntry = {
      id: crypto.randomUUID(),
      type: testDef.value,
      label: testDef.label,
    };
    setSelectedTests(prev => [...prev, newEntry]);
    setAddingTestType("");
  };

  const removeTestSection = (id: string) => {
    setSelectedTests(prev => prev.filter(t => t.id !== id));
  };

  const updateStrengthTestName = (id: string, name: string) => {
    setSelectedTests(prev => prev.map(t => t.id === id ? { ...t, strengthTestName: name } : t));
  };

  const saveSpeedTests = useMutation({
    mutationFn: async (data: { testType: "40m_sprint" | "1600m_run" }) => {
      const entries = players
        ?.filter((p) => testResults[`speed_${data.testType}_${p.id}`])
        .map((p) => {
          const result = testResults[`speed_${data.testType}_${p.id}`];
          if (data.testType === "40m_sprint") {
            return {
              player_id: p.id,
              category_id: categoryId,
              test_date: sessionDate,
              test_type: "40m_sprint",
              time_40m_seconds: parseFloat(result.time),
              speed_ms: result.time ? 40 / parseFloat(result.time) : null,
              speed_kmh: result.time ? (40 / parseFloat(result.time)) * 3.6 : null,
            };
          } else {
            return {
              player_id: p.id,
              category_id: categoryId,
              test_date: sessionDate,
              test_type: "1600m_run",
              time_1600m_minutes: parseInt(result.minutes),
              time_1600m_seconds: parseInt(result.seconds),
              vma_kmh: result.minutes && result.seconds
                ? (1600 / 60 / (parseInt(result.minutes) + parseInt(result.seconds) / 60)) * 3.6
                : null,
            };
          }
        });

      if (!entries || entries.length === 0) {
        throw new Error("Aucun résultat à enregistrer");
      }

      const { error } = await supabase.from("speed_tests").insert(entries);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speed_tests"] });
      queryClient.invalidateQueries({ queryKey: ["existing_tests", categoryId, sessionDate] });
      toast.success("Résultats de vitesse enregistrés");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  const saveStrengthTests = useMutation({
    mutationFn: async (data: { testName: string }) => {
      const entries = players
        ?.filter((p) => testResults[`strength_${data.testName}_${p.id}`])
        .map((p) => ({
          player_id: p.id,
          category_id: categoryId,
          test_date: sessionDate,
          test_name: data.testName,
          weight_kg: parseFloat(testResults[`strength_${data.testName}_${p.id}`]),
        }));

      if (!entries || entries.length === 0) {
        throw new Error("Aucun résultat à enregistrer");
      }

      const { error } = await supabase.from("strength_tests").insert(entries);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strength_tests"] });
      queryClient.invalidateQueries({ queryKey: ["strength_test_names", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["existing_tests", categoryId, sessionDate] });
      toast.success("Résultats de musculation enregistrés");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  const handleSpeedResultChange = (
    playerId: string,
    testType: string,
    field: string,
    value: string
  ) => {
    setTestResults((prev) => ({
      ...prev,
      [`speed_${testType}_${playerId}`]: {
        ...prev[`speed_${testType}_${playerId}`],
        [field]: value,
      },
    }));
  };

  const renderSprintSection = (entry: TestEntry) => (
    <div className="space-y-3">
      <ScrollArea className="max-h-[30vh]">
        <div className="space-y-2 pr-2">
          {players?.map((player) => {
            const existing = existingTests?.speedTests.find(
              (t) => t.player_id === player.id && t.test_type === "40m_sprint"
            );
            return (
              <div key={player.id} className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg">
                <Label className="w-36 font-medium text-sm truncate">{player.name}</Label>
                {existing ? (
                  <span className="text-sm text-muted-foreground">
                    ✓ {existing.time_40m_seconds}s
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Temps (s)"
                      className="w-28 h-8 text-sm"
                      value={testResults[`speed_40m_sprint_${player.id}`]?.time || ""}
                      onChange={(e) =>
                        handleSpeedResultChange(player.id, "40m_sprint", "time", e.target.value)
                      }
                    />
                    <Timer className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <Button
        onClick={() => saveSpeedTests.mutate({ testType: "40m_sprint" })}
        disabled={saveSpeedTests.isPending}
        size="sm"
      >
        Enregistrer Sprint 40m
      </Button>
    </div>
  );

  const render1600mSection = (entry: TestEntry) => (
    <div className="space-y-3">
      <ScrollArea className="max-h-[30vh]">
        <div className="space-y-2 pr-2">
          {players?.map((player) => {
            const existing = existingTests?.speedTests.find(
              (t) => t.player_id === player.id && t.test_type === "1600m_run"
            );
            return (
              <div key={player.id} className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg">
                <Label className="w-36 font-medium text-sm truncate">{player.name}</Label>
                {existing ? (
                  <span className="text-sm text-muted-foreground">
                    ✓ {existing.time_1600m_minutes}'{existing.time_1600m_seconds}"
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      className="w-16 h-8 text-sm"
                      value={testResults[`speed_1600m_run_${player.id}`]?.minutes || ""}
                      onChange={(e) =>
                        handleSpeedResultChange(player.id, "1600m_run", "minutes", e.target.value)
                      }
                    />
                    <span className="text-muted-foreground">'</span>
                    <Input
                      type="number"
                      placeholder="Sec"
                      className="w-16 h-8 text-sm"
                      value={testResults[`speed_1600m_run_${player.id}`]?.seconds || ""}
                      onChange={(e) =>
                        handleSpeedResultChange(player.id, "1600m_run", "seconds", e.target.value)
                      }
                    />
                    <span className="text-muted-foreground">"</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <Button
        onClick={() => saveSpeedTests.mutate({ testType: "1600m_run" })}
        disabled={saveSpeedTests.isPending}
        size="sm"
      >
        Enregistrer 1600m
      </Button>
    </div>
  );

  const renderStrengthSection = (entry: TestEntry) => {
    const testName = entry.strengthTestName || "";
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Exercice de musculation</Label>
          <Select
            value={testName}
            onValueChange={(v) => {
              if (v === "__new__") {
                updateStrengthTestName(entry.id, "");
              } else {
                updateStrengthTestName(entry.id, v);
              }
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Sélectionner un exercice..." />
            </SelectTrigger>
            <SelectContent>
              {existingStrengthTestNames && existingStrengthTestNames.length > 0 && (
                <>
                  {existingStrengthTestNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </>
              )}
              <SelectItem value="__new__">
                ➕ Nouveau test...
              </SelectItem>
            </SelectContent>
          </Select>
          {(testName === "" || !existingStrengthTestNames?.includes(testName)) && (
            <Input
              placeholder="Nom du test (ex: Développé Couché, Squat...)"
              value={testName}
              onChange={(e) => updateStrengthTestName(entry.id, e.target.value)}
              className="h-9"
            />
          )}
        </div>

        {testName && (
          <>
            <ScrollArea className="max-h-[30vh]">
              <div className="space-y-2 pr-2">
                {players?.map((player) => {
                  const existing = existingTests?.strengthTests.find(
                    (t) => t.player_id === player.id && t.test_name === testName
                  );
                  return (
                    <div key={player.id} className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg">
                      <Label className="w-36 font-medium text-sm truncate">{player.name}</Label>
                      {existing ? (
                        <span className="text-sm text-muted-foreground">
                          ✓ {existing.weight_kg}kg
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="kg"
                            className="w-24 h-8 text-sm"
                            value={testResults[`strength_${testName}_${player.id}`] || ""}
                            onChange={(e) =>
                              setTestResults((prev) => ({
                                ...prev,
                                [`strength_${testName}_${player.id}`]: e.target.value,
                              }))
                            }
                          />
                          <Dumbbell className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <Button
              onClick={() => saveStrengthTests.mutate({ testName })}
              disabled={saveStrengthTests.isPending || !testName}
              size="sm"
            >
              Enregistrer {testName}
            </Button>
          </>
        )}
      </div>
    );
  };

  const renderTestSection = (entry: TestEntry) => {
    switch (entry.type) {
      case "sprint_40m":
        return renderSprintSection(entry);
      case "1600m_run":
        return render1600mSection(entry);
      case "musculation":
        return renderStrengthSection(entry);
    }
  };

  const getTestIcon = (type: string) => {
    return AVAILABLE_TESTS.find(t => t.value === type)?.icon || "📊";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Saisie des tests - {format(new Date(sessionDate), "PPP", { locale: fr })}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4">
            {/* Add test selector */}
            <div className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg bg-muted/20">
              <Select value={addingTestType} onValueChange={setAddingTestType}>
                <SelectTrigger className="flex-1 h-9">
                  <SelectValue placeholder="Choisir un test à ajouter..." />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_TESTS.map((test) => (
                    <SelectItem key={test.value} value={test.value}>
                      {test.icon} {test.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                onClick={() => addTestSection(addingTestType)}
                disabled={!addingTestType}
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </div>

            {selectedTests.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Sélectionnez les tests que vous souhaitez saisir</p>
                <p className="text-xs mt-1">Seuls les tests choisis seront proposés aux athlètes</p>
              </div>
            )}

            {/* Render selected test sections */}
            {selectedTests.map((entry) => (
              <div key={entry.id} className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getTestIcon(entry.type)}</span>
                    <h3 className="font-semibold text-sm">{entry.label}</h3>
                    {entry.type === "musculation" && entry.strengthTestName && (
                      <Badge variant="secondary" className="text-xs">
                        {entry.strengthTestName}
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeTestSection(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {renderTestSection(entry)}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
