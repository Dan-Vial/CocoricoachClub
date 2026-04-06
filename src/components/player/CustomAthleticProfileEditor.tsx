import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Settings2, Save } from "lucide-react";
import { toast } from "sonner";

interface CustomAthleticProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

interface CustomTest {
  key: string;
  label: string;
  shortLabel: string;
  unit: string;
  testType: string;
  tableSource: "speed_tests" | "jump_tests" | "generic_tests";
  higherIsBetter: boolean;
}

interface ProfileType {
  label: string;
  description: string;
  recommendations: string[];
  thresholdMin?: number;
  thresholdMax?: number;
}

interface CustomProfileData {
  name: string;
  description: string;
  tests: CustomTest[];
  profile_types: {
    profiles: {
      key: string;
      label: string;
      description: string;
      recommendations: string[];
      thresholdMin?: number;
      thresholdMax?: number;
    }[];
  };
}

const TABLE_SOURCES = [
  { value: "speed_tests", label: "Tests de vitesse" },
  { value: "jump_tests", label: "Tests de détente" },
  { value: "generic_tests", label: "Tests génériques" },
];

const emptyTest: CustomTest = {
  key: "",
  label: "",
  shortLabel: "",
  unit: "",
  testType: "",
  tableSource: "generic_tests",
  higherIsBetter: true,
};

const emptyProfile = {
  key: "",
  label: "",
  description: "",
  recommendations: [""],
  thresholdMin: undefined as number | undefined,
  thresholdMax: undefined as number | undefined,
};

