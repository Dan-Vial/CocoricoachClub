import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, Activity, Moon, Heart, AlertTriangle, Lightbulb } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface MenstrualCycleSectionProps {
  categoryId: string;
  playerId?: string;
}

const SYMPTOMS_OPTIONS = [
  "Crampes",
  "Maux de tête",
  "Fatigue intense",
  "Ballonnements",
  "Sensibilité mammaire",
  "Sautes d'humeur",
  "Douleurs lombaires",
  "Nausées"
];

const PHASE_INFO = {
  menstruation: {
    name: "Menstruation",
    color: "bg-red-500",
    days: "Jours 1-5",
    icon: Moon,
    recommendations: [
      "Privilégier les exercices à faible intensité",
      "Yoga, stretching et récupération active",
      "Éviter les exercices à fort impact",
      "Hydratation importante"
    ]
  },
  follicular: {
    name: "Folliculaire",
    color: "bg-emerald-500",
    days: "Jours 6-13",
    icon: Activity,
    recommendations: [
      "Période idéale pour les entraînements haute intensité",
      "Force et puissance maximales",
      "Bonne récupération musculaire",
      "Moment optimal pour les tests physiques"
    ]
  },
  ovulation: {
    name: "Ovulation",
    color: "bg-amber-500",
    days: "Jours 14-16",
    icon: Heart,
    recommendations: [
      "Performance maximale possible",
      "⚠️ Risque accru de blessures ligamentaires",
      "Échauffement prolongé recommandé",
      "Attention aux exercices avec changements de direction"
    ]
  },
  luteal: {
    name: "Lutéale",
    color: "bg-purple-500",
    days: "Jours 17-28",
    icon: Calendar,
    recommendations: [
      "Réduire progressivement l'intensité",
      "Privilégier l'endurance à intensité modérée",
      "Augmenter les temps de récupération",
      "Surveiller la fatigue et le moral"
    ]
  }
};

const calculateCurrentPhase = (cycleStartDate: string, cycleLength: number = 28, periodLength: number = 5): string => {
  const start = new Date(cycleStartDate);
  const today = new Date();
  const daysSinceStart = differenceInDays(today, start) % cycleLength;
  const currentDay = daysSinceStart + 1;

  if (currentDay <= periodLength) return "menstruation";
  if (currentDay <= 13) return "follicular";
  if (currentDay <= 16) return "ovulation";
  return "luteal";
};

const calculateCycleDay = (cycleStartDate: string, cycleLength: number = 28): number => {
  const start = new Date(cycleStartDate);
  const today = new Date();
  const daysSinceStart = differenceInDays(today, start) % cycleLength;
  return daysSinceStart + 1;
};

