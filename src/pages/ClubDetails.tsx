import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, ChevronRight, Users } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddCategoryDialog } from "@/components/categories/AddCategoryDialog";
import { CollaborationTab } from "@/components/collaboration/CollaborationTab";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { GlobalPlayerSearch } from "@/components/search/GlobalPlayerSearch";
import { ViewerModeProvider, useViewerModeContext } from "@/contexts/ViewerModeContext";

function ClubDetailsContent() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { isViewer } = useViewerModeContext();

  const { data: club } = useQuery({
    queryKey: ["club", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", clubId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("club_id", clubId)
        .order("name");
      if (error) throw error;
      return data;
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
      queryClient.invalidateQueries({ queryKey: ["categories", clubId] });
      toast.success("Catégorie supprimée avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de la catégorie");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-hero py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-start mb-4">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux clubs
            </Button>
            <div className="flex items-center gap-2">
              <GlobalPlayerSearch />
              <NotificationBell />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white">{club?.name}</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList>
            <TabsTrigger value="categories">Catégories</TabsTrigger>
            {!isViewer && (
              <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-foreground">Catégories</h2>
              {!isViewer && (
                <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter une catégorie
                </Button>
              )}
            </div>

            {categories && categories.length === 0 ? (
          <Card className="bg-gradient-card shadow-md">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Aucune catégorie créée pour ce club
              </p>
              {!isViewer && (
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Créer votre première catégorie
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {categories?.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group cursor-pointer"
                onClick={() => navigate(`/categories/${category.id}`)}
              >
                {/* Category image/icon */}
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center border flex-shrink-0">
                  {category.cover_image_url ? (
                    <img 
                      src={category.cover_image_url} 
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Name and info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {category.name}
                    </span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full flex-shrink-0">
                      {category.rugby_type === "7" ? "7s" : 
                       category.rugby_type === "academie" ? "Académie" : 
                       category.rugby_type === "national_team" ? "Équipe Nat." : 
                       category.rugby_type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Créé le {new Date(category.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!isViewer && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Êtes-vous sûr de vouloir supprimer ${category.name} ?`)) {
                          deleteCategory.mutate(category.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {!isViewer && (
        <TabsContent value="collaboration">
          <CollaborationTab clubId={clubId!} />
        </TabsContent>
      )}
    </Tabs>
  </div>

      {!isViewer && (
        <AddCategoryDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          clubId={clubId!}
        />
      )}
    </div>
  );
}

export default function ClubDetails() {
  const { clubId } = useParams();
  
  return (
    <ViewerModeProvider clubId={clubId}>
      <ClubDetailsContent />
    </ViewerModeProvider>
  );
}