export function CustomAthleticProfileEditor({ open, onOpenChange, categoryId }: CustomAthleticProfileEditorProps) {
  const queryClient = useQueryClient();

  const { data: existingProfile } = useQuery({
    queryKey: ["custom_athletic_profile", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_athletic_profiles")
        .select("*")
        .eq("category_id", categoryId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const [name, setName] = useState("Profil personnalisé");
  const [description, setDescription] = useState("");
  const [tests, setTests] = useState<CustomTest[]>([{ ...emptyTest }, { ...emptyTest }]);
  const [profiles, setProfiles] = useState([
    { ...emptyProfile, key: "primary", label: "Profil Qualité 1" },
    { ...emptyProfile, key: "balanced", label: "Profil Équilibré" },
    { ...emptyProfile, key: "secondary", label: "Profil Qualité 2" },
  ]);

  useEffect(() => {
    if (existingProfile) {
      setName(existingProfile.name || "Profil personnalisé");
      setDescription(existingProfile.description || "");
      const testsData = existingProfile.tests as unknown as CustomTest[];
      if (Array.isArray(testsData) && testsData.length >= 2) {
        setTests(testsData);
      }
      const profileTypes = existingProfile.profile_types as unknown as { profiles?: typeof profiles };
      if (profileTypes?.profiles && Array.isArray(profileTypes.profiles)) {
        setProfiles(profileTypes.profiles);
      }
    }
  }, [existingProfile]);

  const mutation = useMutation({
    mutationFn: async () => {
      // Validate
      if (tests.length < 2) throw new Error("Au moins 2 tests requis");
      for (const t of tests) {
        if (!t.label || !t.testType || !t.unit) throw new Error("Tous les tests doivent être renseignés");
      }
      for (const p of profiles) {
        if (!p.label) throw new Error("Tous les profils doivent avoir un label");
      }

      // Auto-generate keys for tests
      const processedTests = tests.map((t, i) => ({
        ...t,
        key: t.key || `test_${i}`,
      }));

      const payload = {
        category_id: categoryId,
        name,
        description,
        tests: JSON.parse(JSON.stringify(processedTests)),
        profile_types: JSON.parse(JSON.stringify({ profiles })),
        is_active: true,
      };

      if (existingProfile) {
        const { error } = await supabase
          .from("custom_athletic_profiles")
          .update(payload)
          .eq("id", existingProfile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("custom_athletic_profiles")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom_athletic_profile", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["player_athletic_profile"] });
      toast.success("Profil athlétique personnalisé enregistré");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message || "Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!existingProfile) return;
      const { error } = await supabase
        .from("custom_athletic_profiles")
        .delete()
        .eq("id", existingProfile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom_athletic_profile", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["player_athletic_profile"] });
      toast.success("Profil personnalisé supprimé, retour au profil par défaut");
      onOpenChange(false);
    },
  });

  const updateTest = (index: number, field: keyof CustomTest, value: string | boolean) => {
    setTests(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const addTest = () => {
    if (tests.length >= 5) return;
    setTests(prev => [...prev, { ...emptyTest }]);
  };

  const removeTest = (index: number) => {
    if (tests.length <= 2) return;
    setTests(prev => prev.filter((_, i) => i !== index));
  };

  const updateProfile = (index: number, field: string, value: string | number | string[] | undefined) => {
    setProfiles(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const addProfile = () => {
    if (profiles.length >= 6) return;
    setProfiles(prev => [...prev, { ...emptyProfile, key: `profile_${prev.length}` }]);
  };

  const removeProfile = (index: number) => {
    if (profiles.length <= 2) return;
    setProfiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateRecommendation = (profileIndex: number, recIndex: number, value: string) => {
    setProfiles(prev => prev.map((p, pi) => {
      if (pi !== profileIndex) return p;
      const recs = [...p.recommendations];
      recs[recIndex] = value;
      return { ...p, recommendations: recs };
    }));
  };

  const addRecommendation = (profileIndex: number) => {
    setProfiles(prev => prev.map((p, pi) => {
      if (pi !== profileIndex) return p;
      return { ...p, recommendations: [...p.recommendations, ""] };
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Profil athlétique personnalisé
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* General info */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Nom du profil</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Profil Force/Vitesse" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description des qualités physiques comparées..." rows={2} />
            </div>
          </div>

          {/* Tests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Tests / Exercices à comparer
                <Button variant="outline" size="sm" onClick={addTest} disabled={tests.length >= 5}>
                  <Plus className="h-3 w-3 mr-1" /> Ajouter
                </Button>
              </CardTitle>
              <p className="text-sm text-muted-foreground">Définissez les tests physiques qui serviront à calculer le profil</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {tests.map((test, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Test {i + 1}</span>
                    {tests.length > 2 && (
                      <Button variant="ghost" size="sm" onClick={() => removeTest(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nom complet</Label>
                      <Input value={test.label} onChange={e => updateTest(i, "label", e.target.value)} placeholder="Ex: Sprint 40m" />
                    </div>
                    <div>
                      <Label className="text-xs">Label court</Label>
                      <Input value={test.shortLabel} onChange={e => updateTest(i, "shortLabel", e.target.value)} placeholder="Ex: Vmax" />
                    </div>
                    <div>
                      <Label className="text-xs">Unité</Label>
                      <Input value={test.unit} onChange={e => updateTest(i, "unit", e.target.value)} placeholder="Ex: km/h, cm, s" />
                    </div>
                    <div>
                      <Label className="text-xs">Type de test (identifiant)</Label>
                      <Input value={test.testType} onChange={e => updateTest(i, "testType", e.target.value)} placeholder="Ex: 40m_sprint" />
                    </div>
                    <div>
                      <Label className="text-xs">Source</Label>
                      <Select value={test.tableSource} onValueChange={v => updateTest(i, "tableSource", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TABLE_SOURCES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <Switch
                        checked={test.higherIsBetter}
                        onCheckedChange={v => updateTest(i, "higherIsBetter", v)}
                      />
                      <Label className="text-xs">
                        {test.higherIsBetter ? "Plus haut = meilleur" : "Plus bas = meilleur"}
                      </Label>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Profiles / Qualities */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Profils / Qualités physiques
                <Button variant="outline" size="sm" onClick={addProfile} disabled={profiles.length >= 6}>
                  <Plus className="h-3 w-3 mr-1" /> Ajouter
                </Button>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Définissez les profils athlétiques et les seuils. Si le ratio est entre les seuils min et max, l'athlète est de ce profil.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {profiles.map((profile, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Profil {i + 1}</span>
                    {profiles.length > 2 && (
                      <Button variant="ghost" size="sm" onClick={() => removeProfile(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nom du profil</Label>
                      <Input value={profile.label} onChange={e => updateProfile(i, "label", e.target.value)} placeholder="Ex: Profil Vitesse" />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input value={profile.description} onChange={e => updateProfile(i, "description", e.target.value)} placeholder="Ex: Excellente vitesse de pointe" />
                    </div>
                    <div>
                      <Label className="text-xs">Ratio min (%)</Label>
                      <Input type="number" value={profile.thresholdMin ?? ""} onChange={e => updateProfile(i, "thresholdMin", e.target.value ? Number(e.target.value) : undefined)} placeholder="Ex: 55" />
                    </div>
                    <div>
                      <Label className="text-xs">Ratio max (%)</Label>
                      <Input type="number" value={profile.thresholdMax ?? ""} onChange={e => updateProfile(i, "thresholdMax", e.target.value ? Number(e.target.value) : undefined)} placeholder="Ex: 100" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Recommandations</Label>
                    {profile.recommendations.map((rec, ri) => (
                      <Input key={ri} className="mt-1" value={rec} onChange={e => updateRecommendation(i, ri, e.target.value)} placeholder="Recommandation..." />
                    ))}
                    <Button variant="ghost" size="sm" className="mt-1" onClick={() => addRecommendation(i)}>
                      <Plus className="h-3 w-3 mr-1" /> Ajouter une recommandation
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <div>
              {existingProfile && (
                <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                  Supprimer (revenir au profil par défaut)
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
