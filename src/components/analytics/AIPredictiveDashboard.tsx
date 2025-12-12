import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Brain, AlertTriangle, TrendingUp, Shield, RefreshCw, Activity, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/use-online-status";

interface AIPredictiveDashboardProps {
  categoryId: string;
}

interface PlayerPrediction {
  player_id: string;
  player_name: string;
  risk_level: "critique" | "élevé" | "modéré" | "faible";
  risk_score: number;
  risk_factors: string[];
  recommendations: string[];
}

interface GlobalInsights {
  high_risk_count: number;
  main_concerns: string[];
  team_recommendations: string[];
}

interface PredictionResponse {
  predictions: PlayerPrediction[];
  global_insights: GlobalInsights;
}

export function AIPredictiveDashboard({ categoryId }: AIPredictiveDashboardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isOnline } = useOnlineStatus();

  const analyzePredictions = async () => {
    if (!isOnline) {
      toast.error("Connexion internet requise pour l'analyse IA");
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('predict-injuries', {
        body: { categoryId }
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setPredictions(data);
      toast.success("Analyse IA terminée");
    } catch (err: any) {
      console.error("Prediction error:", err);
      setError(err.message || "Erreur lors de l'analyse");
      toast.error("Erreur lors de l'analyse IA");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "critique": return "destructive";
      case "élevé": return "destructive";
      case "modéré": return "secondary";
      case "faible": return "outline";
      default: return "outline";
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critique": return "text-destructive bg-destructive/10 border-destructive/30";
      case "élevé": return "text-destructive/80 bg-destructive/5 border-destructive/20";
      case "modéré": return "text-warning bg-warning/10 border-warning/30";
      case "faible": return "text-success bg-success/10 border-success/30";
      default: return "";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "critique":
      case "élevé":
        return <AlertTriangle className="h-5 w-5" />;
      case "modéré":
        return <Activity className="h-5 w-5" />;
      case "faible":
        return <Shield className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Offline indicator */}
      {!isOnline && (
        <Alert className="bg-warning/10 border-warning/30">
          <WifiOff className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Mode hors ligne</AlertTitle>
          <AlertDescription>
            L'analyse IA nécessite une connexion internet. Les prédictions seront disponibles une fois reconnecté.
          </AlertDescription>
        </Alert>
      )}

      {/* Header with analyze button */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Dashboard Prédictif IA</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Analyse intelligente des risques de blessure basée sur AWCR et Wellness
                </p>
              </div>
            </div>
            <Button 
              onClick={analyzePredictions} 
              disabled={isAnalyzing || !isOnline}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : !isOnline ? (
                <>
                  <WifiOff className="h-4 w-4" />
                  Hors ligne
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Analyser les risques
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!predictions && !isAnalyzing && !error && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune analyse disponible</h3>
            <p className="text-muted-foreground mb-4">
              Cliquez sur "Analyser les risques" pour lancer une analyse IA des risques de blessure
            </p>
          </CardContent>
        </Card>
      )}

      {predictions && (
        <>
          {/* Global Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Vue d'ensemble
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="text-3xl font-bold text-destructive">
                    {predictions.global_insights.high_risk_count}
                  </div>
                  <div className="text-sm text-muted-foreground">Joueurs à risque élevé</div>
                </div>
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="text-3xl font-bold text-warning">
                    {predictions.predictions.filter(p => p.risk_level === "modéré").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Joueurs à surveiller</div>
                </div>
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <div className="text-3xl font-bold text-success">
                    {predictions.predictions.filter(p => p.risk_level === "faible").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Joueurs en forme</div>
                </div>
              </div>

              {predictions.global_insights.main_concerns.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Préoccupations principales</h4>
                  <ul className="space-y-1">
                    {predictions.global_insights.main_concerns.map((concern, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        {concern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {predictions.global_insights.team_recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recommandations équipe</h4>
                  <ul className="space-y-1">
                    {predictions.global_insights.team_recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Player Predictions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predictions.predictions
              .sort((a, b) => b.risk_score - a.risk_score)
              .map((player) => (
                <Card 
                  key={player.player_id} 
                  className={`border-2 ${getRiskColor(player.risk_level)}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getRiskIcon(player.risk_level)}
                        <CardTitle className="text-lg">{player.player_name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRiskBadgeVariant(player.risk_level)}>
                          {player.risk_level}
                        </Badge>
                        <span className="text-lg font-bold">{player.risk_score}%</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {player.risk_factors.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium mb-1">Facteurs de risque</h5>
                        <div className="flex flex-wrap gap-1">
                          {player.risk_factors.map((factor, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {player.recommendations.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium mb-1">Recommandations</h5>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {player.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-primary">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
