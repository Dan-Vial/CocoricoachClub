import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Dumbbell, Zap, Lock, BarChart3, Target } from "lucide-react";
import { PhysicalPreparationTab } from "@/components/category/PhysicalPreparationTab";
import { TrainingLoadTab } from "@/components/training-load/TrainingLoadTab";
import { EvolutionTestsMuscuTab } from "@/components/tonnage/EvolutionTestsMuscuTab";
import { BowlingTrainingStats } from "@/components/bowling/BowlingTrainingStats";
import { TennisTrainingStats } from "@/components/tennis/TennisTrainingStats";
import { PrecisionTrainingStats } from "@/components/training/PrecisionTrainingStats";
import { PrecisionFieldTracker } from "@/components/rugby/PrecisionFieldTracker";
import { AthleticsThrowingStats } from "@/components/athletics/AthleticsThrowingStats";
import { AthleticsSprintStats } from "@/components/athletics/AthleticsSprintStats";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import { isRugbyType, isAthletismeCategory } from "@/lib/constants/sportTypes";

interface PerformanceTabProps {
  categoryId: string;
  sportType?: string;
}

function PerformanceDisabledMessage() {
  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg text-muted-foreground">
          Accès restreint
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center text-muted-foreground text-sm">
        <p>Cet onglet n'est pas accessible en mode lecture seule.</p>
        <p className="mt-1">Contactez l'administrateur pour plus d'accès.</p>
      </CardContent>
    </Card>
  );
}

export function PerformanceTab({ categoryId, sportType }: PerformanceTabProps) {
  const { isViewer } = useViewerModeContext();
  const isBowling = (sportType || "").toLowerCase().includes("bowling");
  const isTennis = (sportType || "").toLowerCase().includes("tennis");
  const isRugby = isRugbyType(sportType || "");
  const isAthletics = isAthletismeCategory(sportType || "");

  if (isViewer) {
    return <PerformanceDisabledMessage />;
  }

  return (
    <Tabs defaultValue="training-load" className="space-y-4">
      <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
        <ColoredSubTabsList colorKey="performance" className="inline-flex w-max">
          <ColoredSubTabsTrigger 
            value="training-load" 
            colorKey="performance"
            icon={<Zap className="h-4 w-4" />}
            tooltip="Monitoring de la charge interne (sRPE) et externe (HRV), ratios EWMA et AWCR pour prévenir les blessures"
          >
            <span className="hidden sm:inline">Charge d'entraînement</span>
            <span className="sm:hidden">Charge</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="physical-prep" 
            colorKey="performance"
            icon={<Dumbbell className="h-4 w-4" />}
            tooltip="Disponibilité des athlètes, alertes de risque de blessure et analyses prédictives par IA"
          >
            <span className="hidden sm:inline">Prépa Physique</span>
            <span className="sm:hidden">Prépa</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="evolution-tests" 
            colorKey="performance"
            icon={<BarChart3 className="h-4 w-4" />}
            tooltip="Graphiques d'évolution des tests physiques, comparaisons entre athlètes et suivi du tonnage de musculation"
          >
            <span className="hidden sm:inline">Évolution Tests / Muscu</span>
            <span className="sm:hidden">Tests</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="training-stats" 
            colorKey="performance"
            icon={<Target className="h-4 w-4" />}
            tooltip="Statistiques détaillées des entraînements : précision, drills et exercices spécifiques au sport"
          >
            <span className="hidden sm:inline">Stats entraînement</span>
            <span className="sm:hidden">Stats entr.</span>
          </ColoredSubTabsTrigger>
        </ColoredSubTabsList>
      </div>

      <TabsContent value="training-load">
        <TrainingLoadTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="physical-prep">
        <PhysicalPreparationTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="evolution-tests">
        <EvolutionTestsMuscuTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="training-stats">
        {isBowling ? (
          <BowlingTrainingStats categoryId={categoryId} />
        ) : isTennis ? (
          <TennisTrainingStats categoryId={categoryId} />
        ) : isAthletics ? (
          <AthleticsThrowingStats categoryId={categoryId} />
        ) : isRugby ? (
          <div className="space-y-6">
            <PrecisionFieldTracker categoryId={categoryId} />
            <PrecisionTrainingStats categoryId={categoryId} />
          </div>
        ) : (
          <PrecisionTrainingStats categoryId={categoryId} />
        )}
      </TabsContent>
    </Tabs>
  );
}
