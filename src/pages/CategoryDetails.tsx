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

export default function CategoryDetails() {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const { data: category } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*, clubs(name)")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-hero py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <Button
            variant="ghost"
            className="mb-4 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate(`/clubs/${category?.club_id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux catégories
          </Button>
          <h1 className="text-4xl font-bold text-primary-foreground">
            {category?.name}
          </h1>
          <p className="text-primary-foreground/90 mt-2">
            {category?.clubs?.name}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Vue Générale</TabsTrigger>
            <TabsTrigger value="players">Joueurs</TabsTrigger>
            <TabsTrigger value="calendar">Calendrier</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="awcr">AWCR</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  );
}
