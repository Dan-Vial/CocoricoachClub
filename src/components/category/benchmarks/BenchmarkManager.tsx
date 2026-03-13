import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Target, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { getTestCategoriesForSport, TestCategory } from "@/lib/constants/testCategories";

interface BenchmarkManagerProps {
  categoryId: string;
  sportType?: string;
}

interface Benchmark {
  id: string;
  name: string;
  test_category: string;
  test_type: string;
  unit: string | null;
  lower_is_better: boolean;
  level_1_label: string;
  level_1_max: number | null;
  level_2_label: string;
  level_2_max: number | null;
  level_3_label: string;
  level_3_max: number | null;
  level_4_label: string;
  level_4_max: number | null;
  applies_to: string | null;
}

interface BenchmarkForm {
  name: string;
  test_category: string;
  test_type: string;
  unit: string;
  lower_is_better: boolean;
  level_1_label: string;
  level_1_max: string;
  level_2_label: string;
  level_2_max: string;
  level_3_label: string;
  level_3_max: string;
  level_4_label: string;
  level_4_max: string;
  applies_to: string;
}

const defaultForm: BenchmarkForm = {
  name: "",
  test_category: "",
  test_type: "",
  unit: "",
  lower_is_better: false,
  level_1_label: "Insuffisant",
  level_1_max: "",
  level_2_label: "Moyen",
  level_2_max: "",
  level_3_label: "Bon",
  level_3_max: "",
  level_4_label: "Excellent",
  level_4_max: "",
  applies_to: "all",
};

