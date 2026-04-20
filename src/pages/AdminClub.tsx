 import { useState } from "react";
 import { useParams, useNavigate } from "react-router-dom";
 import { useQuery, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { useAuth } from "@/contexts/AuthContext";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Separator } from "@/components/ui/separator";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import {
   ArrowLeft,
   Shield,
   Users,
   Calendar,
   AlertTriangle,
   Settings,
   ChevronRight,
   Plus,
   CreditCard,
   Video,
   Bell,
   UserPlus,
   CheckCircle,
   XCircle,
   Clock,
   Mail,
   Building2
 } from "lucide-react";
 import { format, startOfWeek, endOfWeek } from "date-fns";
 import { fr } from "date-fns/locale";
 import { cn } from "@/lib/utils";
 import { AddCategoryDialog } from "@/components/categories/AddCategoryDialog";
 import { InviteMemberDialog } from "@/components/collaboration/InviteMemberDialog";
import { TutorialVideosSection } from "@/components/category/settings/TutorialVideosSection";
import { ClubPdfSettingsSection } from "@/components/club/ClubPdfSettingsSection";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, ChevronDown } from "lucide-react";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClubMembersManagement } from "@/components/club/ClubMembersManagement";
import { ClubInvitationsSection } from "@/components/club/ClubInvitationsSection";
import { SeasonManager } from "@/components/club/SeasonManager";
 
 export default function AdminClub() {
   const { clubId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
     const [isEditingSettings, setIsEditingSettings] = useState(false);
     const [editClubName, setEditClubName] = useState("");
     const [editClubSport, setEditClubSport] = useState("");
     const [editClubTimezone, setEditClubTimezone] = useState("Europe/Paris");
     const [pdfOpen, setPdfOpen] = useState(false);
 
   // Fetch club data
   const { data: club, isLoading: clubLoading } = useQuery({
     queryKey: ["club", clubId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("clubs")
         .select("*, clients(*)")
         .eq("id", clubId)
         .single();
       if (error) throw error;
       return data;
     },
   });
 
   // Check user role
   const { data: userRole } = useQuery({
     queryKey: ["user-club-role", clubId, user?.id],
     queryFn: async () => {
       if (!user?.id) return null;
       
       // Check if owner
       const { data: clubData } = await supabase
         .from("clubs")
         .select("user_id")
         .eq("id", clubId)
         .single();
       
       if (clubData?.user_id === user.id) return "owner";
       
       // Check club_members
       const { data: member } = await supabase
         .from("club_members")
         .select("role")
         .eq("club_id", clubId)
         .eq("user_id", user.id)
         .single();
       
       return member?.role || null;
     },
     enabled: !!user?.id && !!clubId,
   });
 
   // Fetch categories
   const { data: categories = [] } = useQuery({
     queryKey: ["categories", clubId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("categories")
         .select("*")
         .eq("club_id", clubId)
         .order("name");
       if (error) throw error;
       return data;
     },
   });
 
   // Fetch player counts per category
   const { data: playerCounts = {} } = useQuery({
     queryKey: ["player-counts", clubId],
     queryFn: async () => {
       const counts: Record<string, number> = {};
       for (const cat of categories) {
         const { count } = await supabase
           .from("players")
           .select("*", { count: "exact", head: true })
           .eq("category_id", cat.id);
         counts[cat.id] = count || 0;
       }
       return counts;
     },
     enabled: categories.length > 0,
   });
 
   // Fetch staff counts per category
   const { data: staffCounts = {} } = useQuery({
     queryKey: ["staff-counts", clubId],
     queryFn: async () => {
       const counts: Record<string, number> = {};
       for (const cat of categories) {
         const { count } = await supabase
           .from("category_members")
           .select("*", { count: "exact", head: true })
           .eq("category_id", cat.id);
         counts[cat.id] = count || 0;
       }
       return counts;
     },
     enabled: categories.length > 0,
   });
 
   // Fetch club members
   const { data: clubMembers = [] } = useQuery({
     queryKey: ["club-members", clubId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("club_members")
         .select("*")
         .eq("club_id", clubId);
       if (error) throw error;
       return data;
     },
   });
 
   // Fetch sessions this week
   const { data: sessionsThisWeek = 0 } = useQuery({
     queryKey: ["sessions-this-week", clubId],
     queryFn: async () => {
       const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
       const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
       
       let total = 0;
       for (const cat of categories) {
         const { count } = await supabase
           .from("training_sessions")
           .select("*", { count: "exact", head: true })
           .eq("category_id", cat.id)
           .gte("session_date", weekStart)
           .lte("session_date", weekEnd);
         total += count || 0;
       }
       return total;
     },
     enabled: categories.length > 0,
   });
 
   // Fetch active alerts
   const { data: alertsCount = 0 } = useQuery({
     queryKey: ["alerts-count", clubId],
     queryFn: async () => {
       let total = 0;
       for (const cat of categories) {
         // Active injuries
         const { count: injuries } = await supabase
           .from("injuries")
           .select("*", { count: "exact", head: true })
           .eq("category_id", cat.id)
           .eq("status", "active");
         total += injuries || 0;
         
         // Expired documents
         const { count: docs } = await supabase
           .from("admin_documents")
           .select("*", { count: "exact", head: true })
           .eq("category_id", cat.id)
           .lte("expiry_date", format(new Date(), "yyyy-MM-dd"))
           .eq("status", "pending");
         total += docs || 0;
       }
       return total;
     },
     enabled: categories.length > 0,
   });
 
   // Fetch client subscription
   const { data: subscription } = useQuery({
     queryKey: ["club-subscription", club?.client_id],
     queryFn: async () => {
       if (!club?.client_id) return null;
       const { data, error } = await supabase
         .from("client_subscriptions")
         .select("*, subscription_plans(*)")
         .eq("client_id", club.client_id)
         .eq("status", "active")
         .maybeSingle();
       if (error) throw error;
       return data;
     },
     enabled: !!club?.client_id,
   });
 
   // Fetch payment history for client
   const { data: paymentHistory = [] } = useQuery({
     queryKey: ["club-payments", club?.client_id],
     queryFn: async () => {
       if (!club?.client_id) return [];
       const { data, error } = await supabase
         .from("payment_history")
         .select("*")
         .eq("client_id", club.client_id)
         .order("payment_date", { ascending: false })
         .limit(10);
       if (error) throw error;
       return data;
     },
     enabled: !!club?.client_id,
   });
 
   // Calculate totals
   const totalAthletes = Object.values(playerCounts).reduce((a, b) => a + b, 0);
   const totalStaff = clubMembers.length;
 
   const isAdmin = userRole === "owner" || userRole === "admin";
 
   const getClubStatus = () => {
     if (!club?.is_active) return { label: "Suspendu", color: "destructive" };
     if (club?.clients?.status === "trial") return { label: "Période d'essai", color: "warning" };
     return { label: "Actif", color: "success" };
   };
 
   const status = getClubStatus();
 
   if (clubLoading) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <p className="text-muted-foreground">Chargement...</p>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-background">
       {/* 🏟️ 1. EN-TÊTE - IDENTITÉ DU CLUB */}
       <div className="bg-gradient-hero py-8 px-4">
         <div className="container mx-auto max-w-6xl">
           <Button
             variant="ghost"
             className="text-white hover:bg-white/10 mb-4"
             onClick={() => navigate("/")}
           >
             <ArrowLeft className="h-4 w-4 mr-2" />
             Retour
           </Button>
 
           <div className="flex items-center gap-6">
             {/* Logo bouclier */}
             <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center border-2 border-white/20 shadow-lg">
               {club?.logo_url ? (
                 <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
               ) : (
                 <Building2 className="h-10 w-10 text-white/70" />
               )}
             </div>
 
             <div className="flex-1">
               <div className="flex items-center gap-3 flex-wrap">
                 <h1 className="text-3xl font-bold text-white">{club?.name}</h1>
                 <Badge 
                   variant={status.color === "success" ? "default" : status.color === "warning" ? "secondary" : "destructive"}
                   className={cn(
                     status.color === "success" && "bg-green-500",
                     status.color === "warning" && "bg-yellow-500 text-yellow-900"
                   )}
                 >
                   {status.label}
                 </Badge>
               </div>
               <p className="text-white/70 mt-1">Admin Club</p>
             </div>
 
             {isAdmin && (
               <Button
                 variant="secondary"
                 onClick={() => setActiveTab("settings")}
                 className="gap-2"
               >
                 <Settings className="h-4 w-4" />
                 Paramètres
               </Button>
             )}
           </div>
         </div>
       </div>
 
       <div className="container mx-auto max-w-6xl px-4 py-6">
         {/* 📊 2. SYNTHÈSE RAPIDE */}
         <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
           <Card 
             className="cursor-pointer hover:shadow-md transition-shadow"
             onClick={() => setActiveTab("categories")}
           >
             <CardContent className="p-4">
               <div className="flex items-center gap-3">
                 <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                   <Shield className="h-5 w-5 text-blue-600" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">{categories.length}</p>
                   <p className="text-xs text-muted-foreground">Catégories</p>
                 </div>
               </div>
             </CardContent>
           </Card>
 
           <Card 
             className="cursor-pointer hover:shadow-md transition-shadow"
             onClick={() => setActiveTab("categories")}
           >
             <CardContent className="p-4">
               <div className="flex items-center gap-3">
                 <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                   <Users className="h-5 w-5 text-green-600" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">{totalAthletes}</p>
                   <p className="text-xs text-muted-foreground">Athlètes</p>
                 </div>
               </div>
             </CardContent>
           </Card>
 
           <Card 
             className="cursor-pointer hover:shadow-md transition-shadow"
             onClick={() => setActiveTab("users")}
           >
             <CardContent className="p-4">
               <div className="flex items-center gap-3">
                 <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                   <UserPlus className="h-5 w-5 text-purple-600" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">{totalStaff}</p>
                   <p className="text-xs text-muted-foreground">Staff</p>
                 </div>
               </div>
             </CardContent>
           </Card>
 
           <Card className="cursor-pointer hover:shadow-md transition-shadow">
             <CardContent className="p-4">
               <div className="flex items-center gap-3">
                 <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                   <Calendar className="h-5 w-5 text-emerald-600" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">{sessionsThisWeek}</p>
                   <p className="text-xs text-muted-foreground">Séances/sem</p>
                 </div>
               </div>
             </CardContent>
           </Card>
 
           <Card 
             className={cn(
               "cursor-pointer hover:shadow-md transition-shadow",
               alertsCount > 0 && "border-orange-300 dark:border-orange-700"
             )}
           >
             <CardContent className="p-4">
               <div className="flex items-center gap-3">
                 <div className={cn(
                   "p-2 rounded-lg",
                   alertsCount > 0 
                     ? "bg-orange-100 dark:bg-orange-900/30" 
                     : "bg-gray-100 dark:bg-gray-800"
                 )}>
                   <AlertTriangle className={cn(
                     "h-5 w-5",
                     alertsCount > 0 ? "text-orange-600" : "text-gray-400"
                   )} />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">{alertsCount}</p>
                   <p className="text-xs text-muted-foreground">Alertes</p>
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>
 
         {/* TABS PRINCIPALES */}
         <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="inline-flex w-max md:grid md:w-full md:grid-cols-7 gap-1">
                <TabsTrigger value="overview" className="whitespace-nowrap text-xs md:text-sm">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="categories" className="whitespace-nowrap text-xs md:text-sm">Catégories</TabsTrigger>
                <TabsTrigger value="users" className="whitespace-nowrap text-xs md:text-sm">Utilisateurs</TabsTrigger>
                <TabsTrigger value="seasons" className="whitespace-nowrap text-xs md:text-sm">Saisons</TabsTrigger>
                {isAdmin && <TabsTrigger value="subscription" className="whitespace-nowrap text-xs md:text-sm">Abonnement</TabsTrigger>}
                <TabsTrigger value="videos" className="whitespace-nowrap text-xs md:text-sm">Vidéos</TabsTrigger>
                {isAdmin && <TabsTrigger value="settings" className="whitespace-nowrap text-xs md:text-sm">Paramètres</TabsTrigger>}
              </TabsList>
            </div>
 
           {/* 🧭 3. ACCÈS AUX CATÉGORIES */}
           <TabsContent value="overview" className="space-y-6">
             <Card>
               <CardHeader className="flex flex-row items-center justify-between">
                 <CardTitle className="flex items-center gap-2">
                   <Shield className="h-5 w-5 text-primary" />
                   Catégories
                 </CardTitle>
                 {isAdmin && (
                   <Button onClick={() => setIsAddCategoryOpen(true)} size="sm" className="gap-1">
                     <Plus className="h-4 w-4" />
                     Créer
                   </Button>
                 )}
               </CardHeader>
               <CardContent>
                 {categories.length === 0 ? (
                   <p className="text-muted-foreground text-center py-8">
                     Aucune catégorie créée
                   </p>
                 ) : (
                   <div className="space-y-2">
                     {categories.map((category) => (
                       <div
                         key={category.id}
                         className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                         onClick={() => navigate(`/categories/${category.id}`)}
                       >
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                             {category.cover_image_url ? (
                               <img src={category.cover_image_url} alt={category.name} className="w-full h-full object-cover" />
                             ) : (
                               <Users className="h-5 w-5 text-muted-foreground" />
                             )}
                           </div>
                           <div>
                             <p className="font-medium">{category.name}</p>
                             <div className="flex items-center gap-2 text-xs text-muted-foreground">
                               <span>{playerCounts[category.id] || 0} athlètes</span>
                               <span>•</span>
                               <span>{staffCounts[category.id] || 0} staff</span>
                             </div>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <Badge variant="outline">
                             {category.rugby_type === "7" ? "7s" : category.rugby_type}
                           </Badge>
                           <ChevronRight className="h-4 w-4 text-muted-foreground" />
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </CardContent>
             </Card>
           </TabsContent>
 
           <TabsContent value="categories" className="space-y-4">
             <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold">Toutes les catégories</h2>
               {isAdmin && (
                 <Button onClick={() => setIsAddCategoryOpen(true)} className="gap-1">
                   <Plus className="h-4 w-4" />
                   Créer une catégorie
                 </Button>
               )}
             </div>
             
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
               {categories.map((category) => (
                 <Card 
                   key={category.id}
                   className="cursor-pointer hover:shadow-md transition-shadow"
                   onClick={() => navigate(`/categories/${category.id}`)}
                 >
                   <CardHeader className="pb-2">
                     <div className="flex items-center justify-between">
                       <CardTitle className="text-lg">{category.name}</CardTitle>
                       <Badge variant="secondary">{category.rugby_type}</Badge>
                     </div>
                   </CardHeader>
                   <CardContent>
                     <div className="flex items-center justify-between text-sm text-muted-foreground">
                       <span>{playerCounts[category.id] || 0} athlètes</span>
                       <span>{staffCounts[category.id] || 0} staff</span>
                     </div>
                     <Button variant="outline" className="w-full mt-3 gap-1">
                       Entrer <ChevronRight className="h-4 w-4" />
                     </Button>
                   </CardContent>
                 </Card>
               ))}
             </div>
           </TabsContent>
 
           {/* 👥 4. GESTION DES UTILISATEURS */}
            <TabsContent value="users" className="space-y-6">
             <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold">Utilisateurs du club</h2>
               {isAdmin && (
                 <Button onClick={() => setIsInviteOpen(true)} className="gap-1">
                   <UserPlus className="h-4 w-4" />
                    Inviter un membre
                 </Button>
               )}
             </div>
 
              {/* Section des membres actuels */}
              <ClubMembersManagement 
                clubId={clubId!} 
                categories={categories}
                canManage={isAdmin} 
              />

              {/* Section des invitations en attente */}
              {isAdmin && (
                <ClubInvitationsSection clubId={clubId!} />
              )}
           </TabsContent>
 
           {/* 💳 5. ABONNEMENT & FACTURATION */}
           {isAdmin && (
             <TabsContent value="subscription" className="space-y-4">
               <h2 className="text-xl font-bold">Abonnement & Facturation</h2>
 
               {!club?.client_id && (
                 <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                   <CardContent className="py-4">
                     <div className="flex items-center gap-3">
                       <AlertTriangle className="h-5 w-5 text-amber-600" />
                       <div>
                         <p className="font-medium text-amber-800 dark:text-amber-200">
                           Club non lié à un compte client
                         </p>
                         <p className="text-sm text-amber-700 dark:text-amber-300">
                           Contactez l'administrateur pour configurer votre abonnement.
                         </p>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               )}
 
               <div className="grid gap-4 md:grid-cols-2">
                 <Card>
                   <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                       <CreditCard className="h-5 w-5 text-primary" />
                       Abonnement actuel
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     {!club?.client_id ? (
                       <p className="text-muted-foreground text-center py-4">
                         Aucun abonnement configuré
                       </p>
                     ) : (
                       <>
                     <div className="flex items-center justify-between">
                       <span className="text-muted-foreground">Plan</span>
                       <span className="font-medium">
                         {subscription?.subscription_plans?.name || "Standard"}
                       </span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-muted-foreground">Statut</span>
                       <Badge variant={subscription?.status === "active" ? "default" : "secondary"}>
                         {subscription?.status === "active" ? "Actif" : "Inactif"}
                       </Badge>
                     </div>
                     {subscription?.amount && (
                       <div className="flex items-center justify-between">
                         <span className="text-muted-foreground">Montant</span>
                         <span className="font-medium">{subscription.amount} €</span>
                       </div>
                     )}
                     {subscription?.end_date && (
                       <div className="flex items-center justify-between">
                         <span className="text-muted-foreground">Expire le</span>
                         <span>{format(new Date(subscription.end_date), "dd/MM/yyyy")}</span>
                       </div>
                     )}
                       </>
                     )}
                   </CardContent>
                 </Card>
 
                 <Card>
                   <CardHeader>
                     <CardTitle>Limites du compte</CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-3">
                     <div className="flex items-center justify-between">
                       <span className="text-muted-foreground">Catégories</span>
                       <span>
                         {categories.length} / {club?.clients?.max_categories_per_club || "∞"}
                       </span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-muted-foreground">Athlètes</span>
                       <span>
                         {totalAthletes} / {club?.clients?.max_athletes || "∞"}
                       </span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-muted-foreground">Staff / catégorie</span>
                       <span>
                         {club?.clients?.max_staff_per_category || club?.clients?.max_staff_users || "∞"}
                       </span>
                     </div>
                   </CardContent>
                 </Card>
               </div>
 
               {/* Historique des paiements */}
               {club?.client_id && paymentHistory.length > 0 && (
                 <Card>
                   <CardHeader>
                     <CardTitle>Historique des paiements</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>Date</TableHead>
                           <TableHead>Montant</TableHead>
                           <TableHead>Méthode</TableHead>
                           <TableHead>N° Facture</TableHead>
                           <TableHead>Statut</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {paymentHistory.map((payment: any) => (
                           <TableRow key={payment.id}>
                             <TableCell>
                               {format(new Date(payment.payment_date), "dd/MM/yyyy")}
                             </TableCell>
                             <TableCell className="font-medium">{payment.amount} €</TableCell>
                             <TableCell>{payment.payment_method || "-"}</TableCell>
                             <TableCell>{payment.invoice_number || "-"}</TableCell>
                             <TableCell>
                               <Badge 
                                 variant={payment.status === "completed" ? "default" : "secondary"}
                                 className={payment.status === "completed" ? "bg-green-600" : ""}
                               >
                                 {payment.status === "completed" ? "Payé" : 
                                  payment.status === "pending" ? "En attente" : payment.status}
                               </Badge>
                             </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </CardContent>
                 </Card>
               )}
             </TabsContent>
           )}
 
            {/* 📅 SAISONS */}
            <TabsContent value="seasons" className="space-y-4">
              <SeasonManager clubId={clubId!} categories={categories} />
            </TabsContent>

            {/* 🎥 6. VIDÉOS & TUTORIELS */}
            <TabsContent value="videos" className="space-y-4">
             <h2 className="text-xl font-bold">Vidéos & Tutoriels</h2>
             <TutorialVideosSection />
           </TabsContent>
 
           {/* ⚙️ 8. PARAMÈTRES DU CLUB */}
            {isAdmin && (
              <TabsContent value="settings" className="space-y-4">
                <h2 className="text-xl font-bold">Paramètres du club</h2>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Informations générales</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditingSettings ? (
                      <>
                        <div className="space-y-2">
                          <Label>Nom du club</Label>
                          <Input
                            value={editClubName}
                            onChange={(e) => setEditClubName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Sport</Label>
                          <Select value={editClubSport} onValueChange={setEditClubSport}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Rugby">Rugby</SelectItem>
                              <SelectItem value="Football">Football</SelectItem>
                              <SelectItem value="Handball">Handball</SelectItem>
                              <SelectItem value="Basketball">Basketball</SelectItem>
                              <SelectItem value="Volleyball">Volleyball</SelectItem>
                              <SelectItem value="Natation">Natation</SelectItem>
                              <SelectItem value="Athlétisme">Athlétisme</SelectItem>
                              <SelectItem value="Tennis">Tennis</SelectItem>
                              <SelectItem value="Bowling">Bowling</SelectItem>
                              <SelectItem value="Autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Fuseau horaire</Label>
                          <Select value={editClubTimezone} onValueChange={setEditClubTimezone}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pacific/Auckland">Nouvelle-Zélande (Auckland)</SelectItem>
                              <SelectItem value="Australia/Sydney">Australie (Sydney)</SelectItem>
                              <SelectItem value="Asia/Tokyo">Japon (Tokyo)</SelectItem>
                              <SelectItem value="Asia/Shanghai">Chine (Shanghai)</SelectItem>
                              <SelectItem value="Asia/Dubai">Émirats (Dubai)</SelectItem>
                              <SelectItem value="Europe/Moscow">Russie (Moscou)</SelectItem>
                              <SelectItem value="Europe/Paris">France (Paris)</SelectItem>
                              <SelectItem value="Europe/London">Royaume-Uni (Londres)</SelectItem>
                              <SelectItem value="Atlantic/Reykjavik">Islande (UTC)</SelectItem>
                              <SelectItem value="America/Sao_Paulo">Brésil (São Paulo)</SelectItem>
                              <SelectItem value="America/New_York">USA Est (New York)</SelectItem>
                              <SelectItem value="America/Chicago">USA Centre (Chicago)</SelectItem>
                              <SelectItem value="America/Denver">USA Montagne (Denver)</SelectItem>
                              <SelectItem value="America/Los_Angeles">USA Ouest (Los Angeles)</SelectItem>
                              <SelectItem value="America/Anchorage">Alaska (Anchorage)</SelectItem>
                              <SelectItem value="Pacific/Honolulu">Hawaï (Honolulu)</SelectItem>
                              <SelectItem value="America/Montreal">Canada Est (Montréal)</SelectItem>
                              <SelectItem value="America/Vancouver">Canada Ouest (Vancouver)</SelectItem>
                              <SelectItem value="Indian/Reunion">La Réunion</SelectItem>
                              <SelectItem value="Pacific/Noumea">Nouvelle-Calédonie</SelectItem>
                              <SelectItem value="Pacific/Tahiti">Polynésie (Tahiti)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Les rappels Wellness seront envoyés à 8h dans ce fuseau horaire</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Créé le</span>
                          <span>{club?.created_at && format(new Date(club.created_at), "dd/MM/yyyy")}</span>
                        </div>
                        <Separator />
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => setIsEditingSettings(false)}
                          >
                            Annuler
                          </Button>
                          <Button 
                            className="flex-1 gap-2"
                            onClick={async () => {
                              const { error } = await supabase
                                .from("clubs")
                                .update({ name: editClubName, sport: editClubSport, timezone: editClubTimezone })
                                .eq("id", clubId);
                              if (error) {
                                toast.error("Erreur lors de la mise à jour");
                              } else {
                                toast.success("Paramètres mis à jour");
                                queryClient.invalidateQueries({ queryKey: ["club", clubId] });
                                setIsEditingSettings(false);
                              }
                            }}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Enregistrer
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Nom du club</span>
                          <span className="font-medium">{club?.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Sport</span>
                          <span className="font-medium">{club?.sport || "Rugby"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Fuseau horaire</span>
                          <span className="font-medium">{(club as any)?.timezone || "Europe/Paris"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Créé le</span>
                          <span>{club?.created_at && format(new Date(club.created_at), "dd/MM/yyyy")}</span>
                        </div>
                        <Separator />
                        <Button 
                          variant="outline" 
                          className="w-full gap-2"
                          onClick={() => {
                            setEditClubName(club?.name || "");
                            setEditClubSport(club?.sport || "Rugby");
                            setEditClubTimezone((club as any)?.timezone || "Europe/Paris");
                            setIsEditingSettings(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                          Modifier les paramètres
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* PDF Settings Collapsible */}
                <Collapsible open={pdfOpen} onOpenChange={setPdfOpen}>
                  <CollapsibleTrigger className="w-full">
                    <div className={cn(
                      "flex items-center justify-between w-full p-4 rounded-xl border bg-card shadow-sm transition-colors hover:bg-accent/50",
                      pdfOpen && "rounded-b-none border-b-0"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">Personnalisation des PDF</p>
                          <p className="text-sm text-muted-foreground">Logo, couleurs et pied de page pour tout le club</p>
                        </div>
                      </div>
                      <ChevronDown className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform duration-200",
                        pdfOpen && "rotate-180"
                      )} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border border-t-0 rounded-b-xl p-4 bg-card shadow-sm">
                      <ClubPdfSettingsSection clubId={clubId!} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>
            )}
          </Tabs>
        </div>
 
       {/* Dialogs */}
       <AddCategoryDialog
         open={isAddCategoryOpen}
         onOpenChange={setIsAddCategoryOpen}
         clubId={clubId!}
       />
 
       <InviteMemberDialog
         open={isInviteOpen}
         onOpenChange={setIsInviteOpen}
         clubId={clubId!}
       />
     </div>
   );
 }