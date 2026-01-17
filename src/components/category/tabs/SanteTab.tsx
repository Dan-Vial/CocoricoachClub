import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Smile, Apple } from "lucide-react";
import { HealthTab } from "@/components/health/HealthTab";
import { WellnessTab } from "@/components/category/WellnessTab";
import { NutritionTab } from "@/components/category/NutritionTab";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { DisabledTabTrigger } from "@/components/ui/disabled-tab-trigger";

interface SanteTabProps {
  categoryId: string;
}

export function SanteTab({ categoryId }: SanteTabProps) {
  const { isViewer } = useViewerModeContext();

  return (
    <Tabs defaultValue="health" className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <TabsList className="inline-flex w-max min-w-full gap-1 h-auto bg-muted p-1">
          <TabsTrigger value="health" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Heart className="h-4 w-4 shrink-0" />
            Santé
          </TabsTrigger>
          {/* Wellness - Grisé en mode viewer */}
          <DisabledTabTrigger value="wellness" isDisabled={isViewer} className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Smile className="h-4 w-4 shrink-0" />
            Wellness
          </DisabledTabTrigger>
          {/* Nutrition - Grisé en mode viewer */}
          <DisabledTabTrigger value="nutrition" isDisabled={isViewer} className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Apple className="h-4 w-4 shrink-0" />
            Nutrition
          </DisabledTabTrigger>
        </TabsList>
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
