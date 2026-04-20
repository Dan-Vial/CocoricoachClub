import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICards } from "@/components/dashboard/KPICards";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { PlayerComparison } from "@/components/dashboard/PlayerComparison";
import { InjuryAlerts } from "@/components/dashboard/InjuryAlerts";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const { data: clubs, isLoading: clubsLoading } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("user_id", user?.id)
        .is("client_id", null);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories", clubs],
    queryFn: async () => {
      if (!clubs || clubs.length === 0) return [];
      const clubIds = clubs.map((c) => c.id);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .in("club_id", clubIds);
      if (error) throw error;
      return data;
    },
    enabled: !!clubs && clubs.length > 0,
  });

  if (clubsLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!clubs || clubs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Tableau de Bord</h1>
            <NotificationBell variant="hero" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Aucun club</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Créez d'abord un club pour accéder au tableau de bord.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const categoryIds = categories?.map((c) => c.id) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Tableau de Bord Analytique</h1>
          <NotificationBell variant="hero" />
        </div>

        <KPICards categoryIds={categoryIds} />

        <div className="grid gap-6 lg:grid-cols-2">
          <PerformanceChart categoryIds={categoryIds} />
          <InjuryAlerts categoryIds={categoryIds} />
        </div>

        <PlayerComparison categoryIds={categoryIds} />
      </div>
    </div>
  );
}
