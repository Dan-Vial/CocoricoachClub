import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpeedTestsSection } from "./tests/SpeedTestsSection";
import { StrengthTestsSection } from "./tests/StrengthTestsSection";
import { MobilityTestsSection } from "./tests/MobilityTestsSection";
import { JumpTestsSection } from "./tests/JumpTestsSection";

interface TestsTabProps {
  categoryId: string;
}

export function TestsTab({ categoryId }: TestsTabProps) {
  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle>Tests de Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="speed" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="speed">Vitesse</TabsTrigger>
            <TabsTrigger value="strength">Musculation</TabsTrigger>
            <TabsTrigger value="mobility">Mobilité</TabsTrigger>
            <TabsTrigger value="jump">Détente</TabsTrigger>
          </TabsList>

          <TabsContent value="speed" className="space-y-6">
            <SpeedTestsSection categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="strength">
            <StrengthTestsSection categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="mobility">
            <MobilityTestsSection categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="jump">
            <JumpTestsSection categoryId={categoryId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
