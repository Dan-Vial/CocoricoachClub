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
import { CreditCard, Plus, Edit, Trash2, Video, MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
 import { format } from "date-fns";
 import { fr } from "date-fns/locale";
 
 export function SuperAdminSubscriptions() {
   const queryClient = useQueryClient();
   const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
   const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    price_monthly: "",
    price_yearly: "",
    max_clubs: 1,
    max_categories_per_club: 3,
    max_staff_users: 5,
    max_staff_per_category: 5,
    max_athletes: 60,
    trial_days: 14,
    video_enabled: false,
    gps_data_enabled: false,
  });
  const [editingPlan, setEditingPlan] = useState<any>(null);
   const [subForm, setSubForm] = useState({
     client_id: "",
     plan_id: "",
     start_date: new Date().toISOString().split("T")[0],
     end_date: "",
     amount: "",
     payment_method: "",
     notes: "",
   });
 
   // Fetch subscription plans
   const { data: plans = [] } = useQuery({
     queryKey: ["subscription-plans"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("subscription_plans")
         .select("*")
         .order("price_monthly");
       if (error) throw error;
       return data;
     },
   });
 
   // Fetch client subscriptions
   const { data: subscriptions = [], isLoading } = useQuery({
     queryKey: ["client-subscriptions"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("client_subscriptions")
         .select("*, clients(name), subscription_plans(name)")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data;
     },
   });
 
   // Fetch clients
   const { data: clients = [] } = useQuery({
     queryKey: ["clients-for-sub"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("clients")
         .select("id, name")
         .order("name");
       if (error) throw error;
       return data;
     },
   });
 
  // Create plan
  const createPlan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subscription_plans").insert({
        name: planForm.name,
        description: planForm.description || null,
        price_monthly: parseFloat(planForm.price_monthly) || null,
        price_yearly: parseFloat(planForm.price_yearly) || null,
        max_clubs: planForm.max_clubs,
        max_categories_per_club: planForm.max_categories_per_club,
        max_staff_users: planForm.max_staff_users,
        max_staff_per_category: planForm.max_staff_per_category,
        max_athletes: planForm.max_athletes,
        trial_days: planForm.trial_days,
        video_enabled: planForm.video_enabled,
        gps_data_enabled: planForm.gps_data_enabled,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan créé");
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      setIsAddPlanOpen(false);
      resetPlanForm();
    },
  });

  // Update plan
  const updatePlan = useMutation({
    mutationFn: async () => {
      if (!editingPlan) return;
      const { error } = await supabase.from("subscription_plans").update({
        name: planForm.name,
        description: planForm.description || null,
        price_monthly: parseFloat(planForm.price_monthly) || null,
        price_yearly: parseFloat(planForm.price_yearly) || null,
        max_clubs: planForm.max_clubs,
        max_categories_per_club: planForm.max_categories_per_club,
        max_staff_users: planForm.max_staff_users,
        max_staff_per_category: planForm.max_staff_per_category,
        max_athletes: planForm.max_athletes,
        trial_days: planForm.trial_days,
        video_enabled: planForm.video_enabled,
        gps_data_enabled: planForm.gps_data_enabled,
      }).eq("id", editingPlan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan mis à jour");
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      setEditingPlan(null);
      resetPlanForm();
    },
  });

  const resetPlanForm = () => {
    setPlanForm({
      name: "",
      description: "",
      price_monthly: "",
      price_yearly: "",
      max_clubs: 1,
      max_categories_per_club: 3,
      max_staff_users: 5,
      max_staff_per_category: 5,
      max_athletes: 60,
      trial_days: 14,
      video_enabled: false,
      gps_data_enabled: false,
    });
  };

  const openEditPlan = (plan: any) => {
    setPlanForm({
      name: plan.name || "",
      description: plan.description || "",
      price_monthly: plan.price_monthly?.toString() || "",
      price_yearly: plan.price_yearly?.toString() || "",
      max_clubs: plan.max_clubs || 1,
      max_categories_per_club: plan.max_categories_per_club || 3,
      max_staff_users: plan.max_staff_users || 5,
      max_staff_per_category: plan.max_staff_per_category || 5,
      max_athletes: plan.max_athletes || 60,
      trial_days: plan.trial_days || 14,
      video_enabled: plan.video_enabled || false,
      gps_data_enabled: plan.gps_data_enabled || false,
    });
    setEditingPlan(plan);
  };
 
   // Create subscription
   const createSubscription = useMutation({
     mutationFn: async () => {
       const { error } = await supabase.from("client_subscriptions").insert({
         client_id: subForm.client_id,
         plan_id: subForm.plan_id || null,
         start_date: subForm.start_date,
         end_date: subForm.end_date || null,
         amount: parseFloat(subForm.amount) || null,
         payment_method: subForm.payment_method || null,
         notes: subForm.notes || null,
       });
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Abonnement créé");
       queryClient.invalidateQueries({ queryKey: ["client-subscriptions"] });
       setIsAddSubOpen(false);
     },
   });
 
   // Delete plan
   const deletePlan = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Plan supprimé");
       queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
     },
   });
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case "active":
         return <Badge className="bg-green-600">Actif</Badge>;
       case "pending":
         return <Badge className="bg-amber-500">En attente</Badge>;
       case "expired":
         return <Badge variant="destructive">Expiré</Badge>;
       case "cancelled":
         return <Badge variant="secondary">Annulé</Badge>;
       default:
         return <Badge variant="outline">{status}</Badge>;
     }
   };
 
   return (
     <div className="space-y-6">
       {/* Subscription Plans */}
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <div>
               <CardTitle className="flex items-center gap-2">
                 <CreditCard className="h-5 w-5" />
                 Plans d'abonnement
               </CardTitle>
               <CardDescription>Définissez les formules d'abonnement</CardDescription>
             </div>
             <Dialog open={isAddPlanOpen} onOpenChange={setIsAddPlanOpen}>
               <DialogTrigger asChild>
                 <Button size="sm">
                   <Plus className="h-4 w-4 mr-2" />
                   Nouveau plan
                 </Button>
               </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Créer un plan</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nom du plan *</Label>
                      <Input
                        value={planForm.name}
                        onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Prix mensuel (€)</Label>
                        <Input
                          type="number"
                          value={planForm.price_monthly}
                          onChange={(e) => setPlanForm({ ...planForm, price_monthly: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prix annuel (€)</Label>
                        <Input
                          type="number"
                          value={planForm.price_yearly}
                          onChange={(e) => setPlanForm({ ...planForm, price_yearly: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Clubs max</Label>
                        <Input
                          type="number"
                          value={planForm.max_clubs}
                          onChange={(e) => setPlanForm({ ...planForm, max_clubs: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Athlètes/catégorie</Label>
                        <Input
                          type="number"
                          value={planForm.max_athletes}
                          onChange={(e) => setPlanForm({ ...planForm, max_athletes: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Staff/catégorie</Label>
                        <Input
                          type="number"
                          value={planForm.max_staff_per_category}
                          onChange={(e) => setPlanForm({ ...planForm, max_staff_per_category: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Jours d'essai</Label>
                        <Input
                          type="number"
                          value={planForm.trial_days}
                          onChange={(e) => setPlanForm({ ...planForm, trial_days: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    {/* Options modules */}
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="font-medium">Modules inclus</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="video_enabled"
                          checked={planForm.video_enabled}
                          onCheckedChange={(checked) => setPlanForm({ ...planForm, video_enabled: !!checked })}
                        />
                        <Label htmlFor="video_enabled" className="cursor-pointer flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Analyse Vidéo
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="gps_enabled"
                          checked={planForm.gps_data_enabled}
                          onCheckedChange={(checked) => setPlanForm({ ...planForm, gps_data_enabled: !!checked })}
                        />
                        <Label htmlFor="gps_enabled" className="cursor-pointer flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Data GPS
                        </Label>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddPlanOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={() => createPlan.mutate()} disabled={!planForm.name}>
                      Créer
                    </Button>
                  </DialogFooter>
                </DialogContent>
             </Dialog>
           </div>
         </CardHeader>
         <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan: any) => (
                <Card key={plan.id} className="relative">
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditPlan(plan)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Supprimer ce plan ?")) deletePlan.mutate(plan.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">
                       {Number(plan.price_monthly) > 0
                         ? `${Number(plan.price_monthly)}€/mois`
                         : Number(plan.price_yearly) > 0
                         ? `${Number(plan.price_yearly)}€${plan.name?.toLowerCase().includes("comptant") ? " (comptant)" : "/an"}`
                         : "Gratuit"}
                     </div>
                     {Number(plan.price_monthly) > 0 && Number(plan.price_yearly) > 0 && (
                       <div className="text-sm text-muted-foreground">
                         ou {Number(plan.price_yearly)}€/an
                       </div>
                     )}
                    <div className="text-sm text-muted-foreground mt-2">
                      <p>{plan.max_clubs} clubs</p>
                      <p>{plan.max_athletes} athlètes/cat.</p>
                      <p>{plan.trial_days} jours d'essai</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {plan.video_enabled && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          Vidéo
                        </Badge>
                      )}
                      {plan.gps_data_enabled && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          GPS
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Edit Plan Dialog */}
            <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Modifier le plan</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom du plan *</Label>
                    <Input
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prix mensuel (€)</Label>
                      <Input
                        type="number"
                        value={planForm.price_monthly}
                        onChange={(e) => setPlanForm({ ...planForm, price_monthly: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Prix annuel (€)</Label>
                      <Input
                        type="number"
                        value={planForm.price_yearly}
                        onChange={(e) => setPlanForm({ ...planForm, price_yearly: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Clubs max</Label>
                      <Input
                        type="number"
                        value={planForm.max_clubs}
                        onChange={(e) => setPlanForm({ ...planForm, max_clubs: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Athlètes/catégorie</Label>
                      <Input
                        type="number"
                        value={planForm.max_athletes}
                        onChange={(e) => setPlanForm({ ...planForm, max_athletes: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Staff/catégorie</Label>
                      <Input
                        type="number"
                        value={planForm.max_staff_per_category}
                        onChange={(e) => setPlanForm({ ...planForm, max_staff_per_category: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Jours d'essai</Label>
                      <Input
                        type="number"
                        value={planForm.trial_days}
                        onChange={(e) => setPlanForm({ ...planForm, trial_days: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  {/* Options modules */}
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="font-medium">Modules inclus</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit_video_enabled"
                        checked={planForm.video_enabled}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, video_enabled: !!checked })}
                      />
                      <Label htmlFor="edit_video_enabled" className="cursor-pointer flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Analyse Vidéo
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit_gps_enabled"
                        checked={planForm.gps_data_enabled}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, gps_data_enabled: !!checked })}
                      />
                      <Label htmlFor="edit_gps_enabled" className="cursor-pointer flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Data GPS
                      </Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingPlan(null)}>
                    Annuler
                  </Button>
                  <Button onClick={() => updatePlan.mutate()} disabled={!planForm.name}>
                    Enregistrer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
         </CardContent>
       </Card>
 
       {/* Client Subscriptions */}
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <div>
               <CardTitle>Abonnements clients</CardTitle>
               <CardDescription>Suivi des abonnements actifs</CardDescription>
             </div>
             <Dialog open={isAddSubOpen} onOpenChange={setIsAddSubOpen}>
               <DialogTrigger asChild>
                 <Button size="sm">
                   <Plus className="h-4 w-4 mr-2" />
                   Nouvel abonnement
                 </Button>
               </DialogTrigger>
               <DialogContent>
                 <DialogHeader>
                   <DialogTitle>Créer un abonnement</DialogTitle>
                 </DialogHeader>
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <Label>Client *</Label>
                     <Select
                       value={subForm.client_id}
                       onValueChange={(v) => setSubForm({ ...subForm, client_id: v })}
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Sélectionner" />
                       </SelectTrigger>
                       <SelectContent>
                         {clients.map((c: any) => (
                           <SelectItem key={c.id} value={c.id}>
                             {c.name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label>Plan</Label>
                     <Select
                       value={subForm.plan_id}
                       onValueChange={(v) => setSubForm({ ...subForm, plan_id: v })}
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Sélectionner" />
                       </SelectTrigger>
                       <SelectContent>
                         {plans.map((p: any) => (
                           <SelectItem key={p.id} value={p.id}>
                             {p.name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Date début</Label>
                       <Input
                         type="date"
                         value={subForm.start_date}
                         onChange={(e) => setSubForm({ ...subForm, start_date: e.target.value })}
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Date fin</Label>
                       <Input
                         type="date"
                         value={subForm.end_date}
                         onChange={(e) => setSubForm({ ...subForm, end_date: e.target.value })}
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <Label>Montant (€)</Label>
                     <Input
                       type="number"
                       value={subForm.amount}
                       onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })}
                     />
                   </div>
                 </div>
                 <DialogFooter>
                   <Button variant="outline" onClick={() => setIsAddSubOpen(false)}>
                     Annuler
                   </Button>
                   <Button onClick={() => createSubscription.mutate()} disabled={!subForm.client_id}>
                     Créer
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
           </div>
         </CardHeader>
         <CardContent>
           {isLoading ? (
             <p className="text-muted-foreground">Chargement...</p>
           ) : subscriptions.length === 0 ? (
             <p className="text-muted-foreground text-center py-8">Aucun abonnement</p>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Client</TableHead>
                   <TableHead>Plan</TableHead>
                   <TableHead>Période</TableHead>
                   <TableHead>Montant</TableHead>
                   <TableHead>Statut</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {subscriptions.map((sub: any) => (
                   <TableRow key={sub.id}>
                     <TableCell className="font-medium">{sub.clients?.name}</TableCell>
                     <TableCell>{sub.subscription_plans?.name || "-"}</TableCell>
                     <TableCell>
                       {format(new Date(sub.start_date), "dd/MM/yyyy", { locale: fr })}
                       {sub.end_date && ` - ${format(new Date(sub.end_date), "dd/MM/yyyy", { locale: fr })}`}
                     </TableCell>
                     <TableCell>{sub.amount ? `${sub.amount}€` : "-"}</TableCell>
                     <TableCell>{getStatusBadge(sub.status)}</TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           )}
         </CardContent>
       </Card>
     </div>
   );
 }