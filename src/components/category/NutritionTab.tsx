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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Utensils, Droplets, Apple, Beef, Wheat, Flame, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { NutritionObjectivesBanner, useNutritionObjectives } from "./nutrition/NutritionObjectivesBanner";

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
  const [dayType, setDayType] = useState<"rest" | "training" | "match">("training");

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
      if (!selectedPlayer) return [];
      const { data, error } = await supabase
        .from("nutrition_entries")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .eq("entry_date", selectedDate)
        .eq("player_id", selectedPlayer)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPlayer,
  });

  const { getObjectives, canCalculate } = useNutritionObjectives(selectedPlayer, categoryId);
  const objectives = selectedPlayer ? getObjectives(dayType) : null;

  const addEntryMutation = useMutation({
    mutationFn: async () => {
      const targetPlayer = playerId || selectedPlayer;
      if (!targetPlayer) throw new Error("Joueur requis");
      
      const { error } = await supabase.from("nutrition_entries").insert({
        player_id: targetPlayer,
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

  // Calculate progress percentages
  const getProgress = (current: number, target: number | undefined) => {
    if (!target) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percent: number) => {
    if (percent < 50) return "bg-red-500";
    if (percent < 80) return "bg-amber-500";
    if (percent <= 110) return "bg-green-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Suivi Nutritionnel</h2>
          <p className="text-muted-foreground">Objectifs et suivi quotidien des repas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedPlayer}>
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
                className="w-full"
              >
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Player & Date Selection */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Joueur</label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un joueur" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {player.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <label className="text-sm font-medium mb-1 block">Type de jour</label>
              <Select value={dayType} onValueChange={(v) => setDayType(v as "rest" | "training" | "match")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rest">Repos</SelectItem>
                  <SelectItem value="training">Entraînement</SelectItem>
                  <SelectItem value="match">Match</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedPlayer ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Sélectionnez un joueur</p>
            <p className="text-sm">pour voir ses objectifs nutritionnels et son suivi</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Nutrition Objectives Banner */}
          <NutritionObjectivesBanner playerId={selectedPlayer} categoryId={categoryId} />

          {/* Daily Progress */}
          {objectives && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Progression du {format(new Date(selectedDate), "d MMMM yyyy", { locale: fr })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Calories */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Calories</span>
                      </div>
                      <span className="text-sm">
                        <span className="font-bold">{dailyTotals.calories}</span>
                        <span className="text-muted-foreground"> / {objectives.calories} kcal</span>
                      </span>
                    </div>
                    <Progress 
                      value={getProgress(dailyTotals.calories, objectives.calories)} 
                      className={`h-2 ${getProgressColor(getProgress(dailyTotals.calories, objectives.calories))}`}
                    />
                  </div>

                  {/* Proteins */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Beef className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">Protéines</span>
                      </div>
                      <span className="text-sm">
                        <span className="font-bold">{Math.round(dailyTotals.proteins)}</span>
                        <span className="text-muted-foreground"> / {objectives.proteins}g</span>
                      </span>
                    </div>
                    <Progress 
                      value={getProgress(dailyTotals.proteins, objectives.proteins)} 
                      className={`h-2 ${getProgressColor(getProgress(dailyTotals.proteins, objectives.proteins))}`}
                    />
                  </div>

                  {/* Carbs */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Wheat className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium">Glucides</span>
                      </div>
                      <span className="text-sm">
                        <span className="font-bold">{Math.round(dailyTotals.carbs)}</span>
                        <span className="text-muted-foreground"> / {objectives.carbs}g</span>
                      </span>
                    </div>
                    <Progress 
                      value={getProgress(dailyTotals.carbs, objectives.carbs)} 
                      className={`h-2 ${getProgressColor(getProgress(dailyTotals.carbs, objectives.carbs))}`}
                    />
                  </div>

                  {/* Fats */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Apple className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Lipides</span>
                      </div>
                      <span className="text-sm">
                        <span className="font-bold">{Math.round(dailyTotals.fats)}</span>
                        <span className="text-muted-foreground"> / {objectives.fats}g</span>
                      </span>
                    </div>
                    <Progress 
                      value={getProgress(dailyTotals.fats, objectives.fats)} 
                      className={`h-2 ${getProgressColor(getProgress(dailyTotals.fats, objectives.fats))}`}
                    />
                  </div>

                  {/* Water */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Hydratation</span>
                      </div>
                      <span className="text-sm">
                        <span className="font-bold">{(dailyTotals.water / 1000).toFixed(1)}</span>
                        <span className="text-muted-foreground"> / {(objectives.water / 1000).toFixed(1)}L</span>
                      </span>
                    </div>
                    <Progress 
                      value={getProgress(dailyTotals.water, objectives.water)} 
                      className={`h-2 ${getProgressColor(getProgress(dailyTotals.water, objectives.water))}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Détail des repas du {format(new Date(selectedDate), "d MMMM yyyy", { locale: fr })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucune entrée pour cette date. Cliquez sur "Nouvelle entrée" pour commencer.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              {mealTypeIcons[entry.meal_type]}
                              {mealTypeLabels[entry.meal_type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {entry.meal_description || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">{entry.calories || "-"}</TableCell>
                          <TableCell className="text-right">{entry.proteins_g || "-"}</TableCell>
                          <TableCell className="text-right">{entry.carbs_g || "-"}</TableCell>
                          <TableCell className="text-right">{entry.fats_g || "-"}</TableCell>
                          <TableCell className="text-right">{entry.water_ml || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="text-right">{dailyTotals.calories}</TableCell>
                        <TableCell className="text-right">{Math.round(dailyTotals.proteins)}</TableCell>
                        <TableCell className="text-right">{Math.round(dailyTotals.carbs)}</TableCell>
                        <TableCell className="text-right">{Math.round(dailyTotals.fats)}</TableCell>
                        <TableCell className="text-right">{dailyTotals.water}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
