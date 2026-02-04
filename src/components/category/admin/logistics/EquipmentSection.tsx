import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Search, AlertTriangle, Trash2, Edit2 } from "lucide-react";

interface EquipmentSectionProps {
  categoryId: string;
}

interface Equipment {
  id: string;
  name: string;
  category: string;
  quantity: number;
  available_quantity: number;
  condition: string;
  location: string | null;
  notes: string | null;
  last_maintenance: string | null;
}

const EQUIPMENT_CATEGORIES = [
  { value: "balls", label: "Ballons" },
  { value: "cones", label: "Plots / Cônes" },
  { value: "goals", label: "Buts / Poteaux" },
  { value: "bibs", label: "Chasubles" },
  { value: "gym", label: "Équipement musculation" },
  { value: "medical", label: "Matériel médical" },
  { value: "gps", label: "GPS / Capteurs" },
  { value: "video", label: "Vidéo / Caméras" },
  { value: "clothing", label: "Tenues / Équipements" },
  { value: "other", label: "Autre" },
];

const CONDITION_COLORS: Record<string, string> = {
  excellent: "bg-green-100 text-green-700",
  good: "bg-blue-100 text-blue-700",
  fair: "bg-amber-100 text-amber-700",
  poor: "bg-red-100 text-red-700",
};

const CONDITION_LABELS: Record<string, string> = {
  excellent: "Excellent",
  good: "Bon",
  fair: "Correct",
  poor: "Mauvais",
};

export function EquipmentSection({ categoryId }: EquipmentSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    name: "",
    category: "balls",
    quantity: "1",
    condition: "good",
    location: "",
    notes: "",
  });

  const { data: equipment, isLoading } = useQuery({
    queryKey: ["equipment", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_inventory")
        .select("*")
        .eq("category_id", categoryId)
        .order("category")
        .order("name");
      if (error) throw error;
      return data as Equipment[];
    },
  });

  const addEquipmentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const qty = parseInt(data.quantity);
      const { error } = await supabase.from("equipment_inventory").insert({
        category_id: categoryId,
        name: data.name,
        category: data.category,
        quantity: qty,
        available_quantity: qty,
        condition: data.condition,
        location: data.location || null,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", categoryId] });
      setShowAddDialog(false);
      setFormData({ name: "", category: "balls", quantity: "1", condition: "good", location: "", notes: "" });
      toast({ title: "Équipement ajouté" });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, available }: { id: string; available: number }) => {
      const { error } = await supabase
        .from("equipment_inventory")
        .update({ available_quantity: available })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", categoryId] });
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment_inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", categoryId] });
      toast({ title: "Équipement supprimé" });
    },
  });

  const filteredEquipment = equipment?.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = equipment?.filter((e) => e.available_quantity < e.quantity * 0.3) || [];

  return (
    <div className="space-y-6">
      {/* Alertes stock bas */}
      {lowStockItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              Stock bas ({lowStockItems.length})
            </div>
            <div className="text-sm text-amber-600">
              {lowStockItems.map((item) => (
                <span key={item.id} className="mr-3">
                  {item.name}: {item.available_quantity}/{item.quantity}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {EQUIPMENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel Équipement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: Ballons match Nike"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Catégorie</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>État</Label>
                  <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Emplacement</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="ex: Local matériel"
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Détails, référence..."
                  rows={2}
                />
              </div>
              <Button onClick={() => addEquipmentMutation.mutate(formData)} disabled={!formData.name} className="w-full">
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des équipements */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : filteredEquipment?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Aucun équipement enregistré</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEquipment?.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {EQUIPMENT_CATEGORIES.find((c) => c.value === item.category)?.label}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteEquipmentMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={CONDITION_COLORS[item.condition]}>
                      {CONDITION_LABELS[item.condition]}
                    </Badge>
                    {item.location && (
                      <span className="text-xs text-muted-foreground">{item.location}</span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm">
                    Disponible: <strong>{item.available_quantity}</strong> / {item.quantity}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={item.available_quantity <= 0}
                      onClick={() => updateQuantityMutation.mutate({ id: item.id, available: item.available_quantity - 1 })}
                    >
                      -
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={item.available_quantity >= item.quantity}
                      onClick={() => updateQuantityMutation.mutate({ id: item.id, available: item.available_quantity + 1 })}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.available_quantity < item.quantity * 0.3 ? "bg-red-500" :
                      item.available_quantity < item.quantity * 0.6 ? "bg-amber-500" : "bg-green-500"
                    }`}
                    style={{ width: `${(item.available_quantity / item.quantity) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
