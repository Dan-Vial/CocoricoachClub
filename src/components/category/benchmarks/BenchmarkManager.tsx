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
import { Plus, Trash2, Edit, Target, Settings2, Weight } from "lucide-react";
import { toast } from "sonner";
import { getTestCategoriesForSport } from "@/lib/constants/testCategories";

interface BenchmarkManagerProps {
  categoryId: string;
  sportType?: string;
}

interface BenchmarkLevel {
  label: string;
  threshold: number | null;
  color: string;
}

interface Benchmark {
  id: string;
  name: string;
  test_category: string;
  test_type: string;
  unit: string | null;
  lower_is_better: boolean;
  levels: BenchmarkLevel[];
  use_body_weight_ratio: boolean;
  body_weight_multiplier: number | null;
  filter_type: string;
  filter_value: string | null;
  applies_to: string | null;
}

interface LevelForm {
  label: string;
  threshold: string;
  color: string;
}

const DEFAULT_COLORS = [
  "#ef4444", "#f59e0b", "#eab308", "#22c55e", "#10b981", "#06b6d4", "#3b82f6"
];

const FILTER_TYPES: Record<string, { label: string; options: { value: string; label: string }[] }> = {
  rugby: {
    label: "Poste",
    options: [
      { value: "pilier", label: "Pilier" },
      { value: "talonneur", label: "Talonneur" },
      { value: "deuxieme_ligne", label: "2ème Ligne" },
      { value: "flanker", label: "Flanker" },
      { value: "numero_8", label: "Numéro 8" },
      { value: "demi_melee", label: "Demi de mêlée" },
      { value: "demi_ouverture", label: "Demi d'ouverture" },
      { value: "centre", label: "Centre" },
      { value: "ailier", label: "Ailier" },
      { value: "arriere", label: "Arrière" },
    ],
  },
  football: {
    label: "Poste",
    options: [
      { value: "gardien", label: "Gardien" },
      { value: "defenseur", label: "Défenseur" },
      { value: "milieu", label: "Milieu" },
      { value: "attaquant", label: "Attaquant" },
    ],
  },
  judo: {
    label: "Catégorie de poids",
    options: [
      { value: "-60", label: "-60 kg" },
      { value: "-66", label: "-66 kg" },
      { value: "-73", label: "-73 kg" },
      { value: "-81", label: "-81 kg" },
      { value: "-90", label: "-90 kg" },
      { value: "-100", label: "-100 kg" },
      { value: "+100", label: "+100 kg" },
    ],
  },
  athletisme: {
    label: "Discipline",
    options: [
      { value: "sprint", label: "Sprint" },
      { value: "demi_fond", label: "Demi-fond" },
      { value: "fond", label: "Fond" },
      { value: "saut", label: "Saut" },
      { value: "lancer", label: "Lancer" },
      { value: "haies", label: "Haies" },
      { value: "combine", label: "Combiné" },
    ],
  },
};

function getFilterConfig(sportType: string) {
  const key = sportType.toLowerCase().replace(/[_\s]/g, "");
  if (key.includes("rugby")) return FILTER_TYPES.rugby;
  if (key.includes("football") || key.includes("foot") || key.includes("soccer")) return FILTER_TYPES.football;
  if (key.includes("judo")) return FILTER_TYPES.judo;
  if (key.includes("athlet") || key.includes("track")) return FILTER_TYPES.athletisme;
  return null;
}

