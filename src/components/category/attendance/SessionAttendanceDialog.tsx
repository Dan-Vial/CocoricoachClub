import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Users, Check, X, Clock, AlertCircle, CheckCircle2, 
  ChevronDown, Activity, Moon, Brain, Dumbbell
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SessionAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    session_date: string;
    training_type: string;
    session_start_time?: string;
    session_end_time?: string;
    intensity?: number;
    notes?: string;
  } | null;
  categoryId: string;
  onAttendanceSaved?: (presentPlayerIds: string[]) => void;
}

const ATTENDANCE_STATUS = [
  { value: "present", label: "Présent", icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-100" },
  { value: "absent", label: "Absent", icon: X, color: "text-red-600", bgColor: "bg-red-100" },
  { value: "excused", label: "Excusé", icon: AlertCircle, color: "text-amber-600", bgColor: "bg-amber-100" },
  { value: "late", label: "Retard", icon: Clock, color: "text-orange-600", bgColor: "bg-orange-100" },
];

const WELLNESS_LABELS = {
  sleep_quality: ["", "Excellent", "Bon", "Moyen", "Mauvais", "Très mauvais"],
  sleep_duration: ["", ">8h", "7-8h", "6-7h", "5-6h", "<5h"],
  general_fatigue: ["", "Très en forme", "En forme", "Normal", "Fatigué", "Épuisé"],
  stress_level: ["", "Très détendu", "Détendu", "Normal", "Stressé", "Très stressé"],
  soreness: ["", "Aucune", "Légère", "Modérée", "Forte", "Limitante"],
};

interface PlayerAttendanceData {
  status: string;
  reason: string;
  wellnessEnabled: boolean;
  wellness: {
    sleepQuality: number;
    sleepDuration: number;
    generalFatigue: number;
    stressLevel: number;
    sorenessUpper: number;
    sorenessLower: number;
    hasSpecificPain: boolean;
    painLocation: string;
  };
}

export function SessionAttendanceDialog({ 
  open, 
  onOpenChange, 
  session, 
  categoryId,
  onAttendanceSaved 
}: SessionAttendanceDialogProps) {
  const queryClient = useQueryClient();
  const [attendance, setAttendance] = useState<Record<string, PlayerAttendanceData>>({});
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [collectWellness, setCollectWellness] = useState(true);

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position, avatar_url")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing attendance for this session
  const { data: existingAttendance } = useQuery({
    queryKey: ["session-attendance", session?.id, session?.session_date],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from("training_attendance")
        .select("*")
        .eq("category_id", categoryId)
        .eq("attendance_date", session.session_date)
        .eq("training_session_id", session.id);
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Fetch existing wellness for this date
  const { data: existingWellness } = useQuery({
    queryKey: ["session-wellness", session?.session_date, categoryId],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("*")
        .eq("category_id", categoryId)
        .eq("tracking_date", session.session_date);
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Initialize attendance state
  useEffect(() => {
    if (players && session) {
      const initial: Record<string, PlayerAttendanceData> = {};
      players.forEach((p) => {
        const existingAtt = existingAttendance?.find((a) => a.player_id === p.id);
        const existingWell = existingWellness?.find((w) => w.player_id === p.id);
        
        initial[p.id] = {
          status: existingAtt?.status || "present",
          reason: existingAtt?.absence_reason || "",
          wellnessEnabled: !!existingWell,
          wellness: {
            sleepQuality: existingWell?.sleep_quality || 3,
            sleepDuration: existingWell?.sleep_duration || 3,
            generalFatigue: existingWell?.general_fatigue || 3,
            stressLevel: existingWell?.stress_level || 3,
            sorenessUpper: existingWell?.soreness_upper_body || 1,
            sorenessLower: existingWell?.soreness_lower_body || 1,
            hasSpecificPain: existingWell?.has_specific_pain || false,
            painLocation: existingWell?.pain_location || "",
          },
        };
      });
      setAttendance(initial);
    }
  }, [players, session, existingAttendance, existingWellness]);

  const saveAttendance = useMutation({
    mutationFn: async () => {
      if (!session) return;

      // Delete existing attendance for this session
      await supabase
        .from("training_attendance")
        .delete()
        .eq("category_id", categoryId)
        .eq("attendance_date", session.session_date)
        .eq("training_session_id", session.id);

      // Insert new attendance
      const attendanceEntries = Object.entries(attendance).map(([playerId, data]) => ({
        player_id: playerId,
        category_id: categoryId,
        attendance_date: session.session_date,
        training_session_id: session.id,
        status: data.status,
        absence_reason: data.status !== "present" ? data.reason : null,
      }));

      const { error: attError } = await supabase.from("training_attendance").insert(attendanceEntries);
      if (attError) throw attError;

      // Handle wellness data if collecting
      if (collectWellness) {
        const wellnessEntries = Object.entries(attendance)
          .filter(([_, data]) => data.status === "present" && data.wellnessEnabled)
          .map(([playerId, data]) => ({
            player_id: playerId,
            category_id: categoryId,
            tracking_date: session.session_date,
            sleep_quality: data.wellness.sleepQuality,
            sleep_duration: data.wellness.sleepDuration,
            general_fatigue: data.wellness.generalFatigue,
            stress_level: data.wellness.stressLevel,
            soreness_upper_body: data.wellness.sorenessUpper,
            soreness_lower_body: data.wellness.sorenessLower,
            has_specific_pain: data.wellness.hasSpecificPain,
            pain_location: data.wellness.hasSpecificPain ? data.wellness.painLocation : null,
          }));

        if (wellnessEntries.length > 0) {
          // Upsert wellness (update if exists, insert if not)
          for (const entry of wellnessEntries) {
            const { error: wellError } = await supabase
              .from("wellness_tracking")
              .upsert(entry, { onConflict: "player_id,tracking_date" });
            if (wellError) console.error("Wellness error:", wellError);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_attendance"] });
      queryClient.invalidateQueries({ queryKey: ["session-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["training_attendance_stats"] });
      queryClient.invalidateQueries({ queryKey: ["wellness_tracking"] });
      queryClient.invalidateQueries({ queryKey: ["session-wellness"] });
      toast.success("Présences et wellness enregistrés");

      // Get list of present player IDs and trigger callback
      const presentPlayerIds = Object.entries(attendance)
        .filter(([_, data]) => data.status === "present")
        .map(([playerId]) => playerId);
      
      onOpenChange(false);
      
      // Call callback after closing this dialog
      if (onAttendanceSaved && presentPlayerIds.length > 0) {
        onAttendanceSaved(presentPlayerIds);
      }
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const setAllStatus = (status: string) => {
    const updated: Record<string, PlayerAttendanceData> = {};
    players?.forEach((p) => {
      updated[p.id] = { 
        ...attendance[p.id], 
        status, 
        reason: attendance[p.id]?.reason || "" 
      };
    });
    setAttendance(updated);
  };

  const enableAllWellness = () => {
    const updated: Record<string, PlayerAttendanceData> = {};
    Object.entries(attendance).forEach(([playerId, data]) => {
      updated[playerId] = { 
        ...data, 
        wellnessEnabled: data.status === "present" 
      };
    });
    setAttendance(updated);
  };

  const handleCollectWellnessChange = (checked: boolean) => {
    setCollectWellness(checked);

    if (!checked) {
      setExpandedPlayer(null);
      return;
    }

    // If user wants wellness, default-enable it for all present players
    enableAllWellness();

    // And auto-open the first present player so the QCM is immediately visible
    const firstPresentPlayerId = players?.find((p) => {
      const status = attendance[p.id]?.status || "present";
      return status === "present";
    })?.id;

    setExpandedPlayer(firstPresentPlayerId || null);
  };

  const getStatusInfo = (status: string) => {
    return ATTENDANCE_STATUS.find((s) => s.value === status) || ATTENDANCE_STATUS[0];
  };

  const updatePlayerWellness = (playerId: string, field: keyof PlayerAttendanceData["wellness"], value: any) => {
    setAttendance({
      ...attendance,
      [playerId]: {
        ...attendance[playerId],
        wellness: {
          ...attendance[playerId].wellness,
          [field]: value,
        },
      },
    });
  };

  const presentCount = Object.values(attendance).filter((a) => a.status === "present").length;
  const absentCount = Object.values(attendance).filter((a) => a.status === "absent").length;
  const wellnessCount = Object.values(attendance).filter((a) => a.status === "present" && a.wellnessEnabled).length;

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Appel - {format(new Date(session.session_date), "EEEE d MMMM", { locale: fr })}
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{session.training_type}</Badge>
            {session.session_start_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {session.session_start_time.slice(0, 5)}
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Summary */}
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <Check className="h-3 w-3 mr-1" />
            {presentCount} présents
          </Badge>
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <X className="h-3 w-3 mr-1" />
            {absentCount} absents
          </Badge>
          {collectWellness && (
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
              <Activity className="h-3 w-3 mr-1" />
              {wellnessCount} wellness
            </Badge>
          )}
        </div>

        {/* Options */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted rounded-lg flex-shrink-0">
          <div className="flex items-center gap-2">
            <Switch 
              id="collect-wellness" 
              checked={collectWellness} 
              onCheckedChange={handleCollectWellnessChange}
            />
            <Label htmlFor="collect-wellness" className="text-sm font-medium">
              Collecter le Wellness
            </Label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAllStatus("present")}>
              Tous présents
            </Button>
            {collectWellness && (
              <Button variant="outline" size="sm" onClick={enableAllWellness}>
                <Activity className="h-3 w-3 mr-1" />
                Wellness pour tous
              </Button>
            )}
          </div>
        </div>

        {/* Player list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 pr-4">
            {players?.map((player) => {
              const playerData = attendance[player.id] || { 
                status: "present", 
                reason: "", 
                wellnessEnabled: false,
                wellness: {
                  sleepQuality: 3,
                  sleepDuration: 3,
                  generalFatigue: 3,
                  stressLevel: 3,
                  sorenessUpper: 1,
                  sorenessLower: 1,
                  hasSpecificPain: false,
                  painLocation: "",
                }
              };
              const statusInfo = getStatusInfo(playerData.status);
              const StatusIcon = statusInfo.icon;
              const isPresent = playerData.status === "present";
              const isExpanded = expandedPlayer === player.id;

              return (
                <Collapsible
                  key={player.id}
                  open={isExpanded && collectWellness && isPresent}
                  onOpenChange={(open) => setExpandedPlayer(open ? player.id : null)}
                >
                  <div
                    className={cn(
                      "p-3 rounded-lg border transition-colors",
                      playerData.status === "absent" && "border-red-200 bg-red-50",
                      playerData.status === "excused" && "border-amber-200 bg-amber-50",
                      playerData.status === "late" && "border-orange-200 bg-orange-50",
                      playerData.status === "present" && "border-green-200 bg-green-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusIcon className={cn("h-5 w-5 flex-shrink-0", statusInfo.color)} />
                        <span className="font-medium truncate">{player.name}</span>
                        {player.position && (
                          <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                            {player.position}
                          </Badge>
                        )}
                        {collectWellness && isPresent && playerData.wellnessEnabled && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            <Activity className="h-3 w-3 mr-1" />
                            Wellness
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={playerData.status}
                          onValueChange={(value) =>
                            setAttendance({
                              ...attendance,
                              [player.id]: { ...playerData, status: value },
                            })
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ATTENDANCE_STATUS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                <div className="flex items-center gap-2">
                                  <s.icon className={cn("h-4 w-4", s.color)} />
                                  {s.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {collectWellness && isPresent && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronDown className={cn(
                                "h-4 w-4 transition-transform",
                                isExpanded && "rotate-180"
                              )} />
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </div>
                    </div>

                    {/* Absence reason */}
                    {!isPresent && (
                      <div className="mt-2">
                        <Input
                          placeholder="Raison (optionnel)..."
                          value={playerData.reason}
                          onChange={(e) =>
                            setAttendance({
                              ...attendance,
                              [player.id]: { ...playerData, reason: e.target.value },
                            })
                          }
                          className="bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Wellness Section */}
                  <CollapsibleContent>
                    <div className="mt-2 p-4 border rounded-lg bg-purple-50/50 border-purple-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Activity className="h-4 w-4 text-purple-600" />
                          Données Wellness
                        </Label>
                        <Switch
                          checked={playerData.wellnessEnabled}
                          onCheckedChange={(checked) =>
                            setAttendance({
                              ...attendance,
                              [player.id]: { ...playerData, wellnessEnabled: checked },
                            })
                          }
                        />
                      </div>

                      {playerData.wellnessEnabled && (
                        <div className="grid gap-4">
                          {/* Sleep */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs flex items-center gap-1">
                                  <Moon className="h-3 w-3" /> Qualité sommeil
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                  {WELLNESS_LABELS.sleep_quality[playerData.wellness.sleepQuality]}
                                </span>
                              </div>
                              <Slider
                                value={[playerData.wellness.sleepQuality]}
                                onValueChange={([v]) => updatePlayerWellness(player.id, "sleepQuality", v)}
                                min={1}
                                max={5}
                                step={1}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Durée sommeil</Label>
                                <span className="text-xs text-muted-foreground">
                                  {WELLNESS_LABELS.sleep_duration[playerData.wellness.sleepDuration]}
                                </span>
                              </div>
                              <Slider
                                value={[playerData.wellness.sleepDuration]}
                                onValueChange={([v]) => updatePlayerWellness(player.id, "sleepDuration", v)}
                                min={1}
                                max={5}
                                step={1}
                              />
                            </div>
                          </div>

                          {/* Fatigue & Stress */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs flex items-center gap-1">
                                  <Dumbbell className="h-3 w-3" /> Fatigue
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                  {WELLNESS_LABELS.general_fatigue[playerData.wellness.generalFatigue]}
                                </span>
                              </div>
                              <Slider
                                value={[playerData.wellness.generalFatigue]}
                                onValueChange={([v]) => updatePlayerWellness(player.id, "generalFatigue", v)}
                                min={1}
                                max={5}
                                step={1}
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs flex items-center gap-1">
                                  <Brain className="h-3 w-3" /> Stress
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                  {WELLNESS_LABELS.stress_level[playerData.wellness.stressLevel]}
                                </span>
                              </div>
                              <Slider
                                value={[playerData.wellness.stressLevel]}
                                onValueChange={([v]) => updatePlayerWellness(player.id, "stressLevel", v)}
                                min={1}
                                max={5}
                                step={1}
                              />
                            </div>
                          </div>

                          {/* Soreness */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Courbatures haut</Label>
                                <span className="text-xs text-muted-foreground">
                                  {WELLNESS_LABELS.soreness[playerData.wellness.sorenessUpper]}
                                </span>
                              </div>
                              <Slider
                                value={[playerData.wellness.sorenessUpper]}
                                onValueChange={([v]) => updatePlayerWellness(player.id, "sorenessUpper", v)}
                                min={1}
                                max={5}
                                step={1}
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Courbatures bas</Label>
                                <span className="text-xs text-muted-foreground">
                                  {WELLNESS_LABELS.soreness[playerData.wellness.sorenessLower]}
                                </span>
                              </div>
                              <Slider
                                value={[playerData.wellness.sorenessLower]}
                                onValueChange={([v]) => updatePlayerWellness(player.id, "sorenessLower", v)}
                                min={1}
                                max={5}
                                step={1}
                              />
                            </div>
                          </div>

                          {/* Specific Pain */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`pain-${player.id}`}
                                checked={playerData.wellness.hasSpecificPain}
                                onCheckedChange={(checked) => 
                                  updatePlayerWellness(player.id, "hasSpecificPain", checked)
                                }
                              />
                              <Label htmlFor={`pain-${player.id}`} className="text-xs">
                                Douleur spécifique
                              </Label>
                            </div>
                            {playerData.wellness.hasSpecificPain && (
                              <Input
                                placeholder="Localisation de la douleur..."
                                value={playerData.wellness.painLocation}
                                onChange={(e) => 
                                  updatePlayerWellness(player.id, "painLocation", e.target.value)
                                }
                                className="text-sm"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => saveAttendance.mutate()} disabled={saveAttendance.isPending}>
            {saveAttendance.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
