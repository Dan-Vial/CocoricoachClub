import { useState, useEffect, useMemo } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { categorySchema } from "@/lib/validations";
import { 
  SportType, 
  MainSportCategory, 
  RUGBY_SUBTYPES, 
  getOtherSportSubtypes 
} from "@/lib/constants/sportTypes";

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
}

export function AddCategoryDialog({
  open,
  onOpenChange,
  clubId,
}: AddCategoryDialogProps) {
  const [categoryName, setCategoryName] = useState("");
  const [gender, setGender] = useState<"masculine" | "feminine">("masculine");
  const [sportSubType, setSportSubType] = useState<SportType>("XV");
  const [validationError, setValidationError] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch club to get the sport and client limits
  const { data: club } = useQuery({
    queryKey: ["club-with-client", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, sport, client_id, clients(max_categories_per_club)")
        .eq("id", clubId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!clubId,
  });

  // Fetch current category count
  const { data: currentCategoryCount = 0 } = useQuery({
    queryKey: ["category-count", clubId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId);
      if (error) throw error;
      return count || 0;
    },
    enabled: open && !!clubId,
    staleTime: 0,
  });

  const maxCategories = (club?.clients as any)?.max_categories_per_club ?? null;
  const isCategoryLimitReached = maxCategories !== null && currentCategoryCount >= maxCategories;

  // Fetch club members with profiles
  const { data: clubMembers = [] } = useQuery({
    queryKey: ["club-members-for-assignment", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_members")
        .select("*")
        .eq("club_id", clubId);
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map((m: any) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        return data.map((member: any) => ({
          ...member,
          profile: profiles?.find((p) => p.id === member.user_id),
        }));
      }

      return data;
    },
    enabled: open && !!clubId,
  });

  // Get available subtypes based on club's sport
  const availableSubtypes = useMemo(() => {
    if (!club?.sport) return RUGBY_SUBTYPES;
    const sport = club.sport as MainSportCategory;
    return sport === "rugby" ? RUGBY_SUBTYPES : getOtherSportSubtypes(sport);
  }, [club?.sport]);

  // Reset subtype when dialog opens or club changes
  useEffect(() => {
    if (availableSubtypes.length > 0) {
      setSportSubType(availableSubtypes[0].value);
    }
    if (open) {
      setSelectedMembers([]);
    }
  }, [availableSubtypes, open]);

  const addCategory = useMutation({
    mutationFn: async (data: { name: string; rugby_type: SportType; gender: "masculine" | "feminine"; memberIds: string[] }) => {
      const { data: newCategory, error } = await supabase
        .from("categories")
        .insert({ name: data.name, club_id: clubId, rugby_type: data.rugby_type, gender: data.gender })
        .select()
        .single();
      
      if (error) {
        console.error("Category insert error:", error);
        throw error;
      }

      // Update assigned_categories for selected members
      if (data.memberIds.length > 0) {
        for (const memberId of data.memberIds) {
          const member = clubMembers.find((m: any) => m.id === memberId);
          if (member) {
            const currentCategories = member.assigned_categories || [];
            const updatedCategories = [...currentCategories, newCategory.id];
            
            await supabase
              .from("club_members")
              .update({ assigned_categories: updatedCategories })
              .eq("id", memberId);
          }
        }
      }

      return newCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", clubId] });
      queryClient.invalidateQueries({ queryKey: ["club-members", clubId] });
      queryClient.invalidateQueries({ queryKey: ["club-members-full", clubId] });
      toast.success("Catégorie ajoutée avec succès");
      setCategoryName("");
      setGender("masculine");
      setSelectedMembers([]);
      if (availableSubtypes.length > 0) {
        setSportSubType(availableSubtypes[0].value);
      }
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de la catégorie");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (isCategoryLimitReached) {
      setValidationError(`Limite de catégories atteinte (${currentCategoryCount}/${maxCategories}). Contactez votre administrateur.`);
      return;
    }

    const result = categorySchema.safeParse({ name: categoryName });
    
    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }

    addCategory.mutate({ name: result.data.name, rugby_type: sportSubType, gender: gender, memberIds: selectedMembers });
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const getRoleBadge = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      coach: "Coach",
      viewer: "Viewer",
      physio: "Kiné",
      doctor: "Médecin",
      mental_coach: "Mental",
      prepa_physique: "Prépa Physique",
      administratif: "Administratif",
    };
    return labels[role] || role;
  };

  // Get sport label for display
  const getSportLabel = (sport: string) => {
    const sportLabels: Record<string, string> = {
      rugby: "Rugby",
      football: "Football",
      basketball: "Basketball",
      handball: "Handball",
      volleyball: "Volleyball",
      athletics: "Athlétisme",
      judo: "Judo",
      rowing: "Aviron",
      bowling: "Bowling",
    };
    return sportLabels[sport] || sport;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle catégorie</DialogTitle>
          {club?.sport && (
            <p className="text-sm text-muted-foreground">
              Sport : {getSportLabel(club.sport)}
            </p>
          )}
        </DialogHeader>
        {isCategoryLimitReached && (
          <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              Limite de catégories atteinte ({currentCategoryCount}/{maxCategories})
            </p>
            <p className="text-xs text-muted-foreground mt-1">Contactez votre administrateur pour augmenter cette limite.</p>
          </div>
        )}
        {maxCategories !== null && !isCategoryLimitReached && (
          <p className="text-xs text-muted-foreground">
            Catégories : {currentCategoryCount}/{maxCategories}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Nom de la catégorie</Label>
              <Input
                id="categoryName"
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  setValidationError("");
                }}
                placeholder="Ex: M14, Séniors, U19"
                required
              />
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Genre</Label>
              <RadioGroup value={gender} onValueChange={(value: "masculine" | "feminine") => setGender(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="masculine" id="gender-m" />
                  <Label htmlFor="gender-m" className="cursor-pointer font-normal">Masculin</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="feminine" id="gender-f" />
                  <Label htmlFor="gender-f" className="cursor-pointer font-normal">Féminin</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={sportSubType} 
                onValueChange={(value: SportType) => setSportSubType(value)}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {availableSubtypes.map((subtype) => (
                    <SelectItem key={subtype.value} value={subtype.value}>
                      {subtype.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section d'assignation des membres */}
          {clubMembers.length > 0 && (
            <div className="space-y-3 py-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assigner des membres
                </Label>
                {selectedMembers.length > 0 && (
                  <Badge variant="secondary">
                    {selectedMembers.length} sélectionné{selectedMembers.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Les membres non sélectionnés garderont leur accès actuel.
              </p>
              <ScrollArea className="h-40 border rounded-lg">
                <div className="p-2 space-y-1">
                  {clubMembers.map((member: any) => (
                    <div 
                      key={member.id}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                        selectedMembers.includes(member.id) 
                          ? "bg-primary/10 border border-primary/30" 
                          : "hover:bg-muted"
                      }`}
                      onClick={() => toggleMember(member.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {member.profile?.full_name || "Utilisateur"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.profile?.email || ""}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {getRoleBadge(member.role)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!categoryName.trim() || addCategory.isPending || isCategoryLimitReached}
            >
              {addCategory.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
