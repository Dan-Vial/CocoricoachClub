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
import { Trash2, Copy, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useResendInvitation, getInvitationStatus } from "@/hooks/useResendInvitation";

interface InvitationsSectionProps {
  clubId: string;
  canManage: boolean;
}

export function InvitationsSection({ clubId, canManage }: InvitationsSectionProps) {
  const queryClient = useQueryClient();
  const resendMutation = useResendInvitation();

  const { data: club } = useQuery({
    queryKey: ["club-name-for-resend", clubId],
    queryFn: async () => {
      const { data } = await supabase.from("clubs").select("name").eq("id", clubId).single();
      return data;
    },
  });

  const { data: invitations, isLoading } = useQuery({
    queryKey: ["club-invitations", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_invitations")
        .select("*")
        .eq("club_id", clubId)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[InvitationsSection] Error:", error);
        throw error;
      }
      return data;
    },
  });

  const deleteInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await (supabase as any)
        .from("club_invitations")
        .delete()
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-invitations", clubId] });
      toast.success("Invitation annulée");
    },
    onError: () => {
      toast.error("Erreur lors de l'annulation de l'invitation");
    },
  });

  const copyInvitationLink = async (invitation: any) => {
    try {
      if (invitation.role === "viewer") {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("Non authentifié");

        const { data, error } = await supabase
          .from("public_access_tokens")
          .insert({
            club_id: clubId,
            category_id: null,
            created_by: userId,
            label: invitation.email ? `Invitation viewer: ${invitation.email}` : null,
            access_type: "viewer",
          })
          .select("token")
          .single();

        if (error) throw error;

        const link = `${window.location.origin}/public-view?token=${data.token}`;
        await navigator.clipboard.writeText(link);
        toast.success("Lien viewer (sans compte) copié");
        return;
      }

      const link = `${window.location.origin}/accept-invitation?token=${invitation.token}`;
      await navigator.clipboard.writeText(link);
      toast.success("Lien d'invitation copié");
    } catch (e) {
      toast.error("Erreur lors de la copie du lien");
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      admin: { label: "Admin", variant: "default" },
      coach: { label: "Coach", variant: "secondary" },
      prepa_physique: { label: "Prépa. Physique", variant: "secondary" },
      doctor: { label: "Médecin", variant: "secondary" },
      administratif: { label: "Administratif", variant: "secondary" },
      viewer: { label: "Viewer", variant: "outline" },
    };
    const config = variants[role] || variants.viewer;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string, expiresAt?: string | null) => {
    const effectiveStatus = getInvitationStatus(status, expiresAt);
    switch (effectiveStatus) {
      case "accepted":
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Activé</Badge>;
      case "expired":
        return <Badge variant="outline" className="text-destructive border-destructive">Expiré</Badge>;
      default:
        return <Badge variant="outline" className="text-amber-600 border-amber-600">En attente</Badge>;
    }
  };

  if (!canManage && (!invitations || invitations.length === 0)) {
    return null;
  }

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle>Invitations</CardTitle>
      </CardHeader>
      <CardContent>
        {invitations && invitations.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Envoyée le</TableHead>
                <TableHead>Statut</TableHead>
                {canManage && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation: any) => {
                const effectiveStatus = getInvitationStatus(invitation.status, invitation.expires_at);
                return (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                    <TableCell>
                      {format(new Date(invitation.created_at), "dd MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invitation.status, invitation.expires_at)}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1">
                          {effectiveStatus === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Copier le lien d'invitation"
                              onClick={() => copyInvitationLink(invitation)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {effectiveStatus !== "accepted" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title={effectiveStatus === "expired" ? "Renvoyer (nouveau lien)" : "Renvoyer l'email"}
                              onClick={() => resendMutation.mutate({
                                tableName: "club_invitations",
                                invitationId: invitation.id,
                                invitationType: "collaborator",
                                clubName: club?.name,
                                role: invitation.role,
                                invalidateKeys: [["club-invitations", clubId]],
                              })}
                              disabled={resendMutation.isPending}
                            >
                              <RefreshCw className={`h-4 w-4 ${resendMutation.isPending ? "animate-spin" : ""}`} />
                            </Button>
                          )}
                          {effectiveStatus !== "accepted" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Annuler l'invitation"
                              onClick={() => deleteInvitation.mutate(invitation.id)}
                              disabled={deleteInvitation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Aucune invitation en attente
          </p>
        )}
      </CardContent>
    </Card>
  );
}
