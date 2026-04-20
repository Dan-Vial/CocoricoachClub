import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Snowflake, Mountain, Droplets, Edit } from "lucide-react";
import { toast } from "sonner";

interface PlayerSkiEquipmentProps {
  playerId: string;
  categoryId: string;
  isViewer?: boolean;
}

const EQUIPMENT_TYPES = [
  { value: "ski", label: "🎿 Ski", icon: Mountain },
  { value: "snowboard", label: "🏂 Snowboard", icon: Mountain },
  { value: "wax", label: "🧴 Fart", icon: Droplets },
  { value: "boots", label: "🥾 Chaussures", icon: Snowflake },
];

const STIFFNESS_OPTIONS = [
  { value: "soft", label: "Souple" },
  { value: "medium_soft", label: "Mi-souple" },
  { value: "medium", label: "Medium" },
  { value: "medium_stiff", label: "Mi-rigide" },
  { value: "stiff", label: "Rigide" },
  { value: "very_stiff", label: "Très rigide" },
];

const CAMBER_TYPES = [
  { value: "camber", label: "Cambre classique" },
  { value: "rocker", label: "Rocker" },
  { value: "flat", label: "Plat" },
  { value: "camber_rocker", label: "Cambre/Rocker" },
  { value: "rocker_camber_rocker", label: "Rocker/Cambre/Rocker" },
  { value: "full_rocker", label: "Full Rocker" },
];

const SOLE_STRUCTURES = [
  { value: "flat", label: "Lisse" },
  { value: "linear", label: "Linéaire" },
  { value: "cross", label: "Croisée" },
  { value: "broken_linear", label: "Linéaire brisée" },
];

