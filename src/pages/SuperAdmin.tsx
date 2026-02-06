import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { Shield, ArrowLeft, LayoutDashboard, Users, Building2, CreditCard, Video, Bell, Settings, FileText, Lock } from "lucide-react";

// Import tab components
import { SuperAdminDashboard } from "@/components/super-admin/SuperAdminDashboard";
import { SuperAdminClients } from "@/components/super-admin/SuperAdminClients";
import { SuperAdminClubs } from "@/components/super-admin/SuperAdminClubs";
import { SuperAdminUsers } from "@/components/super-admin/SuperAdminUsers";
import { SuperAdminSubscriptions } from "@/components/super-admin/SuperAdminSubscriptions";
import { SuperAdminPayments } from "@/components/super-admin/SuperAdminPayments";
import { SuperAdminVideos } from "@/components/super-admin/SuperAdminVideos";
import { SuperAdminNotifications } from "@/components/super-admin/SuperAdminNotifications";
import { SuperAdminSettings } from "@/components/super-admin/SuperAdminSettings";
import { AuditLogsTab } from "@/components/admin/AuditLogsTab";
import { RoleMenuPermissions } from "@/components/super-admin/RoleMenuPermissions";
 
 export default function SuperAdmin() {
   const { user, loading: authLoading } = useAuth();
   const navigate = useNavigate();
 
   // Check if current user is super admin
   const { data: isSuperAdmin, isLoading: checkingAdmin } = useQuery({
     queryKey: ["is-super-admin", user?.id],
     queryFn: async () => {
       if (!user?.id) return false;
       const { data, error } = await supabase.rpc("is_super_admin", {
         _user_id: user.id,
       });
       if (error) {
         console.error("Error checking super admin status:", error);
         return false;
       }
       return data === true;
     },
     enabled: !!user?.id,
   });
 
   // Redirect if not authenticated or not super admin
   useEffect(() => {
     if (!authLoading && !user) {
       navigate("/auth");
     }
   }, [authLoading, user, navigate]);
 
   useEffect(() => {
     if (!checkingAdmin && isSuperAdmin === false && user) {
       toast.error("Accès non autorisé");
       navigate("/");
     }
   }, [checkingAdmin, isSuperAdmin, user, navigate]);
 
   if (authLoading || checkingAdmin) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <p className="text-muted-foreground">Vérification des permissions...</p>
       </div>
     );
   }
 
   if (!isSuperAdmin) {
     return null;
   }
 
   return (
     <div className="min-h-screen bg-background">
       <div className="container mx-auto px-4 py-8">
         {/* Header */}
         <div className="flex items-center gap-4 mb-8">
           <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
             <ArrowLeft className="h-5 w-5" />
           </Button>
           <div className="flex items-center gap-3">
             <Shield className="h-8 w-8 text-primary" />
             <div>
               <h1 className="text-3xl font-bold">Super Admin</h1>
               <p className="text-muted-foreground">Gestion globale de la plateforme</p>
             </div>
           </div>
         </div>
 
         {/* Main Content */}
         <Tabs defaultValue="dashboard" className="space-y-6">
           <TabsList className="flex flex-wrap h-auto gap-1">
             <TabsTrigger value="dashboard" className="flex items-center gap-2">
               <LayoutDashboard className="h-4 w-4" />
               Dashboard
             </TabsTrigger>
             <TabsTrigger value="clients" className="flex items-center gap-2">
               <Building2 className="h-4 w-4" />
               Clients
             </TabsTrigger>
             <TabsTrigger value="clubs" className="flex items-center gap-2">
               <Building2 className="h-4 w-4" />
               Clubs
             </TabsTrigger>
             <TabsTrigger value="users" className="flex items-center gap-2">
               <Users className="h-4 w-4" />
               Utilisateurs
             </TabsTrigger>
             <TabsTrigger value="subscriptions" className="flex items-center gap-2">
               <CreditCard className="h-4 w-4" />
               Abonnements
             </TabsTrigger>
             <TabsTrigger value="payments" className="flex items-center gap-2">
               <CreditCard className="h-4 w-4" />
               Paiements
             </TabsTrigger>
             <TabsTrigger value="videos" className="flex items-center gap-2">
               <Video className="h-4 w-4" />
               Vidéos
             </TabsTrigger>
             <TabsTrigger value="notifications" className="flex items-center gap-2">
               <Bell className="h-4 w-4" />
               Notifications
             </TabsTrigger>
             <TabsTrigger value="settings" className="flex items-center gap-2">
               <Settings className="h-4 w-4" />
               Paramètres
             </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Audit
              </TabsTrigger>
            </TabsList>
 
           <TabsContent value="dashboard">
             <SuperAdminDashboard />
           </TabsContent>
 
           <TabsContent value="clients">
             <SuperAdminClients />
           </TabsContent>
 
           <TabsContent value="clubs">
             <SuperAdminClubs />
           </TabsContent>
 
           <TabsContent value="users">
             <SuperAdminUsers />
           </TabsContent>
 
           <TabsContent value="subscriptions">
             <SuperAdminSubscriptions />
           </TabsContent>
 
           <TabsContent value="payments">
             <SuperAdminPayments />
           </TabsContent>
 
           <TabsContent value="videos">
             <SuperAdminVideos />
           </TabsContent>
 
           <TabsContent value="notifications">
             <SuperAdminNotifications />
           </TabsContent>
 
           <TabsContent value="settings">
             <SuperAdminSettings />
           </TabsContent>
 
            <TabsContent value="permissions">
              <RoleMenuPermissions />
            </TabsContent>

            <TabsContent value="audit">
              <AuditLogsTab />
            </TabsContent>
          </Tabs>
       </div>
     </div>
   );
 }