import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { 
  calculateEWMASeries, 
  transformToDailyLoadData,
  DailyLoadData 
} from "@/lib/trainingLoadCalculations";

interface KPICardsProps {
  categoryIds: string[];
}

export function KPICards({ categoryIds }: KPICardsProps) {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ["kpis-ewma", categoryIds],
    queryFn: async () => {
      if (categoryIds.length === 0) return null;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 56); // 8 weeks of data

      const [playersRes, awcrRes, injuriesRes, testsRes] = await Promise.all([
        supabase
          .from("players")
          .select("id")
          .in("category_id", categoryIds),
        supabase
          .from("awcr_tracking")
          .select("session_date, rpe, duration_minutes, training_load")
          .in("category_id", categoryIds)
          .gte("session_date", startDate.toISOString().split("T")[0])
          .order("session_date", { ascending: true }),
        supabase
          .from("injuries")
          .select("id, status")
          .in("category_id", categoryIds)
          .eq("status", "active"),
        supabase
          .from("speed_tests")
          .select("test_date")
          .in("category_id", categoryIds)
          .gte("test_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const totalPlayers = playersRes.data?.length || 0;
      const activeInjuries = injuriesRes.data?.length || 0;
      const recentTests = testsRes.data?.length || 0;

      // Calculate EWMA from awcr data
      let avgEwmaRatio = 0;
      if (awcrRes.data && awcrRes.data.length > 0) {
        const dailyData: DailyLoadData[] = awcrRes.data.map(entry => ({
          date: entry.session_date,
          rpe: entry.rpe || 0,
          duration: entry.duration_minutes || 0,
          sRPE: entry.training_load || (entry.rpe * entry.duration_minutes) || 0,
        }));

        const ewmaResults = calculateEWMASeries(dailyData, "sRPE");
        if (ewmaResults.length > 0) {
          // Get the latest ratio
          avgEwmaRatio = ewmaResults[ewmaResults.length - 1].ratio;
        }
      }

      return {
        totalPlayers,
        avgEwmaRatio: Number(avgEwmaRatio.toFixed(2)),
        activeInjuries,
        recentTests,
      };
    },
    enabled: categoryIds.length > 0,
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  const getRatioColor = (ratio: number) => {
    if (ratio < 0.8 || ratio > 1.5) return "text-red-500";
    if (ratio < 0.85 || ratio > 1.3) return "text-yellow-500";
    return "text-green-500";
  };

  const getRatioStatus = (ratio: number) => {
    if (ratio >= 0.85 && ratio <= 1.3) return "Zone optimale";
    if (ratio >= 0.8 && ratio <= 1.5) return "Vigilance";
    return "Hors zone";
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Athlètes Actifs</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.totalPlayers}</div>
          <p className="text-xs text-muted-foreground">Total dans vos catégories</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ratio EWMA</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getRatioColor(kpis.avgEwmaRatio)}`}>
            {kpis.avgEwmaRatio}
          </div>
          <p className="text-xs text-muted-foreground">
            {getRatioStatus(kpis.avgEwmaRatio)}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Blessures Actives</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-500">{kpis.activeInjuries}</div>
          <p className="text-xs text-muted-foreground">Nécessitent un suivi</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tests Récents</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.recentTests}</div>
          <p className="text-xs text-muted-foreground">Derniers 30 jours</p>
        </CardContent>
      </Card>
    </div>
  );
}
