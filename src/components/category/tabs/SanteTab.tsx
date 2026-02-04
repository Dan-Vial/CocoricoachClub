import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Heart, Smile, Apple } from "lucide-react";
import { HealthTab } from "@/components/health/HealthTab";
import { WellnessTab } from "@/components/category/WellnessTab";
import { NutritionTab } from "@/components/category/NutritionTab";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";

interface SanteTabProps {
  categoryId: string;
}

export function SanteTab({ categoryId }: SanteTabProps) {
  const { isViewer } = useViewerModeContext();

  return (
    <Tabs defaultValue="health" className="space-y-4">
      <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
        <ColoredSubTabsList colorKey="sante" className="inline-flex w-max">
          <ColoredSubTabsTrigger 
            value="health" 
            colorKey="sante"
            icon={<Heart className="h-4 w-4" />}
          >
            Santé
          </ColoredSubTabsTrigger>
          {!isViewer && (
            <ColoredSubTabsTrigger 
              value="wellness" 
              colorKey="sante"
              icon={<Smile className="h-4 w-4" />}
            >
              Wellness
            </ColoredSubTabsTrigger>
          )}
          {!isViewer && (
            <ColoredSubTabsTrigger 
              value="nutrition" 
              colorKey="sante"
              icon={<Apple className="h-4 w-4" />}
            >
              Nutrition
            </ColoredSubTabsTrigger>
          )}
        </ColoredSubTabsList>
      </div>

      <TabsContent value="health">
        <HealthTab categoryId={categoryId} />
      </TabsContent>

      {!isViewer && (
        <TabsContent value="wellness">
          <WellnessTab categoryId={categoryId} />
        </TabsContent>
      )}

      {!isViewer && (
        <TabsContent value="nutrition">
          <NutritionTab categoryId={categoryId} />
        </TabsContent>
      )}
    </Tabs>
  );
}
