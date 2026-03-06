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

  const calculateRisk = (playerId: string): PlayerRisk | null => {
    if (!awcrData || !players || !injuries) return null;

    const player = players.find(p => p.id === playerId);
    if (!player) return null;

    const playerAwcr = awcrData.filter(a => a.player_id === playerId).slice(0, 7);
    if (playerAwcr.length === 0) {
      return {
        id: playerId,
        name: player.name,
        riskLevel: "low",
        riskScore: 0,
        factors: ["Données insuffisantes"],
      };
    }

    const factors: string[] = [];
    let riskScore = 0;

    // Récupérer les dernières données
    const latest = playerAwcr[0];
    const awcr = Number(latest.awcr || 0);
    const acuteLoad = Number(latest.acute_load || 0);
    const chronicLoad = Number(latest.chronic_load || 0);

    // Facteur 1: AWCR élevé (>1.5) ou très bas (<0.8)
    if (awcr > 1.5) {
      riskScore += 30;
      factors.push(`AWCR élevé (${awcr.toFixed(2)})`);
    } else if (awcr < 0.8 && awcr > 0) {
      riskScore += 20;
      factors.push(`AWCR faible (${awcr.toFixed(2)})`);
    }

    // Facteur 2: Charge aiguë élevée
    if (acuteLoad > 2000) {
      riskScore += 25;
      factors.push(`Charge aiguë élevée (${Math.round(acuteLoad)})`);
    }

    // Facteur 3: Variation importante de charge
    if (playerAwcr.length >= 2) {
      const prevAcute = Number(playerAwcr[1].acute_load || 0);
      const variation = Math.abs(acuteLoad - prevAcute) / prevAcute;
      if (variation > 0.3) {
        riskScore += 20;
        factors.push(`Variation de charge importante (${(variation * 100).toFixed(0)}%)`);
      }
    }

    // Facteur 4: Historique de blessures
    const playerInjuries = injuries.filter(i => i.player_id === playerId);
    if (playerInjuries.length > 0) {
      const activeInjuries = playerInjuries.filter(i => i.status === "active");
      if (activeInjuries.length > 0) {
        riskScore += 40;
        factors.push("Blessure active");
      } else {
        riskScore += 15;
        factors.push(`Historique de blessures (${playerInjuries.length})`);
      }
    }

    // Déterminer le niveau de risque
    let riskLevel: PlayerRisk["riskLevel"];
    if (riskScore >= 70) riskLevel = "very_high";
    else if (riskScore >= 50) riskLevel = "high";
    else if (riskScore >= 30) riskLevel = "moderate";
    else riskLevel = "low";

    return {
      id: playerId,
      name: player.name,
      riskLevel,
      riskScore,
      factors: factors.length > 0 ? factors : ["Aucun facteur de risque détecté"],
      awcr,
      acuteLoad,
      chronicLoad,
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
        return <Badge variant="destructive" className="gap-1 bg-orange-500"><TrendingUp className="h-3 w-3" />Élevé</Badge>;
      case "moderate":
        return <Badge variant="secondary" className="gap-1 bg-yellow-500 text-black"><Activity className="h-3 w-3" />Modéré</Badge>;
      case "low":
        return <Badge variant="default" className="gap-1 bg-green-500"><Shield className="h-3 w-3" />Faible</Badge>;
    }
  };

  const getRiskColor = (level: PlayerRisk["riskLevel"]) => {
    switch (level) {
      case "very_high": return "destructive";
      case "high": return "destructive";
      case "moderate": return "default";
      case "low": return "default";
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Prédiction de Risque de Blessure</AlertTitle>
        <AlertDescription>
          Cette analyse se base sur les charges d'entraînement (AWCR), les variations de charge et l'historique de blessures.
          Un ratio AWCR entre 0.8 et 1.3 est considéré comme optimal.
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
