import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Smile, Apple } from "lucide-react";
import { HealthTab } from "@/components/health/HealthTab";
import { WellnessTab } from "@/components/category/WellnessTab";
import { NutritionTab } from "@/components/category/NutritionTab";

interface SanteTabProps {
  categoryId: string;
}

export function SanteTab({ categoryId }: SanteTabProps) {
  return (
    <Tabs defaultValue="health" className="space-y-4">
      <TabsList>
        <TabsTrigger value="health" className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Santé
        </TabsTrigger>
        <TabsTrigger value="wellness" className="flex items-center gap-2">
          <Smile className="h-4 w-4" />
          Wellness
        </TabsTrigger>
        <TabsTrigger value="nutrition" className="flex items-center gap-2">
          <Apple className="h-4 w-4" />
          Nutrition
        </TabsTrigger>
      </TabsList>

      <TabsContent value="health">
        <HealthTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="wellness">
        <WellnessTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="nutrition">
        <NutritionTab categoryId={categoryId} />
      </TabsContent>
    </Tabs>
  );
}