export function BenchmarkManager({ categoryId, sportType }: BenchmarkManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTestCategory, setFormTestCategory] = useState("");
  const [formTestType, setFormTestType] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formLowerIsBetter, setFormLowerIsBetter] = useState(false);
  const [formLevels, setFormLevels] = useState<LevelForm[]>([
    { label: "Insuffisant", threshold: "", color: "#ef4444" },
    { label: "Moyen", threshold: "", color: "#f59e0b" },
    { label: "Bon", threshold: "", color: "#22c55e" },
    { label: "Excellent", threshold: "", color: "#10b981" },
  ]);
  const [formUseBodyWeight, setFormUseBodyWeight] = useState(false);
  const [formBodyWeightMultiplier, setFormBodyWeightMultiplier] = useState("");
  const [formFilterType, setFormFilterType] = useState("all");
  const [formFilterValue, setFormFilterValue] = useState("");

  const testCategories = getTestCategoriesForSport(sportType || "");
  const filterConfig = getFilterConfig(sportType || "");

  const selectedCategory = useMemo(() => {
    return testCategories.find(c => c.value === formTestCategory);
  }, [testCategories, formTestCategory]);

  const { data: benchmarks = [], isLoading } = useQuery({
    queryKey: ["benchmarks", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benchmarks")
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((b: any) => ({
        ...b,
        levels: Array.isArray(b.levels) ? b.levels : [],
      })) as Benchmark[];
    },
  });

  const saveBenchmark = useMutation({
    mutationFn: async () => {
      const levelsJson = formLevels.map(l => ({
        label: l.label,
        threshold: l.threshold ? parseFloat(l.threshold) : null,
        color: l.color,
      }));

      const payload: any = {
        category_id: categoryId,
        name: formName,
        test_category: formTestCategory,
        test_type: formTestType,
        unit: formUnit || null,
        lower_is_better: formLowerIsBetter,
        levels: levelsJson,
        use_body_weight_ratio: formUseBodyWeight,
        body_weight_multiplier: formBodyWeightMultiplier ? parseFloat(formBodyWeightMultiplier) : null,
        filter_type: formFilterType,
        filter_value: formFilterType !== "all" ? formFilterValue : null,
        applies_to: formFilterType !== "all" ? formFilterValue : "all",
        // Keep legacy columns for backward compat
        level_1_label: levelsJson[0]?.label || "Niveau 1",
        level_1_max: levelsJson[0]?.threshold,
        level_2_label: levelsJson[1]?.label || "Niveau 2",
        level_2_max: levelsJson[1]?.threshold,
        level_3_label: levelsJson[2]?.label || "Niveau 3",
        level_3_max: levelsJson[2]?.threshold,
        level_4_label: levelsJson[3]?.label || "Niveau 4",
        level_4_max: levelsJson[3]?.threshold,
        created_by: user?.id,
      };

      if (editingId) {
        const { error } = await supabase.from("benchmarks").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("benchmarks").insert(payload);
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

  const resetForm = () => {
    setFormName("");
    setFormTestCategory("");
    setFormTestType("");
    setFormUnit("");
    setFormLowerIsBetter(false);
    setFormLevels([
      { label: "Insuffisant", threshold: "", color: "#ef4444" },
      { label: "Moyen", threshold: "", color: "#f59e0b" },
      { label: "Bon", threshold: "", color: "#22c55e" },
      { label: "Excellent", threshold: "", color: "#10b981" },
    ]);
    setFormUseBodyWeight(false);
    setFormBodyWeightMultiplier("");
    setFormFilterType("all");
    setFormFilterValue("");
  };

  const openCreate = () => {
    resetForm();
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEdit = (b: Benchmark) => {
    setFormName(b.name);
    setFormTestCategory(b.test_category);
    setFormTestType(b.test_type);
    setFormUnit(b.unit || "");
    setFormLowerIsBetter(b.lower_is_better);
    setFormLevels(
      b.levels.length > 0
        ? b.levels.map(l => ({
            label: l.label,
            threshold: l.threshold?.toString() || "",
            color: l.color || "#22c55e",
          }))
        : [
            { label: "Insuffisant", threshold: "", color: "#ef4444" },
            { label: "Bon", threshold: "", color: "#22c55e" },
          ]
    );
    setFormUseBodyWeight(b.use_body_weight_ratio || false);
    setFormBodyWeightMultiplier(b.body_weight_multiplier?.toString() || "");
    setFormFilterType(b.filter_type || "all");
    setFormFilterValue(b.filter_value || "");
    setEditingId(b.id);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    resetForm();
  };

  const handleTestCategoryChange = (val: string) => {
    setFormTestCategory(val);
    setFormTestType("");
  };

  const handleTestTypeChange = (val: string) => {
    const cat = testCategories.find(c => c.value === formTestCategory);
    const test = cat?.tests.find(t => t.value === val);
    setFormTestType(val);
    if (test) {
      setFormUnit(test.unit || formUnit);
      if (!formName) setFormName(test.label);
      setFormLowerIsBetter(test.isTime || false);
    }
  };

  const addLevel = () => {
    const nextColor = DEFAULT_COLORS[formLevels.length % DEFAULT_COLORS.length];
    setFormLevels([...formLevels, { label: "", threshold: "", color: nextColor }]);
  };

  const removeLevel = (index: number) => {
    if (formLevels.length <= 2) return;
    setFormLevels(formLevels.filter((_, i) => i !== index));
  };

  const updateLevel = (index: number, field: keyof LevelForm, value: string) => {
    setFormLevels(formLevels.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
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
                    <TableHead>Niveaux</TableHead>
                    <TableHead>Filtre</TableHead>
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
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {b.lower_is_better && (
                                <Badge variant="outline" className="text-xs">⏱ Plus bas = meilleur</Badge>
                              )}
                              {b.use_body_weight_ratio && (
                                <Badge variant="outline" className="text-xs">
                                  <Weight className="h-3 w-3 mr-1" />
                                  {b.body_weight_multiplier}x PDC
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {b.levels.map((level, i) => (
                              <Badge
                                key={i}
                                className="text-[10px] text-white"
                                style={{ backgroundColor: level.color }}
                              >
                                {level.label}: {level.threshold != null ? `${level.threshold}${b.unit ? ` ${b.unit}` : ""}` : "∞"}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {b.filter_type !== "all" && b.filter_value ? (
                            <Badge variant="secondary" className="text-xs">
                              {b.filter_value}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Tous</span>
                          )}
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
                <Select value={formTestCategory} onValueChange={handleTestCategoryChange}>
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
                <Select value={formTestType} onValueChange={handleTestTypeChange} disabled={!formTestCategory}>
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
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex: 3RM Backsquat"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unité</Label>
                <Input
                  value={formUnit}
                  onChange={e => setFormUnit(e.target.value)}
                  placeholder="Ex: kg, s, m"
                />
              </div>
            </div>

            {/* Lower is better toggle */}
            <div className="flex items-center gap-3">
              <Switch checked={formLowerIsBetter} onCheckedChange={setFormLowerIsBetter} />
              <Label>Plus la valeur est basse, meilleur c'est (temps, etc.)</Label>
            </div>

            {/* Body weight ratio */}
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-3">
                <Switch checked={formUseBodyWeight} onCheckedChange={setFormUseBodyWeight} />
                <Label className="flex items-center gap-1.5">
                  <Weight className="h-4 w-4" />
                  Basé sur le poids de corps
                </Label>
              </div>
              {formUseBodyWeight && (
                <div className="space-y-1.5 pl-6">
                  <Label className="text-xs">Multiplicateur (ex: 2 = 2x le poids du corps)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formBodyWeightMultiplier}
                    onChange={e => setFormBodyWeightMultiplier(e.target.value)}
                    placeholder="Ex: 2.0"
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Les seuils seront automatiquement ajustés selon le poids de chaque athlète.
                  </p>
                </div>
              )}
            </div>

            {/* Filter by position/weight class/discipline */}
            {filterConfig && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Filtrer par {filterConfig.label.toLowerCase()}</Label>
                  <Select value={formFilterType} onValueChange={(v) => { setFormFilterType(v); setFormFilterValue(""); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="filter">Par {filterConfig.label.toLowerCase()}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formFilterType === "filter" && (
                  <div className="space-y-1.5">
                    <Label>{filterConfig.label}</Label>
                    <Select value={formFilterValue} onValueChange={setFormFilterValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filterConfig.options.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Flexible levels */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Niveaux de performance</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLevel} className="gap-1">
                  <Plus className="h-3 w-3" />
                  Niveau
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {formLowerIsBetter
                  ? "Seuils max pour chaque niveau (du moins bon au meilleur)"
                  : "Seuils min pour chaque niveau (du moins bon au meilleur)"
                }
              </p>

              {formLevels.map((level, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-md border" style={{ borderColor: level.color + "60" }}>
                  <input
                    type="color"
                    value={level.color}
                    onChange={e => updateLevel(index, "color", e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  />
                  <div className="flex-1">
                    <Input
                      value={level.label}
                      onChange={e => updateLevel(index, "label", e.target.value)}
                      placeholder={`Niveau ${index + 1}`}
                      className="bg-background"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.01"
                      value={level.threshold}
                      onChange={e => updateLevel(index, "threshold", e.target.value)}
                      placeholder="Seuil"
                      className="bg-background"
                    />
                  </div>
                  <span className="text-xs w-8 text-muted-foreground">{formUseBodyWeight ? "x PDC" : formUnit}</span>
                  {formLevels.length > 2 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLevel(index)} className="h-8 w-8 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annuler</Button>
            <Button
              onClick={() => saveBenchmark.mutate()}
              disabled={!formName || !formTestCategory || !formTestType || saveBenchmark.isPending}
            >
              {saveBenchmark.isPending ? "Enregistrement..." : editingId ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
