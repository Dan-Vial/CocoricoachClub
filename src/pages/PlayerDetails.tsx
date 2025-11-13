import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { PlayerTestsTab } from "@/components/player/PlayerTestsTab";
import { PlayerCalendarTab } from "@/components/player/PlayerCalendarTab";
import { PlayerAwcrTab } from "@/components/player/PlayerAwcrTab";
import { PlayerProfile } from "@/components/player/PlayerProfile";
import { PlayerInjuriesTab } from "@/components/player/PlayerInjuriesTab";

export default function PlayerDetails() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();

  const { data: player, isLoading } = useQuery({
    queryKey: ["player", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*, categories(id, name, club_id)")
        .eq("id", playerId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-background p-8">
        <p className="text-muted-foreground">Joueur non trouvé</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/categories/${player.categories?.id}`)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la catégorie
        </Button>

        <Card className="mb-6 bg-gradient-card shadow-md">
          <CardHeader>
            <CardTitle className="text-3xl">{player.name}</CardTitle>
            <p className="text-muted-foreground">{player.categories?.name}</p>
          </CardHeader>
        </Card>

        {/* Player Profile Section */}
        <div className="mb-6">
          <PlayerProfile playerId={playerId!} categoryId={player.category_id} />
        </div>

        <Tabs defaultValue="tests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="calendar">Calendrier</TabsTrigger>
            <TabsTrigger value="awcr">AWCR</TabsTrigger>
            <TabsTrigger value="injuries">Blessures</TabsTrigger>
          </TabsList>

          <TabsContent value="tests">
            <PlayerTestsTab playerId={playerId!} categoryId={player.category_id} />
          </TabsContent>

          <TabsContent value="calendar">
            <PlayerCalendarTab playerId={playerId!} categoryId={player.category_id} />
          </TabsContent>

          <TabsContent value="awcr">
            <PlayerAwcrTab playerId={playerId!} categoryId={player.category_id} />
          </TabsContent>

          <TabsContent value="injuries">
            <PlayerInjuriesTab playerId={playerId!} categoryId={player.category_id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
