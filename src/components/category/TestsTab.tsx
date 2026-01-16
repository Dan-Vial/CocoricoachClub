import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpeedTestsSection } from "./tests/SpeedTestsSection";
import { StrengthTestsSection } from "./tests/StrengthTestsSection";
import { MobilityTestsSection } from "./tests/MobilityTestsSection";
import { JumpTestsSection } from "./tests/JumpTestsSection";
import { FieldTestsSection } from "./tests/FieldTestsSection";
import { GenericTestsSection } from "./tests/GenericTestsSection";

interface TestsTabProps {
  categoryId: string;
  sportType?: string;
}

export function TestsTab({ categoryId, sportType }: TestsTabProps) {
  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle>Tests de Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="running">Course</TabsTrigger>
            <TabsTrigger value="strength">Musculation</TabsTrigger>
            <TabsTrigger value="mobility">Mobilité</TabsTrigger>
            <TabsTrigger value="jump">Détente</TabsTrigger>
            <TabsTrigger value="field">Tests Terrains</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <GenericTestsSection categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="running" className="space-y-6">
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

          <TabsContent value="field">
            <FieldTestsSection categoryId={categoryId} sportType={sportType} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}