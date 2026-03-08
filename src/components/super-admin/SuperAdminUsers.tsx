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

      // Fetch staff members (club_members + category_members) - they are auto-approved via invitation
      const { data: clubMembers } = await supabase
        .from("club_members")
        .select("user_id");
      const { data: categoryMembers } = await supabase
        .from("category_members")
        .select("user_id");

      const approvedMap = new Map(approvedData?.map((a) => [a.user_id, a.is_free_user]) || []);
      const staffUserIds = new Set([
        ...(clubMembers?.map(m => m.user_id) || []),
        ...(categoryMembers?.map(m => m.user_id) || []),
      ]);

      return (usersData as AdminUser[]).map((u) => ({
        ...u,
        is_approved: approvedMap.has(u.id) || u.is_super_admin || staffUserIds.has(u.id),
        is_free_user: approvedMap.get(u.id) === true,
        is_staff: staffUserIds.has(u.id) && !approvedMap.has(u.id) && !u.is_super_admin,
      }));
    },
  });

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

  // Delete user via edge function (actually removes the user from auth)
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const response = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
    },
    onSuccess: () => {
      toast.success("Utilisateur supprimé définitivement");
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la suppression");
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
                              <AlertDialogTitle>Supprimer définitivement cet utilisateur ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action supprimera <strong>{u.full_name || u.email}</strong> de la plateforme (compte, profil, accès). Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteUser.mutate(u.id)}
                              >
                                Supprimer définitivement
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
