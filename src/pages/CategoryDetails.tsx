import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { PlayersTab } from "@/components/category/PlayersTab";
import { CalendarTab } from "@/components/category/CalendarTab";
import { TestsTab } from "@/components/category/TestsTab";
import { AwcrTab } from "@/components/category/AwcrTab";
import { OverviewTab } from "@/components/category/OverviewTab";
import { InjuriesTab } from "@/components/injuries/InjuriesTab";
import { PeriodizationTab } from "@/components/periodization/PeriodizationTab";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AnalyticsTab } from "@/components/analytics/AnalyticsTab";
import { CategoryCoverUpload } from "@/components/category/CategoryCoverUpload";
import { GlobalPlayerSearch } from "@/components/search/GlobalPlayerSearch";
import { TestRemindersTab } from "@/components/category/TestRemindersTab";
import { TournamentsTab } from "@/components/category/TournamentsTab";
import { EditableCategoryName } from "@/components/category/EditableCategoryName";
import { EditableRugbyType } from "@/components/category/EditableRugbyType";
import { MatchesTab } from "@/components/category/MatchesTab";
import { ConcussionProtocolTab } from "@/components/category/ConcussionProtocolTab";
import { WellnessTab } from "@/components/category/WellnessTab";


export default function CategoryDetails() {
  const { categoryId } = useParams();
  const navigate = useNavigate();

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
          <div className="flex justify-between items-start mb-4">
            <Button
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate(`/clubs/${category?.clubs?.id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux catégories
            </Button>
            <div className="flex items-center gap-2">
              <GlobalPlayerSearch />
              <NotificationBell />
            </div>
          </div>
          <div className="flex justify-between items-end">
            <div>
              {categoryId && category?.name && (
                <EditableCategoryName 
                  categoryId={categoryId} 
                  initialName={category.name}
                />
              )}
              <div className="flex items-center gap-4 mt-2">
                <p className="text-primary-foreground/90">
                  {category?.clubs?.name}
                </p>
                {categoryId && category?.rugby_type && (
                  <>
                    <span className="text-primary-foreground/60">•</span>
                    <EditableRugbyType 
                      categoryId={categoryId}
                      currentType={category.rugby_type}
                    />
                  </>
                )}
              </div>
            </div>
            {categoryId && (
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
          <TabsList className="w-full overflow-x-auto flex gap-2">
            <TabsTrigger className="whitespace-nowrap flex-shrink-0" value="overview">Vue Générale</TabsTrigger>
            <TabsTrigger className="whitespace-nowrap flex-shrink-0" value="players">Joueurs</TabsTrigger>
            <TabsTrigger className="whitespace-nowrap flex-shrink-0" value="calendar">Calendrier</TabsTrigger>
            <TabsTrigger className="whitespace-nowrap flex-shrink-0" value="tests">Tests</TabsTrigger>
            <TabsTrigger className="whitespace-nowrap flex-shrink-0" value="awcr">AWCR</TabsTrigger>
            <TabsTrigger className="whitespace-nowrap flex-shrink-0" value="injuries">Blessures</TabsTrigger>
            <TabsTrigger className="whitespace-nowrap flex-shrink-0" value="analytics">Analyse</TabsTrigger>
            <TabsTrigger className="whitespace-nowrap flex-shrink-0" value="periodization">Périodisation</TabsTrigger>
            <TabsTrigger className="whitespace-nowrap flex-shrink-0" value="reminders">Rappels Tests</TabsTrigger>
            <TabsTrigger className="whitespace-nowrap flex-shrink-0" value="matches">Matchs</TabsTrigger>
            <TabsTrigger className="whitespace-nowrap flex-shrink-0" value="wellness">Wellness</TabsTrigger>
            <TabsTrigger className="whitespace-nowrap flex-shrink-0" value="medical">Médical</TabsTrigger>
            {isRugby7 && (
              <TabsTrigger className="whitespace-nowrap flex-shrink-0" value="tournaments">Tournois</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <OverviewTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <PlayersTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <CalendarTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="tests" className="space-y-4">
            <TestsTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="awcr" className="space-y-4">
            <AwcrTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="injuries" className="space-y-4">
            <InjuriesTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="periodization" className="space-y-4">
            <PeriodizationTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4">
            <TestRemindersTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="matches" className="space-y-4">
            <MatchesTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="wellness" className="space-y-4">
            <WellnessTab categoryId={categoryId!} />
          </TabsContent>

          <TabsContent value="medical" className="space-y-4">
            <ConcussionProtocolTab categoryId={categoryId!} />
          </TabsContent>

          {isRugby7 && (
            <TabsContent value="tournaments" className="space-y-4">
              <TournamentsTab categoryId={categoryId!} />
            </TabsContent>
          )}
        </Tabs>
      </div>
      
{/* Voice Assistant temporairement désactivé */}
    </div>
  );
}
