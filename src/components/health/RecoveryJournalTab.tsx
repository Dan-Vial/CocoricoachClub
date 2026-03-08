import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SleepAnalytics } from "./SleepAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Snowflake,
  Droplets,
  Dumbbell,
  Moon,
  Zap,
  ThermometerSnowflake,
  Activity,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

interface RecoveryJournalTabProps {
  categoryId: string;
}

const STRETCHING_TYPES = [
  { value: "static", label: "Statique" },
  { value: "dynamic", label: "Dynamique" },
  { value: "pnf", label: "PNF" },
  { value: "yoga", label: "Yoga" },
  { value: "mixed", label: "Mixte" },
];

export function RecoveryJournalTab({ categoryId }: RecoveryJournalTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const queryClient = useQueryClient();

  // Form state
  const [playerId, setPlayerId] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Sleep
  const [sleepDuration, setSleepDuration] = useState<number | undefined>();
  const [sleepQuality, setSleepQuality] = useState(3);
  const [bedTime, setBedTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [sleepNotes, setSleepNotes] = useState("");
  
  // Recovery modalities
  const [iceBath, setIceBath] = useState(false);
  const [iceBathDuration, setIceBathDuration] = useState<number | undefined>();
  const [iceBathTemp, setIceBathTemp] = useState<number | undefined>();
  
  const [contrastBath, setContrastBath] = useState(false);
  const [contrastBathDuration, setContrastBathDuration] = useState<number | undefined>();
  
  const [massage, setMassage] = useState(false);
  const [massageDuration, setMassageDuration] = useState<number | undefined>();
  const [massageType, setMassageType] = useState("");
  
  const [foamRolling, setFoamRolling] = useState(false);
  const [foamRollingDuration, setFoamRollingDuration] = useState<number | undefined>();
  
  const [stretching, setStretching] = useState(false);
  const [stretchingDuration, setStretchingDuration] = useState<number | undefined>();
  const [stretchingType, setStretchingType] = useState<string>("");
  
  const [compression, setCompression] = useState(false);
  const [compressionDuration, setCompressionDuration] = useState<number | undefined>();
  
  const [sauna, setSauna] = useState(false);
  const [saunaDuration, setSaunaDuration] = useState<number | undefined>();
  
  const [cryotherapy, setCryotherapy] = useState(false);
  const [cryotherapyDuration, setCryotherapyDuration] = useState<number | undefined>();
  
  const [activeRecovery, setActiveRecovery] = useState(false);
  const [activeRecoveryType, setActiveRecoveryType] = useState("");
  const [activeRecoveryDuration, setActiveRecoveryDuration] = useState<number | undefined>();
  
  // Hydration/Nutrition
  const [waterIntake, setWaterIntake] = useState<number | undefined>();
  const [proteinShake, setProteinShake] = useState(false);
  const [supplements, setSupplements] = useState<string[]>([]);
  
  // Scores
  const [overallRecoveryScore, setOverallRecoveryScore] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [muscleReadiness, setMuscleReadiness] = useState(3);
  const [notes, setNotes] = useState("");

  // Fetch players
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
  });

  // Fetch journal entries
  const { data: entries, isLoading } = useQuery({
    queryKey: ["recovery_journal", categoryId, selectedPlayer],
    queryFn: async () => {
      let query = supabase
        .from("recovery_journal")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .gte("entry_date", format(subDays(new Date(), 30), "yyyy-MM-dd"))
        .order("entry_date", { ascending: false });

      if (selectedPlayer !== "all") {
        query = query.eq("player_id", selectedPlayer);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setPlayerId("");
    setEntryDate(new Date().toISOString().split("T")[0]);
    setSleepDuration(undefined);
    setSleepQuality(3);
    setBedTime("");
    setWakeTime("");
    setSleepNotes("");
    setIceBath(false);
    setIceBathDuration(undefined);
    setIceBathTemp(undefined);
    setContrastBath(false);
    setContrastBathDuration(undefined);
    setMassage(false);
    setMassageDuration(undefined);
    setMassageType("");
    setFoamRolling(false);
    setFoamRollingDuration(undefined);
    setStretching(false);
    setStretchingDuration(undefined);
    setStretchingType("");
    setCompression(false);
    setCompressionDuration(undefined);
    setSauna(false);
    setSaunaDuration(undefined);
    setCryotherapy(false);
    setCryotherapyDuration(undefined);
    setActiveRecovery(false);
    setActiveRecoveryType("");
    setActiveRecoveryDuration(undefined);
    setWaterIntake(undefined);
    setProteinShake(false);
    setSupplements([]);
    setOverallRecoveryScore(5);
    setEnergyLevel(3);
    setMuscleReadiness(3);
    setNotes("");
  };

  const addEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("recovery_journal").insert({
        category_id: categoryId,
        player_id: playerId,
        entry_date: entryDate,
        sleep_duration_hours: sleepDuration,
        sleep_quality: sleepQuality,
        bed_time: bedTime || null,
        wake_time: wakeTime || null,
        sleep_notes: sleepNotes || null,
        ice_bath: iceBath,
        ice_bath_duration_min: iceBath ? iceBathDuration : null,
        ice_bath_temperature: iceBath ? iceBathTemp : null,
        contrast_bath: contrastBath,
        contrast_bath_duration_min: contrastBath ? contrastBathDuration : null,
        massage: massage,
        massage_duration_min: massage ? massageDuration : null,
        massage_type: massage ? massageType : null,
        foam_rolling: foamRolling,
        foam_rolling_duration_min: foamRolling ? foamRollingDuration : null,
        stretching: stretching,
        stretching_duration_min: stretching ? stretchingDuration : null,
        stretching_type: stretching ? stretchingType : null,
        compression: compression,
        compression_duration_min: compression ? compressionDuration : null,
        sauna: sauna,
        sauna_duration_min: sauna ? saunaDuration : null,
        cryotherapy: cryotherapy,
        cryotherapy_duration_min: cryotherapy ? cryotherapyDuration : null,
        active_recovery: activeRecovery,
        active_recovery_type: activeRecovery ? activeRecoveryType : null,
        active_recovery_duration_min: activeRecovery ? activeRecoveryDuration : null,
        water_intake_liters: waterIntake,
        protein_shake: proteinShake,
        supplements_taken: supplements.length > 0 ? supplements : null,
        overall_recovery_score: overallRecoveryScore,
        energy_level: energyLevel,
        muscle_readiness: muscleReadiness,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery_journal"] });
      toast.success("Entrée ajoutée au journal");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Une entrée existe déjà pour ce joueur à cette date");
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    },
  });

  const getRecoveryBadge = (score: number) => {
    if (score >= 8) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 6) return <Badge className="bg-yellow-500 text-black">Bon</Badge>;
    if (score >= 4) return <Badge className="bg-orange-500">Moyen</Badge>;
    return <Badge variant="destructive">Faible</Badge>;
  };

  const getModalitiesCount = (entry: any) => {
    const modalities = [
      entry.ice_bath,
      entry.contrast_bath,
      entry.massage,
      entry.foam_rolling,
      entry.stretching,
      entry.compression,
      entry.sauna,
      entry.cryotherapy,
      entry.active_recovery,
    ];
    return modalities.filter(Boolean).length;
  };

  const RecoveryModalitySwitch = ({
    label,
    icon: Icon,
    checked,
    onCheckedChange,
    duration,
    onDurationChange,
    children,
  }: {
    label: string;
    icon: any;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    duration?: number;
    onDurationChange?: (duration: number | undefined) => void;
    children?: React.ReactNode;
  }) => (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{label}</span>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {checked && onDurationChange && (
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Durée (min)</Label>
          <Input
            type="number"
            value={duration || ""}
            onChange={(e) => onDurationChange(e.target.value ? Number(e.target.value) : undefined)}
            className="w-20"
          />
        </div>
      )}
      {checked && children}
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="sleep" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sleep">📊 Analyse Sommeil</TabsTrigger>
          <TabsTrigger value="journal">📝 Journal Récupération</TabsTrigger>
        </TabsList>

        <TabsContent value="sleep">
          <SleepAnalytics categoryId={categoryId} />
        </TabsContent>

        <TabsContent value="journal">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Journal de Récupération</h3>
          <p className="text-sm text-muted-foreground">
            Suivi des modalités de récupération et qualité du sommeil
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par joueur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les joueurs</SelectItem>
              {players?.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle entrée
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Sommeil moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {entries?.length
                ? (entries.reduce((acc, e) => acc + (e.sleep_duration_hours || 0), 0) / entries.length).toFixed(1)
                : "-"}
              <span className="text-sm text-muted-foreground ml-1">h</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Snowflake className="h-4 w-4" />
              Bains froids
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {entries?.filter((e) => e.ice_bath).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Massages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {entries?.filter((e) => e.massage).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Score moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {entries?.length
                ? (entries.reduce((acc, e) => acc + (e.overall_recovery_score || 0), 0) / entries.length).toFixed(1)
                : "-"}
              <span className="text-sm text-muted-foreground ml-1">/10</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries list */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : entries && entries.length > 0 ? (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {format(new Date(entry.entry_date), "dd")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.entry_date), "MMM", { locale: fr })}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">{entry.players?.name}</p>
                      <div className="flex gap-2 flex-wrap mt-1">
                        {entry.sleep_duration_hours && (
                          <Badge variant="outline" className="text-xs">
                            <Moon className="h-3 w-3 mr-1" />
                            {entry.sleep_duration_hours}h
                          </Badge>
                        )}
                        {entry.ice_bath && (
                          <Badge variant="outline" className="text-xs">
                            <Snowflake className="h-3 w-3 mr-1" />
                            Bain froid
                          </Badge>
                        )}
                        {entry.massage && (
                          <Badge variant="outline" className="text-xs">
                            Massage
                          </Badge>
                        )}
                        {entry.stretching && (
                          <Badge variant="outline" className="text-xs">
                            Étirements
                          </Badge>
                        )}
                        {getModalitiesCount(entry) > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{getModalitiesCount(entry) - 4} autres
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Score récupération</p>
                      {getRecoveryBadge(entry.overall_recovery_score || 5)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucune entrée dans le journal
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Nouvelle entrée - Journal de Récupération</DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[calc(90vh-180px)] pr-4">
            <Tabs defaultValue="general" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="sleep">Sommeil</TabsTrigger>
                <TabsTrigger value="modalities">Modalités</TabsTrigger>
                <TabsTrigger value="scores">Scores</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Joueur *</Label>
                    <Select value={playerId} onValueChange={setPlayerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {players?.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hydratation (litres)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={waterIntake || ""}
                      onChange={(e) => setWaterIntake(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Ex: 2.5"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-8">
                    <Switch checked={proteinShake} onCheckedChange={setProteinShake} />
                    <Label>Shake protéiné</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sleep" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Durée du sommeil (heures)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={sleepDuration || ""}
                      onChange={(e) => setSleepDuration(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Ex: 7.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Qualité du sommeil</Label>
                      <span className="text-sm text-muted-foreground">{sleepQuality}/5</span>
                    </div>
                    <Slider
                      value={[sleepQuality]}
                      onValueChange={(v) => setSleepQuality(v[0])}
                      min={1}
                      max={5}
                      step={1}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Heure de coucher</Label>
                    <Input
                      type="time"
                      value={bedTime}
                      onChange={(e) => setBedTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Heure de réveil</Label>
                    <Input
                      type="time"
                      value={wakeTime}
                      onChange={(e) => setWakeTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes sommeil</Label>
                  <Textarea
                    value={sleepNotes}
                    onChange={(e) => setSleepNotes(e.target.value)}
                    placeholder="Difficultés d'endormissement, réveils nocturnes..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="modalities" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RecoveryModalitySwitch
                    label="Bain froid"
                    icon={Snowflake}
                    checked={iceBath}
                    onCheckedChange={setIceBath}
                    duration={iceBathDuration}
                    onDurationChange={setIceBathDuration}
                  >
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Température (°C)</Label>
                      <Input
                        type="number"
                        value={iceBathTemp || ""}
                        onChange={(e) => setIceBathTemp(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-20"
                      />
                    </div>
                  </RecoveryModalitySwitch>

                  <RecoveryModalitySwitch
                    label="Bain contrasté"
                    icon={ThermometerSnowflake}
                    checked={contrastBath}
                    onCheckedChange={setContrastBath}
                    duration={contrastBathDuration}
                    onDurationChange={setContrastBathDuration}
                  />

                  <RecoveryModalitySwitch
                    label="Massage"
                    icon={Dumbbell}
                    checked={massage}
                    onCheckedChange={setMassage}
                    duration={massageDuration}
                    onDurationChange={setMassageDuration}
                  >
                    <Input
                      value={massageType}
                      onChange={(e) => setMassageType(e.target.value)}
                      placeholder="Type de massage"
                      className="mt-2"
                    />
                  </RecoveryModalitySwitch>

                  <RecoveryModalitySwitch
                    label="Foam rolling"
                    icon={Activity}
                    checked={foamRolling}
                    onCheckedChange={setFoamRolling}
                    duration={foamRollingDuration}
                    onDurationChange={setFoamRollingDuration}
                  />

                  <RecoveryModalitySwitch
                    label="Étirements"
                    icon={Activity}
                    checked={stretching}
                    onCheckedChange={setStretching}
                    duration={stretchingDuration}
                    onDurationChange={setStretchingDuration}
                  >
                    <Select value={stretchingType} onValueChange={setStretchingType}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Type d'étirements" />
                      </SelectTrigger>
                      <SelectContent>
                        {STRETCHING_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </RecoveryModalitySwitch>

                  <RecoveryModalitySwitch
                    label="Compression"
                    icon={Activity}
                    checked={compression}
                    onCheckedChange={setCompression}
                    duration={compressionDuration}
                    onDurationChange={setCompressionDuration}
                  />

                  <RecoveryModalitySwitch
                    label="Sauna"
                    icon={Droplets}
                    checked={sauna}
                    onCheckedChange={setSauna}
                    duration={saunaDuration}
                    onDurationChange={setSaunaDuration}
                  />

                  <RecoveryModalitySwitch
                    label="Cryothérapie"
                    icon={Snowflake}
                    checked={cryotherapy}
                    onCheckedChange={setCryotherapy}
                    duration={cryotherapyDuration}
                    onDurationChange={setCryotherapyDuration}
                  />

                  <RecoveryModalitySwitch
                    label="Récupération active"
                    icon={Activity}
                    checked={activeRecovery}
                    onCheckedChange={setActiveRecovery}
                    duration={activeRecoveryDuration}
                    onDurationChange={setActiveRecoveryDuration}
                  >
                    <Input
                      value={activeRecoveryType}
                      onChange={(e) => setActiveRecoveryType(e.target.value)}
                      placeholder="Ex: Vélo, natation, marche..."
                      className="mt-2"
                    />
                  </RecoveryModalitySwitch>
                </div>
              </TabsContent>

              <TabsContent value="scores" className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Score de récupération global</Label>
                      <span className="text-lg font-bold">{overallRecoveryScore}/10</span>
                    </div>
                    <Slider
                      value={[overallRecoveryScore]}
                      onValueChange={(v) => setOverallRecoveryScore(v[0])}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Niveau d'énergie</Label>
                      <span className="text-sm text-muted-foreground">{energyLevel}/5</span>
                    </div>
                    <Slider
                      value={[energyLevel]}
                      onValueChange={(v) => setEnergyLevel(v[0])}
                      min={1}
                      max={5}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Préparation musculaire</Label>
                      <span className="text-sm text-muted-foreground">{muscleReadiness}/5</span>
                    </div>
                    <Slider
                      value={[muscleReadiness]}
                      onValueChange={(v) => setMuscleReadiness(v[0])}
                      min={1}
                      max={5}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes générales</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observations, ressenti général..."
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => addEntry.mutate()}
              disabled={!playerId || addEntry.isPending}
            >
              {addEntry.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
