import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings2, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { getStatsForSport, getStatCategories, getAllAthletismeStatsTagged, type StatField } from "@/lib/constants/sportStats";
import { isAthletismeCategory } from "@/lib/constants/sportTypes";
import { useAuth } from "@/contexts/AuthContext";
import { AddCustomStatDialog } from "./AddCustomStatDialog";
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
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  const isAthletics = isAthletismeCategory(sportType);
  
  // Get all available stats for this sport (memoized to avoid infinite loops)
  // For athletics: use tagged stats with discipline-based categories
  const allStats = useMemo(() => isAthletics ? getAllAthletismeStatsTagged() : getStatsForSport(sportType, false), [sportType, isAthletics]);
  const goalkeeperStats = useMemo(() => isAthletics ? [] : getStatsForSport(sportType, true), [sportType, isAthletics]);
  const statCategories = useMemo(() => getStatCategories(sportType), [sportType]);

  // Fetch existing preferences
  const { data: existingPrefs, isLoading } = useQuery({
    queryKey: ["stat-preferences-raw", categoryId],
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
    staleTime: 0,
    refetchOnMount: "always",
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

  // Track whether user has made changes (to distinguish init from user edits)
  const userHasEdited = useRef(false);
  const isInitialized = useRef(false);
  const latestEnabledStats = useRef<string[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    latestEnabledStats.current = enabledStats;
  }, [enabledStats]);

  // Auto-save with debounce
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(false);

  const doSave = useCallback(async (stats: string[]) => {
    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from("category_stat_preferences")
        .select("id")
        .eq("category_id", categoryId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("category_stat_preferences")
          .update({
            enabled_stats: stats,
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
            enabled_stats: stats,
            updated_by: user?.id,
          });
        if (error) throw error;
      }
      // Invalidate all related queries for immediate updates across the app
      queryClient.invalidateQueries({ queryKey: ["stat-preferences-raw", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["stat-preferences", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["custom-stats", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["player_match_stats"] });
      queryClient.invalidateQueries({ queryKey: ["cumulative_player_stats"] });
      queryClient.invalidateQueries({ queryKey: ["aggregated_round_stats"] });
      setLastSaved(true);
      setTimeout(() => setLastSaved(false), 2000);
    } catch (error) {
      console.error("Error saving stat preferences:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  }, [categoryId, sportType, user?.id, queryClient]);

  // Initialize enabled stats from existing prefs or all stats
  useEffect(() => {
    if (!open) {
      // Flush pending save before resetting
      if (userHasEdited.current && saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        doSave(latestEnabledStats.current);
      }
      isInitialized.current = false;
      userHasEdited.current = false;
      return;
    }
    if (isInitialized.current) return;
    if (isLoading) return;

    if (existingPrefs?.enabled_stats && existingPrefs.enabled_stats.length > 0) {
      setEnabledStats(existingPrefs.enabled_stats);
    } else {
      const allStatKeys = [...allStats, ...goalkeeperStats].map(s => s.key);
      const customStatKeys = customStats.map(s => s.key);
      const uniqueKeys = [...new Set([...allStatKeys, ...customStatKeys])];
      setEnabledStats(uniqueKeys);
    }
    isInitialized.current = true;
  }, [open, isLoading, existingPrefs, allStats, goalkeeperStats, customStats, doSave]);

  // Set default selected category
  useEffect(() => {
    if (statCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(statCategories[0].key);
    }
  }, [statCategories, selectedCategory]);

  // Trigger auto-save when enabledStats changes (only after user edits)
  useEffect(() => {
    if (!userHasEdited.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      doSave(enabledStats);
    }, 600);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [enabledStats, doSave]);

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
    userHasEdited.current = true;
    setEnabledStats(prev =>
      prev.includes(statKey)
        ? prev.filter(k => k !== statKey)
        : [...prev, statKey]
    );
  };

  const selectAll = () => {
    userHasEdited.current = true;
    const allStatKeys = [...allStats, ...goalkeeperStats].map(s => s.key);
    const customStatKeys = customStats.map(s => s.key);
    const uniqueKeys = [...new Set([...allStatKeys, ...customStatKeys])];
    setEnabledStats(uniqueKeys);
  };

  const selectNone = () => {
    userHasEdited.current = true;
    setEnabledStats([]);
  };

  const selectCategory = (categoryKey: string) => {
    userHasEdited.current = true;
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
    userHasEdited.current = true;
    const newStats = [...enabledStats, statKey];
    setEnabledStats(newStats);
    // Immediately save (don't wait for debounce) so other components see it right away
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    doSave(newStats);
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
              {isAthletics && (
                <span className="block mt-1 text-xs">
                  ℹ️ Les statistiques sont organisées par discipline. Activez uniquement celles correspondant aux disciplines de vos athlètes. Lors de la saisie en compétition, seules les statistiques de la discipline de chaque athlète seront affichées.
                </span>
              )}
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

          {/* Category dropdown selector */}
          <div className="flex items-center gap-3 mb-4">
            <Label className="text-sm font-medium whitespace-nowrap">Catégorie :</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {statCategories.map(cat => (
                  <SelectItem key={cat.key} value={cat.key}>
                    <span className="flex items-center gap-2">
                      {cat.label}
                      <Badge variant="secondary" className="text-xs px-1.5">
                        {getEnabledCountForCategory(cat.key)}/{getTotalCountForCategory(cat.key)}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats list with scroll */}
          <ScrollArea className="h-[calc(60vh-120px)] border rounded-md p-4">
            {statCategories.map(cat => {
              if (cat.key !== selectedCategory) return null;
              
              const categoryStats = getCombinedStatsForCategory(cat.key);
              const customCategoryStats = getCustomStatsForCategory(cat.key);
              
              return (
                <div key={cat.key} className="space-y-4">
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
                </div>
              );
            })}
          </ScrollArea>

          <DialogFooter className="mt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mr-auto">
              {isSaving && <span>Enregistrement...</span>}
              {lastSaved && !isSaving && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Sauvegardé
                </span>
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              onClick={async () => {
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                await doSave(enabledStats);
                onOpenChange(false);
              }}
              disabled={isSaving}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Sauvegarder
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
