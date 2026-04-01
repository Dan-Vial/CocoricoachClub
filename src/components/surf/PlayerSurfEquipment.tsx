import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, Waves, Wind, Shirt } from "lucide-react";
import { toast } from "sonner";

interface PlayerSurfEquipmentProps {
  playerId: string;
  categoryId: string;
  isViewer?: boolean;
}

const BOARD_TYPES = [
  { value: "shortboard", label: "Shortboard" },
  { value: "longboard", label: "Longboard" },
  { value: "fish", label: "Fish" },
  { value: "gun", label: "Gun" },
  { value: "funboard", label: "Funboard" },
  { value: "mid_length", label: "Mid-length" },
  { value: "foil", label: "Foilboard" },
  { value: "bodyboard", label: "Bodyboard" },
  { value: "sup", label: "SUP" },
];

const FINS_TYPES = [
  { value: "thruster", label: "Thruster (3)" },
  { value: "quad", label: "Quad (4)" },
  { value: "twin", label: "Twin (2)" },
  { value: "single", label: "Single (1)" },
  { value: "2+1", label: "2+1" },
  { value: "5_fins", label: "5 fins" },
];

const WETSUIT_THICKNESSES = [
  { value: "shorty", label: "Shorty" },
  { value: "2/2", label: "2/2 mm" },
  { value: "3/2", label: "3/2 mm" },
  { value: "4/3", label: "4/3 mm" },
  { value: "5/4", label: "5/4 mm" },
  { value: "5/4/3", label: "5/4/3 mm" },
  { value: "lycra", label: "Lycra / Top UV" },
];

const EQUIPMENT_TYPES = [
  { value: "board", label: "Planche", icon: Waves },
  { value: "fins", label: "Ailerons", icon: Wind },
  { value: "wetsuit", label: "Combinaison", icon: Shirt },
];

