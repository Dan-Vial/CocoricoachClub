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
 import { Calendar } from "@/components/ui/calendar";
 import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
 import { toast } from "@/components/ui/sonner";
 import { CreditCard, Plus, CalendarIcon, TrendingUp, AlertCircle } from "lucide-react";
 import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
 import { fr } from "date-fns/locale";
 
 export function SuperAdminPayments() {
   const queryClient = useQueryClient();
   const [isAddOpen, setIsAddOpen] = useState(false);
   const [selectedMonth, setSelectedMonth] = useState(new Date());
   const [form, setForm] = useState({
     client_id: "",
     amount: "",
     payment_date: new Date().toISOString().split("T")[0],
     payment_method: "",
     status: "completed",
     invoice_number: "",
     notes: "",
   });
 
   // Fetch payments
   const { data: payments = [], isLoading } = useQuery({
     queryKey: ["payment-history"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("payment_history")
         .select("*, clients(name)")
         .order("payment_date", { ascending: false });
       if (error) throw error;
       return data;
     },
   });
 
   // Fetch clients
   const { data: clients = [] } = useQuery({
     queryKey: ["clients-for-payment"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("clients")
         .select("id, name")
         .order("name");
       if (error) throw error;
       return data;
     },
   });
 
   // Create payment
   const createPayment = useMutation({
     mutationFn: async () => {
       const { error } = await supabase.from("payment_history").insert({
         client_id: form.client_id,
         amount: parseFloat(form.amount),
         payment_date: form.payment_date,
         payment_method: form.payment_method || null,
         status: form.status,
         invoice_number: form.invoice_number || null,
         notes: form.notes || null,
       });
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Paiement enregistré");
       queryClient.invalidateQueries({ queryKey: ["payment-history"] });
       setIsAddOpen(false);
       setForm({
         client_id: "",
         amount: "",
         payment_date: new Date().toISOString().split("T")[0],
         payment_method: "",
         status: "completed",
         invoice_number: "",
         notes: "",
       });
     },
   });
 
   // Calculate monthly stats
   const thisMonthPayments = payments.filter((p: any) => {
     const date = new Date(p.payment_date);
     return date >= startOfMonth(selectedMonth) && date <= endOfMonth(selectedMonth);
   });
 
   const totalThisMonth = thisMonthPayments
     .filter((p: any) => p.status === "completed")
     .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
 
   const pendingThisMonth = thisMonthPayments
     .filter((p: any) => p.status === "pending")
     .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
 
   const failedThisMonth = thisMonthPayments.filter((p: any) => p.status === "failed").length;
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case "completed":
         return <Badge className="bg-green-600">Payé</Badge>;
       case "pending":
         return <Badge className="bg-amber-500">En attente</Badge>;
       case "failed":
         return <Badge variant="destructive">Échoué</Badge>;
       case "refunded":
         return <Badge variant="secondary">Remboursé</Badge>;
       default:
         return <Badge variant="outline">{status}</Badge>;
     }
   };
 
   return (
     <div className="space-y-6">
       {/* Monthly Stats */}
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
           <Popover>
             <PopoverTrigger asChild>
               <Button variant="outline" className="gap-2">
                 <CalendarIcon className="h-4 w-4" />
                 {format(selectedMonth, "MMMM yyyy", { locale: fr })}
               </Button>
             </PopoverTrigger>
             <PopoverContent className="w-auto p-0" align="start">
               <Calendar
                 mode="single"
                 selected={selectedMonth}
                 onSelect={(date) => date && setSelectedMonth(date)}
                 initialFocus
               />
             </PopoverContent>
           </Popover>
         </div>
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium flex items-center gap-2">
               <TrendingUp className="h-4 w-4 text-green-600" />
               Revenus du mois
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-green-600">{totalThisMonth.toFixed(2)} €</div>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium flex items-center gap-2">
               <CreditCard className="h-4 w-4 text-amber-600" />
               En attente
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-amber-600">{pendingThisMonth.toFixed(2)} €</div>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium flex items-center gap-2">
               <AlertCircle className="h-4 w-4 text-destructive" />
               Échecs
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-destructive">{failedThisMonth}</div>
           </CardContent>
         </Card>
       </div>
 
       {/* Payments Table */}
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <div>
               <CardTitle className="flex items-center gap-2">
                 <CreditCard className="h-5 w-5" />
                 Historique des paiements
               </CardTitle>
               <CardDescription>Suivi manuel des paiements clients</CardDescription>
             </div>
             <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
               <DialogTrigger asChild>
                 <Button>
                   <Plus className="h-4 w-4 mr-2" />
                   Enregistrer un paiement
                 </Button>
               </DialogTrigger>
               <DialogContent>
                 <DialogHeader>
                   <DialogTitle>Nouveau paiement</DialogTitle>
                 </DialogHeader>
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <Label>Client *</Label>
                     <Select
                       value={form.client_id}
                       onValueChange={(v) => setForm({ ...form, client_id: v })}
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
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Montant (€) *</Label>
                       <Input
                         type="number"
                         value={form.amount}
                         onChange={(e) => setForm({ ...form, amount: e.target.value })}
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Date</Label>
                       <Input
                         type="date"
                         value={form.payment_date}
                         onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                       />
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Méthode</Label>
                       <Select
                         value={form.payment_method}
                         onValueChange={(v) => setForm({ ...form, payment_method: v })}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Sélectionner" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="virement">Virement</SelectItem>
                           <SelectItem value="carte">Carte bancaire</SelectItem>
                           <SelectItem value="cheque">Chèque</SelectItem>
                           <SelectItem value="especes">Espèces</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     <div className="space-y-2">
                       <Label>Statut</Label>
                       <Select
                         value={form.status}
                         onValueChange={(v) => setForm({ ...form, status: v })}
                       >
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="completed">Payé</SelectItem>
                           <SelectItem value="pending">En attente</SelectItem>
                           <SelectItem value="failed">Échoué</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                   <div className="space-y-2">
                     <Label>N° Facture</Label>
                     <Input
                       value={form.invoice_number}
                       onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                     />
                   </div>
                 </div>
                 <DialogFooter>
                   <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                     Annuler
                   </Button>
                   <Button
                     onClick={() => createPayment.mutate()}
                     disabled={!form.client_id || !form.amount}
                   >
                     Enregistrer
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
           </div>
         </CardHeader>
         <CardContent>
           {isLoading ? (
             <p className="text-muted-foreground">Chargement...</p>
           ) : payments.length === 0 ? (
             <p className="text-muted-foreground text-center py-8">Aucun paiement enregistré</p>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Client</TableHead>
                   <TableHead>Montant</TableHead>
                   <TableHead>Date</TableHead>
                   <TableHead>Méthode</TableHead>
                   <TableHead>N° Facture</TableHead>
                   <TableHead>Statut</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {payments.map((payment: any) => (
                   <TableRow key={payment.id}>
                     <TableCell className="font-medium">{payment.clients?.name}</TableCell>
                     <TableCell>{payment.amount} €</TableCell>
                     <TableCell>
                       {format(new Date(payment.payment_date), "dd MMM yyyy", { locale: fr })}
                     </TableCell>
                     <TableCell>{payment.payment_method || "-"}</TableCell>
                     <TableCell>{payment.invoice_number || "-"}</TableCell>
                     <TableCell>{getStatusBadge(payment.status)}</TableCell>
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