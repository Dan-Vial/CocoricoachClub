import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GenericTestsSection } from "./tests/GenericTestsSection";
import { getTestCategoriesForSport } from "@/lib/constants/testCategories";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface TestsTabProps {
  categoryId: string;
  sportType?: string;
}

export function TestsTab({ categoryId, sportType }: TestsTabProps) {
  const testCategories = useMemo(() => {
    const all = getTestCategoriesForSport(sportType || "");
    const nonRehab = all.filter(c => !c.value.startsWith("rehab_"));
    const hasRehab = all.some(c => c.value.startsWith("rehab_"));
    return { nonRehab, hasRehab };
  }, [sportType]);

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle>Tests de Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4">
          <ScrollArea className="w-full">
            <TabsList className="flex w-max gap-1 h-auto">
              <TabsTrigger value="all">Tous</TabsTrigger>
              {testCategories.nonRehab.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value} className="whitespace-nowrap">
                  {cat.label}
                </TabsTrigger>
              ))}
              {testCategories.hasRehab && (
                <TabsTrigger value="rehab" className="text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                  Réathlétisation
                </TabsTrigger>
              )}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="all" className="space-y-6">
            <GenericTestsSection categoryId={categoryId} sportType={sportType} />
          </TabsContent>

          {testCategories.nonRehab.map((cat) => (
            <TabsContent key={cat.value} value={cat.value} className="space-y-6">
              <GenericTestsSection
                categoryId={categoryId}
                sportType={sportType}
                defaultCategory={cat.value}
              />
            </TabsContent>
          ))}

          {testCategories.hasRehab && (
            <TabsContent value="rehab" className="space-y-6">
              <GenericTestsSection
                categoryId={categoryId}
                sportType={sportType}
                defaultCategory="rehab"
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
