import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Target, Save, BookTemplate, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  getGpsPositionGroups,
  getSystemTemplates,
  suggestTemplate,
  SESSION_TYPES,
  CALENDAR_CONTEXTS,
  type GpsObjectiveTargets,
  type GpsObjectiveTemplate,
} from "@/lib/constants/gpsPositionGroups";

interface AdditionalKpi {
  name: string;
  unit: string;
  target: number | null;
  tolerance: number;
}

interface GroupObjective {
  position_group: string;
  targets: GpsObjectiveTargets;
  additional_kpis: AdditionalKpi[];
  tolerance_green: number;
  tolerance_orange: number;
}

interface GpsObjectivesFormProps {
  categoryId: string;
  trainingSessionId: string;
  sportType: string;
  trainingType?: string | null;
  onClose?: () => void;
}

export function GpsObjectivesForm({
  categoryId,
  trainingSessionId,
  sportType,
  trainingType,
  onClose,
}: GpsObjectivesFormProps) {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<"global" | "position">("position");
  const [objectives, setObjectives] = useState<GroupObjective[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateSessionType, setNewTemplateSessionType] = useState("");
  const [newTemplateCalendarContext, setNewTemplateCalendarContext] = useState("");
  const [autoSuggested, setAutoSuggested] = useState(false);
  const queryClient = useQueryClient();

  const positionGroups = getGpsPositionGroups(sportType);
  const systemTemplates = getSystemTemplates(sportType);

  // Fetch custom templates
  const { data: customTemplates } = useQuery({
    queryKey: ["gps-templates", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gps_objective_templates")
        .select("*")
        .or(`is_system.eq.true,category_id.eq.${categoryId}`)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing objectives for this session
  const { data: existingObjectives } = useQuery({
    queryKey: ["gps-objectives", trainingSessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gps_session_objectives")
        .select("*")
        .eq("training_session_id", trainingSessionId);
      if (error) throw error;
      return data;
    },
  });

  // Initialize from existing objectives
  useEffect(() => {
    if (existingObjectives && existingObjectives.length > 0) {
      setEnabled(true);
      const hasGlobal = existingObjectives.some(o => o.position_group === "Global");
      setMode(hasGlobal ? "global" : "position");
      setObjectives(
        existingObjectives.map(o => ({
          position_group: o.position_group,
          targets: {
            total_distance_m: o.target_total_distance_m ? Number(o.target_total_distance_m) : null,
            high_speed_distance_m: o.target_high_speed_distance_m ? Number(o.target_high_speed_distance_m) : null,
            sprint_count: o.target_sprint_count,
            vmax_percentage: o.target_vmax_percentage ? Number(o.target_vmax_percentage) : null,
          },
          additional_kpis: (o.additional_kpis as unknown as AdditionalKpi[]) || [],
          tolerance_green: Number(o.tolerance_green) || 15,
          tolerance_orange: Number(o.tolerance_orange) || 30,
        }))
      );
    } else {
      initializeEmptyObjectives();
    }
  }, [existingObjectives]);

  // Auto-suggest template based on training type
  useEffect(() => {
    if (autoSuggested || !trainingType || !enabled || (existingObjectives && existingObjectives.length > 0)) return;
    
    const allTemplates = getAllTemplates();
    const suggested = suggestTemplate(allTemplates, trainingType);
    if (suggested) {
      applyTemplate(suggested);
      setAutoSuggested(true);
      toast.info(`Template "${suggested.name}" suggéré automatiquement`, { duration: 3000 });
    }
  }, [trainingType, enabled, autoSuggested]);

  function getAllTemplates(): GpsObjectiveTemplate[] {
    return [
      ...systemTemplates,
      ...(customTemplates || []).map(t => {
        const data = t.template_data as { groups?: GpsObjectiveTemplate["groups"] };
        return {
          id: t.id,
          name: `${t.name} (perso)`,
          session_type: t.session_type || undefined,
          calendar_context: t.calendar_context || undefined,
          groups: data?.groups || [],
        };
      }),
    ];
  }

  function initializeEmptyObjectives() {
    if (mode === "global") {
      setObjectives([{
        position_group: "Global",
        targets: { total_distance_m: null, high_speed_distance_m: null, sprint_count: null, vmax_percentage: null },
        additional_kpis: [],
        tolerance_green: 15,
        tolerance_orange: 30,
      }]);
    } else {
      setObjectives(positionGroups.map(g => ({
        position_group: g.label,
        targets: { total_distance_m: null, high_speed_distance_m: null, sprint_count: null, vmax_percentage: null },
        additional_kpis: [],
        tolerance_green: 15,
        tolerance_orange: 30,
      })));
    }
  }

  useEffect(() => {
    if (enabled && objectives.length === 0) {
      initializeEmptyObjectives();
    }
  }, [enabled, mode]);

  const handleModeChange = (newMode: "global" | "position") => {
    setMode(newMode);
    if (newMode === "global") {
      setObjectives([{
        position_group: "Global",
        targets: { total_distance_m: null, high_speed_distance_m: null, sprint_count: null, vmax_percentage: null },
        additional_kpis: [],
        tolerance_green: 15,
        tolerance_orange: 30,
      }]);
    } else {
      setObjectives(positionGroups.map(g => ({
        position_group: g.label,
        targets: { total_distance_m: null, high_speed_distance_m: null, sprint_count: null, vmax_percentage: null },
        additional_kpis: [],
        tolerance_green: 15,
        tolerance_orange: 30,
      })));
    }
  };

  const applyTemplate = (template: GpsObjectiveTemplate) => {
    setMode("position");
    setObjectives(template.groups.map(g => ({
      position_group: g.position_group,
      targets: { ...g.targets },
      additional_kpis: [],
      tolerance_green: 15,
      tolerance_orange: 30,
    })));
    setSelectedTemplate(template.id);
  };

  const updateTarget = (index: number, field: keyof GpsObjectiveTargets, value: string) => {
    setObjectives(prev => prev.map((obj, i) => {
      if (i !== index) return obj;
      return {
        ...obj,
        targets: {
          ...obj.targets,
          [field]: value === "" ? null : Number(value),
        },
      };
    }));
  };

  const addAdditionalKpi = (index: number) => {
    setObjectives(prev => prev.map((obj, i) => {
      if (i !== index) return obj;
      return {
        ...obj,
        additional_kpis: [...obj.additional_kpis, { name: "", unit: "", target: null, tolerance: 15 }],
      };
    }));
  };

  const updateAdditionalKpi = (objIndex: number, kpiIndex: number, field: string, value: string | number) => {
    setObjectives(prev => prev.map((obj, i) => {
      if (i !== objIndex) return obj;
      return {
        ...obj,
        additional_kpis: obj.additional_kpis.map((kpi, ki) => {
          if (ki !== kpiIndex) return kpi;
          return { ...kpi, [field]: field === "target" || field === "tolerance" ? (value === "" ? null : Number(value)) : value };
        }),
      };
    }));
  };

  const removeAdditionalKpi = (objIndex: number, kpiIndex: number) => {
    setObjectives(prev => prev.map((obj, i) => {
      if (i !== objIndex) return obj;
      return {
        ...obj,
        additional_kpis: obj.additional_kpis.filter((_, ki) => ki !== kpiIndex),
      };
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from("gps_session_objectives")
        .delete()
        .eq("training_session_id", trainingSessionId);

      if (!enabled) return;

      const records = objectives.map(obj => ({
        training_session_id: trainingSessionId,
        category_id: categoryId,
        position_group: obj.position_group,
        target_total_distance_m: obj.targets.total_distance_m,
        target_high_speed_distance_m: obj.targets.high_speed_distance_m,
        target_sprint_count: obj.targets.sprint_count,
        target_vmax_percentage: obj.targets.vmax_percentage,
        additional_kpis: JSON.parse(JSON.stringify(obj.additional_kpis)),
        tolerance_green: obj.tolerance_green,
        tolerance_orange: obj.tolerance_orange,
      }));

      const { error } = await supabase
        .from("gps_session_objectives")
        .insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gps-objectives", trainingSessionId] });
      toast.success("Objectifs GPS enregistrés");
      onClose?.();
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement des objectifs");
    },
  });

  const saveAsTemplate = useMutation({
    mutationFn: async () => {
      const templateData = {
        groups: objectives.map(obj => ({
          position_group: obj.position_group,
          targets: obj.targets,
        })),
      };

      const { error } = await supabase
        .from("gps_objective_templates")
        .insert([{
          category_id: categoryId,
          name: newTemplateName,
          sport_type: sportType,
          is_system: false,
          session_type: newTemplateSessionType || null,
          calendar_context: newTemplateCalendarContext || null,
          template_data: JSON.parse(JSON.stringify(templateData)),
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gps-templates", categoryId] });
      toast.success("Template sauvegardé");
      setSaveDialogOpen(false);
      setNewTemplateName("");
      setNewTemplateSessionType("");
      setNewTemplateCalendarContext("");
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("gps_objective_templates")
        .delete()
        .eq("id", templateId)
        .eq("is_system", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gps-templates", categoryId] });
      toast.success("Template supprimé");
    },
  });

  const allTemplates = getAllTemplates();

  if (!enabled) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Objectifs GPS</p>
                <p className="text-xs text-muted-foreground">Définir des cibles par poste pour cette séance</p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Objectifs GPS
            </CardTitle>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode + Template selector */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={mode === "position" ? "default" : "outline"}
                onClick={() => handleModeChange("position")}
              >
                Par poste
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "global" ? "default" : "outline"}
                onClick={() => handleModeChange("global")}
              >
                Global
              </Button>
            </div>

            {allTemplates.length > 0 && (
              <Select
                value={selectedTemplate}
                onValueChange={(v) => {
                  const tmpl = allTemplates.find(t => t.id === v);
                  if (tmpl) {
                    applyTemplate(tmpl);
                    toast.success(`Template "${tmpl.name}" appliqué`);
                  }
                }}
              >
                <SelectTrigger className="w-[220px] h-8">
                  <BookTemplate className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Charger un template..." />
                </SelectTrigger>
                <SelectContent>
                  {allTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-1">
                        {t.name}
                        {t.session_type && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({SESSION_TYPES.find(s => s.value === t.session_type)?.label || t.session_type})
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Auto-suggest button */}
            {trainingType && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const suggested = suggestTemplate(allTemplates, trainingType);
                  if (suggested) {
                    applyTemplate(suggested);
                    toast.success(`Template "${suggested.name}" appliqué`);
                  } else {
                    toast.info("Aucun template correspondant trouvé");
                  }
                }}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Auto
              </Button>
            )}
          </div>

          {/* Objective forms per group */}
          <div className="space-y-3">
            {objectives.map((obj, index) => (
              <div key={obj.position_group} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                <Badge variant="secondary" className="font-medium">{obj.position_group}</Badge>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Distance totale (m)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 5000"
                      value={obj.targets.total_distance_m ?? ""}
                      onChange={(e) => updateTarget(index, "total_distance_m", e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Dist. haute int. (m)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 600"
                      value={obj.targets.high_speed_distance_m ?? ""}
                      onChange={(e) => updateTarget(index, "high_speed_distance_m", e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nb sprints</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 10"
                      value={obj.targets.sprint_count ?? ""}
                      onChange={(e) => updateTarget(index, "sprint_count", e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">% Vmax</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 90"
                      value={obj.targets.vmax_percentage ?? ""}
                      onChange={(e) => updateTarget(index, "vmax_percentage", e.target.value)}
                      className="h-8"
                    />
                  </div>
                </div>

                {/* Additional KPIs */}
                {obj.additional_kpis.map((kpi, ki) => (
                  <div key={ki} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Nom</Label>
                      <Input
                        placeholder="Ex: Accélérations"
                        value={kpi.name}
                        onChange={(e) => updateAdditionalKpi(index, ki, "name", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="w-20">
                      <Label className="text-xs">Unité</Label>
                      <Input
                        placeholder="Ex: nb"
                        value={kpi.unit}
                        onChange={(e) => updateAdditionalKpi(index, ki, "unit", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Cible</Label>
                      <Input
                        type="number"
                        value={kpi.target ?? ""}
                        onChange={(e) => updateAdditionalKpi(index, ki, "target", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAdditionalKpi(index, ki)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addAdditionalKpi(index)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter un KPI
                </Button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSaveDialogOpen(true)}
            >
              <BookTemplate className="h-3 w-3 mr-1" />
              Sauvegarder comme template
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="h-3 w-3 mr-1" />
              {saveMutation.isPending ? "Enregistrement..." : "Enregistrer les objectifs"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save as template dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sauvegarder comme template</DialogTitle>
            <DialogDescription>
              Ce template sera réutilisable pour les prochaines séances.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom du template *</Label>
              <Input
                placeholder="Ex: Semaine type J-2"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label>Type de séance</Label>
              <Select value={newTemplateSessionType} onValueChange={setNewTemplateSessionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Optionnel..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Non défini</SelectItem>
                  {SESSION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contexte calendrier</Label>
              <Select value={newTemplateCalendarContext} onValueChange={setNewTemplateCalendarContext}>
                <SelectTrigger>
                  <SelectValue placeholder="Optionnel..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Non défini</SelectItem>
                  {CALENDAR_CONTEXTS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => saveAsTemplate.mutate()}
              disabled={!newTemplateName.trim() || saveAsTemplate.isPending}
            >
              {saveAsTemplate.isPending ? "Enregistrement..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
