import { useQuery } from "@tanstack/react-query";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Cake,
  Syringe,
  HeartPulse,
} from "lucide-react";
import { RecoveryDashboard } from "./RecoveryDashboard";
import { format, differenceInDays, addDays, isSameMonth, parseISO, isValid } from "date-fns";

const safeFormat = (date: Date | string | null | undefined, fmt: string, options?: any): string => {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return isValid(d) ? format(d, fmt, options) : "N/A";
};

const safeDiffDays = (dateLeft: Date | string | null | undefined, dateRight: Date): number => {
  if (!dateLeft) return 0;
  const d = typeof dateLeft === "string" ? new Date(dateLeft) : dateLeft;
  return isValid(d) ? differenceInDays(d, dateRight) : 0;
};
import { fr } from "date-fns/locale";

interface CoachDashboardProps {
  categoryId: string;
}

export function CoachDashboard({ categoryId }: CoachDashboardProps) {
  // Realtime sync for EWMA, wellness, and AWCR
  useRealtimeSync({
    tables: ["awcr_tracking", "wellness_tracking"],
    categoryId,
    queryKeys: [
      ["ewma_summary", categoryId],
      ["awcr-risk", categoryId],
      ["wellness_tracking", categoryId],
    ],
    channelName: `coach-dashboard-sync-${categoryId}`,
  });

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch active injuries
  const { data: injuries } = useQuery({
    queryKey: ["active_injuries", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injuries")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .neq("status", "healed")
        .order("injury_date", { ascending: false });
      if (error) {
        console.warn("Injuries query error:", error.message);
        return [];
      }
      return data;
    },
    retry: 1,
  });

  // Fetch EWMA data (replacing AWCR) - limit to last 60 days for performance
  const { data: ewmaData } = useQuery({
    queryKey: ["ewma_summary", categoryId],
    queryFn: async () => {
      const sixtyDaysAgo = format(addDays(new Date(), -60), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("player_id, awcr, acute_load, chronic_load, players(name, first_name)")
        .eq("category_id", categoryId)
        .gte("session_date", sixtyDaysAgo)
        .order("session_date", { ascending: false });
      if (error) {
        console.warn("EWMA query error:", error.message);
        return {};
      }

      // Get latest EWMA per player - use the stored awcr field (correct EWMA ratio)
      const latestByPlayer: Record<string, { ewmaRatio: number; acute: number; chronic: number; name: string }> = {};
      data?.forEach((entry: any) => {
        if (!latestByPlayer[entry.player_id] && entry.awcr != null) {
          const playerName = [entry.players?.first_name, entry.players?.name].filter(Boolean).join(" ");
          latestByPlayer[entry.player_id] = {
            ewmaRatio: entry.awcr,
            acute: entry.acute_load || 0,
            chronic: entry.chronic_load || 0,
            name: playerName || "Unknown",
          };
        }
      });
      return latestByPlayer;
    },
    retry: 1,
  });

  // Fetch wellness data
  const { data: wellnessData } = useQuery({
    queryKey: ["wellness_summary", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .gte("tracking_date", format(addDays(new Date(), -7), "yyyy-MM-dd"))
        .order("tracking_date", { ascending: false });
      if (error) {
        console.warn("Wellness query error:", error.message);
        return [];
      }
      return data;
    },
    retry: 1,
  });

  // Fetch medical records due soon
  const { data: medicalRecords } = useQuery({
    queryKey: ["medical_due_soon", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_records")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .lte("next_due_date", format(addDays(new Date(), 30), "yyyy-MM-dd"))
        .order("next_due_date");
      if (error) {
        console.warn("Medical records query error:", error.message);
        return [];
      }
      return data;
    },
    retry: 1,
  });

  // Fetch RTP protocols in progress
  const { data: rtpProtocols } = useQuery({
    queryKey: ["rtp_in_progress", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("return_to_play_protocols")
        .select("*, players(name), injuries(injury_type)")
        .eq("category_id", categoryId)
        .eq("status", "in_progress");
      if (error) {
        console.warn("RTP query error:", error.message);
        return [];
      }
      return data;
    },
    retry: 1,
  });

  // Calculate stats
  const totalPlayers = players?.length || 0;
  const injuredPlayers = injuries?.length || 0;
  const availablePlayers = totalPlayers - injuredPlayers;
  const availabilityRate = totalPlayers > 0 ? (availablePlayers / totalPlayers) * 100 : 0;

  // EWMA analysis (replacing AWCR)
  const ewmaValues = Object.values(ewmaData || {});
  const highEwma = ewmaValues.filter((p) => p.ewmaRatio > 1.3);
  const lowEwma = ewmaValues.filter((p) => p.ewmaRatio < 0.8);
  const optimalEwma = ewmaValues.filter((p) => p.ewmaRatio >= 0.8 && p.ewmaRatio <= 1.3);

  // Wellness analysis - get latest per player
  const latestWellness: Record<string, any> = {};
  wellnessData?.forEach((entry: any) => {
    if (!latestWellness[entry.player_id]) {
      latestWellness[entry.player_id] = entry;
    }
  });
  
  const lowWellnessPlayers = Object.values(latestWellness).filter((w: any) => {
    // Normalize all metrics so that high = good (optimal)
    // sleep_quality: 1=bad, 5=good → keep as-is
    // fatigue, stress, soreness: 1=good, 5=bad → invert (6 - value)
    const normalizedScore = (
      (w.sleep_quality || 3) + 
      (6 - (w.general_fatigue || 3)) + 
      (6 - (w.stress_level || 3)) + 
      (6 - (w.soreness_upper_body || 3)) + 
      (6 - (w.soreness_lower_body || 3))
    ) / 5;
    return normalizedScore < 2.5;
  });

  // Birthdays this month
  const birthdaysThisMonth = players?.filter((p) => {
    if (!p.birth_date) return false;
    const birthDate = parseISO(p.birth_date);
    return isValid(birthDate) && isSameMonth(birthDate, new Date());
  });

  // Medical records stats
  const expiredMedical = medicalRecords?.filter((r) => {
    return safeDiffDays(r.next_due_date, new Date()) < 0;
  });
  const dueSoonMedical = medicalRecords?.filter((r) => {
    const days = safeDiffDays(r.next_due_date, new Date());
    return days >= 0 && days <= 30;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard Coach</h2>
        <p className="text-muted-foreground">Vue consolidée des indicateurs critiques</p>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Disponibilité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {availablePlayers}/{totalPlayers}
            </div>
            <Progress value={availabilityRate} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {availabilityRate.toFixed(0)}% disponibles
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Blessures actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{injuredPlayers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {rtpProtocols?.length || 0} en protocole RTP
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              EWMA élevé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{highEwma.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Risque de surcharge
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HeartPulse className="h-4 w-4" />
              Wellness faible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{lowWellnessPlayers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Attention requise
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Critical alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Alertes critiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {/* Expired medical records */}
                {expiredMedical?.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/30"
                  >
                    <Syringe className="h-4 w-4 text-destructive mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{record.players?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.name} expiré depuis{" "}
                        {Math.abs(safeDiffDays(record.next_due_date, new Date()))} jours
                      </p>
                    </div>
                  </div>
                ))}

                {/* High EWMA players */}
                {highEwma.map((player, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30"
                  >
                    <TrendingUp className="h-4 w-4 text-orange-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{player.name}</p>
                      <p className="text-xs text-muted-foreground">
                        EWMA: {player.ewmaRatio.toFixed(2)} - Risque de surcharge
                      </p>
                    </div>
                  </div>
                ))}

                {/* Low EWMA players */}
                {lowEwma.map((player, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30"
                  >
                    <TrendingDown className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{player.name}</p>
                      <p className="text-xs text-muted-foreground">
                        EWMA: {player.ewmaRatio.toFixed(2)} - Sous-entraîné
                      </p>
                    </div>
                  </div>
                ))}

                {/* Low wellness */}
                {lowWellnessPlayers.map((player: any, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30"
                  >
                    <HeartPulse className="h-4 w-4 text-purple-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{player.players?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Wellness faible - Vérifier état général
                      </p>
                    </div>
                  </div>
                ))}

                {(!expiredMedical?.length && !highEwma.length && !lowEwma.length && !lowWellnessPlayers.length) && (
                  <div className="flex items-center gap-2 text-green-600 p-3">
                    <CheckCircle className="h-5 w-5" />
                    <span>Aucune alerte critique</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Upcoming reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Rappels à venir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {/* Medical records due soon */}
                {dueSoonMedical?.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <Syringe className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{record.players?.name}</p>
                      <p className="text-xs text-muted-foreground">{record.name}</p>
                    </div>
                    <Badge variant="outline">
                      {safeDiffDays(record.next_due_date, new Date())}j
                    </Badge>
                  </div>
                ))}

                {/* RTP protocols */}
                {rtpProtocols?.map((protocol: any) => (
                  <div
                    key={protocol.id}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{protocol.players?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        RTP {protocol.injuries?.injury_type} - Phase {protocol.current_phase}/6
                      </p>
                    </div>
                    <Badge variant="secondary">En cours</Badge>
                  </div>
                ))}

                {/* Birthdays */}
                {birthdaysThisMonth?.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-start gap-3 p-3 bg-pink-500/10 rounded-lg"
                  >
                    <Cake className="h-4 w-4 text-pink-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{player.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Anniversaire le{" "}
                        {safeFormat(player.birth_date ? parseISO(player.birth_date) : null, "dd MMMM", { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}

                {(!dueSoonMedical?.length && !rtpProtocols?.length && !birthdaysThisMonth?.length) && (
                  <p className="text-center text-muted-foreground py-4">
                    Aucun rappel à venir
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Active injuries detail */}
      {injuries && injuries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Blessures en cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {injuries.map((injury: any) => {
                const injuryDate = injury.injury_date ? new Date(injury.injury_date) : null;
                const daysOut = injuryDate ? differenceInDays(new Date(), injuryDate) : null;
                return (
                  <div
                    key={injury.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-base">{injury.players?.name}</p>
                        <p className="text-sm text-destructive font-medium">{injury.injury_type}</p>
                      </div>
                      <Badge
                        variant={injury.status === "active" ? "destructive" : "secondary"}
                      >
                        {injury.status === "active" ? "Active" : "Réhab"}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-foreground">Blessure le:</span>
                        <span>{safeFormat(injury.injury_date, "EEEE dd MMMM yyyy", { locale: fr })}</span>
                      </div>
                      {daysOut !== null && (
                        <p>Absent depuis <span className="font-medium text-foreground">{daysOut} jour{daysOut > 1 ? "s" : ""}</span></p>
                      )}
                      {injury.estimated_return_date && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-foreground">Retour estimé:</span>
                          <span>{safeFormat(injury.estimated_return_date, "EEEE dd MMMM yyyy", { locale: fr })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* EWMA distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribution EWMA</CardTitle>
        </CardHeader>
        <CardContent>
          {ewmaValues.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Aucune donnée EWMA disponible</p>
              <p className="text-sm mt-1">
                Les ratios EWMA sont calculés automatiquement lorsque les joueurs ont suffisamment de sessions RPE enregistrées (minimum 7 jours de données).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-500/10 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{lowEwma.length}</p>
                <p className="text-sm text-muted-foreground">Sous-entraînés (&lt;0.8)</p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{optimalEwma.length}</p>
                <p className="text-sm text-muted-foreground">Zone optimale (0.8-1.3)</p>
              </div>
              <div className="p-4 bg-orange-500/10 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{highEwma.length}</p>
                <p className="text-sm text-muted-foreground">Surcharge (&gt;1.3)</p>
              </div>
            </div>
          )}
        </CardContent>
      {/* Recovery & Sleep Dashboard */}
      <RecoveryDashboard categoryId={categoryId} />
    </div>
  );
}
