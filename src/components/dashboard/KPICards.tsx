import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingUp, AlertTriangle, Users } from "lucide-react";

interface KPICardsProps {
  categoryIds: string[];
}

export function KPICards({ categoryIds }: KPICardsProps) {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ["kpis", categoryIds],
    queryFn: async () => {
      if (categoryIds.length === 0) return null;

      const [playersRes, awcrRes, injuriesRes, testsRes] = await Promise.all([
        supabase
          .from("players")
          .select("id")
          .in("category_id", categoryIds),
        supabase
          .from("awcr_tracking")
          .select("awcr")
          .in("category_id", categoryIds)
          .not("awcr", "is", null)
          .order("session_date", { ascending: false })
          .limit(100),
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
      const avgAwcr = awcrRes.data && awcrRes.data.length > 0
        ? awcrRes.data.reduce((sum, row) => sum + Number(row.awcr), 0) / awcrRes.data.length
        : 0;
      const activeInjuries = injuriesRes.data?.length || 0;
      const recentTests = testsRes.data?.length || 0;

      return {
        totalPlayers,
        avgAwcr: Number(avgAwcr.toFixed(2)),
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

  const getAwcrColor = (awcr: number) => {
    if (awcr < 0.8) return "text-blue-500";
    if (awcr > 1.3) return "text-red-500";
    return "text-green-500";
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
          <CardTitle className="text-sm font-medium">AWCR Moyen</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getAwcrColor(kpis.avgAwcr)}`}>
            {kpis.avgAwcr}
          </div>
          <p className="text-xs text-muted-foreground">
            {kpis.avgAwcr >= 0.8 && kpis.avgAwcr <= 1.3 ? "Zone optimale" : "Hors zone"}
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
