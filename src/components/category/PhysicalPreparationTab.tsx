import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvailabilityScoreTab } from "./AvailabilityScoreTab";
import { BodyCompositionSection } from "./body-composition/BodyCompositionSection";
import { RugbySpecificTestsSection } from "./tests/RugbySpecificTestsSection";
import { PositionBenchmarksSection } from "./benchmarks/PositionBenchmarksSection";
import { Activity, Scale, Timer, Target } from "lucide-react";

interface PhysicalPreparationTabProps {
  categoryId: string;
}

export function PhysicalPreparationTab({ categoryId }: PhysicalPreparationTabProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Préparation Physique Avancée
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="availability" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="availability" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Disponibilité</span>
              </TabsTrigger>
              <TabsTrigger value="composition" className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                <span className="hidden sm:inline">Composition</span>
              </TabsTrigger>
              <TabsTrigger value="rugby-tests" className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                <span className="hidden sm:inline">Tests Rugby</span>
              </TabsTrigger>
              <TabsTrigger value="benchmarks" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Benchmarks</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="availability" className="space-y-6">
              <AvailabilityScoreTab categoryId={categoryId} />
            </TabsContent>

            <TabsContent value="composition" className="space-y-6">
              <BodyCompositionSection categoryId={categoryId} />
            </TabsContent>

            <TabsContent value="rugby-tests" className="space-y-6">
              <RugbySpecificTestsSection categoryId={categoryId} />
            </TabsContent>

            <TabsContent value="benchmarks" className="space-y-6">
              <PositionBenchmarksSection categoryId={categoryId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
