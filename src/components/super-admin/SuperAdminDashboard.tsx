import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, UserCheck, Clock, CreditCard, TrendingUp, AlertTriangle, Calendar, Gift, Ban, DollarSign } from "lucide-react";
import { format, differenceInDays, addMonths } from "date-fns";
import { fr } from "date-fns/locale";

export function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["super-admin-dashboard-stats"],
    refetchOnMount: "always",
    queryFn: async () => {
      // Auto-expire trial clients on each dashboard load
      await supabase.rpc("expire_trial_clients");

      const { data: clients } = await supabase
        .from("clients")
        .select("id, status, trial_ends_at");

      const { data: clubs } = await supabase
        .from("clubs")
        .select("id, is_active, created_at, client_id");

      const { data: categories } = await supabase
        .from("categories")
        .select("id");

      const { data: players } = await supabase
        .from("players")
        .select("id");

      const { data: users } = await supabase
        .from("admin_all_users")
        .select("id, created_at");

      const { data: approvedUsers } = await supabase
        .from("approved_users")
        .select("id, is_free_user, user_id");

      // Get users who already have an active role (club or category member)
      const { data: activeClubMembers } = await supabase
        .from("club_members")
        .select("user_id");
      const { data: activeCategoryMembers } = await supabase
        .from("category_members")
        .select("user_id");

      const activeUserIds = new Set([
        ...(approvedUsers || []).map(a => a.user_id),
        ...(activeClubMembers || []).map(m => m.user_id),
        ...(activeCategoryMembers || []).map(m => m.user_id),
      ]);

      // Payments this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: payments } = await supabase
        .from("payment_history")
        .select("amount")
        .eq("status", "completed")
        .gte("payment_date", startOfMonth.toISOString().split("T")[0]);

      // Subscriptions expiring within 2 months
      const twoMonthsFromNow = addMonths(new Date(), 2);
      const { data: expiringSubscriptions } = await supabase
        .from("client_subscriptions")
        .select("*, clients(name)")
        .eq("status", "active")
        .lte("end_date", twoMonthsFromNow.toISOString().split("T")[0])
        .gte("end_date", new Date().toISOString().split("T")[0])
        .order("end_date");

      // Unpaid payments
      const { data: unpaidPayments } = await supabase
        .from("payment_history")
        .select("*, clients(name)")
        .in("status", ["pending", "failed"])
        .order("payment_date", { ascending: false });

      // Active subscriptions to determine paying clients
      const { data: activeSubscriptions } = await supabase
        .from("client_subscriptions")
        .select("client_id")
        .eq("status", "active");

      const payingClientIds = new Set(activeSubscriptions?.map(s => s.client_id) || []);

      // Calculate stats
      const now = new Date();
      const totalClients = clients?.length || 0;
      
      // Separate trial clients: expired vs active trial
      const trialClients = clients?.filter(c => c.status === "trial") || [];
      const activeTrialClients = trialClients.filter(c => 
        !c.trial_ends_at || new Date(c.trial_ends_at) > now
      );
      const expiredTrialClients = trialClients.filter(c => 
        c.trial_ends_at && new Date(c.trial_ends_at) <= now
      );
      
      // Active paying = status "active" AND has an active subscription
      const activePayingClients = clients?.filter(c => 
        c.status === "active" && payingClientIds.has(c.id)
      ).length || 0;
      
      // Active but no subscription (e.g. free or manually set)
      const activeFreeClients = clients?.filter(c => 
        c.status === "active" && !payingClientIds.has(c.id)
      ).length || 0;
      
      const suspendedClients = clients?.filter(c => c.status === "suspended").length || 0;

      const totalClubs = clubs?.length || 0;
      const activeClubs = clubs?.filter(c => c.is_active).length || 0;

      const totalUsers = users?.length || 0;
      const pendingUsers = (users || []).filter(u => !activeUserIds.has(u.id)).length;

      const revenueThisMonth = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

      return {
        totalClients,
        activePayingClients,
        activeFreeClients,
        trialClients: activeTrialClients.length,
        expiredTrialClients: expiredTrialClients.length,
        suspendedClients,
        totalClubs,
        activeClubs,
        totalCategories: categories?.length || 0,
        totalAthletes: players?.length || 0,
        totalUsers,
        pendingUsers,
        revenueThisMonth,
        expiringSubscriptions: expiringSubscriptions || [],
        unpaidPayments: unpaidPayments || [],
      };
    },
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement du dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{(stats?.activePayingClients || 0) + (stats?.activeFreeClients || 0)} actifs</Badge>
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">{stats?.trialClients} essai</Badge>
              {(stats?.expiredTrialClients || 0) > 0 && (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">{stats?.expiredTrialClients} essai expiré</Badge>
              )}
              {(stats?.suspendedClients || 0) > 0 && (
                <Badge variant="outline" className="text-xs bg-red-50 text-red-700">{stats?.suspendedClients} suspendu</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clubs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClubs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalCategories} catégories • {stats?.totalAthletes} athlètes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            {stats?.pendingUsers && stats.pendingUsers > 0 ? (
              <Badge variant="destructive" className="text-xs mt-1">
                <Clock className="h-3 w-3 mr-1" />
                {stats.pendingUsers} en attente
              </Badge>
            ) : (
              <p className="text-xs text-muted-foreground">Tous validés</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus ce mois</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.revenueThisMonth?.toFixed(2) || "0.00"} €</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "MMMM yyyy", { locale: fr })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Résumé détaillé */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Résumé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600">{stats?.activePayingClients || 0}</div>
              <p className="text-sm text-muted-foreground">Clients actifs payants</p>
              <DollarSign className="h-4 w-4 mx-auto mt-1 text-green-500" />
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-2xl font-bold text-purple-600">{stats?.activeFreeClients || 0}</div>
              <p className="text-sm text-muted-foreground">Clients actifs gratuits</p>
              <Gift className="h-4 w-4 mx-auto mt-1 text-purple-500" />
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="text-2xl font-bold text-amber-600">{stats?.trialClients || 0}</div>
              <p className="text-sm text-muted-foreground">Période d'essai</p>
              <Clock className="h-4 w-4 mx-auto mt-1 text-amber-500" />
            </div>
            {(stats?.expiredTrialClients || 0) > 0 && (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-2xl font-bold text-orange-600">{stats?.expiredTrialClients || 0}</div>
                <p className="text-sm text-muted-foreground">Essai expiré</p>
                <AlertTriangle className="h-4 w-4 mx-auto mt-1 text-orange-500" />
              </div>
            )}
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-2xl font-bold text-red-600">{stats?.suspendedClients || 0}</div>
              <p className="text-sm text-muted-foreground">Suspendus</p>
              <Ban className="h-4 w-4 mx-auto mt-1 text-red-500" />
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="text-2xl font-bold">{stats?.activeClubs || 0}</div>
              <p className="text-sm text-muted-foreground">Clubs actifs</p>
              <Building2 className="h-4 w-4 mx-auto mt-1 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Alerts - 2 months before expiry */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertes abonnements
              {((stats?.expiringSubscriptions?.length || 0) + (stats?.unpaidPayments?.length || 0)) > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {(stats?.expiringSubscriptions?.length || 0) + (stats?.unpaidPayments?.length || 0)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Unpaid */}
            {stats?.unpaidPayments && stats.unpaidPayments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Impayés</p>
                <div className="space-y-2">
                  {stats.unpaidPayments.map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{payment.clients?.name || "Client"}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.amount}€ - {format(new Date(payment.payment_date), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {payment.status === "failed" ? "Échoué" : "En attente"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expiring within 2 months */}
            {stats?.expiringSubscriptions && stats.expiringSubscriptions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Expiration dans moins de 2 mois</p>
                <div className="space-y-2">
                  {stats.expiringSubscriptions.map((sub: any) => {
                    const daysLeft = differenceInDays(new Date(sub.end_date), new Date());
                    return (
                      <div key={sub.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{sub.clients?.name || "Client"}</p>
                          <p className="text-xs text-muted-foreground">
                            Expire le {format(new Date(sub.end_date), "dd MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">
                          {daysLeft}j restants
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(!stats?.expiringSubscriptions || stats.expiringSubscriptions.length === 0) &&
             (!stats?.unpaidPayments || stats.unpaidPayments.length === 0) && (
              <p className="text-muted-foreground text-center py-4">
                Aucune alerte d'abonnement
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pending Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5 text-primary" />
              Utilisateurs en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.pendingUsers && stats.pendingUsers > 0 ? (
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-amber-600">{stats.pendingUsers}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  utilisateur(s) en attente de validation
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Aucun utilisateur en attente
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
