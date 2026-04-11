import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Check, RefreshCw, Mail, Edit2, X, UserCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useResendInvitation, getInvitationStatus } from "@/hooks/useResendInvitation";

interface AthleteAccessSectionProps {
  playerId: string;
  categoryId: string;
  playerName: string;
}

export function AthleteAccessSection({ playerId, categoryId, playerName }: AthleteAccessSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const resendMutation = useResendInvitation();

  // Fetch player email and user_id
  const { data: player } = useQuery({
    queryKey: ["player-email", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("email, user_id")
        .eq("id", playerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });

  // Fetch category to get club_id
  const { data: category } = useQuery({
    queryKey: ["category-club", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("club_id")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });

  // Fetch athlete invitation
  const { data: invitation, refetch: refetchInvitation } = useQuery({
    queryKey: ["athlete-invitation", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_invitations")
        .select("id, token, status, email, expires_at, category_id, club_id")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId && !player?.user_id,
  });

  // Create invitation link
  const createInvitation = useMutation({
    mutationFn: async () => {
      if (!player?.email) throw new Error("L'athlète doit avoir un email renseigné");
      if (!category?.club_id) throw new Error("Club introuvable");
      const { error } = await supabase.from("athlete_invitations").insert({
        player_id: playerId,
        category_id: categoryId,
        club_id: category.club_id,
        email: player.email,
        invited_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchInvitation();
      toast.success("Lien d'activation généré");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la génération du lien");
    },
  });

  const updateEmail = useMutation({
    mutationFn: async (newEmail: string) => {
      const { error } = await supabase
        .from("players")
        .update({ email: newEmail || null })
        .eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-email", playerId] });
      queryClient.invalidateQueries({ queryKey: ["player", playerId] });
      toast.success("Email mis à jour");
      setIsEditingEmail(false);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour de l'email");
    },
  });

  const playerIsConnected = !!player?.user_id;

  const invStatus = invitation ? getInvitationStatus(invitation.status, invitation.expires_at) : null;
  const invitationLink = invitation?.token
    ? `${window.location.origin}/accept-athlete-invitation?token=${invitation.token}`
    : null;

  const copyInvitationLink = () => {
    if (!invitationLink) return;
    navigator.clipboard.writeText(invitationLink);
    setCopied(true);
    toast.success("Lien d'activation copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEditEmail = () => {
    setEmailValue(player?.email || "");
    setIsEditingEmail(true);
  };

  const handleSaveEmail = () => {
    updateEmail.mutate(emailValue.trim());
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Link2 className="h-4 w-4" />
          Accès Athlète
        </CardTitle>
        <CardDescription className="text-xs">
          Lien d'activation pour que {playerName} accède à son espace athlète
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-3 pt-0">

        {/* Email Section */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email de l'athlète
          </Label>
          {isEditingEmail ? (
            <div className="flex gap-2">
              <Input
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="athlete@email.com"
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSaveEmail}
                disabled={updateEmail.isPending}
              >
                <Check className="h-4 w-4 text-primary" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditingEmail(false)}
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {player?.email ? (
                <span className="text-sm">{player.email}</span>
              ) : (
                <span className="text-sm text-muted-foreground italic">Non renseigné</span>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={handleStartEditEmail}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Connected state */}
        {playerIsConnected ? (
          <div className="p-4 rounded-lg bg-accent border border-border space-y-1">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              Compte activé — accès à l'espace athlète
            </p>
            <p className="text-xs text-muted-foreground">
              {playerName} peut se connecter sur l'application avec son email et accéder à son espace athlète.
            </p>
          </div>
        ) : (
          /* Invitation link section */
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Lien d'activation du compte
            </Label>

            {!player?.email && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted border border-border">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Renseignez d'abord l'email de l'athlète pour générer le lien d'activation.
                </p>
              </div>
            )}

            {invitationLink && invStatus === "pending" ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Partagez ce lien avec {playerName}. En cliquant dessus, il·elle créera son compte et accédera directement à son espace athlète.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={invitationLink}
                      readOnly
                      className="text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      onClick={copyInvitationLink}
                      className="shrink-0"
                    >
                      {copied ? (
                        <><Check className="h-4 w-4 mr-1" />Copié</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1" />Copier</>
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">⏳ En attente d'activation</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resendMutation.mutate({
                        tableName: "athlete_invitations",
                        invitationId: invitation!.id,
                        invitationType: "athlete" as any,
                        invalidateKeys: [["athlete-invitation", playerId]],
                      })}
                      disabled={resendMutation.isPending}
                    >
                      <Mail className={`h-4 w-4 mr-1 ${resendMutation.isPending ? "animate-spin" : ""}`} />
                      Renvoyer l'email
                    </Button>
                  </div>
                </div>
              </div>
            ) : invStatus === "expired" ? (
              <div className="p-3 rounded-lg border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">⏰ Lien expiré</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resendMutation.mutate({
                    tableName: "athlete_invitations",
                    invitationId: invitation!.id,
                    invitationType: "athlete" as any,
                    invalidateKeys: [["athlete-invitation", playerId]],
                  })}
                  disabled={resendMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${resendMutation.isPending ? "animate-spin" : ""}`} />
                  Générer un nouveau lien
                </Button>
              </div>
            ) : player?.email ? (
              <div className="p-3 rounded-lg border border-border space-y-2">
                <p className="text-xs text-muted-foreground">
                  Générez le lien d'activation pour que {playerName} puisse créer son compte.
                </p>
                <Button
                  size="sm"
                  onClick={() => createInvitation.mutate()}
                  disabled={createInvitation.isPending}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Générer le lien d'activation
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
