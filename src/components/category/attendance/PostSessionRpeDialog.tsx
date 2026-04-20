import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, differenceInMinutes, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { Activity, Clock, Loader2, Users, ChevronRight, Heart } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PostSessionRpeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    session_date: string;
    training_type: string;
    session_start_time?: string;
    session_end_time?: string;
    intensity?: number;
  } | null;
  categoryId: string;
  presentPlayerIds: string[];
}

interface PlayerRpeEntry {
  playerId: string;
  playerName: string;
  rpe: string;
  duration: string;
}

export function PostSessionRpeDialog({
  open,
  onOpenChange,
  session,
  categoryId,
  presentPlayerIds,
}: PostSessionRpeDialogProps) {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<Record<string, PlayerRpeEntry>>({});
  const [defaultDuration, setDefaultDuration] = useState("60");
  const [showHrv, setShowHrv] = useState(false);
  const [hrvMs, setHrvMs] = useState("");
  const [restingHr, setRestingHr] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [maxHr, setMaxHr] = useState("");
  const [showZones, setShowZones] = useState(false);
  const [zone1, setZone1] = useState("");
  const [zone2, setZone2] = useState("");
  const [zone3, setZone3] = useState("");
  const [zone4, setZone4] = useState("");
  const [zone5, setZone5] = useState("");

  // Fetch players info
  const { data: players } = useQuery({
    queryKey: ["players-for-rpe", categoryId, presentPlayerIds],
    queryFn: async () => {
      if (presentPlayerIds.length === 0) return [];
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .in("id", presentPlayerIds)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open && presentPlayerIds.length > 0,
  });

  // Calculate duration from session times
  useEffect(() => {
    if (session?.session_start_time && session?.session_end_time) {
      try {
        const start = parse(session.session_start_time, "HH:mm:ss", new Date());
        const end = parse(session.session_end_time, "HH:mm:ss", new Date());
        const minutes = differenceInMinutes(end, start);
        if (minutes > 0) {
          setDefaultDuration(String(minutes));
        }
      } catch {
        // Keep default
      }
    }
  }, [session]);

  // Initialize entries when players load
  useEffect(() => {
    if (players && open) {
      const initialEntries: Record<string, PlayerRpeEntry> = {};
      players.forEach((player) => {
        initialEntries[player.id] = {
          playerId: player.id,
          playerName: player.name,
          rpe: session?.intensity ? String(session.intensity) : "",
          duration: defaultDuration,
        };
      });
      setEntries(initialEntries);
    }
  }, [players, open, session?.intensity, defaultDuration]);

  // Calculate AWCR helper function
  const calculateAWCR = async (playerId: string, sessionDate: string, newLoad: number) => {
    const sevenDaysAgo = new Date(sessionDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const twentyEightDaysAgo = new Date(sessionDate);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    const { data: recentSessions } = await supabase
      .from("awcr_tracking")
      .select("training_load")
      .eq("player_id", playerId)
      .gte("session_date", sevenDaysAgo.toISOString().split("T")[0])
      .lt("session_date", sessionDate);

    const { data: chronicSessions } = await supabase
      .from("awcr_tracking")
      .select("training_load")
      .eq("player_id", playerId)
      .gte("session_date", twentyEightDaysAgo.toISOString().split("T")[0])
      .lt("session_date", sessionDate);

    const acuteTotal = (recentSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0) + newLoad;
    const chronicTotal = chronicSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0;

    const acuteAvg = acuteTotal / 7;
    const chronicAvg = chronicTotal / 28;

    const awcr = chronicAvg > 0 ? acuteAvg / chronicAvg : 0;

    return { acuteLoad: acuteAvg, chronicLoad: chronicAvg, awcr };
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Session manquante");

      const validEntries = Object.values(entries).filter(
        (e) => e.rpe && parseInt(e.rpe) >= 0 && parseInt(e.rpe) <= 10
      );

      if (validEntries.length === 0) {
        throw new Error("Aucune entrée valide à enregistrer");
      }

      const insertData = await Promise.all(
        validEntries.map(async (entry) => {
          const rpe = parseInt(entry.rpe);
          const duration = parseInt(entry.duration) || parseInt(defaultDuration);
          const trainingLoad = rpe * duration;

          const { acuteLoad, chronicLoad, awcr } = await calculateAWCR(
            entry.playerId,
            session.session_date,
            trainingLoad
          );

          return {
            player_id: entry.playerId,
            category_id: categoryId,
            session_date: session.session_date,
            training_session_id: session.id,
            rpe: rpe,
            duration_minutes: duration,
            acute_load: acuteLoad,
            chronic_load: chronicLoad,
            awcr: awcr,
          };
        })
      );

      const { error } = await supabase.from("awcr_tracking").insert(insertData);
      if (error) throw error;

      // Save HRV data if provided
      if (showHrv && (hrvMs || restingHr || avgHr || maxHr || zone1 || zone2 || zone3 || zone4 || zone5)) {
        const sessionType = session.training_type;
        const hrvRecordType = sessionType === "test" ? "test" : sessionType === "competition" ? "competition" : "session";
        
        const hrvInserts = validEntries.map(entry => ({
          player_id: entry.playerId,
          category_id: categoryId,
          record_date: session.session_date,
          record_type: hrvRecordType,
          training_session_id: session.id,
          hrv_ms: hrvMs ? parseFloat(hrvMs) : null,
          resting_hr_bpm: restingHr ? parseFloat(restingHr) : null,
          avg_hr_bpm: avgHr ? parseFloat(avgHr) : null,
          max_hr_bpm: maxHr ? parseFloat(maxHr) : null,
          zone1_minutes: zone1 ? parseFloat(zone1) : null,
          zone2_minutes: zone2 ? parseFloat(zone2) : null,
          zone3_minutes: zone3 ? parseFloat(zone3) : null,
          zone4_minutes: zone4 ? parseFloat(zone4) : null,
          zone5_minutes: zone5 ? parseFloat(zone5) : null,
        }));

        const { error: hrvError } = await supabase.from("hrv_records").insert(hrvInserts);
        if (hrvError) {
          console.error("HRV insert error:", hrvError);
          toast.error("RPE enregistrés mais erreur HRV");
        }
      }

      // Trigger AWCR alerts check
      try {
        await supabase.functions.invoke("check-awcr-alerts");
      } catch {
        // Silent fail for edge function
      }

      return insertData.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["awcr_tracking"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (showHrv) {
        queryClient.invalidateQueries({ queryKey: ["hrv_records"] });
      }
      toast.success(`${count} entrées RPE enregistrées`);
      setShowHrv(false);
      setHrvMs(""); setRestingHr(""); setAvgHr(""); setMaxHr("");
      setShowZones(false);
      setZone1(""); setZone2(""); setZone3(""); setZone4(""); setZone5("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  const handleEntryChange = (playerId: string, field: keyof PlayerRpeEntry, value: string) => {
    setEntries((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value,
      },
    }));
  };

  const applyRpeToAll = (rpeValue: string) => {
    setEntries((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], rpe: rpeValue };
      });
      return updated;
    });
  };

  const validCount = Object.values(entries).filter(
    (e) => e.rpe && parseInt(e.rpe) >= 0 && parseInt(e.rpe) <= 10
  ).length;

  const totalPlayers = Object.keys(entries).length;

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Saisie RPE post-séance
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
            <Badge variant="outline">{session.training_type}</Badge>
            <span>•</span>
            <span>{format(new Date(session.session_date), "EEEE d MMMM", { locale: fr })}</span>
            {session.session_start_time && (
              <>
                <span>•</span>
                <Clock className="h-3 w-3" />
                <span>{session.session_start_time.slice(0, 5)}</span>
              </>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Quick RPE buttons */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <Label className="text-sm font-medium mb-2 block">Appliquer à tous :</Label>
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rpe) => (
                <Button
                  key={rpe}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-9 h-9",
                    rpe >= 8 && "border-red-300 hover:bg-red-50",
                    rpe >= 6 && rpe < 8 && "border-yellow-300 hover:bg-yellow-50",
                    rpe < 6 && "border-green-300 hover:bg-green-50"
                  )}
                  onClick={() => applyRpeToAll(String(rpe))}
                >
                  {rpe}
                </Button>
              ))}
            </div>
          </div>

          {/* Duration setting */}
          <div className="flex items-center gap-4">
            <Label className="text-sm whitespace-nowrap">Durée (min) :</Label>
            <Input
              type="number"
              min="1"
              value={defaultDuration}
              onChange={(e) => {
                setDefaultDuration(e.target.value);
                // Apply to all entries
                setEntries((prev) => {
                  const updated = { ...prev };
                  Object.keys(updated).forEach((id) => {
                    updated[id] = { ...updated[id], duration: e.target.value };
                  });
                  return updated;
                });
              }}
              className="w-24"
            />
            <Badge variant="secondary" className="ml-auto">
              <Users className="h-3 w-3 mr-1" />
              {validCount}/{totalPlayers} joueurs
            </Badge>
          </div>

          {/* Players list */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-2 pr-4">
              {players?.map((player) => {
                const entry = entries[player.id];
                if (!entry) return null;

                const rpeValue = entry.rpe ? parseInt(entry.rpe) : null;
                const isValidRpe = rpeValue !== null && rpeValue >= 0 && rpeValue <= 10;
                const load = isValidRpe && entry.duration
                  ? rpeValue * parseInt(entry.duration)
                  : null;

                return (
                  <div
                    key={player.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      isValidRpe ? "bg-green-50/50 border-green-200" : "bg-background"
                    )}
                  >
                    <span className="w-40 font-medium truncate">{player.name}</span>

                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-1">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          placeholder="RPE"
                          className="w-16 h-8"
                          value={entry.rpe}
                          onChange={(e) => handleEntryChange(player.id, "rpe", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="1"
                          placeholder="min"
                          className="w-20 h-8"
                          value={entry.duration}
                          onChange={(e) => handleEntryChange(player.id, "duration", e.target.value)}
                        />
                      </div>
                      {load !== null && (
                        <Badge variant="outline" className="ml-auto">
                          Charge: {load}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* HRV Section (optional) */}
          <div className="p-3 bg-muted/30 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-hrv"
                checked={showHrv}
                onCheckedChange={(c) => setShowHrv(!!c)}
              />
              <Label htmlFor="show-hrv" className="text-sm flex items-center gap-1.5 cursor-pointer">
                <Heart className="h-3.5 w-3.5 text-rose-500" />
                Ajouter données HRV / cardio (optionnel)
              </Label>
            </div>

            {showHrv && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">HRV (ms)</Label>
                    <Input type="number" min="0" className="h-8 mt-1" value={hrvMs} onChange={(e) => setHrvMs(e.target.value)} placeholder="ex: 65" />
                  </div>
                  <div>
                    <Label className="text-xs">FC repos</Label>
                    <Input type="number" min="0" className="h-8 mt-1" value={restingHr} onChange={(e) => setRestingHr(e.target.value)} placeholder="bpm" />
                  </div>
                  <div>
                    <Label className="text-xs">FC moy</Label>
                    <Input type="number" min="0" className="h-8 mt-1" value={avgHr} onChange={(e) => setAvgHr(e.target.value)} placeholder="bpm" />
                  </div>
                  <div>
                    <Label className="text-xs">FC max</Label>
                    <Input type="number" min="0" className="h-8 mt-1" value={maxHr} onChange={(e) => setMaxHr(e.target.value)} placeholder="bpm" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-zones"
                    checked={showZones}
                    onCheckedChange={(c) => setShowZones(!!c)}
                  />
                  <Label htmlFor="show-zones" className="text-xs cursor-pointer">
                    Ajouter le temps par zone cardiaque
                  </Label>
                </div>

                {showZones && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: "Z1 Récup", color: "border-sky-400", value: zone1, set: setZone1 },
                        { label: "Z2 Aéro", color: "border-emerald-400", value: zone2, set: setZone2 },
                        { label: "Z3 Tempo", color: "border-amber-400", value: zone3, set: setZone3 },
                        { label: "Z4 Seuil", color: "border-orange-400", value: zone4, set: setZone4 },
                        { label: "Z5 VO2", color: "border-rose-400", value: zone5, set: setZone5 },
                      ].map((z) => (
                        <div key={z.label}>
                          <Label className="text-[10px] block mb-1">{z.label}</Label>
                          <Input
                            type="number"
                            min="0"
                            className={cn("h-7 text-xs border-l-2", z.color)}
                            value={z.value}
                            onChange={(e) => z.set(e.target.value)}
                            placeholder="min"
                          />
                        </div>
                      ))}
                    </div>
                    {(zone1 || zone2 || zone3 || zone4 || zone5) && (
                      <p className="text-[10px] text-muted-foreground text-right">
                        Total: {[zone1, zone2, zone3, zone4, zone5].reduce((s, v) => s + (parseFloat(v) || 0), 0)} min
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RPE scale reference */}
          <div className="p-2 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            <strong>Échelle RPE:</strong> 1-2 Très léger | 3-4 Léger | 5-6 Modéré | 7-8 Difficile | 9-10 Maximal
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Passer
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={validCount === 0 || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                Enregistrer {validCount} RPE
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
