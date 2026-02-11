import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Users, CheckCircle2, XCircle, Clock, Crown, Gift, UserX, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  clubs_owned: number;
  is_super_admin: boolean;
  is_approved?: boolean;
  is_free_user?: boolean;
}

export function SuperAdminUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["super-admin-users"],
    queryFn: async () => {
      const { data: usersData, error } = await supabase
        .from("admin_all_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: approvedData } = await supabase
        .from("approved_users")
        .select("user_id, is_free_user");

      const approvedMap = new Map(approvedData?.map((a) => [a.user_id, a.is_free_user]) || []);

      return (usersData as AdminUser[]).map((u) => ({
        ...u,
        is_approved: approvedMap.has(u.id) || u.is_super_admin,
        is_free_user: approvedMap.get(u.id) === true,
      }));
    },
  });

  // Approve user
  const approveUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("approved_users")
        .insert({ user_id: userId, approved_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Utilisateur approuvé");
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
    },
  });

  // Revoke approval
  const revokeApproval = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("approved_users")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Accès révoqué");
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
    },
  });

  // Toggle free user
  const toggleFreeUser = useMutation({
    mutationFn: async ({ userId, isFreeUser }: { userId: string; isFreeUser: boolean }) => {
      const { data: existing } = await supabase
        .from("approved_users")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("approved_users")
          .update({ is_free_user: isFreeUser })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("approved_users")
          .insert({
            user_id: userId,
            approved_by: user?.id,
            is_free_user: isFreeUser,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.isFreeUser ? "Utilisateur marqué gratuit" : "Statut gratuit retiré"
      );
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
    },
  });

  // Delete user - removes all related data
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // Remove from approved_users
      await supabase.from("approved_users").delete().eq("user_id", userId);
      // Remove from super_admin_users
      await supabase.from("super_admin_users").delete().eq("user_id", userId);
      // Remove from club_members
      await supabase.from("club_members").delete().eq("user_id", userId);
      // Remove from category_members
      await supabase.from("category_members").delete().eq("user_id", userId);
      // Remove profile
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Utilisateur supprimé");
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const pendingCount = users.filter((u) => !u.is_approved && !u.is_super_admin).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestion des utilisateurs
          {pendingCount > 0 && (
            <Badge variant="destructive">{pendingCount} en attente</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Gérez les accès et les rôles des utilisateurs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead>Clubs</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.full_name || "Non renseigné"}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {u.created_at
                      ? format(new Date(u.created_at), "dd MMM yyyy", { locale: fr })
                      : "-"}
                  </TableCell>
                  <TableCell>{u.clubs_owned}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.is_super_admin && (
                        <Badge className="bg-primary">
                          <Crown className="h-3 w-3 mr-1" />
                          Super Admin
                        </Badge>
                      )}
                      {u.is_free_user && (
                        <Badge className="bg-purple-600">
                          <Gift className="h-3 w-3 mr-1" />
                          Gratuit
                        </Badge>
                      )}
                      {!u.is_super_admin && !u.is_free_user && u.is_approved && (
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approuvé
                        </Badge>
                      )}
                      {!u.is_approved && !u.is_super_admin && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          <Clock className="h-3 w-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {!u.is_approved && !u.is_super_admin && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => approveUser.mutate(u.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                      )}
                      {u.is_approved && !u.is_super_admin && (
                        <>
                          <Button
                            variant={u.is_free_user ? "destructive" : "outline"}
                            size="sm"
                            onClick={() =>
                              toggleFreeUser.mutate({
                                userId: u.id,
                                isFreeUser: !u.is_free_user,
                              })
                            }
                          >
                            <Gift className="h-4 w-4 mr-1" />
                            {u.is_free_user ? "Retirer gratuit" : "Gratuit"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeApproval.mutate(u.id)}
                          >
                            <UserX className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {!u.is_super_admin && u.id !== user?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action supprimera le profil de {u.full_name || u.email} et tous ses accès. Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteUser.mutate(u.id)}
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}