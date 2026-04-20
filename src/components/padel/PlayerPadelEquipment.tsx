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
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

interface PlayerPadelEquipmentProps {
  playerId: string;
  categoryId: string;
  isViewer?: boolean;
}

const EQUIPMENT_TYPES = [
  { value: "racket", label: "🏓 Raquette" },
  { value: "shoes", label: "👟 Chaussures" },
  { value: "accessory", label: "🎒 Accessoire" },
];

const SHAPE_OPTIONS = [
  { value: "round", label: "Ronde" },
  { value: "diamond", label: "Diamant" },
  { value: "teardrop", label: "Goutte d'eau" },
  { value: "hybrid", label: "Hybride" },
];

const BALANCE_OPTIONS = [
  { value: "low", label: "Basse (contrôle)" },
  { value: "medium", label: "Moyenne (polyvalente)" },
  { value: "high", label: "Haute (puissance)" },
];

const SURFACE_OPTIONS = [
  { value: "smooth", label: "Lisse" },
  { value: "rough", label: "Rugueuse" },
  { value: "3k_carbon", label: "Carbone 3K" },
  { value: "12k_carbon", label: "Carbone 12K" },
  { value: "18k_carbon", label: "Carbone 18K" },
  { value: "fiberglass", label: "Fibre de verre" },
];

export function PlayerPadelEquipment({ playerId, categoryId, isViewer }: PlayerPadelEquipmentProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({
    equipment_type: "racket",
    racket_brand: "", racket_model: "", racket_weight_g: "",
    racket_shape: "", racket_balance: "", racket_surface: "",
    shoe_brand: "", shoe_model: "",
    accessory_type: "", accessory_brand: "", accessory_description: "",
    notes: "",
  });

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["padel_equipment", playerId, categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_padel_equipment" as any)
        .select("*")
        .eq("player_id", playerId)
        .eq("category_id", categoryId)
        .order("equipment_type");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const resetForm = () => {
    setForm({
      equipment_type: "racket", racket_brand: "", racket_model: "", racket_weight_g: "",
      racket_shape: "", racket_balance: "", racket_surface: "",
      shoe_brand: "", shoe_model: "",
      accessory_type: "", accessory_brand: "", accessory_description: "",
      notes: "",
    });
    setEditingItem(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        player_id: playerId,
        category_id: categoryId,
        equipment_type: form.equipment_type,
        racket_brand: form.racket_brand || null,
        racket_model: form.racket_model || null,
        racket_weight_g: form.racket_weight_g ? parseInt(form.racket_weight_g) : null,
        racket_shape: form.racket_shape || null,
        racket_balance: form.racket_balance || null,
        racket_surface: form.racket_surface || null,
        shoe_brand: form.shoe_brand || null,
        shoe_model: form.shoe_model || null,
        accessory_type: form.accessory_type || null,
        accessory_brand: form.accessory_brand || null,
        accessory_description: form.accessory_description || null,
        notes: form.notes || null,
      };
      if (editingItem) {
        const { error } = await supabase.from("player_padel_equipment" as any).update(payload).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("player_padel_equipment" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["padel_equipment", playerId, categoryId] });
      toast.success(editingItem ? "Matériel mis à jour" : "Matériel ajouté");
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("player_padel_equipment" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["padel_equipment", playerId, categoryId] });
      toast.success("Matériel supprimé");
    },
  });

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      equipment_type: item.equipment_type || "racket",
      racket_brand: item.racket_brand || "", racket_model: item.racket_model || "",
      racket_weight_g: item.racket_weight_g?.toString() || "",
      racket_shape: item.racket_shape || "", racket_balance: item.racket_balance || "",
      racket_surface: item.racket_surface || "",
      shoe_brand: item.shoe_brand || "", shoe_model: item.shoe_model || "",
      accessory_type: item.accessory_type || "", accessory_brand: item.accessory_brand || "",
      accessory_description: item.accessory_description || "",
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const getLabel = (item: any) => {
    if (item.equipment_type === "racket") {
      const parts = [item.racket_brand, item.racket_model].filter(Boolean).join(" ");
      const weight = item.racket_weight_g ? ` (${item.racket_weight_g}g)` : "";
      return parts ? `${parts}${weight}` : "Raquette";
    }
    if (item.equipment_type === "shoes") {
      return [item.shoe_brand, item.shoe_model].filter(Boolean).join(" ") || "Chaussures";
    }
    return [item.accessory_brand, item.accessory_type || item.accessory_description].filter(Boolean).join(" ") || "Accessoire";
  };

  const getIcon = (type: string) => {
    const icons: Record<string, string> = { racket: "🏓", shoes: "👟", accessory: "🎒" };
    return icons[type] || "🏓";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            🏓 Matériel Padel
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
                      {item.racket_shape && <Badge variant="outline" className="text-[10px] px-1">{SHAPE_OPTIONS.find(s => s.value === item.racket_shape)?.label || item.racket_shape}</Badge>}
                      {item.racket_balance && <Badge variant="outline" className="text-[10px] px-1">{BALANCE_OPTIONS.find(b => b.value === item.racket_balance)?.label || item.racket_balance}</Badge>}
                      {item.racket_surface && <Badge variant="outline" className="text-[10px] px-1">{SURFACE_OPTIONS.find(s => s.value === item.racket_surface)?.label || item.racket_surface}</Badge>}
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

            {form.equipment_type === "racket" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Marque</Label><Input value={form.racket_brand} onChange={e => setForm(p => ({ ...p, racket_brand: e.target.value }))} placeholder="Bullpadel, Head..." /></div>
                  <div><Label className="text-xs">Modèle</Label><Input value={form.racket_model} onChange={e => setForm(p => ({ ...p, racket_model: e.target.value }))} placeholder="Vertex 03..." /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Poids (g)</Label><Input type="number" value={form.racket_weight_g} onChange={e => setForm(p => ({ ...p, racket_weight_g: e.target.value }))} placeholder="365" /></div>
                  <div>
                    <Label className="text-xs">Forme</Label>
                    <Select value={form.racket_shape} onValueChange={v => setForm(p => ({ ...p, racket_shape: v }))}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{SHAPE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Balance</Label>
                    <Select value={form.racket_balance} onValueChange={v => setForm(p => ({ ...p, racket_balance: v }))}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{BALANCE_OPTIONS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Surface</Label>
                  <Select value={form.racket_surface} onValueChange={v => setForm(p => ({ ...p, racket_surface: v }))}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{SURFACE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}

            {form.equipment_type === "shoes" && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Marque</Label><Input value={form.shoe_brand} onChange={e => setForm(p => ({ ...p, shoe_brand: e.target.value }))} placeholder="Asics, Nike..." /></div>
                <div><Label className="text-xs">Modèle</Label><Input value={form.shoe_model} onChange={e => setForm(p => ({ ...p, shoe_model: e.target.value }))} placeholder="Gel-Lima..." /></div>
              </div>
            )}

            {form.equipment_type === "accessory" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Type</Label><Input value={form.accessory_type} onChange={e => setForm(p => ({ ...p, accessory_type: e.target.value }))} placeholder="Grip, Surgrip..." /></div>
                  <div><Label className="text-xs">Marque</Label><Input value={form.accessory_brand} onChange={e => setForm(p => ({ ...p, accessory_brand: e.target.value }))} /></div>
                </div>
                <div><Label className="text-xs">Description</Label><Input value={form.accessory_description} onChange={e => setForm(p => ({ ...p, accessory_description: e.target.value }))} placeholder="Détails..." /></div>
              </>
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
