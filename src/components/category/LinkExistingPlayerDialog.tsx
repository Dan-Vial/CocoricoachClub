import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, UserPlus, Loader2, Link2, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LinkExistingPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

export function LinkExistingPlayerDialog({
  open,
  onOpenChange,
  categoryId,
}: LinkExistingPlayerDialogProps) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  // Fetch category info to get club_id
  const { data: category } = useQuery({
    queryKey: ["category-for-link", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, club_id")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch existing players in this category to exclude them
  const { data: existingPlayerIds = [] } = useQuery({
    queryKey: ["existing-players-ids", categoryId],
    queryFn: async () => {
      const { data: directPlayers } = await supabase
        .from("players")
        .select("id")
        .eq("category_id", categoryId);

      const { data: linkedPlayers } = await supabase
        .from("player_categories")
        .select("player_id")
        .eq("category_id", categoryId)
        .eq("status", "accepted");

      const ids = new Set<string>();
      directPlayers?.forEach(p => ids.add(p.id));
      linkedPlayers?.forEach(p => ids.add(p.player_id));
      return Array.from(ids);
    },
    enabled: open,
  });

  // Search players from all clubs/categories
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["search-players-to-link", search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const { data, error } = await supabase
        .from("players")
        .select(`
          id, name, first_name, category_id, position, avatar_url, user_id,
          categories!inner(name, clubs!inner(name))
        `)
        .or(`name.ilike.%${search}%,first_name.ilike.%${search}%`)
        .limit(20);
      if (error) throw error;
      return (data || []).filter(p => !existingPlayerIds.includes(p.id));
    },
    enabled: open && search.length >= 2,
  });

  const linkPlayer = useMutation({
    mutationFn: async ({ playerId, hasAccount }: { playerId: string; hasAccount: boolean }) => {
      if (!category) throw new Error("Catégorie non trouvée");

      const { error } = await supabase
        .from("player_categories")
        .insert({
          player_id: playerId,
          category_id: categoryId,
          club_id: category.club_id,
          is_primary: false,
          status: hasAccount ? "pending" : "accepted",
        });

      if (error) throw error;
      return hasAccount;
    },
    onSuccess: (hasAccount) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["existing-players-ids", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["search-players-to-link"] });
      toast.success(
        hasAccount
          ? "Demande envoyée — l'athlète doit accepter"
          : "Joueur rattaché à cette catégorie"
      );
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Ce joueur est déjà dans cette catégorie");
      } else {
        toast.error("Erreur lors du rattachement");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Rattacher un joueur existant
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Rechercher un joueur déjà inscrit dans une autre catégorie ou un autre club pour le rattacher ici.
            Il conservera son profil unique et sa charge sera visible globalement.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou prénom (min. 2 caractères)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="max-h-[350px]">
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isSearching && search.length >= 2 && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun joueur trouvé
              </p>
            )}

            {search.length < 2 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Tape au moins 2 caractères pour rechercher
              </p>
            )}

            <div className="space-y-1">
              {searchResults.map((player) => {
                const catName = (player.categories as any)?.name || "";
                const clubName = (player.categories as any)?.clubs?.name || "";
                const displayName = player.first_name
                  ? `${player.first_name} ${player.name}`
                  : player.name;

                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{displayName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {catName}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{clubName}</span>
                        {player.user_id && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-primary border-primary/30">
                            Compte actif
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => linkPlayer.mutate({ playerId: player.id, hasAccount: !!player.user_id })}
                      disabled={linkPlayer.isPending}
                      className="gap-1.5"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Rattacher
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
