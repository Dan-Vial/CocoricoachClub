 import { useState } from "react";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Badge } from "@/components/ui/badge";
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Switch } from "@/components/ui/switch";
 import { toast } from "@/components/ui/sonner";
 import { Bell, Plus, Send, Mail, Smartphone, Trash2 } from "lucide-react";
 import { format } from "date-fns";
 import { fr } from "date-fns/locale";
 
 export function SuperAdminNotifications() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
   const [isAddOpen, setIsAddOpen] = useState(false);
   const [form, setForm] = useState({
     title: "",
     message: "",
     notification_type: "info",
     target_type: "all",
     is_email: false,
     is_push: true,
   });
 
   // Fetch notifications
   const { data: notifications = [], isLoading } = useQuery({
     queryKey: ["global-notifications"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("global_notifications")
         .select("*")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data;
     },
   });
 
   // Create notification
   const createNotification = useMutation({
     mutationFn: async () => {
       const { error } = await supabase.from("global_notifications").insert({
         title: form.title,
         message: form.message,
         notification_type: form.notification_type,
         target_type: form.target_type,
         is_email: form.is_email,
         is_push: form.is_push,
         created_by: user?.id,
         sent_at: new Date().toISOString(),
       });
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Notification envoyée");
       queryClient.invalidateQueries({ queryKey: ["global-notifications"] });
       setIsAddOpen(false);
       setForm({
         title: "",
         message: "",
         notification_type: "info",
         target_type: "all",
         is_email: false,
         is_push: true,
       });
     },
   });
 
   // Delete notification
   const deleteNotification = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase.from("global_notifications").delete().eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Notification supprimée");
       queryClient.invalidateQueries({ queryKey: ["global-notifications"] });
     },
   });
 
   const getTypeBadge = (type: string) => {
     switch (type) {
       case "info":
         return <Badge variant="outline">Info</Badge>;
       case "warning":
         return <Badge className="bg-amber-500">Attention</Badge>;
       case "success":
         return <Badge className="bg-green-600">Succès</Badge>;
       case "alert":
         return <Badge variant="destructive">Alerte</Badge>;
       default:
         return <Badge variant="outline">{type}</Badge>;
     }
   };
 
   const getTargetLabel = (target: string) => {
     switch (target) {
       case "all":
         return "Tous les utilisateurs";
       case "role":
         return "Par rôle";
       case "club":
         return "Par club";
       case "client":
         return "Par client";
       default:
         return target;
     }
   };
 
   return (
     <Card>
       <CardHeader>
         <div className="flex items-center justify-between">
           <div>
             <CardTitle className="flex items-center gap-2">
               <Bell className="h-5 w-5" />
               Notifications globales
             </CardTitle>
             <CardDescription>
               Envoyez des notifications à tous les utilisateurs
             </CardDescription>
           </div>
           <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
             <DialogTrigger asChild>
               <Button>
                 <Plus className="h-4 w-4 mr-2" />
                 Nouvelle notification
               </Button>
             </DialogTrigger>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>Envoyer une notification</DialogTitle>
                 <DialogDescription>
                   Cette notification sera visible par tous les utilisateurs
                 </DialogDescription>
               </DialogHeader>
               <div className="space-y-4">
                 <div className="space-y-2">
                   <Label>Titre *</Label>
                   <Input
                     value={form.title}
                     onChange={(e) => setForm({ ...form, title: e.target.value })}
                     placeholder="Titre de la notification"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Message *</Label>
                   <Textarea
                     value={form.message}
                     onChange={(e) => setForm({ ...form, message: e.target.value })}
                     placeholder="Contenu du message..."
                     rows={4}
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Type</Label>
                     <Select
                       value={form.notification_type}
                       onValueChange={(v) => setForm({ ...form, notification_type: v })}
                     >
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="info">Information</SelectItem>
                         <SelectItem value="success">Succès</SelectItem>
                         <SelectItem value="warning">Attention</SelectItem>
                         <SelectItem value="alert">Alerte</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label>Cible</Label>
                     <Select
                       value={form.target_type}
                       onValueChange={(v) => setForm({ ...form, target_type: v })}
                     >
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">Tous</SelectItem>
                         <SelectItem value="role">Par rôle</SelectItem>
                         <SelectItem value="club">Par club</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
                 <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2">
                     <Switch
                       checked={form.is_push}
                       onCheckedChange={(checked) => setForm({ ...form, is_push: checked })}
                     />
                     <Label className="flex items-center gap-1">
                       <Smartphone className="h-4 w-4" />
                       Push
                     </Label>
                   </div>
                   <div className="flex items-center gap-2">
                     <Switch
                       checked={form.is_email}
                       onCheckedChange={(checked) => setForm({ ...form, is_email: checked })}
                     />
                     <Label className="flex items-center gap-1">
                       <Mail className="h-4 w-4" />
                       Email
                     </Label>
                   </div>
                 </div>
               </div>
               <DialogFooter>
                 <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                   Annuler
                 </Button>
                 <Button
                   onClick={() => createNotification.mutate()}
                   disabled={!form.title || !form.message}
                 >
                   <Send className="h-4 w-4 mr-2" />
                   Envoyer
                 </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
         </div>
       </CardHeader>
       <CardContent>
         {isLoading ? (
           <p className="text-muted-foreground">Chargement...</p>
         ) : notifications.length === 0 ? (
           <p className="text-muted-foreground text-center py-8">
             Aucune notification envoyée
           </p>
         ) : (
           <div className="space-y-3">
             {notifications.map((notif: any) => (
               <div
                 key={notif.id}
                 className="flex items-start gap-4 p-4 border rounded-lg"
               >
                 <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1">
                     <h4 className="font-medium">{notif.title}</h4>
                     {getTypeBadge(notif.notification_type)}
                     <Badge variant="outline">{getTargetLabel(notif.target_type)}</Badge>
                   </div>
                   <p className="text-sm text-muted-foreground">{notif.message}</p>
                   <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                     {notif.sent_at && (
                       <span>
                         Envoyé le {format(new Date(notif.sent_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                       </span>
                     )}
                     <div className="flex items-center gap-2">
                       {notif.is_push && (
                         <Badge variant="outline" className="text-xs">
                           <Smartphone className="h-3 w-3 mr-1" />
                           Push
                         </Badge>
                       )}
                       {notif.is_email && (
                         <Badge variant="outline" className="text-xs">
                           <Mail className="h-3 w-3 mr-1" />
                           Email
                         </Badge>
                       )}
                     </div>
                   </div>
                 </div>
                 <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => {
                     if (confirm("Supprimer cette notification ?")) {
                       deleteNotification.mutate(notif.id);
                     }
                   }}
                 >
                   <Trash2 className="h-4 w-4 text-destructive" />
                 </Button>
               </div>
             ))}
           </div>
         )}
       </CardContent>
     </Card>
   );
 }