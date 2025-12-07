import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Utensils, Droplets, Apple, Beef, Wheat, Flame } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface NutritionTabProps {
  categoryId: string;
}

const mealTypeLabels: Record<string, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Collation",
  hydration: "Hydratation",
};

const mealTypeIcons: Record<string, React.ReactNode> = {
  breakfast: <Apple className="h-4 w-4" />,
  lunch: <Utensils className="h-4 w-4" />,
  dinner: <Utensils className="h-4 w-4" />,
  snack: <Apple className="h-4 w-4" />,
  hydration: <Droplets className="h-4 w-4" />,
};

export function NutritionTab({ categoryId }: NutritionTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");

  // Form states
  const [playerId, setPlayerId] = useState("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [mealType, setMealType] = useState<string>("breakfast");
  const [mealDescription, setMealDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [proteins, setProteins] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [water, setWater] = useState("");
  const [notes, setNotes] = useState("");

  const { data: players = [] } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["nutrition-entries", categoryId, selectedDate, selectedPlayer],
    queryFn: async () => {
      let query = supabase
        .from("nutrition_entries")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .eq("entry_date", selectedDate)
        .order("created_at", { ascending: false });
      
      if (selectedPlayer) {
        query = query.eq("player_id", selectedPlayer);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("nutrition_entries").insert({
        player_id: playerId,
        category_id: categoryId,
        entry_date: entryDate,
        meal_type: mealType,
        meal_description: mealDescription || null,
        calories: calories ? Number(calories) : null,
        proteins_g: proteins ? Number(proteins) : null,
        carbs_g: carbs ? Number(carbs) : null,
        fats_g: fats ? Number(fats) : null,
        water_ml: water ? Number(water) : null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition-entries", categoryId] });
      toast.success("Entrée ajoutée");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const resetForm = () => {
    setPlayerId("");
    setEntryDate(format(new Date(), "yyyy-MM-dd"));
    setMealType("breakfast");
    setMealDescription("");
    setCalories("");
    setProteins("");
    setCarbs("");
    setFats("");
    setWater("");
    setNotes("");
  };

  // Calculate daily totals
  const dailyTotals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + (entry.calories || 0),
      proteins: acc.proteins + (entry.proteins_g || 0),
      carbs: acc.carbs + (entry.carbs_g || 0),
      fats: acc.fats + (entry.fats_g || 0),
      water: acc.water + (entry.water_ml || 0),
    }),
    { calories: 0, proteins: 0, carbs: 0, fats: 0, water: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Suivi Nutritionnel</h2>
          <p className="text-muted-foreground">Repas, hydratation et macronutriments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle entrée
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter une entrée nutrition</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="text-sm font-medium">Joueur</label>
                <Select value={playerId} onValueChange={setPlayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un joueur" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input 
                  type="date" 
                  value={entryDate} 
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(mealTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Description du repas</label>
                <Textarea 
                  value={mealDescription} 
                  onChange={(e) => setMealDescription(e.target.value)}
                  placeholder="Ex: Poulet grillé, riz, légumes..."
                />
              </div>
              
              {mealType === "hydration" ? (
                <div>
                  <label className="text-sm font-medium">Eau (ml)</label>
                  <Input 
                    type="number" 
                    value={water} 
                    onChange={(e) => setWater(e.target.value)}
                    placeholder="500"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1">
                        <Flame className="h-3 w-3" /> Calories
                      </label>
                      <Input 
                        type="number" 
                        value={calories} 
                        onChange={(e) => setCalories(e.target.value)}
                        placeholder="500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1">
                        <Beef className="h-3 w-3" /> Protéines (g)
                      </label>
                      <Input 
                        type="number" 
                        value={proteins} 
                        onChange={(e) => setProteins(e.target.value)}
                        placeholder="30"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1">
                        <Wheat className="h-3 w-3" /> Glucides (g)
                      </label>
                      <Input 
                        type="number" 
                        value={carbs} 
                        onChange={(e) => setCarbs(e.target.value)}
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1">
                        <Apple className="h-3 w-3" /> Lipides (g)
                      </label>
                      <Input 
                        type="number" 
                        value={fats} 
                        onChange={(e) => setFats(e.target.value)}
                        placeholder="15"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Droplets className="h-3 w-3" /> Eau (ml)
                    </label>
                    <Input 
                      type="number" 
                      value={water} 
                      onChange={(e) => setWater(e.target.value)}
                      placeholder="500"
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observations..."
                />
              </div>
              <Button 
                onClick={() => addEntryMutation.mutate()} 
                disabled={!playerId}
                className="w-full"
              >
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Date</label>
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[180px]"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Joueur</label>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tous les joueurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les joueurs</SelectItem>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Calories</p>
                <p className="text-xl font-bold">{dailyTotals.calories}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Beef className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Protéines</p>
                <p className="text-xl font-bold">{dailyTotals.proteins}g</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Wheat className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Glucides</p>
                <p className="text-xl font-bold">{dailyTotals.carbs}g</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Apple className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Lipides</p>
                <p className="text-xl font-bold">{dailyTotals.fats}g</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Hydratation</p>
                <p className="text-xl font-bold">{dailyTotals.water}ml</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Entrées du {format(new Date(selectedDate), "d MMMM yyyy", { locale: fr })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune entrée pour cette date
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joueur</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Cal</TableHead>
                    <TableHead className="text-right">Prot</TableHead>
                    <TableHead className="text-right">Gluc</TableHead>
                    <TableHead className="text-right">Lip</TableHead>
                    <TableHead className="text-right">Eau</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.players?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {mealTypeIcons[entry.meal_type]}
                          {mealTypeLabels[entry.meal_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {entry.meal_description || "-"}
                      </TableCell>
                      <TableCell className="text-right">{entry.calories || "-"}</TableCell>
                      <TableCell className="text-right">{entry.proteins_g || "-"}</TableCell>
                      <TableCell className="text-right">{entry.carbs_g || "-"}</TableCell>
                      <TableCell className="text-right">{entry.fats_g || "-"}</TableCell>
                      <TableCell className="text-right">{entry.water_ml || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}