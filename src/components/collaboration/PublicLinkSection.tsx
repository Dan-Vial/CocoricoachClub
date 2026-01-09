import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Link2, Trash2, Plus, Eye, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PublicLinkSectionProps {
  clubId?: string;
  categoryId?: string;
}

export function PublicLinkSection({ clubId, categoryId }: PublicLinkSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [deleteTokenId, setDeleteTokenId] = useState<string | null>(null);

  const queryKey = ["public-access-tokens", clubId, categoryId];

  const { data: tokens, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from("public_access_tokens")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (clubId) {
        query = query.eq("club_id", clubId);
      }
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!clubId || !!categoryId,
  });

  const createToken = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("public_access_tokens").insert({
        club_id: clubId || null,
        category_id: categoryId || null,
        created_by: user?.id,
        label: newLabel || null,
        access_type: "viewer",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Lien de consultation créé");
      setNewLabel("");
      setIsCreateOpen(false);
    },
    onError: () => {
      toast.error("Erreur lors de la création du lien");
    },
  });

  const deleteToken = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from("public_access_tokens")
        .update({ is_active: false })
        .eq("id", tokenId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Lien désactivé");
      setDeleteTokenId(null);
    },
    onError: () => {
      toast.error("Erreur lors de la désactivation");
    },
  });

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/public-view?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien copié dans le presse-papiers");
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Liens de consultation
              </CardTitle>
              <CardDescription>
                Créez des liens pour permettre l'accès en lecture seule sans compte
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nouveau lien
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tokens && tokens.length > 0 ? (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {token.label || "Lien de consultation"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Créé le {format(new Date(token.created_at), "d MMM yyyy", { locale: fr })}
                        {token.last_used_at && (
                          <span>
                            • Utilisé le {format(new Date(token.last_used_at), "d MMM", { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Viewer</Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyLink(token.token)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTokenId(token.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun lien de consultation créé</p>
              <p className="text-sm">
                Créez un lien pour permettre l'accès sans inscription
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un lien de consultation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom du lien (optionnel)</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Lien pour les parents"
              />
            </div>
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="text-muted-foreground">
                Ce lien permettra à quiconque de consulter les données sans créer de compte.
                L'accès sera en lecture seule.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => createToken.mutate()} disabled={createToken.isPending}>
              {createToken.isPending ? "Création..." : "Créer le lien"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTokenId} onOpenChange={() => setDeleteTokenId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver ce lien ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les personnes utilisant ce lien ne pourront plus accéder aux données.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTokenId && deleteToken.mutate(deleteTokenId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
