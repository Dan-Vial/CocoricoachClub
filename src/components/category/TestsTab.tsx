import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { GenericTestsSection } from "./tests/GenericTestsSection";
import { getTestCategoriesForSport } from "@/lib/constants/testCategories";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ColoredNavTabsList } from "@/components/ui/colored-nav-tabs";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { BenchmarkManager } from "./benchmarks/BenchmarkManager";
import { BenchmarkComparison } from "./benchmarks/BenchmarkComparison";

interface TestsTabProps {
  categoryId: string;
  sportType?: string;
}

// Color palette for test categories
const TEST_TAB_COLORS = [
  "hsl(220 80% 55%)",   // blue
  "hsl(320 75% 55%)",   // magenta
  "hsl(35 90% 55%)",    // orange
  "hsl(160 65% 45%)",   // green
  "hsl(280 70% 55%)",   // purple
  "hsl(200 85% 50%)",   // cyan
  "hsl(350 80% 60%)",   // red
  "hsl(45 95% 50%)",    // yellow
  "hsl(190 80% 45%)",   // teal
  "hsl(260 70% 60%)",   // indigo
  "hsl(140 60% 45%)",   // emerald
  "hsl(10 80% 55%)",    // coral
] as const;

function TestCategoryTrigger({ value, label, colorIndex }: { value: string; label: string; colorIndex: number }) {
  const color = TEST_TAB_COLORS[colorIndex % TEST_TAB_COLORS.length];

  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "group relative inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm",
        "transition-all duration-200 ease-out whitespace-nowrap",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "hover:opacity-80",
        "data-[state=active]:shadow-md data-[state=active]:scale-105",
      )}
      style={{
        borderWidth: "2px",
        borderColor: color,
        borderStyle: "solid",
      }}
    >
      {/* Active fill background */}
      <span
        className={cn(
          "absolute inset-0 rounded-md transition-all duration-200",
          "opacity-0 scale-95",
          "group-data-[state=active]:opacity-100 group-data-[state=active]:scale-100"
        )}
        style={{ backgroundColor: color }}
      />
      {/* Colored text by default, white text when active (dual-span trick to avoid inline style override) */}
      <span className="relative z-10">
        <span className="group-data-[state=active]:hidden" style={{ color }}>{label}</span>
        <span className="hidden group-data-[state=active]:inline text-white">{label}</span>
      </span>
    </TabsPrimitive.Trigger>
  );
}

export function TestsTab({ categoryId, sportType }: TestsTabProps) {
  const testCategories = useMemo(() => {
    const all = getTestCategoriesForSport(sportType || "");
    const nonRehab = all.filter(c => !c.value.startsWith("rehab_"));
    const hasRehab = all.some(c => c.value.startsWith("rehab_"));
    return { nonRehab, hasRehab };
  }, [sportType]);

  const benchmarkColorIndex = testCategories.nonRehab.length + (testCategories.hasRehab ? 2 : 1);

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle>Tests de Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4">
          <ScrollArea className="w-full">
            <ColoredNavTabsList className="flex w-max gap-1.5 p-2">
              <TestCategoryTrigger value="all" label="Tous" colorIndex={0} />
              {testCategories.nonRehab.map((cat, i) => (
                <TestCategoryTrigger
                  key={cat.value}
                  value={cat.value}
                  label={cat.label}
                  colorIndex={i + 1}
                />
              ))}
              {testCategories.hasRehab && (
                <TestCategoryTrigger
                  value="rehab"
                  label="Réathlétisation"
                  colorIndex={testCategories.nonRehab.length + 1}
                />
              )}
              <TestCategoryTrigger
                value="benchmarks"
                label="📊 Benchmarks"
                colorIndex={benchmarkColorIndex}
              />
            </ColoredNavTabsList>
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

          <TabsContent value="benchmarks" className="space-y-6">
            <BenchmarkManager categoryId={categoryId} sportType={sportType} />
            <BenchmarkComparison categoryId={categoryId} sportType={sportType} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
