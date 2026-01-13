import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LayoutDashboard, Users, Calendar, Zap, Heart, Trophy, MessageSquare } from "lucide-react";
import { OverviewTab } from "@/components/category/OverviewTab";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { CategoryCoverUpload } from "@/components/category/CategoryCoverUpload";
import { GlobalPlayerSearch } from "@/components/search/GlobalPlayerSearch";
import { EditableCategoryName } from "@/components/category/EditableCategoryName";
import { EditableRugbyType } from "@/components/category/EditableRugbyType";
import { ViewerModeProvider, useViewerModeContext } from "@/contexts/ViewerModeContext";

// New mega-tabs
import { EffectifTab } from "@/components/category/tabs/EffectifTab";
import { PlanificationTab } from "@/components/category/tabs/PlanificationTab";
import { PerformanceTab } from "@/components/category/tabs/PerformanceTab";
import { SanteTab } from "@/components/category/tabs/SanteTab";
import { CompetitionTab } from "@/components/category/tabs/CompetitionTab";
import { CommunicationTab } from "@/components/category/tabs/CommunicationTab";

function CategoryDetailsContent() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { isViewer } = useViewerModeContext();

  const { data: category } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*, clubs(name, id), rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const isRugby7 = category?.rugby_type === "7";
  const isAcademy = category?.rugby_type === "academie";
  const isNationalTeam = category?.rugby_type === "national_team";

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="relative py-12 px-4 bg-gradient-hero"
        style={
          category?.cover_image_url
            ? {
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${category.cover_image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate(`/clubs/${category?.clubs?.id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Retour aux catégories</span>
              <span className="sm:hidden">Retour</span>
            </Button>
            {!isViewer && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <GlobalPlayerSearch />
                <NotificationBell />
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div className="min-w-0 flex-1">
              {categoryId && category?.name && (
                isViewer ? (
                  <h1 className="text-2xl sm:text-3xl font-bold text-primary-foreground truncate">{category.name}</h1>
                ) : (
                  <EditableCategoryName 
                    categoryId={categoryId} 
                    initialName={category.name}
                  />
                )
              )}
              <div className="flex items-center gap-2 sm:gap-4 mt-2 flex-wrap">
                <p className="text-primary-foreground/90 text-sm sm:text-base truncate">
                  {category?.clubs?.name}
                </p>
                {categoryId && category?.rugby_type && (
                  <>
                    <span className="text-primary-foreground/60">•</span>
                    {isViewer ? (
                      <span className="text-primary-foreground/90 text-xs sm:text-sm">
                        {category.rugby_type === "15" ? "Rugby XV" : 
                         category.rugby_type === "7" ? "Rugby 7" : 
                         category.rugby_type === "academie" ? "Académie" : 
                         category.rugby_type === "national_team" ? "Équipe Nationale" : 
                         category.rugby_type}
                      </span>
                    ) : (
                      <EditableRugbyType 
                        categoryId={categoryId}
                        currentType={category.rugby_type}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
            {categoryId && !isViewer && (
              <CategoryCoverUpload 
                categoryId={categoryId} 
                currentCoverUrl={category?.cover_image_url}
              />
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <TabsList className="inline-flex w-max min-w-full gap-1 h-auto bg-muted p-1">
              <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Vue Générale</span>
                <span className="sm:hidden">Général</span>
              </TabsTrigger>
              <TabsTrigger value="effectif" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Effectif</span>
                <span className="sm:hidden">Équipe</span>
              </TabsTrigger>
              <TabsTrigger value="planification" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Planification</span>
                <span className="sm:hidden">Planning</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
                <Zap className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Performance</span>
                <span className="sm:hidden">Perf</span>
              </TabsTrigger>
              <TabsTrigger value="sante" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
                <Heart className="h-4 w-4 shrink-0" />
                <span>Santé</span>
              </TabsTrigger>
              <TabsTrigger value="competition" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
                <Trophy className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Compétition</span>
                <span className="sm:hidden">Compét</span>
              </TabsTrigger>
              {!isViewer && (
                <TabsTrigger value="communication" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Communication</span>
                  <span className="sm:hidden">Com</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <OverviewTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="effectif" className="space-y-4">
            <EffectifTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="planification" className="space-y-4">
            <PlanificationTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <PerformanceTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="sante" className="space-y-4">
            <SanteTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="competition" className="space-y-4">
            <CompetitionTab 
              categoryId={categoryId!} 
              isRugby7={isRugby7} 
              isNationalTeam={isNationalTeam}
            />
          </TabsContent>

          {!isViewer && (
            <TabsContent value="communication" className="space-y-4">
              <CommunicationTab 
                categoryId={categoryId!} 
                isAcademy={isAcademy}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default function CategoryDetails() {
  const { categoryId } = useParams();

  // Fetch category to get club_id for the provider
  const { data: category } = useQuery({
    queryKey: ["category-for-viewer", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("club_id")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <ViewerModeProvider clubId={category?.club_id} categoryId={categoryId}>
      <CategoryDetailsContent />
    </ViewerModeProvider>
  );
}