export function PlayerSurfEquipment({ playerId, categoryId, isViewer }: PlayerSurfEquipmentProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const queryClient = useQueryClient();

  // Form state
  const [equipmentType, setEquipmentType] = useState("board");
  const [boardBrand, setBoardBrand] = useState("");
  const [boardModel, setBoardModel] = useState("");
  const [boardShaper, setBoardShaper] = useState("");
  const [boardLengthFeet, setBoardLengthFeet] = useState("");
  const [boardWidthInches, setBoardWidthInches] = useState("");
  const [boardThicknessInches, setBoardThicknessInches] = useState("");
  const [boardVolumeLiters, setBoardVolumeLiters] = useState("");
  const [boardType, setBoardType] = useState("");
  const [finsType, setFinsType] = useState("");
  const [finsBrand, setFinsBrand] = useState("");
  const [finsModel, setFinsModel] = useState("");
  const [wetsuitThickness, setWetsuitThickness] = useState("");
  const [wetsuitBrand, setWetsuitBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["surf_equipment", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_surf_equipment")
        .select("*")
        .eq("player_id", playerId)
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const resetForm = () => {
    setEquipmentType("board");
    setBoardBrand(""); setBoardModel(""); setBoardShaper("");
    setBoardLengthFeet(""); setBoardWidthInches(""); setBoardThicknessInches("");
    setBoardVolumeLiters(""); setBoardType("");
    setFinsType(""); setFinsBrand(""); setFinsModel("");
    setWetsuitThickness(""); setWetsuitBrand("");
    setNotes(""); setPurchaseDate("");
    setEditingItem(null);
  };

  const populateForm = (item: any) => {
    setEquipmentType(item.equipment_type || "board");
    setBoardBrand(item.board_brand || "");
    setBoardModel(item.board_model || "");
    setBoardShaper(item.board_shaper || "");
    setBoardLengthFeet(item.board_length_feet?.toString() || "");
    setBoardWidthInches(item.board_width_inches?.toString() || "");
    setBoardThicknessInches(item.board_thickness_inches?.toString() || "");
    setBoardVolumeLiters(item.board_volume_liters?.toString() || "");
    setBoardType(item.board_type || "");
    setFinsType(item.fins_type || "");
    setFinsBrand(item.fins_brand || "");
    setFinsModel(item.fins_model || "");
    setWetsuitThickness(item.wetsuit_thickness || "");
    setWetsuitBrand(item.wetsuit_brand || "");
    setNotes(item.notes || "");
    setPurchaseDate(item.purchase_date || "");
    setEditingItem(item);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        player_id: playerId,
        category_id: categoryId,
        equipment_type: equipmentType,
        board_brand: boardBrand || null,
        board_model: boardModel || null,
        board_shaper: boardShaper || null,
        board_length_feet: boardLengthFeet ? parseFloat(boardLengthFeet) : null,
        board_width_inches: boardWidthInches ? parseFloat(boardWidthInches) : null,
        board_thickness_inches: boardThicknessInches ? parseFloat(boardThicknessInches) : null,
        board_volume_liters: boardVolumeLiters ? parseFloat(boardVolumeLiters) : null,
        board_type: boardType || null,
        fins_type: finsType || null,
        fins_brand: finsBrand || null,
        fins_model: finsModel || null,
        wetsuit_thickness: wetsuitThickness || null,
        wetsuit_brand: wetsuitBrand || null,
        notes: notes || null,
        purchase_date: purchaseDate || null,
      };
      if (editingItem) {
        const { error } = await supabase.from("player_surf_equipment").update(payload).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("player_surf_equipment").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surf_equipment", playerId] });
      toast.success(editingItem ? "Équipement modifié" : "Équipement ajouté");
      resetForm();
      setIsAddOpen(false);
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("player_surf_equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surf_equipment", playerId] });
      toast.success("Équipement supprimé");
    },
    onError: () => toast.error("Erreur"),
  });

  const getEquipmentLabel = (item: any) => {
    if (item.equipment_type === "board") {
      const type = BOARD_TYPES.find(b => b.value === item.board_type)?.label || "";
      const dims = [item.board_length_feet && `${item.board_length_feet}'`, item.board_width_inches && `${item.board_width_inches}"`, item.board_thickness_inches && `${item.board_thickness_inches}"`].filter(Boolean).join(" × ");
      return `${item.board_brand || ""} ${item.board_model || type}${dims ? ` (${dims})` : ""}`.trim() || "Planche";
    }
    if (item.equipment_type === "fins") {
      const type = FINS_TYPES.find(f => f.value === item.fins_type)?.label || "";
      return `${item.fins_brand || ""} ${item.fins_model || type}`.trim() || "Ailerons";
    }
    if (item.equipment_type === "wetsuit") {
      return `${item.wetsuit_brand || ""} ${item.wetsuit_thickness || ""}`.trim() || "Combinaison";
    }
    return "Équipement";
  };

  const getTypeIcon = (type: string) => {
    const config = EQUIPMENT_TYPES.find(t => t.value === type);
    if (!config) return <Waves className="h-4 w-4" />;
    const Icon = config.icon;
    return <Icon className="h-4 w-4" />;
  };

  const getTypeBadgeColor = (type: string) => {
    if (type === "board") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    if (type === "fins") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  };

  if (isLoading) return <p className="text-muted-foreground">Chargement...</p>;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Waves className="h-5 w-5" />
            Équipement
          </CardTitle>
          {!isViewer && (
            <Button size="sm" onClick={() => { resetForm(); setIsAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {equipment.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Aucun équipement enregistré</p>
        ) : (
          <div className="space-y-3">
            {equipment.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  {getTypeIcon(item.equipment_type)}
                  <div>
                    <div className="font-medium text-sm">{getEquipmentLabel(item)}</div>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className={`text-xs ${getTypeBadgeColor(item.equipment_type)}`}>
                        {EQUIPMENT_TYPES.find(t => t.value === item.equipment_type)?.label}
                      </Badge>
                      {item.board_volume_liters && (
                        <Badge variant="secondary" className="text-xs">{item.board_volume_liters}L</Badge>
                      )}
                      {!item.is_active && (
                        <Badge variant="destructive" className="text-xs">Inactif</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {!isViewer && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { populateForm(item); setIsAddOpen(true); }}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isAddOpen} onOpenChange={(v) => { if (!v) resetForm(); setIsAddOpen(v); }}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Modifier l'équipement" : "Ajouter un équipement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type d'équipement</Label>
              <Select value={equipmentType} onValueChange={setEquipmentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {equipmentType === "board" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Marque</Label>
                    <Input value={boardBrand} onChange={e => setBoardBrand(e.target.value)} placeholder="Ex: Channel Islands" />
                  </div>
                  <div>
                    <Label>Modèle</Label>
                    <Input value={boardModel} onChange={e => setBoardModel(e.target.value)} placeholder="Ex: Dumpster Diver" />
                  </div>
                </div>
                <div>
                  <Label>Shaper</Label>
                  <Input value={boardShaper} onChange={e => setBoardShaper(e.target.value)} placeholder="Ex: Al Merrick" />
                </div>
                <div>
                  <Label>Type de planche</Label>
                  <Select value={boardType} onValueChange={setBoardType}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {BOARD_TYPES.map(b => (
                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Longueur (pieds)</Label>
                    <Input type="number" step="0.1" value={boardLengthFeet} onChange={e => setBoardLengthFeet(e.target.value)} placeholder="5.10" />
                  </div>
                  <div>
                    <Label>Largeur (pouces)</Label>
                    <Input type="number" step="0.1" value={boardWidthInches} onChange={e => setBoardWidthInches(e.target.value)} placeholder="18.5" />
                  </div>
                  <div>
                    <Label>Épaisseur (pouces)</Label>
                    <Input type="number" step="0.1" value={boardThicknessInches} onChange={e => setBoardThicknessInches(e.target.value)} placeholder="2.25" />
                  </div>
                </div>
                <div>
                  <Label>Volume (litres)</Label>
                  <Input type="number" step="0.1" value={boardVolumeLiters} onChange={e => setBoardVolumeLiters(e.target.value)} placeholder="25.5" />
                </div>
              </>
            )}

            {equipmentType === "fins" && (
              <>
                <div>
                  <Label>Configuration</Label>
                  <Select value={finsType} onValueChange={setFinsType}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {FINS_TYPES.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Marque</Label>
                    <Input value={finsBrand} onChange={e => setFinsBrand(e.target.value)} placeholder="Ex: FCS, Futures" />
                  </div>
                  <div>
                    <Label>Modèle</Label>
                    <Input value={finsModel} onChange={e => setFinsModel(e.target.value)} placeholder="Ex: Performer Neo Glass" />
                  </div>
                </div>
              </>
            )}

            {equipmentType === "wetsuit" && (
              <>
                <div>
                  <Label>Épaisseur</Label>
                  <Select value={wetsuitThickness} onValueChange={setWetsuitThickness}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {WETSUIT_THICKNESSES.map(w => (
                        <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Marque</Label>
                  <Input value={wetsuitBrand} onChange={e => setWetsuitBrand(e.target.value)} placeholder="Ex: Rip Curl, O'Neill" />
                </div>
              </>
            )}

            <div>
              <Label>Date d'achat</Label>
              <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes sur l'équipement..." rows={2} />
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
              {saveMutation.isPending ? "Sauvegarde..." : editingItem ? "Modifier" : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
