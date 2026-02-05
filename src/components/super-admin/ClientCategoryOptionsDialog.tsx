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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/components/ui/sonner";
import { 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  FolderOpen,
  MapPin,
  Video,
  GraduationCap,
  Loader2
} from "lucide-react";

interface ClientCategoryOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

interface CategoryWithOptions {
  id: string;
  name: string;
  rugby_type: string;
  gender: string;
  gps_enabled: boolean;
  video_enabled: boolean;
  academy_enabled: boolean;
  club_id: string;
  club_name: string;
}

export function ClientCategoryOptionsDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
}: ClientCategoryOptionsDialogProps) {
  const queryClient = useQueryClient();
  const [expandedClubs, setExpandedClubs] = useState<Set<string>>(new Set());

  // Fetch clubs and categories for this client
  const { data: clubsWithCategories, isLoading } = useQuery({
    queryKey: ["client-clubs-categories", clientId],
    queryFn: async () => {
      // Get clubs for this client
      const { data: clubs, error: clubsError } = await supabase
        .from("clubs")
        .select("id, name")
        .eq("client_id", clientId)
        .order("name");
      
      if (clubsError) throw clubsError;
      if (!clubs || clubs.length === 0) return [];

      // Get categories for these clubs
      const clubIds = clubs.map(c => c.id);
      const { data: categories, error: catError } = await supabase
        .from("categories")
        .select("id, name, rugby_type, gender, gps_enabled, video_enabled, academy_enabled, club_id")
        .in("club_id", clubIds)
        .order("name");
      
      if (catError) throw catError;

      // Group categories by club
      return clubs.map(club => ({
        ...club,
        categories: (categories || []).filter(cat => cat.club_id === club.id)
      }));
    },
    enabled: open && !!clientId,
  });

  // Toggle category option
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

  const toggleClub = (clubId: string) => {
    const newExpanded = new Set(expandedClubs);
    if (newExpanded.has(clubId)) {
      newExpanded.delete(clubId);
    } else {
      newExpanded.add(clubId);
    }
    setExpandedClubs(newExpanded);
  };

  // Expand all clubs by default when data loads
  useEffect(() => {
    if (clubsWithCategories && clubsWithCategories.length > 0) {
      setExpandedClubs(new Set(clubsWithCategories.map(c => c.id)));
    }
  }, [clubsWithCategories]);

  const getOptionLabel = (option: string) => {
    switch (option) {
      case 'gps_enabled': return 'GPS';
      case 'video_enabled': return 'Vidéo';
      case 'academy_enabled': return 'Académie';
      default: return option;
    }
  };

  const getOptionIcon = (option: string) => {
    switch (option) {
      case 'gps_enabled': return <MapPin className="h-4 w-4" />;
      case 'video_enabled': return <Video className="h-4 w-4" />;
      case 'academy_enabled': return <GraduationCap className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Options des catégories - {clientName}
          </DialogTitle>
          <DialogDescription>
            Activez ou désactivez les fonctionnalités par catégorie
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
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
                    {club.categories.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-2 pl-6">
                        Aucune catégorie
                      </p>
                    ) : (
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
                              {/* GPS Option */}
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
                                <label
                                  htmlFor={`gps-${category.id}`}
                                  className="text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <MapPin className="h-3 w-3" />
                                  GPS
                                </label>
                              </div>

                              {/* Video Option */}
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
                                <label
                                  htmlFor={`video-${category.id}`}
                                  className="text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Video className="h-3 w-3" />
                                  Vidéo
                                </label>
                              </div>

                              {/* Academy Option */}
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
                                <label
                                  htmlFor={`academy-${category.id}`}
                                  className="text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <GraduationCap className="h-3 w-3" />
                                  Académie
                                </label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}