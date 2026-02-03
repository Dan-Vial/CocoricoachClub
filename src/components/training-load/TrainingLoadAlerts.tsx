import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Brain, 
  Heart,
  Shield,
  ChevronRight,
} from "lucide-react";
import { LoadSummary, generateLoadRecommendation } from "@/lib/trainingLoadCalculations";

interface PlayerAtRisk {
  id: string;
  name: string;
  position?: string;
  summary: LoadSummary | null;
}

interface TrainingLoadAlertsProps {
  playersAtRisk: PlayerAtRisk[];
  onPlayerClick?: (playerId: string) => void;
  isLoading?: boolean;
}

export function TrainingLoadAlerts({ 
  playersAtRisk, 
  onPlayerClick,
  isLoading 
}: TrainingLoadAlertsProps) {
  if (isLoading) {
    return (
      <Card className="bg-gradient-card shadow-md">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalPlayers = playersAtRisk.filter(p => p.summary?.riskLevel === "danger");
  const warningPlayers = playersAtRisk.filter(p => p.summary?.riskLevel === "warning");

  if (playersAtRisk.length === 0) {
    return (
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-green-500" />
            Alertes Charge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <Shield className="h-10 w-10 mb-2 text-green-500" />
            <p className="font-medium text-foreground">Tous les athlètes en zone optimale</p>
            <p className="text-sm">Aucune alerte de surcharge ou sous-charge</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Alertes Charge
          </span>
          <Badge variant="destructive">
            {playersAtRisk.length} athlète{playersAtRisk.length > 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[300px] pr-2">
          <div className="space-y-3">
            {/* Critical alerts first */}
            {criticalPlayers.map(player => (
              <AlertCard 
                key={player.id} 
                player={player} 
                severity="critical"
                onClick={() => onPlayerClick?.(player.id)}
              />
            ))}
            
            {/* Warning alerts */}
            {warningPlayers.map(player => (
              <AlertCard 
                key={player.id} 
                player={player} 
                severity="warning"
                onClick={() => onPlayerClick?.(player.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AlertCard({ 
  player, 
  severity,
  onClick 
}: { 
  player: PlayerAtRisk; 
  severity: "warning" | "critical";
  onClick?: () => void;
}) {
  const summary = player.summary;
  if (!summary) return null;

  const recommendation = generateLoadRecommendation(summary);
  const isOverload = summary.ewmaRatio > 1.3;
  const Icon = isOverload ? TrendingUp : TrendingDown;

  return (
    <div 
      className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
        severity === "critical" 
          ? "border-red-500/30 bg-red-500/5" 
          : "border-yellow-500/30 bg-yellow-500/5"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 ${
            severity === "critical" ? "text-red-500" : "text-yellow-500"
          }`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{player.name}</span>
              {player.position && (
                <Badge variant="outline" className="text-xs">{player.position}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Ratio: <span className={severity === "critical" ? "text-red-500 font-semibold" : "text-yellow-500 font-semibold"}>
                {summary.ewmaRatio.toFixed(2)}
              </span>
              {" • "}
              {isOverload ? "Surcharge" : "Sous-charge"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {recommendation.action}
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </div>
  );
}
