import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddCategoryDialog } from "@/components/categories/AddCategoryDialog";
import { CollaborationTab } from "@/components/collaboration/CollaborationTab";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default function ClubDetails() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux clubs
            </Button>
            <NotificationBell />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground">{club?.name}</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList>
            <TabsTrigger value="categories">Catégories</TabsTrigger>
            <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-foreground">Catégories</h2>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter une catégorie
              </Button>
            </div>

            {categories && categories.length === 0 ? (
          <Card className="bg-gradient-card shadow-md">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Aucune catégorie créée pour ce club
              </p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Créer votre première catégorie
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories?.map((category) => (
              <Card
                key={category.id}
                className="bg-gradient-card shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group animate-fade-in"
                onClick={() => navigate(`/categories/${category.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span className="text-foreground group-hover:text-primary transition-colors">
                      {category.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Êtes-vous sûr de vouloir supprimer ${category.name} ?`
                          )
                        ) {
                          deleteCategory.mutate(category.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Créé le{" "}
                    {new Date(category.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="collaboration">
        <CollaborationTab clubId={clubId!} />
      </TabsContent>
    </Tabs>
  </div>

      <AddCategoryDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        clubId={clubId!}
      />
    </div>
  );
}
