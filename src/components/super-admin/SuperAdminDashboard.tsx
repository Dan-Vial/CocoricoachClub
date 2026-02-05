 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Users, Building2, UserCheck, Clock, CreditCard, TrendingUp, AlertTriangle, Calendar } from "lucide-react";
 import { format } from "date-fns";
 import { fr } from "date-fns/locale";
 
 export function SuperAdminDashboard() {
   // Fetch dashboard stats
   const { data: stats, isLoading } = useQuery({
     queryKey: ["super-admin-dashboard-stats"],
     queryFn: async () => {
       // Fetch clients
       const { data: clients } = await supabase
         .from("clients")
         .select("id, status, trial_ends_at");
 
       // Fetch clubs
       const { data: clubs } = await supabase
         .from("clubs")
         .select("id, is_active, created_at");
 
       // Fetch categories
       const { data: categories } = await supabase
         .from("categories")
         .select("id");
 
       // Fetch players
       const { data: players } = await supabase
         .from("players")
         .select("id");
 
       // Fetch users
       const { data: users } = await supabase
         .from("admin_all_users")
         .select("id, created_at");
 
       // Fetch approved users
       const { data: approvedUsers } = await supabase
         .from("approved_users")
         .select("id");
 
       // Fetch payments this month
       const startOfMonth = new Date();
       startOfMonth.setDate(1);
       startOfMonth.setHours(0, 0, 0, 0);
       
       const { data: payments } = await supabase
         .from("payment_history")
         .select("amount")
         .eq("status", "completed")
         .gte("payment_date", startOfMonth.toISOString().split("T")[0]);
 
       // Fetch upcoming subscription expirations
       const nextWeek = new Date();
       nextWeek.setDate(nextWeek.getDate() + 7);
 
       const { data: expiringSubscriptions } = await supabase
         .from("client_subscriptions")
         .select("*, clients(name)")
         .eq("status", "active")
         .lte("end_date", nextWeek.toISOString().split("T")[0])
         .gte("end_date", new Date().toISOString().split("T")[0]);
 
       // Calculate stats
       const totalClients = clients?.length || 0;
       const activeClients = clients?.filter(c => c.status === "active").length || 0;
       const trialClients = clients?.filter(c => c.status === "trial").length || 0;
       const suspendedClients = clients?.filter(c => c.status === "suspended").length || 0;
       
       const totalClubs = clubs?.length || 0;
       const activeClubs = clubs?.filter(c => c.is_active).length || 0;
 
       const totalUsers = users?.length || 0;
       const pendingUsers = totalUsers - (approvedUsers?.length || 0);
 
       const revenueThisMonth = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
 
       // Recent activity
       const recentClubs = clubs
         ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         .slice(0, 5) || [];
 
       const recentUsers = users
         ?.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
         .slice(0, 5) || [];
 
       return {
         totalClients,
         activeClients,
         trialClients,
         suspendedClients,
         totalClubs,
         activeClubs,
         totalCategories: categories?.length || 0,
         totalAthletes: players?.length || 0,
         totalUsers,
         pendingUsers,
         revenueThisMonth,
         expiringSubscriptions: expiringSubscriptions || [],
         recentClubs,
         recentUsers,
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
             <div className="flex gap-2 mt-1">
               <Badge variant="outline" className="text-xs">{stats?.activeClients} actifs</Badge>
               <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">{stats?.trialClients} essai</Badge>
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
 
       {/* Alerts & Upcoming */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Subscription Alerts */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2 text-lg">
               <AlertTriangle className="h-5 w-5 text-amber-500" />
               Alertes abonnements
             </CardTitle>
           </CardHeader>
           <CardContent>
             {stats?.expiringSubscriptions && stats.expiringSubscriptions.length > 0 ? (
               <div className="space-y-3">
                 {stats.expiringSubscriptions.map((sub: any) => (
                   <div key={sub.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                     <div>
                       <p className="font-medium">{sub.clients?.name || "Client inconnu"}</p>
                       <p className="text-sm text-muted-foreground">
                         Expire le {format(new Date(sub.end_date), "dd MMM yyyy", { locale: fr })}
                       </p>
                     </div>
                     <Badge variant="outline" className="bg-amber-100 text-amber-800">
                       À renouveler
                     </Badge>
                   </div>
                 ))}
               </div>
             ) : (
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
 
       {/* Quick Stats Summary */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2 text-lg">
             <Calendar className="h-5 w-5" />
             Résumé
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
             <div className="p-4 bg-muted/50 rounded-lg">
               <div className="text-2xl font-bold text-green-600">{stats?.activeClients || 0}</div>
               <p className="text-sm text-muted-foreground">Clients actifs</p>
             </div>
             <div className="p-4 bg-muted/50 rounded-lg">
               <div className="text-2xl font-bold text-amber-600">{stats?.trialClients || 0}</div>
               <p className="text-sm text-muted-foreground">En période d'essai</p>
             </div>
             <div className="p-4 bg-muted/50 rounded-lg">
               <div className="text-2xl font-bold text-red-600">{stats?.suspendedClients || 0}</div>
               <p className="text-sm text-muted-foreground">Suspendus</p>
             </div>
             <div className="p-4 bg-muted/50 rounded-lg">
               <div className="text-2xl font-bold">{stats?.activeClubs || 0}</div>
               <p className="text-sm text-muted-foreground">Clubs actifs</p>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }