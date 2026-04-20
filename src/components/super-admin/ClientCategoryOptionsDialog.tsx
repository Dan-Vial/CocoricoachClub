import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { toast } from "@/components/ui/sonner";
import { 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  FolderOpen,
  MapPin,
  Video,
  GraduationCap,
  Loader2,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import { MAIN_SPORTS, MainSportCategory, getOtherSportSubtypes } from "@/lib/constants/sportTypes";

interface ClientCategoryOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function ClientCategoryOptionsDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
}: ClientCategoryOptionsDialogProps) {
  const queryClient = useQueryClient();
  const [expandedClubs, setExpandedClubs] = useState<Set<string>>(new Set());
  const [addingForClub, setAddingForClub] = useState<string | null>(null);
  const [addingClub, setAddingClub] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [newClubSport, setNewClubSport] = useState<MainSportCategory>("rugby");
  const [newCat, setNewCat] = useState({
    name: "",
    gender: "male",
    sport: "rugby" as MainSportCategory,
    rugby_type: "XV",
    gps_enabled: false,
    video_enabled: false,
    academy_enabled: false,
  });

  const resetNewCat = () => {
    setNewCat({
      name: "",
      gender: "male",
      sport: "rugby" as MainSportCategory,
      rugby_type: "XV",
      gps_enabled: false,
      video_enabled: false,
      academy_enabled: false,
    });
  };

  const { data: clubsWithCategories, isLoading } = useQuery({
    queryKey: ["client-clubs-categories", clientId],
    queryFn: async () => {
      const { data: clubs, error: clubsError } = await supabase
        .from("clubs")
        .select("id, name")
        .eq("client_id", clientId)
        .order("name");
      
      if (clubsError) throw clubsError;
      if (!clubs || clubs.length === 0) return [];

      const clubIds = clubs.map(c => c.id);
      const { data: categories, error: catError } = await supabase
        .from("categories")
        .select("id, name, rugby_type, gender, gps_enabled, video_enabled, academy_enabled, club_id")
        .in("club_id", clubIds)
        .order("name");
      
      if (catError) throw catError;

      return clubs.map(club => ({
        ...club,
        categories: (categories || []).filter(cat => cat.club_id === club.id)
      }));
    },
    enabled: open && !!clientId,
  });

  const toggleOption = useMutation({
    mutationFn: async ({ 
      categoryId, 
      option, 
      value 
    }: { 
      categoryId: string; 
      option: 'gps_enabled' | 'video_enabled' | 'academy_enabled'; 
      value: boolean 
    }) => {
      const { error } = await supabase
        .from("categories")
        .update({ [option]: value })
        .eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-clubs-categories", clientId] });
      toast.success("Option mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const createCategory = useMutation({
    mutationFn: async ({ clubId }: { clubId: string }) => {
      if (!newCat.name.trim()) throw new Error("Nom requis");
      const { error } = await supabase
        .from("categories")
        .insert({
          club_id: clubId,
          name: newCat.name.trim(),
          gender: newCat.gender,
          rugby_type: newCat.rugby_type,
          gps_enabled: newCat.gps_enabled,
          video_enabled: newCat.video_enabled,
          academy_enabled: newCat.academy_enabled,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-clubs-categories", clientId] });
      toast.success("Catégorie créée avec succès");
      resetNewCat();
      setAddingForClub(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la création");
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-clubs-categories", clientId] });
      toast.success("Catégorie supprimée");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la suppression");
    },
  });

  const createClub = useMutation({
    mutationFn: async () => {
      if (!newClubName.trim()) throw new Error("Nom requis");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      
      const { error } = await supabase
        .from("clubs")
        .insert({
          name: newClubName.trim(),
          sport: newClubSport,
          user_id: user.id,
          client_id: clientId,
          timezone: "Europe/Paris",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-clubs-categories", clientId] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-clubs"] });
      toast.success("Club créé avec succès");
      setNewClubName("");
      setNewClubSport("rugby");
      setAddingClub(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la création du club");
    },
  });

  const toggleClub = (clubId: string) => {
    const newExpanded = new Set(expandedClubs);
    if (newExpanded.has(clubId)) {
      newExpanded.delete(clubId);
    } else {
      newExpanded.add(clubId);
    }
    setExpandedClubs(newExpanded);
  };

  useEffect(() => {
    if (clubsWithCategories && clubsWithCategories.length > 0) {
      setExpandedClubs(new Set(clubsWithCategories.map(c => c.id)));
    }
  }, [clubsWithCategories]);

  const handleSportChange = (sport: MainSportCategory) => {
    const subtypes = getOtherSportSubtypes(sport);
    setNewCat(prev => ({
      ...prev,
      sport,
      rugby_type: subtypes[0]?.value || sport,
    }));
  };

  const subtypes = getOtherSportSubtypes(newCat.sport);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Options des catégories - {clientName}
          </DialogTitle>
          <DialogDescription>
            Gérez et créez des catégories pour chaque structure
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !clubsWithCategories || clubsWithCategories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun club associé à ce client</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clubsWithCategories.map((club) => (
                <Collapsible
                  key={club.id}
                  open={expandedClubs.has(club.id)}
                  onOpenChange={() => toggleClub(club.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        {expandedClubs.has(club.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-medium">{club.name}</span>
                      </div>
                      <Badge variant="secondary">
                        {club.categories.length} catégorie(s)
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="pl-6 pr-2 pb-2">
                    {club.categories.length === 0 && addingForClub !== club.id && (
                      <p className="text-sm text-muted-foreground italic py-2 pl-6">
                        Aucune catégorie
                      </p>
                    )}

                    {club.categories.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {club.categories.map((category: any) => (
                          <div
                            key={category.id}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                          >
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{category.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({category.rugby_type} - {category.gender})
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`gps-${category.id}`}
                                  checked={category.gps_enabled}
                                  onCheckedChange={(checked) =>
                                    toggleOption.mutate({
                                      categoryId: category.id,
                                      option: 'gps_enabled',
                                      value: checked === true,
                                    })
                                  }
                                />
                                <label htmlFor={`gps-${category.id}`} className="text-xs flex items-center gap-1 cursor-pointer">
                                  <MapPin className="h-3 w-3" /> GPS
                                </label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`video-${category.id}`}
                                  checked={category.video_enabled}
                                  onCheckedChange={(checked) =>
                                    toggleOption.mutate({
                                      categoryId: category.id,
                                      option: 'video_enabled',
                                      value: checked === true,
                                    })
                                  }
                                />
                                <label htmlFor={`video-${category.id}`} className="text-xs flex items-center gap-1 cursor-pointer">
                                  <Video className="h-3 w-3" /> Vidéo
                                </label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`academy-${category.id}`}
                                  checked={category.academy_enabled}
                                  onCheckedChange={(checked) =>
                                    toggleOption.mutate({
                                      categoryId: category.id,
                                      option: 'academy_enabled',
                                      value: checked === true,
                                    })
                                  }
                                />
                                <label htmlFor={`academy-${category.id}`} className="text-xs flex items-center gap-1 cursor-pointer">
                                  <GraduationCap className="h-3 w-3" /> Académie
                                </label>
                              </div>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 ml-2">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer la catégorie</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir supprimer la catégorie <strong>{category.name}</strong> ? Cette action est irréversible et supprimera toutes les données associées (joueurs, matchs, entraînements…).
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => deleteCategory.mutate(category.id)}
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add category form */}
                    {addingForClub === club.id ? (
                      <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">Nouvelle catégorie</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setAddingForClub(null); resetNewCat(); }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Sport</Label>
                            <Select value={newCat.sport} onValueChange={(v) => handleSportChange(v as MainSportCategory)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {MAIN_SPORTS.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <Select value={newCat.rugby_type} onValueChange={(v) => setNewCat(prev => ({ ...prev, rugby_type: v }))}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {subtypes.map((st) => (
                                  <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Nom</Label>
                            <Input
                              value={newCat.name}
                              onChange={(e) => setNewCat(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Ex: Seniors, U18..."
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Genre</Label>
                            <Select value={newCat.gender} onValueChange={(v) => setNewCat(prev => ({ ...prev, gender: v }))}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Masculin</SelectItem>
                                <SelectItem value="female">Féminin</SelectItem>
                                <SelectItem value="mixed">Mixte</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Checkbox checked={newCat.gps_enabled} onCheckedChange={(c) => setNewCat(prev => ({ ...prev, gps_enabled: c === true }))} />
                            <span className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> GPS</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Checkbox checked={newCat.video_enabled} onCheckedChange={(c) => setNewCat(prev => ({ ...prev, video_enabled: c === true }))} />
                            <span className="text-xs flex items-center gap-1"><Video className="h-3 w-3" /> Vidéo</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Checkbox checked={newCat.academy_enabled} onCheckedChange={(c) => setNewCat(prev => ({ ...prev, academy_enabled: c === true }))} />
                            <span className="text-xs flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Académie</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={!newCat.name.trim() || createCategory.isPending}
                          onClick={() => createCategory.mutate({ clubId: club.id })}
                        >
                          {createCategory.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                          Créer la catégorie
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => { setAddingForClub(club.id); resetNewCat(); }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter une catégorie
                      </Button>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}

          {/* Add club form */}
          {addingClub ? (
            <div className="mt-4 p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Nouveau club / structure
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setAddingClub(false); setNewClubName(""); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nom</Label>
                  <Input
                    value={newClubName}
                    onChange={(e) => setNewClubName(e.target.value)}
                    placeholder="Ex: CREPS Toulouse..."
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sport principal</Label>
                  <Select value={newClubSport} onValueChange={(v) => setNewClubSport(v as MainSportCategory)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MAIN_SPORTS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={!newClubName.trim() || createClub.isPending}
                onClick={() => createClub.mutate()}
              >
                {createClub.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                Créer le club
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setAddingClub(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un club / structure
            </Button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={() => { toast.success("Modifications enregistrées"); onOpenChange(false); }}>
            Valider
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
