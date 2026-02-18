import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Check, Trash2, RefreshCw, ExternalLink, Mail, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AthleteAccessSectionProps {
  playerId: string;
  categoryId: string;
  playerName: string;
}

export function AthleteAccessSection({ playerId, categoryId, playerName }: AthleteAccessSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailValue, setEmailValue] = useState("");

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
  });

  // Fetch athlete invitation link (only if player not yet connected)
  const { data: invitation } = useQuery({
    queryKey: ["athlete-invitation", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_invitations")
        .select("token, status, email")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !player?.user_id, // Only fetch if player has no linked account
  });

  const playerIsConnected = !!player?.user_id;

  const queryKey = ["athlete-access-tokens", playerId];

  const { data: tokens, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_access_tokens")
        .select("*")
        .eq("player_id", playerId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createToken = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("athlete_access_tokens").insert({
        player_id: playerId,
        category_id: categoryId,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Lien d'accès athlète créé");
    },
    onError: () => {
      toast.error("Erreur lors de la création du lien");
    },
  });

  const deleteToken = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from("athlete_access_tokens")
        .update({ is_active: false })
        .eq("id", tokenId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Lien supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
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

  const copyLink = (token: string, tokenId: string) => {
    const safeToken = encodeURIComponent(token);
    const url = `${window.location.origin}/athlete-portal?token=${safeToken}`;
    navigator.clipboard.writeText(url);
    setCopiedId(tokenId);
    toast.success("Lien copié dans le presse-papier");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartEditEmail = () => {
    setEmailValue(player?.email || "");
    setIsEditingEmail(true);
  };

  const handleSaveEmail = () => {
    updateEmail.mutate(emailValue.trim());
  };

  const activeToken = tokens?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Accès Athlète
        </CardTitle>
        <CardDescription>
          Générez un lien pour que {playerName} puisse saisir ses propres données (RPE, statistiques de match)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        {/* Invitation Link Section - hidden when player is connected */}
        {!playerIsConnected && invitation?.token && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Lien d'inscription
            </Label>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
              <p className="text-xs text-muted-foreground">
                Partagez ce lien pour que l'athlète crée son compte et accède à l'application.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}/accept-athlete-invitation?token=${invitation.token}`}
                  readOnly
                  className="text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/accept-athlete-invitation?token=${invitation.token}`);
                    toast.success("Lien d'inscription copié !");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Badge variant="secondary" className="text-xs">
                {invitation.status === "accepted" ? "Acceptée" : "En attente"}
              </Badge>
            </div>
          </div>
        )}

        {playerIsConnected && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
              <Check className="h-4 w-4" />
              Athlète connecté à l'application
            </p>
          </div>
        )}

        {/* Token Section */}
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Chargement...</p>
        ) : activeToken ? (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3" />
                  Lien actif
                </Badge>
                {activeToken.last_used_at && (
                  <span className="text-xs text-muted-foreground">
                    Dernier accès: {format(new Date(activeToken.last_used_at), "d MMM à HH:mm", { locale: fr })}
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1 gap-2"
                  onClick={() => copyLink(activeToken.token, activeToken.id)}
                >
                  {copiedId === activeToken.id ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copier le lien
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`${window.location.origin}/athlete-portal?token=${encodeURIComponent(activeToken.token)}`, "_blank")}
                  title="Tester le lien"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteToken.mutate(activeToken.id)}
                  title="Révoquer le lien"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Envoyez ce lien à l'athlète. Il pourra saisir ses RPE et statistiques de match directement.
            </p>
          </div>
        ) : (
          <div className="text-center py-4 space-y-4">
            <p className="text-muted-foreground text-sm">
              Aucun lien d'accès actif pour cet athlète
            </p>
            <Button onClick={() => createToken.mutate()} disabled={createToken.isPending}>
              <Link2 className="h-4 w-4 mr-2" />
              Générer un lien d'accès
            </Button>
          </div>
        )}

        {activeToken && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => {
              deleteToken.mutate(activeToken.id);
              setTimeout(() => createToken.mutate(), 500);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Régénérer un nouveau lien
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
