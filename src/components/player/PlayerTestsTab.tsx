import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ColoredNavTabsList } from "@/components/ui/colored-nav-tabs";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { getTestCategoriesForSport, TestCategory } from "@/lib/constants/testCategories";

/** Strip technical metadata (Session ID, HTML comments) from notes for display */
function cleanNotes(notes: string | null): string {
  if (!notes) return "-";
  let cleaned = notes
    .replace(/\(Session ID:\s*[a-f0-9-]+\)/gi, "")
    .replace(/Session ID:\s*[a-f0-9-]+/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/Séance du \d{4}-\d{2}-\d{2}\s*/g, "")
    .trim();
  return cleaned || "-";
}

interface PlayerTestsTabProps {
  playerId: string;
  categoryId: string;
  sportType?: string;
}

const TAB_COLORS = [
  "hsl(220 80% 55%)",
  "hsl(320 75% 55%)",
  "hsl(35 90% 55%)",
  "hsl(160 65% 45%)",
  "hsl(280 70% 55%)",
  "hsl(200 85% 50%)",
  "hsl(350 80% 60%)",
  "hsl(45 95% 50%)",
  "hsl(190 80% 45%)",
  "hsl(260 70% 60%)",
  "hsl(140 60% 45%)",
  "hsl(10 80% 55%)",
] as const;

function TestTabTrigger({ value, label, colorIndex }: { value: string; label: string; colorIndex: number }) {
  const color = TAB_COLORS[colorIndex % TAB_COLORS.length];
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
      style={{ borderWidth: "2px", borderColor: color, borderStyle: "solid" }}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-md transition-all duration-200",
          "opacity-0 scale-95",
          "group-data-[state=active]:opacity-100 group-data-[state=active]:scale-100"
        )}
        style={{ backgroundColor: color }}
      />
      <span className="relative z-10">
        <span className="group-data-[state=active]:hidden" style={{ color }}>{label}</span>
        <span className="hidden group-data-[state=active]:inline text-white">{label}</span>
      </span>
    </TabsPrimitive.Trigger>
  );
}