export function PlayerSkiEquipment({ playerId, categoryId, isViewer }: PlayerSkiEquipmentProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({
    equipment_type: "ski",
    ski_brand: "", ski_model: "", ski_length_cm: "", ski_radius_m: "", ski_stiffness: "",
    sole_structure: "", camber_type: "",
    wax_brand: "", wax_type: "", wax_temp_range: "", wax_humidity_range: "",
    boot_brand: "", boot_model: "", boot_flex: "",
    notes: "",
  });

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["ski_equipment", playerId, categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_ski_equipment")
        .select("*")
        .eq("player_id", playerId)
        .eq("category_id", categoryId)
        .order("equipment_type");
      if (error) throw error;
      return data || [];
    },
  });

  const resetForm = () => {
    setForm({
      equipment_type: "ski", ski_brand: "", ski_model: "", ski_length_cm: "", ski_radius_m: "",
      ski_stiffness: "", sole_structure: "", camber_type: "",
      wax_brand: "", wax_type: "", wax_temp_range: "", wax_humidity_range: "",
      boot_brand: "", boot_model: "", boot_flex: "", notes: "",
    });
    setEditingItem(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        player_id: playerId,
        category_id: categoryId,
        equipment_type: form.equipment_type,
        ski_brand: form.ski_brand || null,
        ski_model: form.ski_model || null,
        ski_length_cm: form.ski_length_cm ? parseFloat(form.ski_length_cm) : null,
        ski_radius_m: form.ski_radius_m ? parseFloat(form.ski_radius_m) : null,
        ski_stiffness: form.ski_stiffness || null,
        sole_structure: form.sole_structure || null,
        camber_type: form.camber_type || null,
        wax_brand: form.wax_brand || null,
        wax_type: form.wax_type || null,
        wax_temp_range: form.wax_temp_range || null,
        wax_humidity_range: form.wax_humidity_range || null,
        boot_brand: form.boot_brand || null,
        boot_model: form.boot_model || null,
        boot_flex: form.boot_flex ? parseInt(form.boot_flex) : null,
        notes: form.notes || null,
      };
      if (editingItem) {
        const { error } = await supabase.from("player_ski_equipment").update(payload).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("player_ski_equipment").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ski_equipment", playerId, categoryId] });
      toast.success(editingItem ? "Matériel mis à jour" : "Matériel ajouté");
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("player_ski_equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ski_equipment", playerId, categoryId] });
      toast.success("Matériel supprimé");
    },
  });

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      equipment_type: item.equipment_type || "ski",
      ski_brand: item.ski_brand || "", ski_model: item.ski_model || "",
      ski_length_cm: item.ski_length_cm?.toString() || "", ski_radius_m: item.ski_radius_m?.toString() || "",
      ski_stiffness: item.ski_stiffness || "", sole_structure: item.sole_structure || "",
      camber_type: item.camber_type || "",
      wax_brand: item.wax_brand || "", wax_type: item.wax_type || "",
      wax_temp_range: item.wax_temp_range || "", wax_humidity_range: item.wax_humidity_range || "",
      boot_brand: item.boot_brand || "", boot_model: item.boot_model || "",
      boot_flex: item.boot_flex?.toString() || "", notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const getLabel = (item: any) => {
    if (item.equipment_type === "ski" || item.equipment_type === "snowboard") {
      return `${item.ski_brand || ""} ${item.ski_model || ""}${item.ski_length_cm ? ` (${item.ski_length_cm}cm)` : ""}`.trim() || (item.equipment_type === "ski" ? "Ski" : "Snowboard");
    }
    if (item.equipment_type === "wax") {
      return `${item.wax_brand || ""} ${item.wax_type || "Fart"}${item.wax_temp_range ? ` [${item.wax_temp_range}]` : ""}`.trim();
    }
    return `${item.boot_brand || ""} ${item.boot_model || "Chaussures"}${item.boot_flex ? ` (flex ${item.boot_flex})` : ""}`.trim();
  };

  const getIcon = (type: string) => {
    const icons: Record<string, string> = { ski: "🎿", snowboard: "🏂", wax: "🧴", boots: "🥾" };
    return icons[type] || "🎿";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mountain className="h-4 w-4" />
            Matériel Ski / Snow
          </CardTitle>
          {!isViewer && (
            <Button size="sm" variant="outline" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : equipment.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun matériel enregistré</p>
        ) : (
          <div className="space-y-2">
            {equipment.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2">
                  <span>{getIcon(item.equipment_type)}</span>
                  <div>
                    <p className="text-sm font-medium">{getLabel(item)}</p>
                    {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                    <div className="flex gap-1 mt-0.5">
                      {item.camber_type && <Badge variant="outline" className="text-[10px] px-1">{CAMBER_TYPES.find(c => c.value === item.camber_type)?.label || item.camber_type}</Badge>}
                      {item.ski_stiffness && <Badge variant="outline" className="text-[10px] px-1">{STIFFNESS_OPTIONS.find(s => s.value === item.ski_stiffness)?.label || item.ski_stiffness}</Badge>}
                      {item.sole_structure && <Badge variant="outline" className="text-[10px] px-1">{SOLE_STRUCTURES.find(s => s.value === item.sole_structure)?.label || item.sole_structure}</Badge>}
                    </div>
                  </div>
                </div>
                {!isViewer && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Modifier" : "Ajouter"} du matériel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.equipment_type} onValueChange={v => setForm(p => ({ ...p, equipment_type: v }))} disabled={!!editingItem}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {(form.equipment_type === "ski" || form.equipment_type === "snowboard") && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Marque</Label><Input value={form.ski_brand} onChange={e => setForm(p => ({ ...p, ski_brand: e.target.value }))} placeholder="Rossignol, Burton..." /></div>
                  <div><Label className="text-xs">Modèle</Label><Input value={form.ski_model} onChange={e => setForm(p => ({ ...p, ski_model: e.target.value }))} placeholder="Hero Elite..." /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Longueur (cm)</Label><Input type="number" value={form.ski_length_cm} onChange={e => setForm(p => ({ ...p, ski_length_cm: e.target.value }))} placeholder="165" /></div>
                  <div><Label className="text-xs">Rayon (m)</Label><Input type="number" step="0.1" value={form.ski_radius_m} onChange={e => setForm(p => ({ ...p, ski_radius_m: e.target.value }))} placeholder="14.5" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Rigidité</Label>
                    <Select value={form.ski_stiffness} onValueChange={v => setForm(p => ({ ...p, ski_stiffness: v }))}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{STIFFNESS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Cambre / Rocker</Label>
                    <Select value={form.camber_type} onValueChange={v => setForm(p => ({ ...p, camber_type: v }))}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{CAMBER_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Structure de semelle</Label>
                  <Select value={form.sole_structure} onValueChange={v => setForm(p => ({ ...p, sole_structure: v }))}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{SOLE_STRUCTURES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}

            {form.equipment_type === "wax" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Marque</Label><Input value={form.wax_brand} onChange={e => setForm(p => ({ ...p, wax_brand: e.target.value }))} placeholder="Swix, Toko..." /></div>
                  <div><Label className="text-xs">Type</Label><Input value={form.wax_type} onChange={e => setForm(p => ({ ...p, wax_type: e.target.value }))} placeholder="HF, LF, CH..." /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Plage temp. neige</Label><Input value={form.wax_temp_range} onChange={e => setForm(p => ({ ...p, wax_temp_range: e.target.value }))} placeholder="-10°C à -3°C" /></div>
                  <div><Label className="text-xs">Plage humidité</Label><Input value={form.wax_humidity_range} onChange={e => setForm(p => ({ ...p, wax_humidity_range: e.target.value }))} placeholder="40-60%" /></div>
                </div>
              </>
            )}

            {form.equipment_type === "boots" && (
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Marque</Label><Input value={form.boot_brand} onChange={e => setForm(p => ({ ...p, boot_brand: e.target.value }))} placeholder="Lange..." /></div>
                <div><Label className="text-xs">Modèle</Label><Input value={form.boot_model} onChange={e => setForm(p => ({ ...p, boot_model: e.target.value }))} /></div>
                <div><Label className="text-xs">Flex</Label><Input type="number" value={form.boot_flex} onChange={e => setForm(p => ({ ...p, boot_flex: e.target.value }))} placeholder="130" /></div>
              </div>
            )}

            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Détails supplémentaires..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Sauvegarde..." : editingItem ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}