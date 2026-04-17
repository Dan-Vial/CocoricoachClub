import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Activity, Shield } from "lucide-react";
import { Loader2 } from "lucide-react";

interface InjuryRiskPredictionProps {
  categoryId: string;
}

interface PlayerRisk {
  id: string;
  name: string;
  riskLevel: "low" | "moderate" | "high" | "very_high";
  riskScore: number;
  factors: string[];
  awcr?: number;
  ewmaRatio?: number;
  acuteLoad?: number;
  chronicLoad?: number;
}

export function InjuryRiskPrediction({ categoryId }: InjuryRiskPredictionProps) {
  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name, category_id")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: awcrData, isLoading } = useQuery({
    queryKey: ["awcr-risk", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("*")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: injuries } = useQuery({
    queryKey: ["injuries-risk", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injuries")
        .select("*")
        .eq("category_id", categoryId);
      if (error) throw error;
      return data;
    },
  });

  // Wellness — last 7 days per player (fatigue / pain markers)
  const { data: wellnessData } = useQuery({
    queryKey: ["wellness-risk", categoryId],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("player_id, sleep_quality, fatigue_level, stress_level, muscle_soreness, has_specific_pain, recorded_at")
        .eq("category_id", categoryId)
        .gte("recorded_at", since.toISOString())
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // HRV — last 7 days
  const { data: hrvData } = useQuery({
    queryKey: ["hrv-risk", categoryId],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const { data, error } = await supabase
        .from("hrv_records")
        .select("player_id, rmssd, recorded_at")
        .eq("category_id", categoryId)
        .gte("recorded_at", since.toISOString())
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // GPS — last 14 days (high-speed running spikes)
  const { data: gpsData } = useQuery({
    queryKey: ["gps-risk", categoryId],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const { data, error } = await supabase
        .from("gps_sessions")
        .select("player_id, total_distance_m, hsr_distance_m, sprint_distance_m, session_date")
        .eq("category_id", categoryId)
        .gte("session_date", since.toISOString().split("T")[0])
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Strength tonnage — last 28 days
  const { data: tonnageData } = useQuery({
    queryKey: ["tonnage-risk", categoryId],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 28);
      const { data, error } = await supabase
        .from("athlete_exercise_logs")
        .select("player_id, tonnage, created_at")
        .eq("category_id", categoryId)
        .gte("created_at", since.toISOString());
      if (error) throw error;
      return data || [];
    },
  });

  const calculateRisk = (playerId: string): PlayerRisk | null => {
    if (!awcrData || !players || !injuries) return null;

    const player = players.find(p => p.id === playerId);
    if (!player) return null;

    const fullName = [player.first_name, player.name].filter(Boolean).join(" ");
    const playerAwcr = awcrData.filter(a => a.player_id === playerId).slice(0, 7);
    const factors: string[] = [];
    let riskScore = 0;

    // ===== AWCR + EWMA =====
    if (playerAwcr.length > 0) {
      const latest = playerAwcr[0];
      const awcr = Number(latest.awcr || 0);
      const acuteLoad = Number(latest.acute_load || 0);
      const chronicLoad = Number(latest.chronic_load || 0);
      const ewmaRatio = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

      if (awcr > 1.5) {
        riskScore += 25;
        factors.push(`AWCR élevé (${awcr.toFixed(2)})`);
      } else if (awcr < 0.8 && awcr > 0) {
        riskScore += 15;
        factors.push(`AWCR faible (${awcr.toFixed(2)})`);
      }
      if (ewmaRatio > 1.5) {
        riskScore += 20;
        factors.push(`EWMA élevé (${ewmaRatio.toFixed(2)})`);
      }
      if (acuteLoad > 2000) {
        riskScore += 15;
        factors.push(`Charge aiguë élevée (${Math.round(acuteLoad)})`);
      }
      if (playerAwcr.length >= 2) {
        const prevAcute = Number(playerAwcr[1].acute_load || 0);
        if (prevAcute > 0) {
          const variation = Math.abs(acuteLoad - prevAcute) / prevAcute;
          if (variation > 0.3) {
            riskScore += 15;
            factors.push(`Variation de charge ${(variation * 100).toFixed(0)}%`);
          }
        }
      }

      // ===== Wellness (fatigue + pain) =====
      const wellness = (wellnessData || []).filter(w => w.player_id === playerId).slice(0, 3);
      if (wellness.length > 0) {
        const avgFatigue = wellness.reduce((s, w) => s + (w.fatigue_level || 0), 0) / wellness.length;
        const avgSoreness = wellness.reduce((s, w) => s + (w.muscle_soreness || 0), 0) / wellness.length;
        const hasPain = wellness.some(w => w.has_specific_pain);
        if (hasPain) {
          riskScore += 20;
          factors.push("Douleur signalée (Wellness)");
        }
        if (avgFatigue >= 4) {
          riskScore += 12;
          factors.push(`Fatigue élevée (${avgFatigue.toFixed(1)}/5)`);
        }
        if (avgSoreness >= 4) {
          riskScore += 8;
          factors.push(`Courbatures importantes (${avgSoreness.toFixed(1)}/5)`);
        }
      }

      // ===== HRV (chute > 10% sur 3 j vs baseline 14 j) =====
      const hrv = (hrvData || []).filter(h => h.player_id === playerId);
      if (hrv.length >= 5) {
        const recent3 = hrv.slice(0, 3);
        const baseline = hrv.slice(3);
        const avgRecent = recent3.reduce((s, h) => s + Number(h.rmssd || 0), 0) / recent3.length;
        const avgBase = baseline.reduce((s, h) => s + Number(h.rmssd || 0), 0) / baseline.length;
        if (avgBase > 0 && avgRecent < avgBase * 0.9) {
          const drop = ((avgBase - avgRecent) / avgBase) * 100;
          riskScore += 15;
          factors.push(`HRV en baisse (-${drop.toFixed(0)}%)`);
        }
      }

      // ===== GPS (pic HSR > +30% vs moyenne 14j) =====
      const gps = (gpsData || []).filter(g => g.player_id === playerId);
      if (gps.length >= 4) {
        const recent = gps.slice(0, 2);
        const baseline = gps.slice(2);
        const avgRecentHsr = recent.reduce((s, g) => s + Number(g.hsr_distance_m || 0), 0) / recent.length;
        const avgBaseHsr = baseline.reduce((s, g) => s + Number(g.hsr_distance_m || 0), 0) / baseline.length;
        if (avgBaseHsr > 0 && avgRecentHsr > avgBaseHsr * 1.3) {
          riskScore += 12;
          factors.push(`Pic HSR détecté (+${(((avgRecentHsr / avgBaseHsr) - 1) * 100).toFixed(0)}%)`);
        }
      }

      // ===== Tonnage musculation (pic semaine vs 4 sem) =====
      const tonnage = (tonnageData || []).filter(t => t.player_id === playerId);
      if (tonnage.length > 0) {
        const now = Date.now();
        const week = 7 * 24 * 3600 * 1000;
        const lastWeek = tonnage
          .filter(t => now - new Date(t.created_at).getTime() < week)
          .reduce((s, t) => s + Number(t.tonnage || 0), 0);
        const monthAvgWeek =
          tonnage.reduce((s, t) => s + Number(t.tonnage || 0), 0) / 4;
        if (monthAvgWeek > 0 && lastWeek > monthAvgWeek * 1.4) {
          riskScore += 10;
          factors.push(`Pic tonnage musculation (+${(((lastWeek / monthAvgWeek) - 1) * 100).toFixed(0)}%)`);
        }
      }

      // ===== Historique blessures =====
      const playerInjuries = injuries.filter(i => i.player_id === playerId);
      const activeInjuries = playerInjuries.filter(i => i.status === "active");
      if (activeInjuries.length > 0) {
        riskScore += 35;
        factors.push("Blessure active");
      } else if (playerInjuries.length > 0) {
        riskScore += 10;
        factors.push(`Antécédents (${playerInjuries.length})`);
      }

      let riskLevel: PlayerRisk["riskLevel"];
      if (riskScore >= 70) riskLevel = "very_high";
      else if (riskScore >= 50) riskLevel = "high";
      else if (riskScore >= 30) riskLevel = "moderate";
      else riskLevel = "low";

      return {
        id: playerId,
        name: fullName,
        riskLevel,
        riskScore: Math.min(riskScore, 100),
        factors: factors.length > 0 ? factors : ["Aucun facteur de risque détecté"],
        awcr,
        ewmaRatio,
        acuteLoad,
        chronicLoad,
      };
    }

    return {
      id: playerId,
      name: fullName,
      riskLevel: "low",
      riskScore: 0,
      factors: ["Données insuffisantes"],
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const playerRisks = players?.map(p => calculateRisk(p.id)).filter(Boolean) as PlayerRisk[] || [];
  const sortedRisks = playerRisks.sort((a, b) => b.riskScore - a.riskScore);

  const getRiskBadge = (level: PlayerRisk["riskLevel"]) => {
    switch (level) {
      case "very_high":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Très Élevé</Badge>;
      case "high":
        return <Badge variant="destructive" className="gap-1"><TrendingUp className="h-3 w-3" />Élevé</Badge>;
      case "moderate":
        return <Badge variant="secondary" className="gap-1"><Activity className="h-3 w-3" />Modéré</Badge>;
      case "low":
        return <Badge variant="default" className="gap-1"><Shield className="h-3 w-3" />Faible</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Prédiction de Risque de Blessure (multi-sources)</AlertTitle>
        <AlertDescription>
          Algorithme déterministe corrélant <strong>AWCR + EWMA</strong>, <strong>Wellness</strong> (fatigue, douleur, courbatures),{" "}
          <strong>HRV</strong> (chute &gt; 10%), <strong>GPS</strong> (pic HSR) et <strong>Tonnage musculation</strong> (pic hebdomadaire).
          Plus les sources sont renseignées, plus le score est fiable. Aucune IA externe utilisée.
        </AlertDescription>
      </Alert>

      {sortedRisks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedRisks.map(risk => (
            <Card key={risk.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{risk.name}</span>
                  {getRiskBadge(risk.riskLevel)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <p><strong>Score de risque:</strong> {risk.riskScore}/100</p>
                  {risk.awcr !== undefined && (
                    <p><strong>AWCR:</strong> {risk.awcr.toFixed(2)}</p>
                  )}
                  {risk.ewmaRatio !== undefined && risk.ewmaRatio > 0 && (
                    <p><strong>EWMA:</strong> {risk.ewmaRatio.toFixed(2)}</p>
                  )}
                  {risk.acuteLoad !== undefined && (
                    <p><strong>Charge aiguë:</strong> {Math.round(risk.acuteLoad)}</p>
                  )}
                  {risk.chronicLoad !== undefined && (
                    <p><strong>Charge chronique:</strong> {Math.round(risk.chronicLoad)}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Facteurs de risque:</p>
                  <ul className="text-sm space-y-1">
                    {risk.factors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">
              Aucune donnée disponible pour l'analyse de risque
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