export function MenstrualCycleSection({ categoryId, playerId }: MenstrualCycleSectionProps) {
  const [isAddCycleOpen, setIsAddCycleOpen] = useState(false);
  const [isAddSymptomsOpen, setIsAddSymptomsOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>(playerId || "");
  const [cycleStartDate, setCycleStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [painLevel, setPainLevel] = useState(1);
  const [moodLevel, setMoodLevel] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const queryClient = useQueryClient();

  const { data: players } = useQuery({
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
    enabled: !playerId,
  });

  const { data: cycles } = useQuery({
    queryKey: ["menstrual_cycles", categoryId, playerId],
    queryFn: async () => {
      let query = supabase
        .from("menstrual_cycles")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("cycle_start_date", { ascending: false });
      
      if (playerId) {
        query = query.eq("player_id", playerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: symptoms } = useQuery({
    queryKey: ["menstrual_symptoms", categoryId, playerId],
    queryFn: async () => {
      let query = supabase
        .from("menstrual_symptoms")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("tracking_date", { ascending: false })
        .limit(30);
      
      if (playerId) {
        query = query.eq("player_id", playerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const addCycleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("menstrual_cycles")
        .insert({
          player_id: selectedPlayer,
          category_id: categoryId,
          cycle_start_date: cycleStartDate,
          cycle_length_days: cycleLength,
          period_length_days: periodLength,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menstrual_cycles"] });
      toast.success("Cycle enregistré");
      setIsAddCycleOpen(false);
      resetCycleForm();
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const addSymptomsMutation = useMutation({
    mutationFn: async () => {
      const latestCycle = cycles?.find(c => c.player_id === selectedPlayer);
      const phase = latestCycle ? calculateCurrentPhase(latestCycle.cycle_start_date, latestCycle.cycle_length_days, latestCycle.period_length_days) : null;
      const cycleDay = latestCycle ? calculateCycleDay(latestCycle.cycle_start_date, latestCycle.cycle_length_days) : null;

      const { error } = await supabase
        .from("menstrual_symptoms")
        .insert({
          player_id: selectedPlayer,
          category_id: categoryId,
          tracking_date: format(new Date(), "yyyy-MM-dd"),
          cycle_day: cycleDay,
          phase: phase,
          energy_level: energyLevel,
          pain_level: painLevel,
          mood_level: moodLevel,
          sleep_quality: sleepQuality,
          symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : null,
          notes: notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menstrual_symptoms"] });
      toast.success("Suivi enregistré");
      setIsAddSymptomsOpen(false);
      resetSymptomsForm();
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const resetCycleForm = () => {
    setCycleStartDate(format(new Date(), "yyyy-MM-dd"));
    setCycleLength(28);
    setPeriodLength(5);
    if (!playerId) setSelectedPlayer("");
  };

  const resetSymptomsForm = () => {
    setEnergyLevel(3);
    setPainLevel(1);
    setMoodLevel(3);
    setSleepQuality(3);
    setSelectedSymptoms([]);
    setNotes("");
    if (!playerId) setSelectedPlayer("");
  };

  const getLatestCycleForPlayer = (pId: string) => {
    return cycles?.find(c => c.player_id === pId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-pink-500" />
                Suivi du Cycle Menstruel
              </CardTitle>
              <CardDescription>
                Optimisez la préparation physique selon les phases du cycle
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsAddCycleOpen(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Nouveau cycle
              </Button>
              <Button onClick={() => setIsAddSymptomsOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Suivi quotidien
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Phase Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(PHASE_INFO).map(([key, phase]) => {
              const Icon = phase.icon;
              return (
                <div key={key} className={`p-4 rounded-lg border ${phase.color} bg-opacity-10`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${phase.color}`} />
                    <span className="font-medium">{phase.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{phase.days}</p>
                </div>
              );
            })}
          </div>

          {/* Current Status by Player */}
          {cycles && cycles.length > 0 ? (
            <div className="space-y-4">
              <h4 className="font-medium">État actuel des joueuses</h4>
              <div className="grid gap-4">
                {(playerId ? cycles.filter(c => c.player_id === playerId) : 
                  [...new Map(cycles.map(c => [c.player_id, c])).values()]
                ).map((cycle) => {
                  const phase = calculateCurrentPhase(cycle.cycle_start_date, cycle.cycle_length_days, cycle.period_length_days);
                  const cycleDay = calculateCycleDay(cycle.cycle_start_date, cycle.cycle_length_days);
                  const phaseInfo = PHASE_INFO[phase as keyof typeof PHASE_INFO];
                  const Icon = phaseInfo.icon;

                  return (
                    <Card key={cycle.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${phaseInfo.color} bg-opacity-20 flex items-center justify-center`}>
                            <Icon className={`h-5 w-5 ${phaseInfo.color.replace('bg-', 'text-')}`} />
                          </div>
                          <div>
                            <p className="font-medium">{cycle.players?.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={phaseInfo.color}>{phaseInfo.name}</Badge>
                              <span className="text-sm text-muted-foreground">Jour {cycleDay}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Prochain cycle prévu</p>
                          <p className="text-sm font-medium">
                            {format(addDays(new Date(cycle.cycle_start_date), cycle.cycle_length_days), "dd MMM", { locale: fr })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Recommendations */}
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium">Recommandations d'entraînement</span>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {phaseInfo.recommendations.map((rec, i) => (
                            <li key={i} className={rec.startsWith("⚠️") ? "text-amber-600 font-medium" : ""}>
                              • {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Moon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun cycle enregistré.</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsAddCycleOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Enregistrer un premier cycle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Symptoms */}
      {symptoms && symptoms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Suivi récent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {symptoms.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{s.players?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(s.tracking_date), "dd MMM yyyy", { locale: fr })}
                      {s.phase && ` • ${PHASE_INFO[s.phase as keyof typeof PHASE_INFO]?.name}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={s.energy_level <= 2 ? "destructive" : s.energy_level >= 4 ? "default" : "secondary"}>
                      Énergie: {s.energy_level}/5
                    </Badge>
                    {s.pain_level > 2 && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Douleur: {s.pain_level}/5
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Cycle Dialog */}
      <Dialog open={isAddCycleOpen} onOpenChange={setIsAddCycleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un nouveau cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!playerId && (
              <div className="space-y-2">
                <Label>Joueuse</Label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une joueuse" />
                  </SelectTrigger>
                  <SelectContent>
                    {players?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Date de début du cycle (premier jour des règles)</Label>
              <Input
                type="date"
                value={cycleStartDate}
                onChange={(e) => setCycleStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Durée du cycle (jours): {cycleLength}</Label>
              <Slider
                value={[cycleLength]}
                onValueChange={(v) => setCycleLength(v[0])}
                min={21}
                max={35}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Durée des règles (jours): {periodLength}</Label>
              <Slider
                value={[periodLength]}
                onValueChange={(v) => setPeriodLength(v[0])}
                min={3}
                max={7}
                step={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCycleOpen(false)}>Annuler</Button>
            <Button 
              onClick={() => addCycleMutation.mutate()}
              disabled={!selectedPlayer && !playerId}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Symptoms Dialog */}
      <Dialog open={isAddSymptomsOpen} onOpenChange={setIsAddSymptomsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Suivi quotidien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {!playerId && (
              <div className="space-y-2">
                <Label>Joueuse</Label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une joueuse" />
                  </SelectTrigger>
                  <SelectContent>
                    {players?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Niveau d'énergie: {energyLevel}/5</Label>
              <Slider value={[energyLevel]} onValueChange={(v) => setEnergyLevel(v[0])} min={1} max={5} step={1} />
              <p className="text-xs text-muted-foreground">1 = Très fatigué • 5 = Pleine forme</p>
            </div>

            <div className="space-y-2">
              <Label>Niveau de douleur: {painLevel}/5</Label>
              <Slider value={[painLevel]} onValueChange={(v) => setPainLevel(v[0])} min={1} max={5} step={1} />
              <p className="text-xs text-muted-foreground">1 = Aucune douleur • 5 = Douleur intense</p>
            </div>

            <div className="space-y-2">
              <Label>Humeur: {moodLevel}/5</Label>
              <Slider value={[moodLevel]} onValueChange={(v) => setMoodLevel(v[0])} min={1} max={5} step={1} />
              <p className="text-xs text-muted-foreground">1 = Maussade • 5 = Excellent moral</p>
            </div>

            <div className="space-y-2">
              <Label>Qualité du sommeil: {sleepQuality}/5</Label>
              <Slider value={[sleepQuality]} onValueChange={(v) => setSleepQuality(v[0])} min={1} max={5} step={1} />
            </div>

            <div className="space-y-2">
              <Label>Symptômes</Label>
              <div className="grid grid-cols-2 gap-2">
                {SYMPTOMS_OPTIONS.map((symptom) => (
                  <div key={symptom} className="flex items-center space-x-2">
                    <Checkbox
                      id={symptom}
                      checked={selectedSymptoms.includes(symptom)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSymptoms([...selectedSymptoms, symptom]);
                        } else {
                          setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
                        }
                      }}
                    />
                    <Label htmlFor={symptom} className="text-sm font-normal cursor-pointer">
                      {symptom}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observations supplémentaires..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSymptomsOpen(false)}>Annuler</Button>
            <Button 
              onClick={() => addSymptomsMutation.mutate()}
              disabled={!selectedPlayer && !playerId}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}