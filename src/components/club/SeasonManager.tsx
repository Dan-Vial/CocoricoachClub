import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  Plus,
  CheckCircle,
  Circle,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";

interface SeasonManagerProps {
  clubId: string;
  categories: any[];
}

export function SeasonManager({ clubId, categories }: SeasonManagerProps) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [rolloverSeasonId, setRolloverSeasonId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const { data: seasons = [], isLoading } = useQuery({
    queryKey: ["seasons", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("club_id", clubId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get player counts per season
  const { data: seasonPlayerCounts = {} } = useQuery({
    queryKey: ["season-player-counts", clubId, seasons.map((s: any) => s.id)],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const season of seasons) {
        const { count } = await supabase
          .from("players")
          .select("*", { count: "exact", head: true })
          .eq("season_id", season.id);
        counts[season.id] = count || 0;
      }
      // Also count players without a season
      const { count: noSeasonCount } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .in("category_id", categories.map((c: any) => c.id))
        .is("season_id", null);
      counts["none"] = noSeasonCount || 0;
      return counts;
    },
    enabled: seasons.length > 0 && categories.length > 0,
  });

  const createSeason = useMutation({
    mutationFn: async () => {
      if (!newName || !startDate || !endDate) throw new Error("Champs requis");
      if (endDate < startDate) throw new Error("La date de fin doit être postérieure à la date de début");
      const { error } = await supabase.from("seasons").insert({
        club_id: clubId,
        name: newName,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        is_active: seasons.length === 0, // First season is active by default
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons", clubId] });
      toast.success("Saison créée");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const activateSeason = useMutation({
    mutationFn: async (seasonId: string) => {
      // The trigger will deactivate others
      const { error } = await supabase
        .from("seasons")
        .update({ is_active: true })
        .eq("id", seasonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons", clubId] });
      toast.success("Saison activée");
    },
  });

  const deleteSeason = useMutation({
    mutationFn: async (seasonId: string) => {
      // First unlink players from this season
      const { error: unlinkError } = await supabase
        .from("players")
        .update({ season_id: null })
        .eq("season_id", seasonId);
      if (unlinkError) throw unlinkError;
      
      const { error } = await supabase.from("seasons").delete().eq("id", seasonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons", clubId] });
      queryClient.invalidateQueries({ queryKey: ["season-player-counts"] });
      toast.success("Saison supprimée");
    },
  });

  const rolloverPlayers = useMutation({
    mutationFn: async (targetSeasonId: string) => {
      // Get active season
      const activeSeason = seasons.find((s: any) => s.is_active);
      if (!activeSeason) throw new Error("Aucune saison active");

      // Get all players from all categories of this club in the active season
      const categoryIds = categories.map((c: any) => c.id);
      const { data: players, error: fetchError } = await supabase
        .from("players")
        .select("*")
        .in("category_id", categoryIds)
        .eq("season_id", activeSeason.id);
      if (fetchError) throw fetchError;

      if (!players || players.length === 0) {
        throw new Error("Aucun joueur à reconduire dans la saison active");
      }

      // Duplicate players for the target season
      const newPlayers = players.map((p: any) => ({
        name: p.name,
        category_id: p.category_id,
        position: p.position,
        email: p.email,
        phone: p.phone,
        birth_year: p.birth_year,
        birth_date: p.birth_date,
        discipline: p.discipline,
        specialty: p.specialty,
        avatar_url: p.avatar_url,
        season_id: targetSeasonId,
      }));

      const { error: insertError } = await supabase.from("players").insert(newPlayers);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["season-player-counts"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("Joueurs reconduits avec succès !");
      setRolloverSeasonId(null);
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la reconduction"),
  });

  const resetForm = () => {
    setNewName("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const activeSeason = seasons.find((s: any) => s.is_active);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Gestion des saisons
          </CardTitle>
          <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Nouvelle saison
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-4">Chargement...</p>
          ) : seasons.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">Aucune saison configurée</p>
              <p className="text-xs text-muted-foreground">
                Créez votre première saison pour organiser vos effectifs par année.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {seasonPlayerCounts["none"] > 0 && (
                <div className="p-3 rounded-lg border border-dashed bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Joueurs sans saison assignée</span>
                    </div>
                    <Badge variant="outline">{seasonPlayerCounts["none"]} joueurs</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ces joueurs existaient avant la mise en place des saisons. Ils restent accessibles dans toutes les vues.
                  </p>
                </div>
              )}

              {seasons.map((season: any) => (
                <div
                  key={season.id}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    season.is_active
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {season.is_active ? (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{season.name}</span>
                          {season.is_active && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(season.start_date), "dd MMM yyyy", { locale: fr })} → {format(new Date(season.end_date), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {seasonPlayerCounts[season.id] || 0}
                      </Badge>

                      {!season.is_active && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => activateSeason.mutate(season.id)}
                            disabled={activateSeason.isPending}
                          >
                            Activer
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => setRolloverSeasonId(season.id)}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Reconduire
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteSeason.mutate(season.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Season Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une nouvelle saison</DialogTitle>
            <DialogDescription>
              Définissez les dates de début et fin de la saison sportive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom de la saison</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: 2025-2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Sélectionner"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Date de fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Sélectionner"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => startDate ? date < startDate : false}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button
              onClick={() => createSeason.mutate()}
              disabled={!newName || !startDate || !endDate || createSeason.isPending}
            >
              {createSeason.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollover Confirmation */}
      <AlertDialog open={!!rolloverSeasonId} onOpenChange={() => setRolloverSeasonId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reconduire les joueurs</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va copier tous les joueurs de la saison active ({activeSeason?.name}) vers la saison sélectionnée.
              Les données historiques (stats, blessures, etc.) restent liées à la saison d'origine.
              Les joueurs seront dupliqués, vous pourrez ensuite retirer ceux qui ne continuent pas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rolloverSeasonId && rolloverPlayers.mutate(rolloverSeasonId)}
              disabled={rolloverPlayers.isPending}
            >
              {rolloverPlayers.isPending ? "Reconduction..." : "Confirmer la reconduction"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
