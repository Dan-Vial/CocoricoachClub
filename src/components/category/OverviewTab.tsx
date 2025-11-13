import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface OverviewTabProps {
  categoryId: string;
}

export function OverviewTab({ categoryId }: OverviewTabProps) {
  // Fetch AWCR averages
  const { data: awcrStats } = useQuery({
    queryKey: ["awcr_stats", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("awcr, training_load, acute_load, chronic_load")
        .eq("category_id", categoryId)
        .not("awcr", "is", null);
      
      if (error) throw error;
      
      if (!data || data.length === 0) return null;
      
      const avgAwcr = data.reduce((sum, row) => sum + (row.awcr || 0), 0) / data.length;
      const avgLoad = data.reduce((sum, row) => sum + (row.training_load || 0), 0) / data.length;
      const avgAcute = data.reduce((sum, row) => sum + (row.acute_load || 0), 0) / data.length;
      const avgChronic = data.reduce((sum, row) => sum + (row.chronic_load || 0), 0) / data.length;
      
      return { avgAwcr, avgLoad, avgAcute, avgChronic };
    },
  });

  // Fetch speed test averages (40m)
  const { data: speedStats } = useQuery({
    queryKey: ["speed_stats", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_tests")
        .select("time_40m_seconds, speed_kmh, vma_kmh, test_type")
        .eq("category_id", categoryId);
      
      if (error) throw error;
      
      if (!data || data.length === 0) return null;
      
      const sprint40m = data.filter(t => t.test_type === "40m" && t.time_40m_seconds);
      const run1600m = data.filter(t => t.test_type === "1600m" && t.vma_kmh);
      
      const avg40m = sprint40m.length > 0 
        ? sprint40m.reduce((sum, row) => sum + (row.time_40m_seconds || 0), 0) / sprint40m.length 
        : null;
      
      const avgVma = run1600m.length > 0
        ? run1600m.reduce((sum, row) => sum + (row.vma_kmh || 0), 0) / run1600m.length
        : null;
      
      return { avg40m, avgVma };
    },
  });

  // Fetch strength test averages
  const { data: strengthStats } = useQuery({
    queryKey: ["strength_stats", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strength_tests")
        .select("test_name, weight_kg")
        .eq("category_id", categoryId);
      
      if (error) throw error;
      
      if (!data || data.length === 0) return null;
      
      // Group by test name and calculate averages
      const grouped = data.reduce((acc, test) => {
        if (!acc[test.test_name]) {
          acc[test.test_name] = { sum: 0, count: 0 };
        }
        acc[test.test_name].sum += test.weight_kg;
        acc[test.test_name].count += 1;
        return acc;
      }, {} as Record<string, { sum: number; count: number }>);
      
      return Object.entries(grouped).map(([name, stats]) => ({
        testName: name,
        average: stats.sum / stats.count,
      }));
    },
  });

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Vue Générale de l'Équipe
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Statistiques moyennes de tous les joueurs de la catégorie
          </p>
        </CardHeader>
      </Card>

      {/* AWCR Stats */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle>Moyennes AWCR</CardTitle>
        </CardHeader>
        <CardContent>
          {awcrStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">AWCR Moyen</p>
                <p className={`text-2xl font-bold ${
                  awcrStats.avgAwcr < 0.8 || awcrStats.avgAwcr > 1.3
                    ? "text-destructive"
                    : "text-primary"
                }`}>
                  {awcrStats.avgAwcr.toFixed(2)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Charge Moyenne</p>
                <p className="text-2xl font-bold">{awcrStats.avgLoad.toFixed(0)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Charge Aiguë</p>
                <p className="text-2xl font-bold">{awcrStats.avgAcute.toFixed(1)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Charge Chronique</p>
                <p className="text-2xl font-bold">{awcrStats.avgChronic.toFixed(1)}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Aucune donnée AWCR disponible</p>
          )}
        </CardContent>
      </Card>

      {/* Speed Tests Stats */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle>Moyennes Tests de Vitesse</CardTitle>
        </CardHeader>
        <CardContent>
          {speedStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {speedStats.avg40m && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Temps 40m Moyen</p>
                  <p className="text-2xl font-bold">{speedStats.avg40m.toFixed(2)} s</p>
                </div>
              )}
              {speedStats.avgVma && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">VMA Moyenne</p>
                  <p className="text-2xl font-bold">{speedStats.avgVma.toFixed(1)} km/h</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Aucun test de vitesse disponible</p>
          )}
        </CardContent>
      </Card>

      {/* Strength Tests Stats */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle>Moyennes Tests de Musculation</CardTitle>
        </CardHeader>
        <CardContent>
          {strengthStats && strengthStats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exercise</TableHead>
                  <TableHead className="text-right">Poids Moyen (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strengthStats.map((stat) => (
                  <TableRow key={stat.testName}>
                    <TableCell className="font-medium">{stat.testName}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {stat.average.toFixed(1)} kg
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">Aucun test de musculation disponible</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
