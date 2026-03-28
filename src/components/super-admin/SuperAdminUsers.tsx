import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Users, Crown, Trash2, Phone, Building2 } from "lucide-react";
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
  phone: string | null;
  created_at: string | null;
  clubs: { id: string; name: string; sport: string }[];
  is_super_admin: boolean;
}

export function SuperAdminUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["super-admin-users"],
    queryFn: async () => {
      // Get all clubs with their owners
      const { data: clubs, error: clubsError } = await supabase
        .from("clubs")
        .select("id, name, sport, user_id")
        .order("name");
      if (clubsError) throw clubsError;

      // Get unique owner IDs
      const ownerIds = [...new Set((clubs || []).map(c => c.user_id))];
      if (ownerIds.length === 0) return [];

      // Get profiles for owners
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", ownerIds);

      // Get super admin status
      const { data: superAdmins } = await supabase
        .from("super_admin_users")
        .select("user_id");
      const superAdminIds = new Set((superAdmins || []).map(sa => sa.user_id));

      // Group clubs by owner
      const ownerClubs = new Map<string, any[]>();
      (clubs || []).forEach(club => {
        if (!ownerClubs.has(club.user_id)) ownerClubs.set(club.user_id, []);
        ownerClubs.get(club.user_id)!.push({ id: club.id, name: club.name, sport: club.sport });
      });

      return ownerIds.map(userId => {
        const profile = (profiles || []).find(p => p.id === userId);
        return {
          id: userId,
          email: profile?.email || null,
          full_name: profile?.full_name || null,
          phone: profile?.phone || null,
          created_at: null,
          clubs: ownerClubs.get(userId) || [],
          is_super_admin: superAdminIds.has(userId),
        } as AdminUser;
      });
    },
  });

  // Delete user via edge function
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Administrateurs des clubs
        </CardTitle>
        <CardDescription>
          Propriétaires de clubs (les admins gèrent eux-mêmes leur staff dans leur Admin Club)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Clubs</TableHead>
                <TableHead>Rôle</TableHead>
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
                    {u.phone ? (
                      <a href={`tel:${u.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                        <Phone className="h-3 w-3" />
                        {u.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.clubs.map((club) => (
                        <Badge key={club.id} variant="outline" className="text-xs">
                          <Building2 className="h-3 w-3 mr-1" />
                          {club.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.is_super_admin ? (
                      <Badge className="bg-primary">
                        <Crown className="h-3 w-3 mr-1" />
                        Super Admin
                      </Badge>
                    ) : (
                      <Badge className="bg-green-600">Admin Club</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
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
                              Cette action supprimera <strong>{u.full_name || u.email}</strong> de la plateforme. Cette action est irréversible.
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