export function BenchmarkManager({ categoryId, sportType }: BenchmarkManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BenchmarkForm>(defaultForm);

  const testCategories = getTestCategoriesForSport(sportType || "");

  const selectedCategory = useMemo(() => {
    return testCategories.find(c => c.value === form.test_category);
  }, [testCategories, form.test_category]);

  const { data: benchmarks = [], isLoading } = useQuery({
    queryKey: ["benchmarks", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benchmarks")
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Benchmark[];
    },
  });

  const saveBenchmark = useMutation({
    mutationFn: async () => {
      const payload = {
        category_id: categoryId,
        name: form.name,
        test_category: form.test_category,
        test_type: form.test_type,
        unit: form.unit || null,
        lower_is_better: form.lower_is_better,
        level_1_label: form.level_1_label,
        level_1_max: form.level_1_max ? parseFloat(form.level_1_max) : null,
        level_2_label: form.level_2_label,
        level_2_max: form.level_2_max ? parseFloat(form.level_2_max) : null,
        level_3_label: form.level_3_label,
        level_3_max: form.level_3_max ? parseFloat(form.level_3_max) : null,
        level_4_label: form.level_4_label,
        level_4_max: form.level_4_max ? parseFloat(form.level_4_max) : null,
        applies_to: form.applies_to,
        created_by: user?.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from("benchmarks")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("benchmarks")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benchmarks", categoryId] });
      toast.success(editingId ? "Benchmark modifié" : "Benchmark créé");
      closeDialog();
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const deleteBenchmark = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("benchmarks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benchmarks", categoryId] });
      toast.success("Benchmark supprimé");
    },
  });

  const openCreate = () => {
    setForm(defaultForm);
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEdit = (b: Benchmark) => {
    setForm({
      name: b.name,
      test_category: b.test_category,
      test_type: b.test_type,
      unit: b.unit || "",
      lower_is_better: b.lower_is_better,
      level_1_label: b.level_1_label,
      level_1_max: b.level_1_max?.toString() || "",
      level_2_label: b.level_2_label,
      level_2_max: b.level_2_max?.toString() || "",
      level_3_label: b.level_3_label,
      level_3_max: b.level_3_max?.toString() || "",
      level_4_label: b.level_4_label,
      level_4_max: b.level_4_max?.toString() || "",
      applies_to: b.applies_to || "all",
    });
    setEditingId(b.id);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleTestCategoryChange = (val: string) => {
    setForm(f => ({ ...f, test_category: val, test_type: "" }));
  };

  const handleTestTypeChange = (val: string) => {
    const cat = testCategories.find(c => c.value === form.test_category);
    const test = cat?.tests.find(t => t.value === val);
    setForm(f => ({
      ...f,
      test_type: val,
      unit: test?.unit || f.unit,
      name: f.name || test?.label || "",
      lower_is_better: test?.isTime || false,
    }));
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return "bg-red-500/10 text-red-700 border-red-200";
      case 2: return "bg-amber-500/10 text-amber-700 border-amber-200";
      case 3: return "bg-green-500/10 text-green-700 border-green-200";
      case 4: return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
      default: return "";
    }
  };

  const getTestLabel = (testCategory: string, testType: string) => {
    const cat = testCategories.find(c => c.value === testCategory);
    const test = cat?.tests.find(t => t.value === testType);
    return { catLabel: cat?.label || testCategory, testLabel: test?.label || testType };
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Benchmarks personnalisés
            </CardTitle>
            <Button onClick={openCreate} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Définissez des seuils de performance pour chaque test. Les résultats des joueurs seront comparés à ces barèmes.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Chargement...</p>
          ) : benchmarks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun benchmark défini. Créez-en un pour commencer à comparer les performances.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead className="text-center">
                      <Badge variant="outline" className={getLevelColor(1)}>Niv. 1</Badge>
                    </TableHead>
                    <TableHead className="text-center">
                      <Badge variant="outline" className={getLevelColor(2)}>Niv. 2</Badge>
                    </TableHead>
                    <TableHead className="text-center">
                      <Badge variant="outline" className={getLevelColor(3)}>Niv. 3</Badge>
                    </TableHead>
                    <TableHead className="text-center">
                      <Badge variant="outline" className={getLevelColor(4)}>Niv. 4</Badge>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benchmarks.map((b) => {
                    const { catLabel, testLabel } = getTestLabel(b.test_category, b.test_type);
                    return (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{catLabel} → {testLabel}</p>
                            {b.lower_is_better && (
                              <Badge variant="outline" className="text-xs mt-0.5">⏱ Plus bas = meilleur</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{b.unit || "-"}</TableCell>
                        <TableCell className="text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">{b.level_1_label}</p>
                            <p className="font-mono text-sm">{b.lower_is_better ? `> ${b.level_1_max}` : `< ${b.level_1_max}`}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">{b.level_2_label}</p>
                            <p className="font-mono text-sm">{b.level_2_max != null ? `≤ ${b.level_2_max}` : "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">{b.level_3_label}</p>
                            <p className="font-mono text-sm">{b.level_3_max != null ? `≤ ${b.level_3_max}` : "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">{b.level_4_label}</p>
                            <p className="font-mono text-sm">{b.level_4_max != null ? `> ${b.level_3_max}` : "∞"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteBenchmark.mutate(b.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {editingId ? "Modifier le benchmark" : "Nouveau benchmark"}
            </DialogTitle>
            <DialogDescription>
              Définissez les seuils de performance pour ce test.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Test selection */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Catégorie de test</Label>
                <Select value={form.test_category} onValueChange={handleTestCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {testCategories.filter(c => !c.value.startsWith("rehab_")).map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Test</Label>
                <Select value={form.test_type} onValueChange={handleTestTypeChange} disabled={!form.test_category}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory?.tests.map(test => (
                      <SelectItem key={test.value} value={test.value}>
                        {test.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Name and unit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom du benchmark</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: VMA U18"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unité</Label>
                <Input
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="Ex: km/h, s, m"
                />
              </div>
            </div>

            {/* Lower is better toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.lower_is_better}
                onCheckedChange={v => setForm(f => ({ ...f, lower_is_better: v }))}
              />
              <Label>Plus la valeur est basse, meilleur c'est (temps, etc.)</Label>
            </div>

            {/* Level thresholds */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Seuils de niveaux</Label>
              <p className="text-xs text-muted-foreground">
                {form.lower_is_better
                  ? "Définissez les seuils max pour chaque niveau (du meilleur au moins bon)"
                  : "Définissez les seuils min pour chaque niveau (du moins bon au meilleur)"
                }
              </p>

              {[1, 2, 3, 4].map(level => (
                <div key={level} className={`flex items-center gap-3 p-2 rounded-md border ${getLevelColor(level)}`}>
                  <div className="flex-1">
                    <Input
                      value={(form as any)[`level_${level}_label`]}
                      onChange={e => setForm(f => ({ ...f, [`level_${level}_label`]: e.target.value }))}
                      placeholder="Nom du niveau"
                      className="bg-background"
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      value={(form as any)[`level_${level}_max`]}
                      onChange={e => setForm(f => ({ ...f, [`level_${level}_max`]: e.target.value }))}
                      placeholder={level === 4 ? "Max" : "Seuil"}
                      className="bg-background"
                    />
                  </div>
                  <span className="text-xs w-8">{form.unit}</span>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annuler</Button>
            <Button
              onClick={() => saveBenchmark.mutate()}
              disabled={!form.name || !form.test_category || !form.test_type || saveBenchmark.isPending}
            >
              {saveBenchmark.isPending ? "Enregistrement..." : editingId ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
