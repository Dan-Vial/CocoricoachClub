import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Heart, Smile, Apple } from "lucide-react";
import { HealthTab } from "@/components/health/HealthTab";
import { WellnessTab } from "@/components/category/WellnessTab";
import { NutritionTab } from "@/components/category/NutritionTab";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import React from "react";

interface SanteTabProps {
  categoryId: string;
}

class SanteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined as Error | undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("SanteTab error:", error.message, error.stack, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-destructive">
          <p className="font-bold">Erreur dans le module Santé</p>
          <p className="text-sm">{this.state.error?.message}</p>
          <pre className="text-xs mt-2 overflow-auto max-h-40">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export function SanteTab({ categoryId }: SanteTabProps) {
  const { isViewer } = useViewerModeContext();

  return (
    <SanteErrorBoundary>
      <Tabs defaultValue="health" className="space-y-4">
        <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
          <ColoredSubTabsList colorKey="sante" className="inline-flex w-max">
            <ColoredSubTabsTrigger 
              value="health" 
              colorKey="sante"
              icon={<Heart className="h-4 w-4" />}
              tooltip="Suivi médical : blessures, protocoles de retour, réathlétisation et historique de santé"
            >
              Santé
            </ColoredSubTabsTrigger>
            {!isViewer && (
              <ColoredSubTabsTrigger 
                value="wellness" 
                colorKey="sante"
                icon={<Smile className="h-4 w-4" />}
                tooltip="Questionnaire de bien-être quotidien : sommeil, fatigue, stress, courbatures et score de récupération"
              >
                Wellness
              </ColoredSubTabsTrigger>
            )}
            {!isViewer && (
              <ColoredSubTabsTrigger 
                value="nutrition" 
                colorKey="sante"
                icon={<Apple className="h-4 w-4" />}
                tooltip="Plans nutritionnels et suivi alimentaire adaptés aux objectifs de chaque athlète"
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
    </SanteErrorBoundary>
  );
}
