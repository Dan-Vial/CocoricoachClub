import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Trash2, Crown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MembersSectionProps {
  clubId: string;
  canManage: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Coach",
  prepa_physique: "Prépa. Physique",
  doctor: "Médecin",
  administratif: "Administratif",
};

export function MembersSection({ clubId, canManage }: MembersSectionProps) {
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["club-members", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_members")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map((m: any) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        return data.map((member: any) => ({
          ...member,
          profile: profiles?.find((p) => p.id === member.user_id),
        }));
      }

      return data;
    },
  });

  const { data: club } = useQuery({
    queryKey: ["club-owner", clubId],
    queryFn: async () => {
      const { data: clubData, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", clubId)
        .single();
      if (error) throw error;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", clubData.user_id)
        .maybeSingle();

      return {
        ...clubData,
        profile: profileData,
      };
    },
  });

  const removeMember = useMutation({
    mutationFn: async (member: any) => {
      // Remove from all category_members for this club's categories
      const { data: categories } = await supabase
        .from("categories")
        .select("id")
        .eq("club_id", clubId);

      if (categories && categories.length > 0) {
        const categoryIds = categories.map((c) => c.id);
        await supabase
          .from("category_members")
          .delete()
          .eq("user_id", member.user_id)
          .in("category_id", categoryIds);
      }

      // Remove from club_members
      const { error } = await supabase
        .from("club_members")
        .delete()
        .eq("id", member.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-members", clubId] });
      queryClient.invalidateQueries({ queryKey: ["club-members-full", clubId] });
      toast.success("Membre retiré avec succès");
    },
    onError: () => {
      toast.error("Erreur lors du retrait du membre");
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ memberId, userId, newRole }: { memberId: string; userId: string; newRole: string }) => {
      // Update club_members role
      const { error } = await supabase
        .from("club_members")
        .update({ role: newRole as any })
        .eq("id", memberId);
      if (error) throw error;

      // Also update category_members role for all categories of this club
      const { data: categories } = await supabase
        .from("categories")
        .select("id")
        .eq("club_id", clubId);

      if (categories && categories.length > 0) {
        const categoryIds = categories.map((c) => c.id);
        await supabase
          .from("category_members")
          .update({ role: newRole as any })
          .eq("user_id", userId)
          .in("category_id", categoryIds);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-members", clubId] });
      toast.success("Rôle modifié avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la modification du rôle");
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const getRoleBadge = (role: string) => {
    const label = ROLE_LABELS[role] || role;
    const variant = role === "admin" ? "default" : "secondary";
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle>Membres du Club</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Membre depuis</TableHead>
              {canManage && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {club && (
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    {club.profile?.full_name || "Propriétaire"}
                  </div>
                </TableCell>
                <TableCell>{club.profile?.email}</TableCell>
                <TableCell>
                  <Badge variant="default">Propriétaire</Badge>
                </TableCell>
                <TableCell>—</TableCell>
                {canManage && <TableCell>—</TableCell>}
              </TableRow>
            )}
            {members && members.length > 0 ? (
              members.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.profile?.full_name || "Utilisateur"}
                  </TableCell>
                  <TableCell>{member.profile?.email}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) => updateRole.mutate({ memberId: member.id, userId: member.user_id, newRole: value })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              <Badge variant={value === "admin" ? "default" : "secondary"} className="text-xs">
                                {label}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      getRoleBadge(member.role)
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(member.created_at), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={removeMember.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member.profile?.full_name || "Ce membre"} sera retiré du club et de toutes les catégories associées. Vous pourrez ensuite inviter quelqu'un d'autre à sa place.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeMember.mutate(member)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Retirer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="text-center text-muted-foreground">
                  Aucun membre pour le moment
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