export function PlayerTestsTab({ playerId, categoryId, sportType }: PlayerTestsTabProps) {
  // Get all test categories for the sport (excluding rehab which gets its own tab)
  const testCategories = useMemo(() => {
    const all = getTestCategoriesForSport(sportType || "");
    const nonRehab = all.filter(c => !c.value.startsWith("rehab_"));
    const hasRehab = all.some(c => c.value.startsWith("rehab_"));
    return { nonRehab, hasRehab };
  }, [sportType]);

  // Build a map of test_category values to labels
  const categoryLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    const all = getTestCategoriesForSport(sportType || "");
    for (const cat of all) {
      map[cat.value] = cat.label;
      for (const test of cat.tests) {
        // We don't override category-level labels
      }
    }
    return map;
  }, [sportType]);

  // Fetch ALL generic tests for this player
  const { data: allGenericTests } = useQuery({
    queryKey: ["all_generic_tests", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generic_tests")
        .select("*")
        .eq("player_id", playerId)
        .order("test_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Group tests by category
  const testsByCategory = useMemo(() => {
    const map: Record<string, typeof allGenericTests> = {};
    if (!allGenericTests) return map;
    for (const test of allGenericTests) {
      const cat = test.test_category || "autres";
      if (!map[cat]) map[cat] = [];
      map[cat]!.push(test);
    }
    return map;
  }, [allGenericTests]);

  // Get test label from testCategories
  const getTestLabel = (testCategory: string, testType: string): string => {
    const all = getTestCategoriesForSport(sportType || "");
    const cat = all.find(c => c.value === testCategory);
    if (cat) {
      const test = cat.tests.find(t => t.value === testType);
      if (test) return test.label;
    }
    return testType?.replace(/_/g, " ") || "Test";
  };

  // Render a generic category table
  const renderCategoryContent = (categoryValue: string, tests: NonNullable<typeof allGenericTests>) => {
    const label = categoryLabelMap[categoryValue] || categoryValue.replace(/_/g, " ");

    // Chart data: group by test_type over time
    const testTypes = [...new Set(tests.map(t => t.test_type))];
    const chartData = tests.reduce((acc, t) => {
      const date = new Date(t.test_date).toLocaleDateString("fr-FR");
      let existing = acc.find(item => item.date === date);
      if (!existing) {
        existing = { date };
        acc.push(existing);
      }
      const tLabel = getTestLabel(categoryValue, t.test_type);
      existing[tLabel] = t.result_value;
      return acc;
    }, [] as Record<string, any>[]);

    const testTypeLabels = testTypes.map(tt => getTestLabel(categoryValue, tt));

    return (
      <div className="space-y-6">
        {chartData.length > 1 && testTypeLabels.length <= 6 && (
          <Card className="bg-gradient-card shadow-md">
            <CardHeader>
              <CardTitle>Évolution - {label}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {testTypeLabels.map((tl, i) => (
                    <Line
                      key={tl}
                      type="monotone"
                      dataKey={tl}
                      stroke={`hsl(${(i * 60) % 360}, 70%, 50%)`}
                      name={tl}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-card shadow-md">
          <CardHeader>
            <CardTitle>Historique - {label}</CardTitle>
          </CardHeader>
          <CardContent>
            {tests.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Test</TableHead>
                      <TableHead>Résultat</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.slice().reverse().map((test) => (
                      <TableRow key={test.id}>
                        <TableCell>{new Date(test.test_date).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell>{getTestLabel(test.test_category, test.test_type)}</TableCell>
                        <TableCell className="font-semibold text-primary">
                          {test.result_value} {test.result_unit || ""}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">{cleanNotes(test.notes)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Aucun test enregistré</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render "Tous" tab with all tests
  const renderAllTests = () => (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle>Historique complet des tests</CardTitle>
      </CardHeader>
      <CardContent>
        {allGenericTests && allGenericTests.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Résultat</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allGenericTests.slice().reverse().map((test) => (
                  <TableRow key={test.id}>
                    <TableCell>{new Date(test.test_date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>{categoryLabelMap[test.test_category] || test.test_category?.replace(/_/g, " ") || "-"}</TableCell>
                    <TableCell>{getTestLabel(test.test_category, test.test_type)}</TableCell>
                    <TableCell className="font-semibold text-primary">
                      {test.result_value} {test.result_unit || ""}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{cleanNotes(test.notes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">Aucun test enregistré</p>
        )}
      </CardContent>
    </Card>
  );

  // Render rehab tab with all rehab_ categories combined
  const renderRehabTests = () => {
    const rehabTests = allGenericTests?.filter(t => t.test_category?.startsWith("rehab_")) || [];
    return renderCategoryContent("rehab", rehabTests);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="space-y-4">
        <ScrollArea className="w-full">
          <ColoredNavTabsList className="flex w-max gap-1.5 p-2">
            <TestTabTrigger value="all" label="Tous" colorIndex={0} />
            {testCategories.nonRehab.map((cat, i) => (
              <TestTabTrigger
                key={cat.value}
                value={cat.value}
                label={cat.label}
                colorIndex={i + 1}
              />
            ))}
            {testCategories.hasRehab && (
              <TestTabTrigger
                value="rehab"
                label="Réathlétisation"
                colorIndex={testCategories.nonRehab.length + 1}
              />
            )}
          </ColoredNavTabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="all" className="space-y-6">
          {renderAllTests()}
        </TabsContent>

        {testCategories.nonRehab.map((cat) => (
          <TabsContent key={cat.value} value={cat.value} className="space-y-6">
            {renderCategoryContent(cat.value, testsByCategory[cat.value] || [])}
          </TabsContent>
        ))}

        {testCategories.hasRehab && (
          <TabsContent value="rehab" className="space-y-6">
            {renderRehabTests()}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
