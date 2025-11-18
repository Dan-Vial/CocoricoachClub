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


export default function CategoryDetails() {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const { data: category } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*, clubs(name, id)")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

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
              <h1 className="text-4xl font-bold text-primary-foreground">
                {category?.name}
              </h1>
              <p className="text-primary-foreground/90 mt-2">
                {category?.clubs?.name}
              </p>
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
        </Tabs>
      </div>
      
{/* Voice Assistant temporairement désactivé */}
    </div>
  );
}
