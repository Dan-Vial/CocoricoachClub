import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings2, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { getStatsForSport, getStatCategories, type StatField } from "@/lib/constants/sportStats";
import { useAuth } from "@/contexts/AuthContext";
import { AddCustomStatDialog } from "./AddCustomStatDialog";
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

interface StatPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sportType: string;
}

interface CustomStat {
  id: string;
  key: string;
  label: string;
  short_label: string;
  category_type: string;
  measurement_type: string;
  unit: string | null;
}

export function StatPreferencesDialog({
  open,
  onOpenChange,
  categoryId,
  sportType,
}: StatPreferencesDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [enabledStats, setEnabledStats] = useState<string[]>([]);
  const [showAddCustomDialog, setShowAddCustomDialog] = useState(false);
  const [statToDelete, setStatToDelete] = useState<CustomStat | null>(null);
  
  // Get all available stats for this sport
  const allStats = getStatsForSport(sportType, false);
  const goalkeeperStats = getStatsForSport(sportType, true);
  const statCategories = getStatCategories(sportType);

  // Fetch existing preferences
  const { data: existingPrefs, isLoading } = useQuery({
    queryKey: ["stat-preferences", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_stat_preferences")
        .select("*")
        .eq("category_id", categoryId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch custom stats for this category
  const { data: customStats = [] } = useQuery({
    queryKey: ["custom-stats", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_stats")
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CustomStat[];
    },
    enabled: open,
  });

  // Initialize enabled stats from existing prefs or all stats
  useEffect(() => {
    if (existingPrefs?.enabled_stats && existingPrefs.enabled_stats.length > 0) {
      setEnabledStats(existingPrefs.enabled_stats);
    } else {
      // Default: all stats enabled
      const allStatKeys = [...allStats, ...goalkeeperStats].map(s => s.key);
      const customStatKeys = customStats.map(s => s.key);
      const uniqueKeys = [...new Set([...allStatKeys, ...customStatKeys])];
      setEnabledStats(uniqueKeys);
    }
  }, [existingPrefs, allStats, goalkeeperStats, customStats]);

  const savePrefs = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from("category_stat_preferences")
        .select("id")
        .eq("category_id", categoryId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("category_stat_preferences")
          .update({
            enabled_stats: enabledStats,
            sport_type: sportType,
            updated_by: user?.id,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("category_stat_preferences")
          .insert({
            category_id: categoryId,
            sport_type: sportType,
            enabled_stats: enabledStats,
            updated_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stat-preferences", categoryId] });
      toast.success("Préférences de statistiques enregistrées");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving stat preferences:", error);
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  const deleteCustomStat = useMutation({
    mutationFn: async (statId: string) => {
      const { error } = await supabase
        .from("custom_stats")
        .delete()
        .eq("id", statId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-stats", categoryId] });
      toast.success("Statistique personnalisée supprimée");
      setStatToDelete(null);
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const toggleStat = (statKey: string) => {
    setEnabledStats(prev =>
      prev.includes(statKey)
        ? prev.filter(k => k !== statKey)
        : [...prev, statKey]
    );
  };

  const selectAll = () => {
    const allStatKeys = [...allStats, ...goalkeeperStats].map(s => s.key);
    const customStatKeys = customStats.map(s => s.key);
    const uniqueKeys = [...new Set([...allStatKeys, ...customStatKeys])];
    setEnabledStats(uniqueKeys);
  };

  const selectNone = () => {
    setEnabledStats([]);
  };

  const selectCategory = (categoryKey: string) => {
    const categoryStats = allStats.filter(s => s.category === categoryKey).map(s => s.key);
    const gkCategoryStats = goalkeeperStats.filter(s => s.category === categoryKey).map(s => s.key);
    const customCategoryStats = customStats.filter(s => s.category_type === categoryKey).map(s => s.key);
    const allCategoryStats = [...new Set([...categoryStats, ...gkCategoryStats, ...customCategoryStats])];
    
    // Check if all are already enabled
    const allEnabled = allCategoryStats.every(k => enabledStats.includes(k));
    
    if (allEnabled) {
      // Disable all in category
      setEnabledStats(prev => prev.filter(k => !allCategoryStats.includes(k)));
    } else {
      // Enable all in category
      setEnabledStats(prev => [...new Set([...prev, ...allCategoryStats])]);
    }
  };

  const renderStatCheckbox = (stat: StatField) => (
    <div key={stat.key} className="flex items-center space-x-2">
      <Checkbox
        id={stat.key}
        checked={enabledStats.includes(stat.key)}
        onCheckedChange={() => toggleStat(stat.key)}
      />
      <Label htmlFor={stat.key} className="text-sm cursor-pointer">
        {stat.label}
      </Label>
    </div>
  );

  const renderCustomStatCheckbox = (stat: CustomStat) => (
    <div key={stat.key} className="flex items-center justify-between group">
      <div className="flex items-center space-x-2">
        <Checkbox
          id={stat.key}
          checked={enabledStats.includes(stat.key)}
          onCheckedChange={() => toggleStat(stat.key)}
        />
        <Label htmlFor={stat.key} className="text-sm cursor-pointer flex items-center gap-2">
          {stat.label}
          {stat.unit && (
            <span className="text-xs text-muted-foreground">({stat.unit})</span>
          )}
          <Badge variant="outline" className="text-xs">Personnalisée</Badge>
        </Label>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setStatToDelete(stat)}
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );

  // Combine and dedupe stats from both regular and goalkeeper
  const getCombinedStatsForCategory = (categoryKey: string) => {
    const regularStats = allStats.filter(s => s.category === categoryKey);
    const gkStats = goalkeeperStats.filter(s => s.category === categoryKey);
    
    // Combine and dedupe by key
    const combined = [...regularStats];
    gkStats.forEach(gkStat => {
      if (!combined.some(s => s.key === gkStat.key)) {
        combined.push(gkStat);
      }
    });
    
    return combined;
  };

  const getCustomStatsForCategory = (categoryKey: string) => {
    return customStats.filter(s => s.category_type === categoryKey);
  };

  const getEnabledCountForCategory = (categoryKey: string) => {
    const categoryStats = getCombinedStatsForCategory(categoryKey);
    const customCategoryStats = getCustomStatsForCategory(categoryKey);
    const allKeys = [...categoryStats.map(s => s.key), ...customCategoryStats.map(s => s.key)];
    return allKeys.filter(k => enabledStats.includes(k)).length;
  };

  const getTotalCountForCategory = (categoryKey: string) => {
    const categoryStats = getCombinedStatsForCategory(categoryKey);
    const customCategoryStats = getCustomStatsForCategory(categoryKey);
    return categoryStats.length + customCategoryStats.length;
  };

  const handleCustomStatAdded = (statKey: string) => {
    setEnabledStats(prev => [...prev, statKey]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Personnaliser les statistiques
            </DialogTitle>
            <DialogDescription>
              Sélectionnez les statistiques à afficher et saisir pour cette catégorie.
              Vous pouvez également créer des statistiques personnalisées.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mb-4 flex-wrap">
            <Button variant="outline" size="sm" onClick={selectAll}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Tout sélectionner
            </Button>
            <Button variant="outline" size="sm" onClick={selectNone}>
              Tout désélectionner
            </Button>
            <Button variant="default" size="sm" onClick={() => setShowAddCustomDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter une statistique
            </Button>
          </div>

          <Tabs defaultValue={statCategories[0]?.key || "general"} className="flex-1 min-h-0 flex flex-col">
            <TabsList className={`grid w-full ${statCategories.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {statCategories.map(cat => (
                <TabsTrigger key={cat.key} value={cat.key} className="relative">
                  {cat.label}
                  <Badge variant="secondary" className="ml-1 text-xs px-1">
                    {getEnabledCountForCategory(cat.key)}/{getTotalCountForCategory(cat.key)}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              {statCategories.map(cat => {
                const categoryStats = getCombinedStatsForCategory(cat.key);
                const customCategoryStats = getCustomStatsForCategory(cat.key);
                
                return (
                  <TabsContent key={cat.key} value={cat.key} className="space-y-4 mt-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{cat.label}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => selectCategory(cat.key)}
                      >
                        {[...categoryStats, ...customCategoryStats].every(s => enabledStats.includes(s.key)) 
                          ? "Désélectionner tout" 
                          : "Sélectionner tout"
                        }
                      </Button>
                    </div>
                    
                    {/* Standard stats */}
                    {categoryStats.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {categoryStats.map(stat => renderStatCheckbox(stat))}
                      </div>
                    )}
                    
                    {/* Custom stats */}
                    {customCategoryStats.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-3 text-muted-foreground">
                          Statistiques personnalisées
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {customCategoryStats.map(stat => renderCustomStatCheckbox(stat))}
                        </div>
                      </div>
                    )}

                    {categoryStats.length === 0 && customCategoryStats.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune statistique dans cette catégorie
                      </p>
                    )}
                  </TabsContent>
                );
              })}
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => savePrefs.mutate()} 
              disabled={savePrefs.isPending || enabledStats.length === 0}
            >
              {savePrefs.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCustomStatDialog
        open={showAddCustomDialog}
        onOpenChange={setShowAddCustomDialog}
        categoryId={categoryId}
        onStatAdded={handleCustomStatAdded}
      />

      <AlertDialog open={!!statToDelete} onOpenChange={() => setStatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette statistique ?</AlertDialogTitle>
            <AlertDialogDescription>
              La statistique "{statToDelete?.label}" sera définitivement supprimée.
              Les données associées ne seront plus accessibles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => statToDelete && deleteCustomStat.mutate(statToDelete.id)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
