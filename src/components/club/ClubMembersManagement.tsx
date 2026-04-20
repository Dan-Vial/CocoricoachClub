import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Trash2, Crown, Settings2, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Category {
  id: string;
  name: string;
}

interface ClubMembersManagementProps {
  clubId: string;
  categories: Category[];
  canManage: boolean;
}

export function ClubMembersManagement({ clubId, categories, canManage }: ClubMembersManagementProps) {
  const queryClient = useQueryClient();
  const [editingMember, setEditingMember] = useState<any>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState(true);

  // Fetch club owner
  const { data: club } = useQuery({
    queryKey: ["club-owner", clubId],
    queryFn: async () => {
      const { data: clubData, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", clubId)
        .single();
      if (error) throw error;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", clubData.user_id)
        .maybeSingle();

      return {
        ...clubData,
        profile: profileData,
      };
    },
  });

  // Fetch club members with profiles and category counts
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["club-members-full", clubId],
    queryFn: async () => {
      // First get the club to know the owner
      const { data: clubData } = await supabase
        .from("clubs")
        .select("user_id")
        .eq("id", clubId)
        .single();

      const { data, error } = await supabase
        .from("club_members")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Filter out the owner (shown separately)
      const filteredData = (data || []).filter(
        (m: any) => m.user_id !== clubData?.user_id
      );

      if (filteredData.length > 0) {
        const userIds = filteredData.map((m: any) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        // Count how many categories each member has access to
        return filteredData.map((member: any) => {
          const assignedCount = member.assigned_categories?.length || 0;
          const totalCategories = categories.length;
          const accessibleCategories = assignedCount === 0 ? totalCategories : assignedCount;
          
          return {
            ...member,
            profile: profiles?.find((p) => p.id === member.user_id),
            accessible_category_count: accessibleCategories,
          };
        });
      }

      return filteredData;
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("club_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-members-full", clubId] });
      queryClient.invalidateQueries({ queryKey: ["club-members", clubId] });
      toast.success("Membre retiré avec succès");
    },
    onError: () => {
      toast.error("Erreur lors du retrait du membre");
    },
  });

  const updateMember = useMutation({
    mutationFn: async ({ memberId, role, assignedCategories }: { 
      memberId: string; 
      role: "admin" | "coach" | "viewer" | "physio" | "doctor" | "mental_coach" | "prepa_physique" | "administratif";
      assignedCategories: string[] | null;
    }) => {
      const { error } = await supabase
        .from("club_members")
        .update({ 
          role: role, 
          assigned_categories: assignedCategories 
        })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-members-full", clubId] });
      queryClient.invalidateQueries({ queryKey: ["club-members", clubId] });
      toast.success("Membre mis à jour");
      setEditingMember(null);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    const hasAllAccess = !member.assigned_categories || member.assigned_categories.length === 0;
    setAllCategories(hasAllAccess);
    setSelectedCategories(member.assigned_categories || []);
  };

  const handleSaveEdit = () => {
    if (!editingMember) return;
    
    updateMember.mutate({
      memberId: editingMember.id,
      role: editingMember.role as "admin" | "coach" | "viewer" | "physio" | "doctor" | "mental_coach" | "prepa_physique" | "administratif",
      assignedCategories: allCategories ? null : selectedCategories,
    });
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      admin: { label: "Admin", variant: "default" },
      coach: { label: "Coach", variant: "secondary" },
      viewer: { label: "Viewer", variant: "outline" },
      physio: { label: "Kiné", variant: "secondary" },
      doctor: { label: "Médecin", variant: "secondary" },
      mental_coach: { label: "Mental", variant: "secondary" },
      prepa_physique: { label: "Prépa Physique", variant: "secondary" },
      administratif: { label: "Administratif", variant: "secondary" },
    };
    const config = variants[role] || variants.viewer;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCategoryNames = (assignedCategories: string[] | null) => {
    if (!assignedCategories || assignedCategories.length === 0) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Toutes</Badge>;
    }
    
    const names = categories
      .filter(c => assignedCategories.includes(c.id))
      .map(c => c.name);
    
    if (names.length <= 2) {
      return names.map((n, i) => (
        <Badge key={i} variant="outline" className="mr-1">{n}</Badge>
      ));
    }
    
    return <Badge variant="outline">{names.length} catégories</Badge>;
  };

  if (isLoading) {
    return <Card className="animate-pulse h-64" />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membres du Club
            </CardTitle>
            <Badge variant="secondary" className="text-sm">
              {members.length + 1} membre{members.length > 0 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Résumé staff par catégorie */}
          {categories.length > 0 && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Staff par catégorie :</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const staffInCat = members.filter((m: any) => {
                    if (!m.assigned_categories || m.assigned_categories.length === 0) return true;
                    return m.assigned_categories.includes(cat.id);
                  }).length + 1; // +1 for owner
                  return (
                    <Badge key={cat.id} variant="outline" className="text-xs">
                      {cat.name}: {staffInCat}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Catégories</TableHead>
                <TableHead>Depuis</TableHead>
                {canManage && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Propriétaire */}
              {club && (
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      {club.profile?.full_name || "Propriétaire"}
                    </div>
                  </TableCell>
                  <TableCell>{club.profile?.email || "-"}</TableCell>
                  <TableCell>
                    <Badge className="bg-yellow-500 hover:bg-yellow-600">Propriétaire</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Toutes</Badge>
                  </TableCell>
                  <TableCell>—</TableCell>
                  {canManage && <TableCell>—</TableCell>}
                </TableRow>
              )}

              {/* Membres */}
              {members.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.profile?.full_name || "Utilisateur"}
                  </TableCell>
                  <TableCell>{member.profile?.email || "-"}</TableCell>
                  <TableCell>{getRoleBadge(member.role)}</TableCell>
                  <TableCell>{getCategoryNames(member.assigned_categories)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(member.created_at), "dd/MM/yy", { locale: fr })}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditMember(member)}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMember.mutate(member.id)}
                          disabled={removeMember.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}

              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground py-8">
                    Aucun membre invité
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog d'édition */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier les accès</DialogTitle>
          </DialogHeader>

          {editingMember && (
            <div className="space-y-6">
              <div>
                <p className="font-medium">{editingMember.profile?.full_name || "Utilisateur"}</p>
                <p className="text-sm text-muted-foreground">{editingMember.profile?.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select
                  value={editingMember.role}
                  onValueChange={(value) => setEditingMember({ ...editingMember, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin - Accès complet</SelectItem>
                    <SelectItem value="coach">Coach - Données sportives</SelectItem>
                    <SelectItem value="prepa_physique">Préparateur Physique</SelectItem>
                    <SelectItem value="doctor">Médecin</SelectItem>
                    <SelectItem value="administratif">Administratif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Accès aux catégories</Label>
                
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Checkbox
                    id="all-categories"
                    checked={allCategories}
                    onCheckedChange={(checked) => {
                      setAllCategories(!!checked);
                      if (checked) setSelectedCategories([]);
                    }}
                  />
                  <Label htmlFor="all-categories" className="cursor-pointer">
                    Toutes les catégories du club
                  </Label>
                </div>

                {!allCategories && (
                  <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`cat-${cat.id}`}
                          checked={selectedCategories.includes(cat.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategories([...selectedCategories, cat.id]);
                            } else {
                              setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                            }
                          }}
                        />
                        <Label htmlFor={`cat-${cat.id}`} className="cursor-pointer">
                          {cat.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMember.isPending}>
              {updateMember.isPending ? "..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}