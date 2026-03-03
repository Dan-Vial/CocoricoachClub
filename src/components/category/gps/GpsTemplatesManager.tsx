import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Target, Plus, Trash2, BookTemplate, Copy, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  getGpsPositionGroups,
  getSystemTemplates,
  SESSION_TYPES,
  CALENDAR_CONTEXTS,
  type GpsObjectiveTargets,
  type GpsObjectiveTemplate,
} from "@/lib/constants/gpsPositionGroups";

interface GpsTemplatesManagerProps {
  categoryId: string;
  sportType: string;
}

export function GpsTemplatesManager({ categoryId, sportType }: GpsTemplatesManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [calendarContext, setCalendarContext] = useState("");
  const [groups, setGroups] = useState<{ position_group: string; targets: GpsObjectiveTargets }[]>([]);
  const queryClient = useQueryClient();

  const positionGroups = getGpsPositionGroups(sportType);
  const systemTemplates = getSystemTemplates(sportType);

  const { data: customTemplates, isLoading } = useQuery({
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

  // Sessions with objectives for quick overview
  const { data: recentObjectives } = useQuery({
    queryKey: ["gps-recent-objectives", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gps_session_objectives")
        .select("*, training_sessions(id, session_date, training_type)")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const templateData = { groups };

      if (editingTemplate) {
        const { error } = await supabase
          .from("gps_objective_templates")
          .update({
            name: templateName,
            session_type: sessionType || null,
            calendar_context: calendarContext || null,
            template_data: JSON.parse(JSON.stringify(templateData)),
          })
          .eq("id", editingTemplate)
          .eq("is_system", false);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("gps_objective_templates")
          .insert([{
            category_id: categoryId,
            name: templateName,
            sport_type: sportType,
            is_system: false,
            session_type: sessionType || null,
            calendar_context: calendarContext || null,
            template_data: JSON.parse(JSON.stringify(templateData)),
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gps-templates", categoryId] });
      toast.success(editingTemplate ? "Template mis à jour" : "Template créé");
      resetForm();
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gps_objective_templates")
        .delete()
        .eq("id", id)
        .eq("is_system", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gps-templates", categoryId] });
      toast.success("Template supprimé");
    },
  });

  function resetForm() {
    setCreateDialogOpen(false);
    setEditingTemplate(null);
    setTemplateName("");
    setSessionType("");
    setCalendarContext("");
    setGroups([]);
  }

  function openCreateDialog(fromTemplate?: GpsObjectiveTemplate) {
    if (fromTemplate) {
      setTemplateName(`${fromTemplate.name} (copie)`);
      setSessionType(fromTemplate.session_type || "");
      setCalendarContext(fromTemplate.calendar_context || "");
      setGroups(fromTemplate.groups.map(g => ({ ...g, targets: { ...g.targets } })));
    } else {
      setTemplateName("");
      setSessionType("");
      setCalendarContext("");
      setGroups(positionGroups.map(g => ({
        position_group: g.label,
        targets: { total_distance_m: null, high_speed_distance_m: null, sprint_count: null, vmax_percentage: null },
      })));
    }
    setEditingTemplate(null);
    setCreateDialogOpen(true);
  }

  function openEditDialog(templateId: string) {
    const tmpl = customTemplates?.find(t => t.id === templateId);
    if (!tmpl) return;
    const data = tmpl.template_data as { groups?: GpsObjectiveTemplate["groups"] };
    setTemplateName(tmpl.name);
    setSessionType(tmpl.session_type || "");
    setCalendarContext(tmpl.calendar_context || "");
    setGroups(data?.groups?.map(g => ({ ...g, targets: { ...g.targets } })) || []);
    setEditingTemplate(templateId);
    setCreateDialogOpen(true);
  }

  function updateGroupTarget(groupIndex: number, field: keyof GpsObjectiveTargets, value: string) {
    setGroups(prev => prev.map((g, i) => {
      if (i !== groupIndex) return g;
      return { ...g, targets: { ...g.targets, [field]: value === "" ? null : Number(value) } };
    }));
  }

  // Get unique sessions that have objectives
  const uniqueSessions = recentObjectives
    ? [...new Map(recentObjectives.map(o => [o.training_session_id, o])).values()]
    : [];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BookTemplate className="h-5 w-5 text-primary" />
              Templates GPS
            </h3>
            <p className="text-sm text-muted-foreground">
              Créez et gérez vos modèles d'objectifs GPS par type de séance
            </p>
          </div>
          <Button onClick={() => openCreateDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau template
          </Button>
        </div>

        {/* System templates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Templates prédéfinis ({systemTemplates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {systemTemplates.map(tmpl => (
                <div key={tmpl.id} className="p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{tmpl.name}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCreateDialog(tmpl)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tmpl.session_type && (
                      <Badge variant="outline" className="text-[10px]">
                        {SESSION_TYPES.find(s => s.value === tmpl.session_type)?.label || tmpl.session_type}
                      </Badge>
                    )}
                    {tmpl.groups.map(g => (
                      <Badge key={g.position_group} variant="secondary" className="text-[10px]">
                        {g.position_group}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {tmpl.groups.map(g => (
                      <div key={g.position_group}>
                        <span className="font-medium">{g.position_group}:</span>{" "}
                        {g.targets.total_distance_m && `${g.targets.total_distance_m}m`}
                        {g.targets.high_speed_distance_m && ` • HI ${g.targets.high_speed_distance_m}m`}
                        {g.targets.sprint_count != null && ` • ${g.targets.sprint_count} sprints`}
                        {g.targets.vmax_percentage && ` • ${g.targets.vmax_percentage}% Vmax`}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom templates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mes templates personnalisés ({customTemplates?.filter(t => !t.is_system).length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!customTemplates || customTemplates.filter(t => !t.is_system).length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucun template personnalisé. Créez-en un ou dupliquez un template prédéfini.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {customTemplates.filter(t => !t.is_system).map(tmpl => {
                  const data = tmpl.template_data as { groups?: GpsObjectiveTemplate["groups"] };
                  return (
                    <div key={tmpl.id} className="p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{tmpl.name}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(tmpl.id)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(tmpl.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tmpl.session_type && (
                          <Badge variant="outline" className="text-[10px]">
                            {SESSION_TYPES.find(s => s.value === tmpl.session_type)?.label || tmpl.session_type}
                          </Badge>
                        )}
                        {tmpl.calendar_context && (
                          <Badge variant="outline" className="text-[10px]">
                            {CALENDAR_CONTEXTS.find(c => c.value === tmpl.calendar_context)?.label || tmpl.calendar_context}
                          </Badge>
                        )}
                      </div>
                      {data?.groups && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {data.groups.map(g => (
                            <div key={g.position_group}>
                              <span className="font-medium">{g.position_group}:</span>{" "}
                              {g.targets.total_distance_m && `${g.targets.total_distance_m}m`}
                              {g.targets.high_speed_distance_m && ` • HI ${g.targets.high_speed_distance_m}m`}
                              {g.targets.sprint_count != null && ` • ${g.targets.sprint_count} sprints`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent sessions with objectives */}
        {uniqueSessions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dernières séances avec objectifs ({uniqueSessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Groupes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uniqueSessions.map(obj => {
                      const session = obj.training_sessions as { id: string; session_date: string; training_type: string } | null;
                      const sessionObjectives = recentObjectives?.filter(o => o.training_session_id === obj.training_session_id) || [];
                      return (
                        <TableRow key={obj.training_session_id}>
                          <TableCell className="text-sm">{session?.session_date || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{session?.training_type || "—"}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {sessionObjectives.map(o => (
                                <Badge key={o.id} variant="secondary" className="text-[10px]">{o.position_group}</Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(v) => { if (!v) resetForm(); else setCreateDialogOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Modifier le template" : "Créer un template GPS"}</DialogTitle>
            <DialogDescription>
              Définissez les objectifs GPS par groupe de postes pour ce modèle de séance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nom du template *</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: Vitesse J-3"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type de séance</Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Optionnel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {SESSION_TYPES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contexte calendrier</Label>
                <Select value={calendarContext} onValueChange={setCalendarContext}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Optionnel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {CALENDAR_CONTEXTS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* KPI targets per group */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Objectifs par groupe de postes</Label>
              {groups.map((group, index) => (
                <div key={group.position_group} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                  <Badge variant="secondary" className="font-medium">{group.position_group}</Badge>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Distance totale (m)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 5000"
                        value={group.targets.total_distance_m ?? ""}
                        onChange={(e) => updateGroupTarget(index, "total_distance_m", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Dist. haute int. (m)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 600"
                        value={group.targets.high_speed_distance_m ?? ""}
                        onChange={(e) => updateGroupTarget(index, "high_speed_distance_m", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Nb sprints</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 10"
                        value={group.targets.sprint_count ?? ""}
                        onChange={(e) => updateGroupTarget(index, "sprint_count", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">% Vmax</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 90"
                        value={group.targets.vmax_percentage ?? ""}
                        onChange={(e) => updateGroupTarget(index, "vmax_percentage", e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Annuler</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!templateName.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Enregistrement..." : editingTemplate ? "Mettre à jour" : "Créer le template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
