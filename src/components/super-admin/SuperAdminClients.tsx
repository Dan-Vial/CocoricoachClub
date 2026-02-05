 import { useState } from "react";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Textarea } from "@/components/ui/textarea";
 import { toast } from "@/components/ui/sonner";
 import { Plus, Edit, Pause, Play, Trash2, Building2, Mail } from "lucide-react";
 import { format } from "date-fns";
 import { fr } from "date-fns/locale";
 import { InviteClientDialog } from "./InviteClientDialog";
 
 interface Client {
   id: string;
   name: string;
   email: string | null;
   phone: string | null;
   address: string | null;
   status: string;
   trial_ends_at: string | null;
   max_clubs: number;
   max_categories_per_club: number;
   max_staff_users: number;
   max_athletes: number;
   notes: string | null;
   created_at: string;
 }
 
export function SuperAdminClients() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
   const [formData, setFormData] = useState({
     name: "",
     email: "",
     phone: "",
     address: "",
     status: "trial",
     max_clubs: 1,
     max_categories_per_club: 3,
     max_staff_users: 5,
     max_athletes: 50,
     notes: "",
   });
 
   // Fetch clients
   const { data: clients = [], isLoading } = useQuery({
     queryKey: ["super-admin-clients"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("clients")
         .select("*")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data as Client[];
     },
   });
 
   // Create client mutation
   const createClient = useMutation({
     mutationFn: async (data: typeof formData) => {
       const trialEndsAt = data.status === "trial" 
         ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
         : null;
 
       const { error } = await supabase
         .from("clients")
         .insert({
           name: data.name,
           email: data.email || null,
           phone: data.phone || null,
           address: data.address || null,
           status: data.status,
           trial_ends_at: trialEndsAt,
           max_clubs: data.max_clubs,
           max_categories_per_club: data.max_categories_per_club,
           max_staff_users: data.max_staff_users,
           max_athletes: data.max_athletes,
           notes: data.notes || null,
         });
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Client créé avec succès");
       queryClient.invalidateQueries({ queryKey: ["super-admin-clients"] });
       setIsAddDialogOpen(false);
       resetForm();
     },
     onError: () => {
       toast.error("Erreur lors de la création");
     },
   });
 
   // Update client mutation
   const updateClient = useMutation({
     mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
       const { error } = await supabase
         .from("clients")
         .update({
           name: data.name,
           email: data.email || null,
           phone: data.phone || null,
           address: data.address || null,
           status: data.status,
           max_clubs: data.max_clubs,
           max_categories_per_club: data.max_categories_per_club,
           max_staff_users: data.max_staff_users,
           max_athletes: data.max_athletes,
           notes: data.notes || null,
         })
         .eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Client mis à jour");
       queryClient.invalidateQueries({ queryKey: ["super-admin-clients"] });
       setEditingClient(null);
       resetForm();
     },
     onError: () => {
       toast.error("Erreur lors de la mise à jour");
     },
   });
 
   // Toggle status mutation
   const toggleStatus = useMutation({
     mutationFn: async ({ id, status }: { id: string; status: string }) => {
       const { error } = await supabase
         .from("clients")
         .update({ status })
         .eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Statut mis à jour");
       queryClient.invalidateQueries({ queryKey: ["super-admin-clients"] });
     },
   });
 
   // Delete client mutation
   const deleteClient = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase.from("clients").delete().eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Client supprimé");
       queryClient.invalidateQueries({ queryKey: ["super-admin-clients"] });
     },
     onError: () => {
       toast.error("Erreur lors de la suppression");
     },
   });
 
   const resetForm = () => {
     setFormData({
       name: "",
       email: "",
       phone: "",
       address: "",
       status: "trial",
       max_clubs: 1,
       max_categories_per_club: 3,
       max_staff_users: 5,
       max_athletes: 50,
       notes: "",
     });
   };
 
   const openEditDialog = (client: Client) => {
     setEditingClient(client);
     setFormData({
       name: client.name,
       email: client.email || "",
       phone: client.phone || "",
       address: client.address || "",
       status: client.status,
       max_clubs: client.max_clubs,
       max_categories_per_club: client.max_categories_per_club,
       max_staff_users: client.max_staff_users,
       max_athletes: client.max_athletes,
       notes: client.notes || "",
     });
   };
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case "active":
         return <Badge className="bg-green-600">Actif</Badge>;
       case "trial":
         return <Badge className="bg-amber-500">Essai</Badge>;
       case "suspended":
         return <Badge variant="destructive">Suspendu</Badge>;
       case "cancelled":
         return <Badge variant="secondary">Annulé</Badge>;
       default:
         return <Badge variant="outline">{status}</Badge>;
     }
   };
 
   const ClientForm = () => (
     <div className="space-y-4">
       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <Label>Nom du client *</Label>
           <Input
             value={formData.name}
             onChange={(e) => setFormData({ ...formData, name: e.target.value })}
             placeholder="Nom de l'organisation"
           />
         </div>
         <div className="space-y-2">
           <Label>Email</Label>
           <Input
             type="email"
             value={formData.email}
             onChange={(e) => setFormData({ ...formData, email: e.target.value })}
             placeholder="contact@exemple.com"
           />
         </div>
       </div>
 
       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <Label>Téléphone</Label>
           <Input
             value={formData.phone}
             onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
             placeholder="+33 1 23 45 67 89"
           />
         </div>
         <div className="space-y-2">
           <Label>Statut</Label>
           <Select
             value={formData.status}
             onValueChange={(value) => setFormData({ ...formData, status: value })}
           >
             <SelectTrigger>
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="trial">Période d'essai</SelectItem>
               <SelectItem value="active">Actif</SelectItem>
               <SelectItem value="suspended">Suspendu</SelectItem>
               <SelectItem value="cancelled">Annulé</SelectItem>
             </SelectContent>
           </Select>
         </div>
       </div>
 
       <div className="space-y-2">
         <Label>Adresse</Label>
         <Input
           value={formData.address}
           onChange={(e) => setFormData({ ...formData, address: e.target.value })}
           placeholder="Adresse complète"
         />
       </div>
 
       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <Label>Nombre max de clubs</Label>
           <Input
             type="number"
             min={1}
             value={formData.max_clubs}
             onChange={(e) => setFormData({ ...formData, max_clubs: parseInt(e.target.value) || 1 })}
           />
         </div>
         <div className="space-y-2">
           <Label>Catégories par club</Label>
           <Input
             type="number"
             min={1}
             value={formData.max_categories_per_club}
             onChange={(e) => setFormData({ ...formData, max_categories_per_club: parseInt(e.target.value) || 1 })}
           />
         </div>
       </div>
 
       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <Label>Utilisateurs staff max</Label>
           <Input
             type="number"
             min={1}
             value={formData.max_staff_users}
             onChange={(e) => setFormData({ ...formData, max_staff_users: parseInt(e.target.value) || 1 })}
           />
         </div>
         <div className="space-y-2">
           <Label>Athlètes max</Label>
           <Input
             type="number"
             min={1}
             value={formData.max_athletes}
             onChange={(e) => setFormData({ ...formData, max_athletes: parseInt(e.target.value) || 1 })}
           />
         </div>
       </div>
 
       <div className="space-y-2">
         <Label>Notes</Label>
         <Textarea
           value={formData.notes}
           onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
           placeholder="Notes internes..."
         />
       </div>
     </div>
   );
 
   return (
     <Card>
       <CardHeader>
         <div className="flex items-center justify-between">
           <div>
             <CardTitle className="flex items-center gap-2">
               <Building2 className="h-5 w-5" />
               Gestion des clients
             </CardTitle>
             <CardDescription>
               Gérez les organisations clientes et leurs limites
             </CardDescription>
           </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(true)}>
                <Mail className="h-4 w-4 mr-2" />
                Inviter un client
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer manuellement
                  </Button>
                </DialogTrigger>
             <DialogContent className="max-w-2xl">
               <DialogHeader>
                 <DialogTitle>Créer un client</DialogTitle>
                 <DialogDescription>
                   Ajoutez une nouvelle organisation cliente
                 </DialogDescription>
               </DialogHeader>
               <ClientForm />
               <DialogFooter>
                 <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                   Annuler
                 </Button>
                 <Button
                   onClick={() => createClient.mutate(formData)}
                   disabled={!formData.name || createClient.isPending}
                 >
                   Créer
                 </Button>
               </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
         </div>
       </CardHeader>
       <CardContent>
         {isLoading ? (
           <p className="text-muted-foreground">Chargement...</p>
         ) : clients.length === 0 ? (
           <p className="text-muted-foreground text-center py-8">Aucun client enregistré</p>
         ) : (
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Client</TableHead>
                 <TableHead>Contact</TableHead>
                 <TableHead>Statut</TableHead>
                 <TableHead>Limites</TableHead>
                 <TableHead>Créé le</TableHead>
                 <TableHead className="text-right">Actions</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {clients.map((client) => (
                 <TableRow key={client.id}>
                   <TableCell className="font-medium">{client.name}</TableCell>
                   <TableCell>
                     <div className="text-sm">
                       {client.email && <p>{client.email}</p>}
                       {client.phone && <p className="text-muted-foreground">{client.phone}</p>}
                     </div>
                   </TableCell>
                   <TableCell>{getStatusBadge(client.status)}</TableCell>
                   <TableCell>
                     <div className="text-xs space-y-1">
                       <p>{client.max_clubs} clubs</p>
                       <p>{client.max_categories_per_club} cat./club</p>
                       <p>{client.max_athletes} athlètes</p>
                     </div>
                   </TableCell>
                   <TableCell>
                     {format(new Date(client.created_at), "dd MMM yyyy", { locale: fr })}
                   </TableCell>
                   <TableCell className="text-right">
                     <div className="flex justify-end gap-1">
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => openEditDialog(client)}
                       >
                         <Edit className="h-4 w-4" />
                       </Button>
                       {client.status === "suspended" ? (
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => toggleStatus.mutate({ id: client.id, status: "active" })}
                         >
                           <Play className="h-4 w-4 text-green-600" />
                         </Button>
                       ) : (
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => toggleStatus.mutate({ id: client.id, status: "suspended" })}
                         >
                           <Pause className="h-4 w-4 text-amber-600" />
                         </Button>
                       )}
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => {
                           if (confirm("Supprimer ce client ?")) {
                             deleteClient.mutate(client.id);
                           }
                         }}
                       >
                         <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                     </div>
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         )}
 
         {/* Edit Dialog */}
         <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
           <DialogContent className="max-w-2xl">
             <DialogHeader>
               <DialogTitle>Modifier le client</DialogTitle>
             </DialogHeader>
             <ClientForm />
             <DialogFooter>
               <Button variant="outline" onClick={() => setEditingClient(null)}>
                 Annuler
               </Button>
               <Button
                 onClick={() => editingClient && updateClient.mutate({ id: editingClient.id, data: formData })}
                 disabled={!formData.name || updateClient.isPending}
               >
                 Sauvegarder
               </Button>
             </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Invite Client Dialog */}
          <InviteClientDialog
            open={isInviteDialogOpen}
            onOpenChange={setIsInviteDialogOpen}
          />
        </CardContent>
      </Card>
    );
  }